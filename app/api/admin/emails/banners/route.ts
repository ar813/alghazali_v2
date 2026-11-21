import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import serverClient from "@/sanity/lib/serverClient";
import { authAdmin, dbAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BANNERS_COLLECTION = "email_banners";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB hard input cap
const MAX_OUTPUT_BYTES = 1.5 * 1024 * 1024; // keep stored assets lean
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 800;
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function verifySuperAdmin(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    const userDoc = await dbAdmin.collection("users").doc(decodedToken.uid).get();
    const data = userDoc.data();

    if (userDoc.exists && data?.role === "super_admin") {
      return {
        uid: decodedToken.uid,
        email: decodedToken.email || data?.email || "admin@alghazali.edu.pk",
        displayName: decodedToken.name || data?.displayName || "Super Admin",
      };
    }
    return null;
  } catch (error) {
    console.error("verifySuperAdmin failed:", error);
    return null;
  }
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 60) || "banner";
}

/**
 * GET: Lists every banner saved in Firestore (newest first)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifySuperAdmin(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Access Denied: Super Admin privileges required." },
        { status: 403 }
      );
    }

    const snap = await dbAdmin
      .collection(BANNERS_COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    const banners = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({
      ok: true,
      banners,
      totalSizeKB: banners.reduce(
        (sum: number, b: any) => sum + (b.sizeKB || 0),
        0
      ),
    });
  } catch (error: any) {
    console.error("GET /api/admin/emails/banners error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to load saved banners." },
      { status: 500 }
    );
  }
}

/**
 * POST: Accepts a multipart image, resizes it, uploads it to the public Sanity
 * CDN and registers it in Firestore. The response is a short public HTTPS URL —
 * base64 data-URIs are never stored or sent to email clients.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await verifySuperAdmin(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Access Denied: Super Admin privileges required." },
        { status: 403 }
      );
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const rawName = (form.get("name") as string | null)?.trim() || "";
    const linkUrl = (form.get("linkUrl") as string | null)?.trim() || "";

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { ok: false, error: "No image file was provided." },
        { status: 400 }
      );
    }

    const mime = (file.type || "").toLowerCase();
    const extension = ALLOWED_MIME[mime];
    if (!extension) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unsupported image type "${mime || "unknown"}". Allowed: JPG, PNG, WEBP.`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed is 8MB.`,
        },
        { status: 400 }
      );
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // Resize + re-encode server-side. Sharp refuses malformed/oversized images
    // and guarantees we never publish a multi-megabyte asset by accident.
    const pipeline = sharp(inputBuffer, { failOn: "error" }).rotate().resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    });

    const outputBuffer =
      extension === "png"
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();

    if (outputBuffer.byteLength > MAX_OUTPUT_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: "Processed image is still too large. Please use a simpler banner design.",
        },
        { status: 400 }
      );
    }

    const metadata = await sharp(outputBuffer).metadata();
    const baseName = sanitizeFileName(rawName || file.name);
    const filename = `${baseName}.${extension}`;

    const asset = await serverClient.assets.upload("image", outputBuffer, {
      filename,
      contentType: `image/${extension}`,
    });

    const bannerData = {
      name: (rawName || baseName).slice(0, 80),
      url: asset.url,
      assetId: asset._id,
      linkUrl: linkUrl || "https://alghazali.vercel.app",
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      sizeBytes: outputBuffer.byteLength,
      sizeKB: Math.round((outputBuffer.byteLength / 1024) * 10) / 10,
      mime: `image/${extension}`,
      storageProvider: "sanity",
      createdAt: new Date().toISOString(),
      createdBy: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
    };

    const docRef = await dbAdmin
      .collection(BANNERS_COLLECTION)
      .add(bannerData);

    return NextResponse.json({
      ok: true,
      message: `Banner "${bannerData.name}" uploaded (${bannerData.sizeKB} KB).`,
      banner: { id: docRef.id, ...bannerData },
    });
  } catch (error: any) {
    console.error("POST /api/admin/emails/banners error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to upload the banner. Please try again.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Removes a banner from Firestore and deletes its Sanity asset so
 * uploaded files never accumulate in the CDN.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await verifySuperAdmin(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Access Denied: Super Admin privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const bannerId = searchParams.get("id");

    if (!bannerId) {
      return NextResponse.json(
        { ok: false, error: "Banner ID is required." },
        { status: 400 }
      );
    }

    const docRef = dbAdmin.collection(BANNERS_COLLECTION).doc(bannerId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { ok: false, error: "Banner not found. It may already be deleted." },
        { status: 404 }
      );
    }

    const bannerName = docSnap.data()?.name || "Banner";
    const assetId = docSnap.data()?.assetId;

    await docRef.delete();

    // Best-effort CDN cleanup. The database record is already gone, so a
    // failure here must not surface as a failed delete to the admin.
    if (assetId && typeof assetId === "string") {
      try {
        // @sanity/client v6 removed AssetsClient.delete(); image assets are
        // regular documents now, so they go through the generic delete().
        await serverClient.delete(assetId);
      } catch (assetErr) {
        console.error("Failed to delete Sanity asset", assetId, assetErr);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Banner "${bannerName}" deleted.`,
    });
  } catch (error: any) {
    console.error("DELETE /api/admin/emails/banners error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to delete the banner." },
      { status: 500 }
    );
  }
}

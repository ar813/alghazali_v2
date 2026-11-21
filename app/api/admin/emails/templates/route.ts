import { NextRequest, NextResponse } from "next/server";
import { authAdmin, dbAdmin } from "@/lib/firebase-admin";
import { sanitizeBannerUrl } from "@/lib/email-banner";

export const dynamic = "force-dynamic";

async function verifySuperAdmin(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { isSuper: false, user: null };
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    const userDoc = await dbAdmin.collection("users").doc(decodedToken.uid).get();
    const data = userDoc.data();

    if (userDoc.exists && data?.role === "super_admin") {
      return {
        isSuper: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email || data?.email || "admin@alghazali.edu.pk",
          displayName: decodedToken.name || data?.displayName || "Super Admin",
        },
      };
    }
    return { isSuper: false, user: null };
  } catch (error) {
    console.error("verifySuperAdmin failed:", error);
    return { isSuper: false, user: null };
  }
}

/**
 * GET: Fetches custom user-saved email templates from Firestore
 */
export async function GET(req: NextRequest) {
  try {
    const { isSuper } = await verifySuperAdmin(req);
    if (!isSuper) {
      return NextResponse.json(
        { ok: false, error: "Access Denied: Super Admin privileges required." },
        { status: 403 }
      );
    }

    const snap = await dbAdmin
      .collection("saved_email_templates")
      .orderBy("createdAt", "desc")
      .get();

    const customTemplates = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ ok: true, templates: customTemplates });
  } catch (error: any) {
    console.error("GET /api/admin/emails/templates error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to load templates" },
      { status: 500 }
    );
  }
}

/**
 * POST: Saves a new custom template into Firestore
 */
export async function POST(req: NextRequest) {
  try {
    const { isSuper, user } = await verifySuperAdmin(req);
    if (!isSuper || !user) {
      return NextResponse.json(
        { ok: false, error: "Access Denied: Super Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      category = "custom",
      description = "",
      defaultSubject,
      defaultPreheader = "",
      headerBadge = "OFFICIAL NOTIFICATION",
      themeColor = "#0d9488",
      markdownContent,
      includeBanner = false,
      bannerUrl = "https://alghazali.vercel.app/email_data_format/333.jpg",
      isUrdu = false,
      bannerLink = "https://alghazali.vercel.app",
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: "Template name is required." },
        { status: 400 }
      );
    }

    if (!markdownContent || !markdownContent.trim()) {
      return NextResponse.json(
        { ok: false, error: "Template content cannot be empty." },
        { status: 400 }
      );
    }

    // A data-URI banner would exceed Firestore's 1MiB per-document limit and
    // inflate emails past Gmail's clip limit. Only public HTTPS URLs are kept.
    const bannerCheck = sanitizeBannerUrl(bannerUrl);
    if (!bannerCheck.ok) {
      return NextResponse.json(
        { ok: false, error: bannerCheck.reason },
        { status: 400 }
      );
    }
    const safeUrl = bannerCheck.url;
    const safeLink =
      typeof bannerLink === "string" && /^https:\/\//i.test(bannerLink.trim())
        ? bannerLink.trim()
        : "https://alghazali.vercel.app";

    const templateData = {
      name: name.trim(),
      category,
      description: description.trim() || `Saved on ${new Date().toLocaleDateString()}`,
      defaultSubject: (defaultSubject || name).trim(),
      defaultPreheader: defaultPreheader.trim(),
      headerBadge: headerBadge.trim(),
      themeColor,
      markdownContent,
      includeBanner: Boolean(includeBanner),
      bannerUrl: safeUrl,
      isUrdu: Boolean(isUrdu),
      bannerLink: safeLink,
      createdAt: new Date().toISOString(),
      createdBy: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
    };

    const docRef = await dbAdmin.collection("saved_email_templates").add(templateData);

    return NextResponse.json({
      ok: true,
      message: `Template "${name}" successfully saved for future use!`,
      template: {
        id: docRef.id,
        ...templateData,
      },
    });
  } catch (error: any) {
    console.error("POST /api/admin/emails/templates error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to save template" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Removes a custom saved template from Firestore
 */
export async function DELETE(req: NextRequest) {
  try {
    const { isSuper } = await verifySuperAdmin(req);
    if (!isSuper) {
      return NextResponse.json(
        { ok: false, error: "Access Denied: Super Admin privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json(
        { ok: false, error: "Template ID is required." },
        { status: 400 }
      );
    }

    await dbAdmin.collection("saved_email_templates").doc(templateId).delete();

    return NextResponse.json({
      ok: true,
      message: "Template deleted successfully.",
    });
  } catch (error: any) {
    console.error("DELETE /api/admin/emails/templates error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to delete template" },
      { status: 500 }
    );
  }
}

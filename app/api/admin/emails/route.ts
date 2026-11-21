import { NextRequest, NextResponse } from "next/server";
import { authAdmin, dbAdmin } from "@/lib/firebase-admin";
import {
  sendUnifiedEmail,
  getProviderStatus,
  getRecentEmailLogs,
  EmailProvider,
} from "@/lib/email-service";
import { generateFullEmailHtml, PRESET_EMAIL_TEMPLATES } from "@/lib/email-templates";
import { markdownToPlainText } from "@/lib/email-markdown";
import {
  DEFAULT_BANNER_URL,
  MAX_EMAIL_HTML_BYTES,
  sanitizeBannerUrl,
  stripInlineDataUriBanners,
} from "@/lib/email-banner";

export const dynamic = "force-dynamic";

/**
 * Minifies email HTML to stay under Gmail's 102KB clip limit.
 * - Strips non-MSO HTML comments
 * - Collapses whitespace between tags
 * - Removes blank lines
 */
function minifyEmailHtml(html: string): string {
  return html
    // Remove non-MSO HTML comments
    .replace(/<!--(?!\[if)(?!<!\/)[\s\S]*?-->/g, '')
    // Collapse whitespace between tags
    .replace(/>\s+</g, '><')
    // Collapse multiple spaces into one
    .replace(/ {2,}/g, ' ')
    // Remove blank lines
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

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
 * GET: Fetches provider statuses, template presets, and sent email logs
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

    const providerStatus = getProviderStatus();
    const logs = await getRecentEmailLogs(50);

    // Fetch custom templates from Firestore
    let customTemplates: any[] = [];
    try {
      const snap = await dbAdmin
        .collection("saved_email_templates")
        .orderBy("createdAt", "desc")
        .get();
      customTemplates = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (tmplErr) {
      console.error("Error fetching custom templates:", tmplErr);
    }

    return NextResponse.json({
      ok: true,
      providerStatus,
      templates: PRESET_EMAIL_TEMPLATES,
      customTemplates,
      logs,
    });
  } catch (error: any) {
    console.error("GET /api/admin/emails error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to retrieve email details" },
      { status: 500 }
    );
  }
}

/**
 * POST: Sends email via Resend or Nodemailer with Markdown rendering
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
      provider = "resend",
      to,
      subject,
      preheader,
      markdownContent,
      headerBadge,
      themeColor,
      fromName,
      replyTo,
    } = body;

    // Validate recipients
    let recipientsList: string[] = [];
    if (Array.isArray(to)) {
      recipientsList = to.map((e) => String(e).trim()).filter(Boolean);
    } else if (typeof to === "string") {
      recipientsList = to
        .split(/[,;\n]/)
        .map((e) => e.trim())
        .filter(Boolean);
    }

    if (recipientsList.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Please provide at least one valid recipient email address." },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipientsList.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid email address format detected: ${invalidEmails.slice(0, 3).join(", ")}${invalidEmails.length > 3 ? "..." : ""}`,
        },
        { status: 400 }
      );
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { ok: false, error: "Email subject line is required." },
        { status: 400 }
      );
    }

    if (!markdownContent || !markdownContent.trim()) {
      return NextResponse.json(
        { ok: false, error: "Email markdown body cannot be empty." },
        { status: 400 }
      );
    }

    const validatedProvider: EmailProvider =
      provider === "nodemailer" ? "nodemailer" : "resend";

    // A banner must be a public HTTPS URL. Base64 data-URIs inflate the HTML
    // past Gmail's 102KB clip limit and render as a broken image in clients.
    const bannerCheck = sanitizeBannerUrl(body.bannerUrl);
    if (!bannerCheck.ok) {
      return NextResponse.json(
        { ok: false, error: bannerCheck.reason },
        { status: 400 }
      );
    }
    const bannerUrl = body.includeBanner ? bannerCheck.url : DEFAULT_BANNER_URL;

    // A :::banner block in the body can inline a second copy of the image on
    // top of the header banner. Strip any that carry base64 data-URIs.
    const { markdown: safeMarkdown, removed: strippedBanners } =
      stripInlineDataUriBanners(markdownContent);

    // Compile Markdown to responsive inline email HTML
    const rawEmailHtml = generateFullEmailHtml({
      title: subject,
      preheader: preheader || subject,
      markdownContent: safeMarkdown,
      headerBadge: headerBadge || "OFFICIAL NOTIFICATION",
      themeColor: themeColor || "#0d9488",
      includeBanner: Boolean(body.includeBanner),
      bannerUrl,
      bannerLink: body.bannerLink || undefined,
      isUrdu: Boolean(body.isUrdu),
    });

    // Minify HTML to stay under Gmail's 102KB clip limit
    const emailHtml = minifyEmailHtml(rawEmailHtml);
    const htmlSizeKB = Buffer.byteLength(emailHtml, 'utf8') / 1024;
    console.log(`[Email] HTML size after minification: ${htmlSizeKB.toFixed(1)}KB`);

    // Hard gate: never report success for a message the inbox will clip.
    const htmlSizeBytes = Buffer.byteLength(emailHtml, 'utf8');
    if (htmlSizeBytes > MAX_EMAIL_HTML_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: `This email is ${htmlSizeKB.toFixed(0)}KB, which exceeds the ${Math.round(
            MAX_EMAIL_HTML_BYTES / 1024
          )}KB limit. Gmail clips anything past 102KB, so the recipient would only see a truncated "View entire message" stub. Shorten the body, remove images, or split the mailing into two emails.`,
        },
        { status: 400 }
      );
    }

    if (strippedBanners > 0) {
      console.warn(
        `[Email] Stripped ${strippedBanners} inline base64 banner block(s) from the markdown body.`
      );
    }

    const plainText = markdownToPlainText(safeMarkdown);

    // Send email via unified dispatcher
    const result = await sendUnifiedEmail({
      provider: validatedProvider,
      to: recipientsList,
      subject: subject.trim(),
      html: emailHtml,
      text: plainText,
      fromName: fromName || "Al-Ghazali High School",
      replyTo: replyTo || undefined,
      sentBy: user,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || "Failed to dispatch email through the selected provider.",
          provider: validatedProvider,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Email successfully sent to ${result.recipientCount} recipient(s) via ${validatedProvider.toUpperCase()}.`,
      result,
    });
  } catch (error: any) {
    console.error("POST /api/admin/emails error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Deletes one or all email dispatch logs from Firestore
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
    const logId = searchParams.get("logId");
    const clearAll = searchParams.get("clearAll") === "true";

    if (clearAll) {
      const snap = await dbAdmin.collection("email_logs").get();
      const batch = dbAdmin.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return NextResponse.json({
        ok: true,
        message: "All email dispatch audit logs cleared successfully.",
      });
    }

    if (logId) {
      await dbAdmin.collection("email_logs").doc(logId).delete();
      return NextResponse.json({
        ok: true,
        message: "Email dispatch log deleted successfully.",
      });
    }

    return NextResponse.json(
      { ok: false, error: "Missing logId or clearAll parameter." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("DELETE /api/admin/emails error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to delete email logs." },
      { status: 500 }
    );
  }
}

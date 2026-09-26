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
    const logs = await getRecentEmailLogs(30);

    return NextResponse.json({
      ok: true,
      providerStatus,
      templates: PRESET_EMAIL_TEMPLATES,
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

    // Compile Markdown to responsive inline email HTML
    const emailHtml = generateFullEmailHtml({
      title: subject,
      preheader: preheader || subject,
      markdownContent,
      headerBadge: headerBadge || "OFFICIAL NOTIFICATION",
      themeColor: themeColor || "#0d9488",
    });

    const plainText = markdownToPlainText(markdownContent);

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

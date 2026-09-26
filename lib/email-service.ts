import "server-only";
import nodemailer from "nodemailer";
import { dbAdmin } from "@/lib/firebase-admin";

export type EmailProvider = 'resend' | 'nodemailer';

export interface SendEmailOptions {
  provider: EmailProvider;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  replyTo?: string;
  sentBy?: {
    uid: string;
    email: string;
    displayName?: string;
  };
}

export interface SendResult {
  success: boolean;
  provider: EmailProvider;
  messageId?: string;
  error?: string;
  recipientCount: number;
}

export interface ProviderStatus {
  resend: {
    configured: boolean;
    fromEmail: string;
    hasKey: boolean;
  };
  nodemailer: {
    configured: boolean;
    user: string;
    service: string;
  };
}

/**
 * Checks which email providers are currently configured in environment variables
 */
export function getProviderStatus(): ProviderStatus {
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL || "Al-Ghazali High School <onboarding@resend.dev>";

  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailService = process.env.EMAIL_SERVICE || "gmail";

  return {
    resend: {
      configured: Boolean(resendKey && resendKey.length > 5),
      fromEmail: resendFrom,
      hasKey: Boolean(resendKey),
    },
    nodemailer: {
      configured: Boolean(emailUser && emailPassword),
      user: emailUser || "",
      service: emailService,
    },
  };
}

/**
 * Send email using Resend API
 * Uses the REST API directly with native fetch, providing 100% reliability
 * with or without the external 'resend' npm package installed.
 */
async function sendViaResend(
  to: string[],
  subject: string,
  html: string,
  text?: string,
  fromName?: string,
  replyTo?: string
): Promise<{ messageId: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Resend is not configured: RESEND_API_KEY is missing from environment variables."
    );
  }

  // Format default 'from' header
  const configuredFrom = process.env.RESEND_FROM_EMAIL;
  let fromAddress = configuredFrom;

  if (!fromAddress) {
    // If not set, use onboarding@resend.dev which is standard for testing
    fromAddress = `${fromName || 'Al-Ghazali High School'} <onboarding@resend.dev>`;
  } else if (fromName && configuredFrom && !configuredFrom.includes('<')) {
    fromAddress = `${fromName} <${configuredFrom}>`;
  }

  // Resend Cloud REST API (Native Fetch with Zero External Dependencies)
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to,
      subject,
      html,
      text: text || undefined,
      reply_to: replyTo || undefined,
    }),
  });

  const resJson = await response.json();

  if (!response.ok) {
    const errorMsg = resJson?.message || resJson?.error || JSON.stringify(resJson);
    throw new Error(`Resend API Error (${response.status}): ${errorMsg}`);
  }

  return { messageId: resJson.id || 'resend-ok' };
}

/**
 * Send email using Nodemailer
 */
async function sendViaNodemailer(
  to: string[],
  subject: string,
  html: string,
  text?: string,
  fromName?: string,
  replyTo?: string
): Promise<{ messageId: string }> {
  const EMAIL_HOST = process.env.EMAIL_HOST;
  const EMAIL_PORT = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
  const EMAIL_SECURE = process.env.EMAIL_SECURE === "true";
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
  const EMAIL_SERVICE = process.env.EMAIL_SERVICE || "gmail";

  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    throw new Error(
      "Nodemailer is not configured: EMAIL_USER and EMAIL_PASSWORD are required in environment variables."
    );
  }

  const transporter = nodemailer.createTransport(
    EMAIL_HOST
      ? {
          host: EMAIL_HOST,
          port: EMAIL_PORT || 587,
          secure: EMAIL_SECURE,
          auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
        }
      : ({
          service: EMAIL_SERVICE,
          auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
        } as any)
  );

  const senderName = fromName || "Al-Ghazali High School";
  const from = `"${senderName}" <${EMAIL_USER}>`;

  const info = await transporter.sendMail({
    from,
    to: to.join(", "),
    subject,
    text: text || undefined,
    html,
    replyTo: replyTo || undefined,
  });

  return { messageId: info.messageId || 'nodemailer-ok' };
}

/**
 * Unified sender that logs transaction to Firestore
 */
export async function sendUnifiedEmail(options: SendEmailOptions): Promise<SendResult> {
  const { provider, to, subject, html, text, fromName, replyTo, sentBy } = options;

  if (!to || to.length === 0) {
    throw new Error("At least one recipient email address is required.");
  }

  if (!subject) {
    throw new Error("Email subject is required.");
  }

  let messageId = "";
  let errorMsg = "";
  let success = false;

  try {
    if (provider === 'resend') {
      const res = await sendViaResend(to, subject, html, text, fromName, replyTo);
      messageId = res.messageId;
      success = true;
    } else if (provider === 'nodemailer') {
      const res = await sendViaNodemailer(to, subject, html, text, fromName, replyTo);
      messageId = res.messageId;
      success = true;
    } else {
      throw new Error(`Unsupported email provider: ${provider}`);
    }
  } catch (err: any) {
    success = false;
    errorMsg = err.message || "An unexpected error occurred while sending email.";
  }

  // Save audit log to Firestore collection `email_logs`
  try {
    await dbAdmin.collection("email_logs").add({
      provider,
      subject,
      recipients: to,
      recipientCount: to.length,
      success,
      messageId: messageId || null,
      error: errorMsg || null,
      fromName: fromName || "Al-Ghazali High School",
      sentBy: sentBy || { uid: "system", email: "system" },
      createdAt: new Date().toISOString(),
    });
  } catch (logErr) {
    console.error("Failed to write to email_logs in Firestore:", logErr);
  }

  if (!success) {
    return {
      success: false,
      provider,
      error: errorMsg,
      recipientCount: to.length,
    };
  }

  return {
    success: true,
    provider,
    messageId,
    recipientCount: to.length,
  };
}

/**
 * Retrieves past email logs from Firestore
 */
export async function getRecentEmailLogs(limitCount: number = 25) {
  try {
    const snapshot = await dbAdmin
      .collection("email_logs")
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching email logs:", error);
    return [];
  }
}

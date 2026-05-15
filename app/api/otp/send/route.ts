import { NextRequest, NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";
import { transporter, EMAIL_FROM } from "@/lib/email";
import { getOTPEmailTemplate } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
    try {
        const { email, actionName } = await req.json();

        if (!email) {
            return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store in Firestore with 10-minute expiration
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        
        await dbAdmin.collection("verification_codes").doc(email).set({
            code: otp,
            expiresAt: expiresAt,
            actionName: actionName || "Critical Action",
            createdAt: new Date()
        });

        // Send Email
        try {
            await transporter.sendMail({
                from: EMAIL_FROM,
                to: email,
                subject: `Security Verification - ${otp}`,
                html: getOTPEmailTemplate(otp, actionName || "Critical Action"),
            });
        } catch (mailError: any) {
            console.error("Failed to send OTP email:", mailError);
            return NextResponse.json({ ok: false, error: "Failed to send verification email. Please check SMTP settings." }, { status: 500 });
        }

        return NextResponse.json({ ok: true, message: "Verification code sent to your email" });

    } catch (error: any) {
        console.error("OTP Send Error:", error);
        return NextResponse.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";
import { transporter, EMAIL_FROM } from "@/lib/email";
import { getOTPEmailTemplate } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get("action");
        const body = await req.json();

        if (action === "send") {
            const { email, actionName, userId } = body;

            if (!email || !userId) {
                return NextResponse.json({ ok: false, error: "Email and User ID are required" }, { status: 400 });
            }

            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

            // Store in Firestore using admin SDK
            await dbAdmin.collection("security_otps").doc(userId).set({
                otp,
                expiresAt,
                email,
                actionName: actionName || "Critical Action",
                createdAt: new Date()
            });

            // Send Email
            const mailOptions = {
                from: `"Al-Ghazali Security" <${EMAIL_FROM}>`,
                to: email,
                subject: `${otp} is your verification code`,
                text: `Your verification code is ${otp}. This code will expire in 10 minutes.`,
                html: getOTPEmailTemplate(otp, actionName || "Verification"),
                headers: {
                    'X-Priority': '1 (Highest)',
                    'X-MSMail-Priority': 'High',
                    'Importance': 'High'
                }
            };

            await transporter.sendMail(mailOptions);

            return NextResponse.json({ ok: true, message: "OTP sent successfully" });
        }

        if (action === "verify") {
            const { userId, otp } = body;

            if (!userId || !otp) {
                return NextResponse.json({ ok: false, error: "User ID and OTP are required" }, { status: 400 });
            }

            const docRef = dbAdmin.collection("security_otps").doc(userId);
            const doc = await docRef.get();

            if (!doc.exists) {
                return NextResponse.json({ ok: false, error: "OTP expired or not found" }, { status: 400 });
            }

            const data = doc.data();
            const currentTime = new Date();
            const expiresAt = data?.expiresAt?.toDate();

            if (currentTime > expiresAt) {
                await docRef.delete();
                return NextResponse.json({ ok: false, error: "OTP expired" }, { status: 400 });
            }

            if (data?.otp !== otp) {
                return NextResponse.json({ ok: false, error: "Invalid verification code" }, { status: 400 });
            }

            // Success - delete OTP so it can't be reused
            await docRef.delete();

            return NextResponse.json({ ok: true, message: "Verified" });
        }

        return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        console.error("OTP Error:", error);
        return NextResponse.json({ ok: false, error: error.message || "Failed to process OTP" }, { status: 500 });
    }
}

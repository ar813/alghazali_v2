import { NextRequest, NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json({ ok: false, error: "Email and code are required" }, { status: 400 });
        }

        const docRef = dbAdmin.collection("verification_codes").doc(email);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ ok: false, error: "No verification code found for this email" }, { status: 400 });
        }

        const data = doc.data();
        const currentTime = new Date();
        const expiresAt = data?.expiresAt?.toDate();

        if (currentTime > expiresAt) {
            await docRef.delete();
            return NextResponse.json({ ok: false, error: "Verification code has expired" }, { status: 400 });
        }

        if (data?.code !== code) {
            return NextResponse.json({ ok: false, error: "Invalid verification code" }, { status: 400 });
        }

        // Success - Delete the code so it can't be used again
        await docRef.delete();

        return NextResponse.json({ ok: true, message: "Verified successfully" });

    } catch (error: any) {
        console.error("OTP Verify Error:", error);
        return NextResponse.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
    }
}

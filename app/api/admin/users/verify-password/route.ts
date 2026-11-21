import { NextRequest, NextResponse } from "next/server";
import { authAdmin, dbAdmin } from "@/lib/firebase-admin";
import { issueReauthProof } from "@/lib/reauth-proof";

export const dynamic = "force-dynamic";

/**
 * Step 1 of the change-password flow: prove that the *acting* admin knows their
 * own current password.
 *
 * The acting admin's password is never sent to or stored by the target account
 * flow — we only check the actor, then hand back a short-lived signed proof so
 * step 2 cannot be reached with a stolen ID token alone.
 */

const FAILURE_MESSAGE = "That password is not correct. Please try again.";

// Best-effort throttle. A serverless instance may recycle, so this is a
// speed bump for casual guessing, not a hard limit.
const attemptWindow = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function throttle(uid: string) {
    const now = Date.now();
    const entry = attemptWindow.get(uid);
    if (!entry || now > entry.resetAt) {
        attemptWindow.set(uid, { count: 0, resetAt: now + WINDOW_MS });
        return null;
    }
    if (entry.count >= MAX_ATTEMPTS) {
        return Math.ceil((entry.resetAt - now) / 1000);
    }
    return null;
}

function recordFailure(uid: string) {
    const entry = attemptWindow.get(uid);
    if (entry) entry.count += 1;
}

export async function POST(req: NextRequest) {
    try {
        // ── Auth: must be a signed-in super admin ────────────────────────────
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        let actorUid: string;
        try {
            actorUid = (await authAdmin.verifyIdToken(authHeader.split("Bearer ")[1])).uid;
        } catch {
            return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
        }

        const actor = await authAdmin.getUser(actorUid);
        if (!actor.email) {
            return NextResponse.json({ error: "Your account has no email address to verify against." }, { status: 400 });
        }

        const userDoc = await dbAdmin.collection("users").doc(actorUid).get();
        if (!userDoc.exists || userDoc.data()?.role !== "super_admin") {
            return NextResponse.json(
                { error: "Access Denied: Super Admin privileges required." },
                { status: 403 }
            );
        }

        // ── Body ─────────────────────────────────────────────────────────────
        const { password, targetUid } = await req.json();
        if (typeof password !== "string" || !password) {
            return NextResponse.json({ error: "Enter your current password to continue." }, { status: 400 });
        }
        if (typeof targetUid !== "string" || !targetUid) {
            return NextResponse.json({ error: "Target user is required." }, { status: 400 });
        }

        const waitSeconds = throttle(actorUid);
        if (waitSeconds) {
            return NextResponse.json(
                { error: `Too many attempts. Try again in ${Math.ceil(waitSeconds / 60)} minute(s).` },
                { status: 429 }
            );
        }

        // ── Verify the password against Firebase Auth ─────────────────────────
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        if (!apiKey) {
            console.error("NEXT_PUBLIC_FIREBASE_API_KEY is missing — cannot verify password.");
            return NextResponse.json({ error: "Password verification is unavailable right now." }, { status: 500 });
        }

        const res = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: actor.email, password, returnSecureToken: true }),
            }
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            // Same message for "wrong password" and "no such user" so this
            // endpoint cannot be used to discover which emails exist.
            const code = data?.error?.message || "";
            if (code.includes("USER_DISABLED")) {
                return NextResponse.json({ error: "This admin account has been disabled." }, { status: 403 });
            }
            recordFailure(actorUid);
            return NextResponse.json({ error: FAILURE_MESSAGE }, { status: 401 });
        }

        // signInWithPassword minted a brand-new refresh token for the actor.
        // Sign that session straight back out: verification must not leave a
        // spare long-lived credential lying around.
        if (data?.refreshToken) {
            await fetch(
                `https://securetoken.googleapis.com/v1/revoke?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: data.refreshToken }),
                }
            ).catch(() => { /* best effort */ });
        }

        attemptWindow.delete(actorUid);

        return NextResponse.json({
            success: true,
            verifiedEmail: actor.email,
            proof: issueReauthProof({
                actorUid,
                actorEmail: actor.email,
                targetUid,
                oldPassword: password,
            }),
        });
    } catch (error: any) {
        console.error("Error verifying admin password:", error);
        return NextResponse.json({ error: error.message || "Failed to verify password." }, { status: 500 });
    }
}

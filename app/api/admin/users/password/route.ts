import { NextRequest, NextResponse } from "next/server";
import { authAdmin, dbAdmin } from "@/lib/firebase-admin";
import { getPasswordIssues } from "@/lib/password-policy";
import { verifyReauthProof, isUnchangedPassword } from "@/lib/reauth-proof";

export const dynamic = "force-dynamic";

/**
 * Step 2 of the change-password flow: apply the new password.
 *
 * Reachable only with a valid, unexpired re-auth proof from
 * `/api/admin/users/verify-password`, which is bound to the acting admin, the
 * target account and a 5 minute window.
 */
export async function PUT(req: NextRequest) {
    try {
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

        const userDoc = await dbAdmin.collection("users").doc(actorUid).get();
        if (!userDoc.exists || userDoc.data()?.role !== "super_admin") {
            return NextResponse.json(
                { error: "Access Denied: Super Admin privileges required." },
                { status: 403 }
            );
        }

        const { targetUid, newPassword, proof } = await req.json();

        if (typeof targetUid !== "string" || !targetUid) {
            return NextResponse.json({ error: "Target user is required." }, { status: 400 });
        }
        if (typeof newPassword !== "string" || !newPassword) {
            return NextResponse.json({ error: "Enter a new password." }, { status: 400 });
        }

        // ── Re-auth proof ─────────────────────────────────────────────────────
        const verification = verifyReauthProof(proof, { actorUid, targetUid });
        if (!verification.ok) {
            return NextResponse.json({ error: verification.reason }, { status: 403 });
        }

        // ── Policy, checked authoritatively here rather than trusted from the UI
        const issues = getPasswordIssues(newPassword);
        if (issues.length > 0) {
            return NextResponse.json(
                { error: "That password does not meet the requirements.", issues },
                { status: 400 }
            );
        }

        if (isUnchangedPassword(verification.payload, newPassword)) {
            return NextResponse.json(
                { error: "New password must be different from your current password." },
                { status: 400 }
            );
        }

        // ── Anti-lockout: never orphan the last super admin ──────────────────
        const isSelfChange = targetUid === actorUid;

        const target = await authAdmin.getUser(targetUid).catch(() => null);
        if (!target) {
            return NextResponse.json({ error: "That admin account no longer exists." }, { status: 404 });
        }

        if (!isSelfChange) {
            const targetDoc = await dbAdmin.collection("users").doc(targetUid).get();
            if (targetDoc.data()?.role === "super_admin") {
                const superAdmins = await dbAdmin
                    .collection("users")
                    .where("role", "==", "super_admin")
                    .get();
                if (superAdmins.size <= 1) {
                    return NextResponse.json(
                        { error: "This is the only Super Admin account. Change its password from Account Settings instead." },
                        { status: 400 }
                    );
                }
            }
        }

        // ── Apply ─────────────────────────────────────────────────────────────
        await authAdmin.updateUser(targetUid, { password: newPassword });

        // Force every other signed-in device for this account to re-authenticate.
        // Skipped on a self change: the acting admin's own refresh token is one
        // of the ones being revoked, which would sign them out mid-task.
        if (!isSelfChange) {
            await authAdmin.revokeRefreshTokens(targetUid).catch((e) => {
                console.error("Failed to revoke target sessions:", e);
            });
        }

        const stamp = new Date().toISOString();
        await dbAdmin.collection("users").doc(targetUid).set(
            { passwordChangedAt: stamp, passwordChangedBy: actorUid },
            { merge: true }
        );

        console.log(
            `[admin-audit] password changed: target=${targetUid} by=${actorUid} self=${isSelfChange} at=${stamp}`
        );

        return NextResponse.json({
            success: true,
            selfChange: isSelfChange,
            message: isSelfChange
                ? "Your password has been updated."
                : `Password updated for ${target.displayName || target.email}.`,
        });
    } catch (error: any) {
        console.error("Error changing admin password:", error);
        return NextResponse.json({ error: error.message || "Failed to change password." }, { status: 500 });
    }
}

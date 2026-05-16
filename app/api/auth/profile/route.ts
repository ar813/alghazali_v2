import { NextResponse } from "next/server";
import { authAdmin, dbAdmin } from "@/lib/firebase-admin";
import { patchAdminInSanity } from "@/lib/sanity-sync";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await authAdmin.verifyIdToken(idToken);
        } catch (error) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const uid = decodedToken.uid;
        const { displayName, gender, photoURL } = await req.json();

        // 1. Update Firebase Auth (displayName only)
        if (displayName) {
            await authAdmin.updateUser(uid, { displayName });
        }

        // 2. Update Firestore
        const firestoreUpdate: any = { updatedAt: new Date().toISOString() };
        if (displayName) firestoreUpdate.displayName = displayName;
        if (gender) firestoreUpdate.gender = gender;
        if (photoURL !== undefined) firestoreUpdate.photoURL = photoURL || null;

        if (Object.keys(firestoreUpdate).length > 1) {
            await dbAdmin.collection("users").doc(uid).set(firestoreUpdate, { merge: true });
        }

        // 3. Sync to Sanity (Backup) — non-fatal
        const sanityUpdates: any = {};
        if (displayName) sanityUpdates.displayName = displayName;
        if (gender) sanityUpdates.gender = gender;
        if (photoURL !== undefined) sanityUpdates.photoURL = photoURL;

        if (Object.keys(sanityUpdates).length > 0) {
            try {
                await patchAdminInSanity(uid, sanityUpdates);
            } catch (error) {
                console.error("Sanity sync failed for profile update:", error);
            }
        }

        return NextResponse.json({ message: "Profile updated successfully." });
    } catch (error: any) {
        console.error("Error in profile update:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

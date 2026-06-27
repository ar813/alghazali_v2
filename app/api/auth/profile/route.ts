import { NextResponse } from "next/server";
import { authAdmin, dbAdmin } from "@/lib/firebase-admin";
import { patchAdminInSanity } from "@/lib/sanity-sync";

export const dynamic = "force-dynamic";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle preflight requests from mobile
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function PUT(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
        }

        const idToken = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await authAdmin.verifyIdToken(idToken);
        } catch {
            return NextResponse.json({ error: "Invalid token" }, { status: 401, headers: corsHeaders });
        }

        const uid = decodedToken.uid;
        const { displayName, gender, photoURL, email, password, profileSetupRequired } = await req.json();

        // 1. Update Firebase Auth
        const authUpdate: any = {};
        if (displayName) authUpdate.displayName = displayName;
        if (email) authUpdate.email = email;
        if (password) authUpdate.password = password;
        if (Object.keys(authUpdate).length > 0) {
            await authAdmin.updateUser(uid, authUpdate);
        }

        // 2. Update Firestore
        const firestoreUpdate: any = { updatedAt: new Date().toISOString() };
        if (displayName) firestoreUpdate.displayName = displayName;
        if (gender) firestoreUpdate.gender = gender;
        if (photoURL !== undefined) firestoreUpdate.photoURL = photoURL || null;
        if (email) firestoreUpdate.email = email;
        if (profileSetupRequired === false) firestoreUpdate.profileSetupRequired = false;

        if (Object.keys(firestoreUpdate).length > 1) {
            await dbAdmin.collection("users").doc(uid).set(firestoreUpdate, { merge: true });
        }

        // 3. Sync to Sanity — non-fatal
        const sanityUpdates: any = {};
        if (displayName) sanityUpdates.displayName = displayName;
        if (gender) sanityUpdates.gender = gender;
        if (photoURL !== undefined) sanityUpdates.photoURL = photoURL;
        if (email) sanityUpdates.email = email;

        if (Object.keys(sanityUpdates).length > 0) {
            try {
                await patchAdminInSanity(uid, sanityUpdates);
            } catch (error) {
                console.error("Sanity sync failed for profile update:", error);
            }
        }

        return NextResponse.json({ message: "Profile updated successfully." }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Error in profile update:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500, headers: corsHeaders });
    }
}

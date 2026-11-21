import { createClient } from 'next-sanity';
import { apiVersion, dataset, projectId } from '../sanity/env';

export const sanityWriteClient = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: process.env.SANITY_API_WRITE_TOKEN,
});

interface AdminUserData {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    gender?: string;
    photoURL?: string | null;
    designation?: string;
    assignedClass?: string | null;
    employeeId?: string;
    fatherName?: string;
    cnic?: string;
    phoneNumber?: string;
}

export const syncAdminToSanity = async (userData: AdminUserData) => {
    try {
        if (!process.env.SANITY_API_WRITE_TOKEN) {
            console.warn("SANITY_API_WRITE_TOKEN is missing. Skipping Sanity backup.");
            return;
        }

        // Create or replace the document with ID based on UID to ensure uniqueness
        await sanityWriteClient.createOrReplace({
            _id: `admin-${userData.uid}`,
            _type: 'adminUser',
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName,
            role: userData.role,
            gender: userData.gender || null,
            photoURL: userData.photoURL || null,
            designation: userData.designation || null,
            assignedClass: userData.assignedClass || null,
            employeeId: userData.employeeId || null,
            fatherName: userData.fatherName || null,
            cnic: userData.cnic || null,
            phoneNumber: userData.phoneNumber || null,
            lastSyncedAt: new Date().toISOString(),
        });

        console.log(`Successfully synced admin ${userData.email} to Sanity.`);
    } catch (error) {
        console.error("Error syncing admin to Sanity:", error);
    }
};

export const patchAdminInSanity = async (uid: string, updates: Partial<AdminUserData>) => {
    try {
        if (!process.env.SANITY_API_WRITE_TOKEN) {
            console.warn("SANITY_API_WRITE_TOKEN is missing. Skipping Sanity backup patch.");
            return;
        }

        const docId = `admin-${uid}`;
        
        // Ensure document exists first
        await sanityWriteClient.createIfNotExists({
            _id: docId,
            _type: 'adminUser',
            uid: uid,
            displayName: updates.displayName || 'Admin',
            role: updates.role || 'admin',
        });

        const patch = sanityWriteClient.patch(docId);

        if (updates.email) patch.set({ email: updates.email });
        if (updates.displayName) patch.set({ displayName: updates.displayName });
        if (updates.role) patch.set({ role: updates.role });
        if (updates.gender !== undefined) patch.set({ gender: updates.gender });
        if (updates.photoURL !== undefined) patch.set({ photoURL: updates.photoURL });
        if (updates.designation !== undefined) patch.set({ designation: updates.designation });
        if (updates.assignedClass !== undefined) patch.set({ assignedClass: updates.assignedClass });
        if (updates.employeeId !== undefined) patch.set({ employeeId: updates.employeeId });
        if (updates.fatherName !== undefined) patch.set({ fatherName: updates.fatherName });
        if (updates.cnic !== undefined) patch.set({ cnic: updates.cnic });
        if (updates.phoneNumber !== undefined) patch.set({ phoneNumber: updates.phoneNumber });

        patch.set({ lastSyncedAt: new Date().toISOString() });

        await patch.commit();
        console.log(`Successfully patched admin ${uid} in Sanity.`);
    } catch (error) {
        console.error("Error patching admin in Sanity:", error);
    }
};

export const deleteAdminFromSanity = async (uid: string) => {
    try {
        if (!process.env.SANITY_API_WRITE_TOKEN) {
            console.warn("SANITY_API_WRITE_TOKEN is missing. Skipping Sanity backup deletion.");
            return;
        }

        await sanityWriteClient.delete(`admin-${uid}`);
        console.log(`Successfully deleted admin ${uid} from Sanity.`);
    } catch (error) {
        // Ignore 404s if already deleted
        console.error("Error deleting admin from Sanity:", error);
    }
};

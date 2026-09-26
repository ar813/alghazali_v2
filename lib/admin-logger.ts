/**
 * Admin Logger — logs every admin action to Firebase Firestore
 * Collection: admin_logs
 * Only Super Admins can read these logs.
 */

import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type LogAction =
    | "login"
    | "logout"
    | "session_created"
    | "session_deleted"
    | "session_renamed"
    | "session_locked"
    | "session_unlocked"
    | "student_added"
    | "student_updated"
    | "student_deleted"
    | "fee_recorded"
    | "fee_deleted"
    | "quiz_created"
    | "quiz_deleted"
    | "result_announced"
    | "result_deleted"
    | "attendance_taken"
    | "profile_updated"
    | "user_created"
    | "user_deleted"
    | "user_role_changed"
    | "card_printed"
    | "admit_card_printed"
    | "report_exported"
    | "email_sent"
    | "notice_published"
    | "page_visited"
    | string;

export interface AdminLogEntry {
    uid: string;
    displayName: string | null;
    email: string | null;
    role: "admin" | "super_admin" | null;
    gender: "male" | "female" | null;
    action: LogAction;
    description: string;
    session?: string | null;
    meta?: Record<string, any>;
    timestamp?: any;
    ip?: string;
    userAgent?: string;
}

export async function logAdminAction(entry: AdminLogEntry): Promise<void> {
    try {
        await addDoc(collection(db, "admin_logs"), {
            ...entry,
            timestamp: serverTimestamp(),
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        });
    } catch (error) {
        // Silently fail — logging should never break the app
        console.warn("[AdminLogger] Failed to log action:", error);
    }
}

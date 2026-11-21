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
    | "profile_name_updated"
    | "profile_email_updated"
    | "profile_password_updated"
    | "profile_gender_updated"
    | "profile_photo_updated"
    | "profile_photo_removed"
    | "user_created"
    | "user_deleted"
    | "user_role_changed"
    | "card_printed"
    | "admit_card_printed"
    | "report_exported"
    | "email_sent"
    | "email_test_sent"
    | "email_bulk_sent"
    | "email_log_deleted"
    | "email_logs_cleared"
    | "banner_uploaded"
    | "banner_deleted"
    | "banner_used"
    | "template_saved"
    | "template_deleted"
    | "template_used"
    | "notice_published"
    | "notice_deleted"
    | "notice_cleared"
    | "notice_edited"
    | "page_visited"
    | "logs_exported"
    | "log_deleted"
    | "logs_cleared"
    | string;

export interface AdminLogEntry {
    uid: string;
    displayName: string | null;
    email: string | null;
    role: "admin" | "super_admin" | null;
    gender?: "male" | "female" | null;
    action: LogAction;
    description: string;
    session?: string | null;
    meta?: Record<string, any>;
    timestamp?: any;
    ip?: string;
    userAgent?: string;
}

export interface DeviceInfo {
    browser: string | null;
    os: string | null;
    language: string | null;
    platform: string | null;
    screenWidth: number | null;
    screenHeight: number | null;
    isMobile: boolean | null;
    referrer: string | null;
    userAgent: string | null;
}

/**
 * Best-effort client device information. Logging must never throw, so every
 * access is guarded and wrapped in a try/catch.
 */
export function getDeviceInfo(): DeviceInfo {
    try {
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
        let browser: string | null = null;
        let os: string | null = null;

        if (ua) {
            if (/Edg\//.test(ua)) browser = "Edge";
            else if (/Chrome\//.test(ua)) browser = "Chrome";
            else if (/Firefox\//.test(ua)) browser = "Firefox";
            else if (/Safari\//.test(ua)) browser = "Safari";
            else if (typeof (navigator as any).userAgentData?.brands !== "undefined") browser = "Chromium";

            if (/Windows/.test(ua)) os = "Windows";
            else if (/Mac OS/.test(ua)) os = "macOS";
            else if (/Android/.test(ua)) os = "Android";
            else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
            else if (/Linux/.test(ua)) os = "Linux";
        }

        return {
            browser,
            os,
            language: typeof navigator !== "undefined" ? navigator.language : null,
            platform: typeof navigator !== "undefined" ? (navigator as any).platform || null : null,
            screenWidth: typeof window !== "undefined" ? window.screen?.width ?? null : null,
            screenHeight: typeof window !== "undefined" ? window.screen?.height ?? null : null,
            isMobile: typeof navigator !== "undefined" ? /Mobi/.test(navigator.userAgent) : null,
            referrer: typeof document !== "undefined" ? document.referrer || null : null,
            userAgent: ua,
        };
    } catch {
        return {
            browser: null,
            os: null,
            language: null,
            platform: null,
            screenWidth: null,
            screenHeight: null,
            isMobile: null,
            referrer: null,
            userAgent: null,
        };
    }
}

export async function logAdminAction(entry: AdminLogEntry): Promise<void> {
    try {
        const device = getDeviceInfo();
        await addDoc(collection(db, "admin_logs"), {
            ...entry,
            timestamp: serverTimestamp(),
            userAgent: entry.userAgent ?? device.userAgent,
            device: {
                browser: device.browser,
                os: device.os,
                language: device.language,
                platform: device.platform,
                screenWidth: device.screenWidth,
                screenHeight: device.screenHeight,
                isMobile: device.isMobile,
                referrer: device.referrer,
            },
        });
    } catch (error) {
        // Silently fail — logging should never break the app
        console.warn("[AdminLogger] Failed to log action:", error);
    }
}
"use client";

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { SessionProvider } from '@/context/SessionContext';
import { useAuth } from '@/hooks/use-auth';
import { logAdminAction } from '@/lib/admin-logger';

/**
 * Records every admin page the logged-in admin opens ("page_visited" admin_logs
 * entry). Consecutive duplicates and rapid repeat visits within 10s are skipped
 * so a navigation doesn't spam the history.
 */
function AdminPageVisitTracker() {
    const pathname = usePathname();
    const { user, role, gender } = useAuth();
    const lastLogRef = useRef<{ path: string; at: number } | null>(null);

    useEffect(() => {
        // Only meaningful once an admin is authenticated.
        if (!user?.uid || !pathname?.startsWith("/admin")) return;

        const now = Date.now();
        const last = lastLogRef.current;
        // Skip when revisiting the exact same page within 10 seconds (hash-only
        // changes already produce the same pathname).
        if (last && last.path === pathname && now - last.at < 10_000) return;
        lastLogRef.current = { path: pathname, at: now };

        const segments = pathname.split("/").filter(Boolean); // ["admin", "emails"] etc.
        const session = segments[1] && !segments[1].startsWith("admin")
            ? segments[1]
            : null;

        logAdminAction({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            role,
            gender,
            action: "page_visited",
            description: `Opened ${pathname === "/admin" ? "the session dashboard" : `the ${segments[1] || "admin"} section (${pathname})`}`,
            session,
            meta: { path: pathname },
        });
    }, [pathname, user, role, gender]);

    return null;
}

export default function AdminClientWrapper({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AdminPageVisitTracker />
            {children}
        </SessionProvider>
    );
}
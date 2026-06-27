"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import AdminPortal from '@/components/AdminPortal/AdminPortal';
import NavBar from '@/components/NavBar/NavBar';
import TopLoader from '@/components/TopLoader/TopLoader';
import { useAuth } from '@/hooks/use-auth';
import AuthLayout from '@/components/Auth/AuthLayout';
import AdminLoginForm from '@/components/Auth/AdminLoginForm';

const SessionPage = ({ params }: { params: { session: string } }) => {
    // Decoding param just in case
    const sessionName = decodeURIComponent(params.session);

    return (
        <SessionContent sessionName={sessionName} />
    );
};

const SessionContent = ({ sessionName }: { sessionName: string }) => {
    const { setSelectedSession, selectedSession } = useSession();
    const { user, loading, gender, isSuperAdmin } = useAuth();
    const [childLoading, setChildLoading] = useState(true);
    const { isSessionLocked } = useSession();

    // Force the session context to match the URL
    useEffect(() => {
        if (sessionName && selectedSession !== sessionName) {
            setSelectedSession(sessionName);
        }
    }, [sessionName, selectedSession, setSelectedSession]);

    // Show loading spinner
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded animate-spin mx-auto mb-4"></div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <AuthLayout
                title="Admin Portal"
                subtitle="Sign in to manage the school dashboard."
                type="admin"
            >
                <AdminLoginForm onLoginSuccess={() => { }} />
            </AuthLayout>
        );
    }

    // Block non-super-admins from locked sessions
    if (!isSuperAdmin && isSessionLocked(sessionName)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
                <div className="text-center max-w-sm px-6">
                    <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">Session Locked</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
                        The session <span className="font-semibold text-neutral-800 dark:text-neutral-200">{sessionName}</span> has been locked by the Super Admin.
                    </p>
                    <a href="/admin" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors">
                        Go Back
                    </a>
                </div>
            </div>
        );
    }

    // Determine gender filter for regular admins. Super admins see all.
    const activeGenderFilter = !isSuperAdmin && gender ? gender : undefined;

    return (
        <div className="relative pt-20">
            <NavBar />
            {/* Top non-blocking progress bar for child loading */}
            <TopLoader loading={childLoading} />
            <AdminPortal 
                onLoadingChange={setChildLoading} 
                childLoading={childLoading} 
                gender={activeGenderFilter} 
            />
        </div>
    );
};

export default SessionPage;

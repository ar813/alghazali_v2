"use client";

import React from 'react';
import AdminClasses from '@/components/AdminClasses/AdminClasses';
import NavBar from '@/components/NavBar/NavBar';
import { useAuth } from '@/hooks/use-auth';
import AuthLayout from '@/components/Auth/AuthLayout';
import AdminLoginForm from '@/components/Auth/AdminLoginForm';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GlobalClassesPage() {
    const { user, role, loading } = useAuth();

    // Show loading spinner while checking auth state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded animate-spin mx-auto mb-4"></div>
                </div>
            </div>
        );
    }

    // Require login
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

    // Require Super Admin or normal Admin (currently anyone with admin access can view this, adjust if needed)
    // Here we'll just allow any logged-in user who is part of the admin side
    // If you need super admin only, you can uncomment the block below
    /*
    if (role !== "super_admin") {
        return (
            <main className="min-h-screen bg-neutral-50/50">
                <NavBar />
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-6">
                    <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-none p-8 text-center border border-neutral-200 dark:border-neutral-800 shadow-xl">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded flex items-center justify-center text-red-500 mx-auto mb-6 border border-red-100 dark:border-red-900/50 shadow-sm">
                            <ShieldAlert size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Access Denied</h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-8">
                            This section is restricted to <span className="text-red-600 dark:text-red-400 font-bold">Super Administrators</span>.
                        </p>
                        <a href="/admin" className="inline-flex items-center justify-center w-full px-6 py-3 rounded-none bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium transition-all hover:bg-neutral-800 dark:hover:bg-neutral-100">Return to Dashboard</a>
                    </div>
                </div>
            </main>
        );
    }
    */

    return (
        <main className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950/50">
            <NavBar />
            <div className="p-4 sm:p-6 md:p-8 mt-16">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm shrink-0">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Global Class & Fees Setup</h1>
                            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Manage all academic classes and their fee structures globally across the entire system.</p>
                        </div>
                    </div>
                    <AdminClasses />
                </div>
            </div>
        </main>
    );
}

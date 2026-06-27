"use client";

import React from 'react';
import AdminDiary from '@/components/AdminDiary/AdminDiary';
import NavBar from '@/components/NavBar/NavBar';
import { useAuth } from '@/hooks/use-auth';
import AuthLayout from '@/components/Auth/AuthLayout';
import AdminLoginForm from '@/components/Auth/AdminLoginForm';
import Link from 'next/link';
import { ChevronLeft, BookMarked, Loader2 } from 'lucide-react';

export default function DiaryPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!user) {
        return (
            <AuthLayout title="Admin Portal" subtitle="Sign in to manage the school dashboard." type="admin">
                <AdminLoginForm onLoginSuccess={() => {}} />
            </AuthLayout>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950/50 overflow-x-hidden">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
                    <Link href="/admin" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors">
                        <ChevronLeft size={20} />
                    </Link>
                    <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800" />
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <BookMarked size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight">Diary Manager</h1>
                        <p className="text-[10px] text-neutral-500 font-medium">Daily lesson records and PDF export</p>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                <AdminDiary />
            </main>
        </div>
    );
}

"use client";

import React from "react";
import AdminEmailSender from "@/components/AdminEmailSender/AdminEmailSender";
import { useAuth } from "@/hooks/use-auth";
import AuthLayout from "@/components/Auth/AuthLayout";
import AdminLoginForm from "@/components/Auth/AdminLoginForm";
import Link from "next/link";
import { ChevronLeft, ShieldAlert, Loader2 } from "lucide-react";

export default function AdminEmailsPage() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-center flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600 mb-4" />
          <p className="text-sm font-medium text-neutral-500">
            Verifying Super Admin credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthLayout
        title="Admin Portal"
        subtitle="Sign in to access official communication tools."
        type="admin"
      >
        <AdminLoginForm onLoginSuccess={() => {}} />
      </AuthLayout>
    );
  }

  // Security gate: ONLY SUPER ADMINS ALLOWED
  if (role !== "super_admin") {
    return (
      <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950/50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="w-full max-w-md bg-white dark:bg-black rounded-3xl p-8 text-center border border-neutral-200 dark:border-neutral-800 shadow-2xl relative z-10">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-500 mx-auto mb-6 border border-red-100 dark:border-red-800/50 shadow-inner">
            <ShieldAlert size={36} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white mb-3">
            Access Denied
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-8">
            The Official Email Sender is exclusively restricted to{" "}
            <span className="text-red-600 dark:text-red-400 font-bold px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 rounded-md">
              Super Administrators
            </span>
            . Unauthorized mass email transmission is strictly prohibited by security policies.
          </p>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center w-full px-6 py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-bold transition-all shadow-lg active:scale-95 text-sm"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-teal-500/30 overflow-x-hidden">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
            >
              <ChevronLeft size={20} />
            </Link>
            <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-1" />
            <div>
              <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider block leading-none mb-0.5">
                Super Admin Console
              </span>
              <h1 className="text-base font-bold text-neutral-900 dark:text-white leading-none">
                Email Sender
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold">
              Resend + Nodemailer
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AdminEmailSender />
      </main>
    </div>
  );
}

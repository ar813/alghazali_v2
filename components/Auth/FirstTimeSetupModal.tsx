"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { User, Mail, Lock, Eye, EyeOff, ShieldCheck, LogIn, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const FirstTimeSetupModal = () => {
    const { user, completeProfileSetup } = useAuth();

    const [name, setName] = useState(user?.displayName || "");
    const [email, setEmail] = useState(user?.email || "");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "Name is required";
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Valid email is required";
        if (password.length < 6) e.password = "Minimum 6 characters";
        if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            await completeProfileSetup(name.trim(), email.trim(), password);
            setDone(true);
            // Auto-redirect after showing success state (logout happens inside completeProfileSetup)
        } catch (err: any) {
            setErrors({ submit: err.message || "Setup failed. Please try again." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Success Screen ───────────────────────────────────────────────────────
    if (done) {
        return (
            <div className="fixed inset-0 z-[9999] bg-white dark:bg-neutral-950 flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-3">You're all set!</h2>
                    <p className="text-sm text-neutral-500 leading-relaxed mb-6">
                        Your profile has been saved. You've been signed out — please log in with your new credentials.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-semibold">
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        Redirecting to login...
                    </div>
                </div>
            </div>
        );
    }

    // ─── Setup Form ───────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-neutral-950 flex items-center justify-center overflow-y-auto">
            {/* Subtle background decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
            <div className="absolute top-20 -left-32 w-96 h-96 bg-emerald-50 dark:bg-emerald-950/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 -right-32 w-80 h-80 bg-teal-50 dark:bg-teal-950/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-md mx-auto p-6 py-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-600/25">
                        <ShieldCheck size={30} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">
                        Set Up Your Account
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
                        Your account was created by a Super Admin. Choose your own credentials before continuing.
                    </p>
                </div>

                {/* Steps indicator */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {["Name", "Email", "Password"].map((step, i) => (
                        <React.Fragment key={step}>
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                                    {i + 1}
                                </div>
                                <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">{step}</span>
                            </div>
                            {i < 2 && <div className="w-6 h-px bg-neutral-200 dark:bg-neutral-800" />}
                        </React.Fragment>
                    ))}
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Global error */}
                        {errors.submit && (
                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3 text-xs font-semibold text-red-600 dark:text-red-400">
                                {errors.submit}
                            </div>
                        )}

                        {/* Name */}
                        <Field
                            label="Full Name"
                            icon={<User size={15} />}
                            error={errors.name}
                        >
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })); }}
                                placeholder="Enter your full name"
                                className="flex-1 bg-transparent text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600 outline-none"
                            />
                        </Field>

                        {/* Email */}
                        <Field
                            label="Email Address"
                            icon={<Mail size={15} />}
                            error={errors.email}
                        >
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }}
                                placeholder="your@email.com"
                                className="flex-1 bg-transparent text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600 outline-none"
                            />
                        </Field>

                        {/* Password */}
                        <Field
                            label="New Password"
                            icon={<Lock size={15} />}
                            error={errors.password}
                            suffix={
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            }
                        >
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: "" })); }}
                                placeholder="Min. 6 characters"
                                className="flex-1 bg-transparent text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600 outline-none"
                            />
                        </Field>

                        {/* Confirm Password */}
                        <Field
                            label="Confirm Password"
                            icon={<Lock size={15} />}
                            error={errors.confirmPassword}
                        >
                            <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: "" })); }}
                                placeholder="Re-enter password"
                                className="flex-1 bg-transparent text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600 outline-none"
                            />
                        </Field>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={16} />
                                    Save & Continue
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-[11px] text-neutral-400 mt-5">
                    After saving, you'll be signed out and redirected to login with your new credentials.
                </p>
            </div>
        </div>
    );
};

// ─── Reusable Field ───────────────────────────────────────────────────────────
const Field = ({
    label, icon, error, suffix, children
}: {
    label: string;
    icon: React.ReactNode;
    error?: string;
    suffix?: React.ReactNode;
    children: React.ReactNode;
}) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-0.5">
            {label}
        </label>
        <div className={cn(
            "flex items-center gap-2.5 border rounded-xl px-3.5 h-11 transition-colors",
            error
                ? "border-red-400 bg-red-50/50 dark:bg-red-900/10"
                : "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus-within:border-emerald-500 dark:focus-within:border-emerald-500"
        )}>
            <span className="text-neutral-400 shrink-0">{icon}</span>
            {children}
            {suffix}
        </div>
        {error && <p className="text-[11px] text-red-500 ml-0.5">{error}</p>}
    </div>
);

export default FirstTimeSetupModal;

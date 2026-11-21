"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter } from "@chakra-ui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    Lock,
    ShieldCheck,
    TriangleAlert,
    UserCog,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { PASSWORD_RULES, getPasswordIssues, getPasswordStrength } from "@/lib/password-policy";

interface ChangePasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Account whose password is being changed. */
    target: { uid: string; displayName: string; email: string } | null;
    /** Signed-in admin who is performing the change. */
    actorEmail: string;
    isSelf: boolean;
}

/** 16 chars from an unambiguous alphabet, so it can be read aloud or copied. */
function suggestPassword(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    const bytes = new Uint32Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Two-step change-password dialog.
 *
 * Step 1 proves the *acting* admin knows their own password — the target
 * account's old password is never needed or accepted here. Step 2 sets the new
 * password and requires the step-1 proof, which the server validates against
 * the acting admin, the target uid and a 5 minute window.
 */
const ChangePasswordDialog = ({
    open,
    onOpenChange,
    target,
    actorEmail,
    isSelf,
}: ChangePasswordDialogProps) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const [confirmTouched, setConfirmTouched] = useState(false);
    const [proof, setProof] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    const reset = () => {
        setStep(1);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowOld(false);
        setShowNew(false);
        setShowConfirm(false);
        setCapsLock(false);
        setConfirmTouched(false);
        setProof(null);
        setError("");
        setBusy(false);
        setDone(false);
    };

    useEffect(() => {
        if (open) reset();
    }, [open, target?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

    const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
    const newIssues = useMemo(() => getPasswordIssues(newPassword), [newPassword]);
    const mismatch = confirmTouched && !!confirmPassword && confirmPassword !== newPassword;
    const canSubmitStep2 = newIssues.length === 0 && !!confirmPassword && !mismatch;

    const targetLabel = target?.displayName || target?.email || "this admin";

    const handleVerify = async () => {
        if (!target) return;
        if (!oldPassword) {
            setError("Enter your current password to continue.");
            return;
        }

        setBusy(true);
        setError("");
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/admin/users/verify-password", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ password: oldPassword, targetUid: target.uid }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.error || "Could not verify your password.");
                setOldPassword("");
                return;
            }

            setProof(data.proof);
            setStep(2);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const handleApply = async () => {
        if (!target || !proof) return;
        if (!canSubmitStep2) {
            setError(
                mismatch
                    ? "The two new passwords do not match."
                    : "The new password does not meet the requirements yet."
            );
            return;
        }

        setBusy(true);
        setError("");
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/admin/users/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ targetUid: target.uid, newPassword, proof }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.error || "Could not change the password.");
                // A rejected proof means the 5 minute window lapsed or the actor
                // changed — send them back rather than let them retry blind.
                if (res.status === 403) {
                    setProof(null);
                    setStep(1);
                    setOldPassword("");
                }
                return;
            }

            setDone(true);
            toast.success(data.message || "Password updated.");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const handleClose = () => {
        if (busy) return;
        onOpenChange(false);
    };

    return (
        <Modal isOpen={open} onClose={handleClose} isCentered size="md" motionPreset="scale">
            <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(4px)" />
            <ModalContent
                bg="white"
                color="neutral.900"
                borderRadius="0"
                border="1px solid"
                borderColor="neutral.200"
                overflow="hidden"
                mx={4}
            >
                {/* ── Header + step indicator ─────────────────────────────────── */}
                <div className="bg-neutral-900 px-5 sm:px-6 py-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                            {step === 1 ? <ShieldCheck size={20} /> : <KeyRound size={20} />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                                {done
                                    ? "Password updated"
                                    : step === 1
                                      ? "Confirm it's you"
                                      : "Set a new password"}
                            </h2>
                            <p className="text-xs text-neutral-400 mt-0.5 break-words">
                                {isSelf ? "Your own account" : `For ${targetLabel}`}
                                {!done && <span className="text-neutral-500"> · {target?.email}</span>}
                            </p>
                        </div>
                    </div>

                    {!done && (
                        <div className="mt-4 flex items-center gap-3">
                            {[
                                { n: 1, label: "Verify" },
                                { n: 2, label: "New password" },
                            ].map(({ n, label }) => {
                                const active = step === n;
                                const complete = step > n;
                                return (
                                    <React.Fragment key={n}>
                                        {n > 1 && <div className="h-px flex-1 bg-neutral-700" />}
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={[
                                                    "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors",
                                                    complete
                                                        ? "bg-emerald-500 text-neutral-900"
                                                        : active
                                                          ? "bg-white text-neutral-900"
                                                          : "bg-neutral-800 text-neutral-500",
                                                ].join(" ")}
                                            >
                                                {complete ? <Check size={13} /> : n}
                                            </div>
                                            <span
                                                className={[
                                                    "text-[11px] font-semibold",
                                                    active ? "text-white" : "text-neutral-500",
                                                ].join(" ")}
                                            >
                                                {label}
                                            </span>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </div>

                <ModalBody p={0}>
                    {/* ── Success ─────────────────────────────────────────────── */}
                    {done ? (
                        <div className="px-5 sm:px-6 py-8 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                                <Check size={28} />
                            </div>
                            <p className="mt-4 text-sm text-neutral-600">
                                {isSelf
                                    ? "You can keep using the portal — you stay signed in on this device."
                                    : `${targetLabel} has been signed out of their other devices and must use the new password next time.`}
                            </p>
                            {!isSelf && (
                                <p className="mt-2 text-xs text-neutral-500">
                                    Share the new password securely. It cannot be recovered or emailed later.
                                </p>
                            )}
                        </div>
                    ) : step === 1 ? (
                        /* ── Step 1: verify acting admin ──────────────────────────── */
                        <div className="px-5 sm:px-6 py-5 space-y-4">
                            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                                <UserCog size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                    {isSelf ? (
                                        <>
                                            You are changing the password for your own account, so confirm it with your{" "}
                                            <span className="font-semibold">current</span> password.
                                        </>
                                    ) : (
                                        <>
                                            For security, confirm <span className="font-semibold">your own</span> admin
                                            password before changing {targetLabel}&apos;s.
                                            <span className="block mt-1 text-amber-600/80 dark:text-neutral-400">
                                                Their current password is not needed.
                                            </span>
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                    Your current password
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showOld ? "text" : "password"}
                                        value={oldPassword}
                                        autoComplete="current-password"
                                        autoFocus
                                        onChange={(e) => {
                                            setOldPassword(e.target.value);
                                            setError("");
                                        }}
                                        onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
                                        placeholder={`Signed in as ${actorEmail}`}
                                        className="h-11 rounded-xl text-sm font-medium pl-10 pr-10 border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-emerald-500"
                                    />
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <button
                                        type="button"
                                        onClick={() => setShowOld((s) => !s)}
                                        aria-label={showOld ? "Hide password" : "Show password"}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
                                    >
                                        {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {capsLock && (
                                    <p className="text-[11px] font-medium text-amber-600 flex items-center gap-1.5">
                                        <TriangleAlert size={12} /> Caps Lock is on
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
                                    <TriangleAlert size={14} className="shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <p className="text-[11px] text-neutral-500">
                                This step is valid for 5 minutes and only for {targetLabel}.
                            </p>
                        </div>
                    ) : (
                        /* ── Step 2: new password ─────────────────────────────────── */
                        <div className="px-5 sm:px-6 py-5 space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                        New password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const suggestion = suggestPassword();
                                            setNewPassword(suggestion);
                                            setConfirmPassword(suggestion);
                                            setConfirmTouched(false);
                                            setError("");
                                        }}
                                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-500 inline-flex items-center gap-1"
                                    >
                                        <KeyRound size={12} /> Suggest a strong one
                                    </button>
                                </div>
                                <div className="relative">
                                    <Input
                                        type={showNew ? "text" : "password"}
                                        value={newPassword}
                                        autoComplete="new-password"
                                        autoFocus
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            setError("");
                                        }}
                                        onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
                                        placeholder="At least 8 characters"
                                        className="h-11 rounded-xl text-sm font-medium pl-10 pr-10 border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-emerald-500"
                                    />
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew((s) => !s)}
                                        aria-label={showNew ? "Hide password" : "Show password"}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
                                    >
                                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>

                                {/* Strength meter */}
                                <div className="pt-1 space-y-1.5">
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className={[
                                                    "h-1.5 rounded-full transition-colors",
                                                    i < strength.score ? strength.barColor : "bg-neutral-200",
                                                ].join(" ")}
                                            />
                                        ))}
                                    </div>
                                    <p className={["text-[11px] font-bold uppercase tracking-wider", strength.color].join(" ")}>
                                        {strength.label}
                                    </p>
                                </div>
                            </div>

                            {/* Live requirements */}
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {PASSWORD_RULES.map((rule) => {
                                    const pass = rule.test(newPassword);
                                    return (
                                        <li
                                            key={rule.id}
                                            className={[
                                                "flex items-center gap-1.5 text-[11px] font-medium transition-colors",
                                                pass ? "text-emerald-600" : "text-neutral-400",
                                            ].join(" ")}
                                        >
                                            <span
                                                className={[
                                                    "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0",
                                                    pass ? "bg-emerald-500 text-white" : "bg-neutral-200",
                                                ].join(" ")}
                                            >
                                                {pass && <Check size={10} />}
                                            </span>
                                            {rule.label}
                                        </li>
                                    );
                                })}
                            </ul>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                    Confirm new password
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPassword}
                                        autoComplete="new-password"
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            setConfirmTouched(true);
                                            setError("");
                                        }}
                                        onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
                                        placeholder="Re-enter the new password"
                                        className={[
                                            "h-11 rounded-xl text-sm font-medium pl-10 pr-10 bg-neutral-50/50",
                                            mismatch
                                                ? "border-red-400 focus:border-red-500"
                                                : "border-neutral-200 focus:border-emerald-500",
                                        ].join(" ")}
                                    />
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm((s) => !s)}
                                        aria-label={showConfirm ? "Hide password" : "Show password"}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
                                    >
                                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {mismatch && (
                                    <p className="text-[11px] font-medium text-red-600 flex items-center gap-1.5">
                                        <TriangleAlert size={12} /> Passwords do not match
                                    </p>
                                )}
                                {capsLock && (
                                    <p className="text-[11px] font-medium text-amber-600 flex items-center gap-1.5">
                                        <TriangleAlert size={12} /> Caps Lock is on
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
                                    <TriangleAlert size={14} className="shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {!isSelf && (
                                <p className="text-[11px] text-neutral-500 leading-relaxed">
                                    Changing this password signs {targetLabel} out of every other device. Write the new
                                    password down and hand it over in person.
                                </p>
                            )}
                        </div>
                    )}
                </ModalBody>

                <ModalFooter
                    borderTop="1px solid"
                    borderColor="neutral.200"
                    gap={2}
                    className="px-5 sm:px-6 py-4"
                >
                    {done ? (
                        <Button
                            onClick={handleClose}
                            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                            Done
                        </Button>
                    ) : step === 1 ? (
                        <>
                            <Button
                                onClick={handleClose}
                                disabled={busy}
                                className="flex-1 rounded-xl bg-transparent hover:bg-neutral-100 text-neutral-700 font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleVerify}
                                disabled={busy || !oldPassword}
                                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                {busy ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>
                                        Verify &amp; continue <ArrowRight size={15} />
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                onClick={() => {
                                    setStep(1);
                                    setError("");
                                }}
                                disabled={busy}
                                className="flex-1 rounded-xl bg-transparent hover:bg-neutral-100 text-neutral-700 font-bold"
                            >
                                <ArrowLeft size={15} /> Back
                            </Button>
                            <Button
                                onClick={handleApply}
                                disabled={busy || !canSubmitStep2}
                                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                {busy ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>
                                        <Check size={15} /> Change password
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ChangePasswordDialog;

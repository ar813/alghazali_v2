"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, Mail, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface OTPVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerifySuccess: () => void;
    email: string;
    userId: string;
    actionName: string;
}

const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
    isOpen,
    onClose,
    onVerifySuccess,
    email,
    userId,
    actionName
}) => {
    const [otp, setOtp] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [timer, setTimer] = useState(60);
    const [error, setError] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (isOpen) {
            setOtp(['', '', '', '']);
            setError(null);
            setSent(false);
            setShowHelp(false);
            sendOTP();
            setTimer(60);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0 && isOpen) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer, isOpen]);

    // Auto-focus first input after sending
    useEffect(() => {
        if (sent && !sending) {
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [sent, sending]);

    const sendOTP = async () => {
        setSending(true);
        setError(null);
        setSent(false);
        try {
            const res = await fetch('/api/auth/otp?action=send', {
                method: 'POST',
                body: JSON.stringify({ email, userId, actionName }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);
            setSent(true);
            setTimer(60);
        } catch (err: any) {
            setError(err.message || 'Failed to send code');
        } finally {
            setSending(false);
        }
    };

    const handleVerify = async () => {
        const fullOtp = otp.join('');
        if (fullOtp.length < 4) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/otp?action=verify', {
                method: 'POST',
                body: JSON.stringify({ userId, otp: fullOtp }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);
            toast.success('Identity verified');
            onVerifySuccess();
        } catch (err: any) {
            setError(err.message || 'Verification failed');
            setOtp(['', '', '', '']);
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
        // Auto-submit when last digit filled
        if (value && index === 3) {
            const filled = [...newOtp];
            if (filled.every(d => d !== '')) {
                setTimeout(() => handleVerifyWith(filled), 100);
            }
        }
    };

    const handleVerifyWith = async (digits: string[]) => {
        const fullOtp = digits.join('');
        if (fullOtp.length < 4) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/otp?action=verify', {
                method: 'POST',
                body: JSON.stringify({ userId, otp: fullOtp }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);
            toast.success('Identity verified');
            onVerifySuccess();
        } catch (err: any) {
            setError(err.message || 'Verification failed');
            setOtp(['', '', '', '']);
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace') {
            if (otp[index]) {
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            } else if (index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4).split('');
        const newOtp = ['', '', '', ''];
        pastedData.forEach((char, i) => { newOtp[i] = char; });
        setOtp(newOtp);
        const nextEmpty = newOtp.findIndex(d => d === '');
        const focusIdx = nextEmpty === -1 ? 3 : nextEmpty;
        inputRefs.current[focusIdx]?.focus();
    };

    if (!isOpen) return null;

    const isComplete = otp.every(d => d !== '');

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    {/* Backdrop — NOT clickable to close */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 24 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="relative w-full max-w-sm bg-[#141414] rounded-2xl shadow-2xl overflow-hidden border border-white/10"
                    >
                        {/* Top accent bar */}
                        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500" />

                        <div className="p-7">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="relative mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center">
                                        <ShieldCheck size={30} className="text-blue-400" />
                                    </div>
                                    {sending && (
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#141414] border border-white/10 flex items-center justify-center">
                                            <RefreshCw size={10} className="text-blue-400 animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 tracking-tight">Verify Your Identity</h3>
                                <p className="text-neutral-400 text-[13px] leading-relaxed">
                                    {sending ? (
                                        <span className="flex items-center gap-1.5 justify-center"><RefreshCw size={11} className="animate-spin" /> Sending code...</span>
                                    ) : sent ? (
                                        <>4-digit code sent to<br /><span className="text-white font-semibold">{email}</span></>
                                    ) : (
                                        <>Enter the code sent to<br /><span className="text-white font-semibold">{email}</span></>
                                    )}
                                </p>
                            </div>

                            {/* OTP Inputs */}
                            <div className="flex justify-center gap-3 mb-5">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={el => { inputRefs.current[index] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleChange(index, e.target.value)}
                                        onKeyDown={e => handleKeyDown(index, e)}
                                        onPaste={handlePaste}
                                        disabled={loading || sending}
                                        className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all
                                            bg-white/5 text-white caret-blue-400
                                            ${digit ? 'border-blue-500 bg-blue-500/10' : 'border-white/10'}
                                            ${error ? 'border-red-500/60 bg-red-500/5' : ''}
                                            focus:border-blue-400 focus:bg-blue-500/10 focus:ring-4 focus:ring-blue-500/10
                                            disabled:opacity-50`}
                                    />
                                ))}
                            </div>

                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="mb-4 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5"
                                    >
                                        <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-400 font-medium leading-tight">{error}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Verify Button */}
                            <button
                                onClick={handleVerify}
                                disabled={!isComplete || loading || sending}
                                className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2
                                    bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25
                                    disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                                    active:scale-[0.98]"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Verify & Continue'
                                )}
                            </button>

                            {/* Resend */}
                            <div className="flex items-center justify-between mt-4">
                                <button
                                    onClick={() => { sendOTP(); setOtp(['', '', '', '']); setError(null); }}
                                    disabled={timer > 0 || sending || loading}
                                    className="text-[12px] font-semibold text-neutral-500 hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                                >
                                    <RefreshCw size={11} className={sending ? 'animate-spin' : ''} />
                                    {timer > 0 ? `Resend in ${timer}s` : 'Resend Code'}
                                </button>

                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="text-[12px] font-semibold text-neutral-600 hover:text-neutral-400 disabled:opacity-40 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>

                        {/* Help / Info Section */}
                        <div className="border-t border-white/5">
                            <button
                                onClick={() => setShowHelp(h => !h)}
                                className="w-full flex items-center justify-between px-5 py-3 text-[12px] text-neutral-500 hover:text-neutral-300 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Info size={12} />
                                    Email not received?
                                </span>
                                {showHelp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>

                            <AnimatePresence>
                                {showHelp && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-5 pb-5 space-y-3">
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="text-[9px] font-bold text-amber-400">1</span>
                                                </div>
                                                <p className="text-[11px] text-neutral-500 leading-relaxed">
                                                    <span className="text-neutral-300 font-semibold">Check your Spam/Junk folder.</span> Gmail and other providers sometimes move automated emails to spam.
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="text-[9px] font-bold text-amber-400">2</span>
                                                </div>
                                                <p className="text-[11px] text-neutral-500 leading-relaxed">
                                                    <span className="text-neutral-300 font-semibold">Wait 1–2 minutes.</span> Email delivery can sometimes be delayed, especially on first send.
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="text-[9px] font-bold text-amber-400">3</span>
                                                </div>
                                                <p className="text-[11px] text-neutral-500 leading-relaxed">
                                                    <span className="text-neutral-300 font-semibold">Search for "Al-Ghazali Security"</span> in your inbox. The email is sent from the school's official SMTP account.
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-5 h-5 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Mail size={9} className="text-blue-400" />
                                                </div>
                                                <p className="text-[11px] text-neutral-500 leading-relaxed">
                                                    If issues persist, ask your IT admin to verify that <span className="text-neutral-300 font-semibold">Gmail App Password</span> is correctly set in the server environment variables (<code className="text-blue-400 text-[10px]">EMAIL_PASSWORD</code>).
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default OTPVerificationModal;

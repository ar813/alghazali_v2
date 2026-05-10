import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, X, RefreshCw, AlertCircle } from 'lucide-react';
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
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [timer, setTimer] = useState(60);
    const [error, setError] = useState<string | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (isOpen) {
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

    const sendOTP = async () => {
        setSending(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/otp?action=send', {
                method: 'POST',
                body: JSON.stringify({ email, userId, actionName }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);
            toast.success('Verification code sent to your email');
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message || 'Failed to send code');
        } finally {
            setSending(false);
        }
    };

    const handleVerify = async () => {
        const fullOtp = otp.join('');
        if (fullOtp.length < 6) return;

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
            setError(err.message);
            toast.error(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;
        
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        // Move to next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
        const newOtp = [...otp];
        pastedData.forEach((char, i) => {
            if (!isNaN(Number(char))) newOtp[i] = char;
        });
        setOtp(newOtp);
        inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-white dark:bg-neutral-950 rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 dark:border-neutral-900"
                >
                    <div className="p-8">
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4 text-blue-600">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2 uppercase tracking-tight">Email Verification</h3>
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                                Enter the 6-digit code sent to <br />
                                <span className="font-bold text-neutral-900 dark:text-white">{email}</span>
                            </p>
                        </div>

                        <div className="flex justify-between gap-2 mb-8">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => { inputRefs.current[index] = el }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleChange(index, e.target.value)}
                                    onKeyDown={e => handleKeyDown(index, e)}
                                    onPaste={handlePaste}
                                    className="w-12 h-14 text-center text-2xl font-black bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-800 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-neutral-900 dark:text-white"
                                />
                            ))}
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center gap-3 text-red-600 border border-red-100 dark:border-red-900/30">
                                <AlertCircle size={18} className="flex-shrink-0" />
                                <p className="text-xs font-bold leading-tight">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <button
                                onClick={handleVerify}
                                disabled={loading || otp.some(d => !d)}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-wider text-sm shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Verify & Continue'
                                )}
                            </button>

                            <div className="text-center">
                                <button
                                    onClick={sendOTP}
                                    disabled={timer > 0 || sending}
                                    className="text-[12px] font-bold text-neutral-400 hover:text-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
                                >
                                    {sending ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                    {timer > 0 ? `Resend code in ${timer}s` : 'Resend Code'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default OTPVerificationModal;

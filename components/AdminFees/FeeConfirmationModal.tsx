import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeeConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: React.ReactNode;
    loading?: boolean;
}

const FeeConfirmationModal: React.FC<FeeConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    loading = false,
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-white shadow-2xl overflow-hidden border border-gray-100 rounded"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-red-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 text-red-600 rounded">
                                <AlertTriangle size={20} className="stroke-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <div className="text-gray-600 text-sm leading-relaxed">
                            {description}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end border-t border-gray-100">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 transition-colors text-sm rounded border border-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`px-5 py-2.5 text-white font-medium shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2 bg-red-600 hover:bg-red-700 rounded`}
                        >
                            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded animate-spin" />}
                            {loading ? 'Deleting...' : 'Confirm'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default FeeConfirmationModal;

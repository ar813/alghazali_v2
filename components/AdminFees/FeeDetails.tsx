"use client";

import React from 'react';
import { X, User, BookOpen, CreditCard, Info } from 'lucide-react';

interface FeeDetailsProps {
    fee: any;
    onClose: () => void;
}

const FeeDetails = ({ fee, onClose }: FeeDetailsProps) => {
    if (!fee) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex justify-end">
            <div className="w-full max-w-md bg-white dark:bg-zinc-950 h-full shadow-2xl border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Transaction Details</h2>
                        <p className="text-xs text-zinc-500 font-mono mt-1">ID: {fee._id.slice(-8)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors">
                        <X size={20} className="text-zinc-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-80px)]">

                    {/* Amount Hero */}
                    <div className="text-center py-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 border-dashed">
                        <div className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                            Rs. {Number(fee.amountPaid ?? 0).toLocaleString()}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mt-1">Amount Paid</div>
                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-3 ${
                            fee.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            fee.status === 'partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                            {fee.status.toUpperCase()}
                        </div>
                    </div>

                    {/* Student Info */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <User size={14} /> Student Information
                        </h3>
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-sm">
                            <div className="flex justify-between">
                                <span className="text-sm text-zinc-500">Name</span>
                                <span className="text-sm font-semibold text-zinc-900 dark:text-white">{fee.student?.fullName || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-zinc-500">Class</span>
                                <span className="text-sm font-semibold text-zinc-900 dark:text-white">{fee.className || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-zinc-500">Roll Number</span>
                                <span className="text-sm font-mono font-medium text-zinc-900 dark:text-white">{fee.student?.rollNumber || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-zinc-500">GR Number</span>
                                <span className="text-sm font-mono font-medium text-zinc-900 dark:text-white">{fee.student?.grNumber || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Fee Breakdown */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <CreditCard size={14} /> Fee Breakdown
                        </h3>
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-sm">
                            <div className="flex justify-between">
                                <span className="text-sm text-zinc-500 flex items-center gap-1">
                                    Total Fee
                                    <span className="relative group/tip cursor-help">
                                        <Info size={12} className="text-zinc-400" />
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-zinc-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">Total amount to be paid this month</span>
                                    </span>
                                </span>
                                <span className="text-sm font-bold text-zinc-900 dark:text-white">Rs. {Number(fee.payableAmount ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800">
                                <span className="text-zinc-500 flex items-center gap-1">
                                    Discount
                                    <span className="relative group/tip cursor-help">
                                        <Info size={10} className="text-zinc-400" />
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-zinc-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">Special discount or fee waiver given</span>
                                    </span>
                                </span>
                                <span className="text-emerald-600 dark:text-emerald-500 font-semibold">- Rs. {Number(fee.concession ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-500 flex items-center gap-1">
                                    Previous Dues
                                    <span className="relative group/tip cursor-help">
                                        <Info size={10} className="text-zinc-400" />
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-zinc-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">Unpaid amount from previous months</span>
                                    </span>
                                </span>
                                <span className="text-orange-500 font-semibold">+ Rs. {Number(fee.arrears ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-500 flex items-center gap-1">
                                    Late Charges
                                    <span className="relative group/tip cursor-help">
                                        <Info size={10} className="text-zinc-400" />
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-zinc-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">Extra charge for paying after due date</span>
                                    </span>
                                </span>
                                <span className="text-red-500 font-semibold">+ Rs. {Number(fee.lateFine ?? 0).toLocaleString()}</span>
                            </div>
                            {fee.dueDate && (
                                <div className="flex justify-between text-xs pt-2.5 border-t border-dashed border-zinc-150 dark:border-zinc-800">
                                    <span className="text-zinc-500">Due Date</span>
                                    <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">{fee.dueDate}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Details */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <CreditCard size={14} /> Payment Info
                        </h3>
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-sm">
                            <div className="flex justify-between">
                                <span className="text-sm text-zinc-500">For Month</span>
                                <span className="text-sm font-semibold text-zinc-900 dark:text-white">{fee.month} {fee.year}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-zinc-500">Paid Date</span>
                                <span className="text-sm font-mono font-medium text-zinc-900 dark:text-white">{fee.paidDate || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-zinc-500">Receipt No.</span>
                                <span className="text-sm font-mono font-medium text-zinc-900 dark:text-white">{fee.receiptNumber || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-zinc-500">Book No.</span>
                                <span className="text-sm font-mono font-medium text-zinc-900 dark:text-white">{fee.bookNumber || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {fee.notes && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <BookOpen size={14} /> Notes
                            </h3>
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl text-sm text-zinc-600 dark:text-zinc-450 italic">
                                "{fee.notes}"
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default FeeDetails;

"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { 
    Search, ChevronLeft, MessageSquare, Eye, Trash2, CheckCircle, Clock, AlertCircle, User, Mail, Phone, Reply, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import AccessDeniedDialog from '@/components/Auth/AccessDeniedDialog';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminInquiriesPage() {
    const { role, isSuperAdmin, loading: authLoading } = useAuth();
    const isAdmin = role === "admin" || role === "super_admin";
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAccessDenied, setShowAccessDenied] = useState(false);
    
    // View Details Modal
    const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Delete Alert
    const [deleteInquiryId, setDeleteInquiryId] = useState<string | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!isAdmin) {
            setShowAccessDenied(true);
            return;
        }

        const q = query(collection(db, 'contact_inquiries'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setInquiries(data);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching inquiries:", err);
            toast.error("Failed to load inquiries");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authLoading, isAdmin]);

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, 'contact_inquiries', id), {
                status: newStatus,
                updatedAt: new Date()
            });
            toast.success(`Marked as ${newStatus}`);
            if (selectedInquiry && selectedInquiry.id === id) {
                setSelectedInquiry({ ...selectedInquiry, status: newStatus });
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async () => {
        if (!deleteInquiryId) return;
        try {
            await deleteDoc(doc(db, 'contact_inquiries', deleteInquiryId));
            toast.success("Inquiry deleted successfully");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete inquiry");
        } finally {
            setDeleteOpen(false);
            setDeleteInquiryId(null);
        }
    };

    const filteredInquiries = inquiries.filter(item => 
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusConfig = (status: string) => {
        switch(status) {
            case 'unread': 
            case 'pending':
                return { icon: <Clock size={14} />, color: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800', label: 'Unread' };
            case 'read': return { icon: <CheckCircle size={14} />, color: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800', label: 'Read' };
            case 'replied': return { icon: <Reply size={14} />, color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800', label: 'Replied' };
            default: return { icon: <AlertCircle size={14} />, color: 'text-neutral-700 bg-neutral-50 border-neutral-200 dark:text-neutral-400 dark:bg-neutral-900/20 dark:border-neutral-800', label: status || 'Unknown' };
        }
    };

    const openInquiryDetails = async (inquiry: any) => {
        setSelectedInquiry(inquiry);
        setDetailsOpen(true);
        // Automatically mark as read if it was unread/pending
        if (inquiry.status === 'unread' || inquiry.status === 'pending' || !inquiry.status) {
            handleUpdateStatus(inquiry.id, 'read');
        }
    };

    if (showAccessDenied) {
        return <AccessDeniedDialog open={showAccessDenied} onOpenChange={setShowAccessDenied} />;
    }

    return (
        <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-emerald-500/30">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors">
                            <ChevronLeft size={20} />
                        </Link>
                        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-1"></div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <MessageSquare size={18} />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold tracking-tight">Contact Inquiries</h1>
                                <p className="text-[10px] text-neutral-500 font-medium">Manage messages</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="relative hidden md:block w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-9 pl-9 pr-4 bg-neutral-100 dark:bg-neutral-900 border-none rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-neutral-400"
                        />
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Mobile Search */}
                <div className="relative md:hidden mb-6">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                    />
                </div>

                <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800 text-[10px] uppercase tracking-widest text-neutral-500 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Sender</th>
                                    <th className="px-6 py-4">Subject</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
                                                <p className="text-sm font-medium text-neutral-500">Loading messages...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredInquiries.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-200 dark:border-neutral-800">
                                                <MessageSquare size={24} className="text-neutral-400" />
                                            </div>
                                            <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">No inquiries found</p>
                                            <p className="text-sm text-neutral-500 mt-1">Try adjusting your search criteria</p>
                                        </td>
                                    </tr>
                                ) : (
                                    <AnimatePresence>
                                        {filteredInquiries.map((inquiry, index) => {
                                            const statusConf = getStatusConfig(inquiry.status || 'unread');
                                            const date = inquiry.createdAt?.toDate ? inquiry.createdAt.toDate() : new Date();
                                            const isUnread = (inquiry.status || 'unread') === 'unread';
                                            
                                            return (
                                                <motion.tr 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    key={inquiry.id} 
                                                    onClick={() => openInquiryDetails(inquiry)}
                                                    className={cn(
                                                        "hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors group cursor-pointer",
                                                        isUnread ? "bg-emerald-50/30 dark:bg-emerald-900/10" : ""
                                                    )}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-100 dark:border-emerald-800/50">
                                                                {inquiry.name?.charAt(0).toUpperCase() || '?'}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className={cn("font-bold", isUnread ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300")}>{inquiry.name}</span>
                                                                <span className="text-[10px] font-medium text-neutral-500 flex items-center gap-1 mt-0.5"><Mail size={10} /> {inquiry.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 max-w-[200px]">
                                                        <span className={cn("truncate block", isUnread ? "font-bold text-neutral-900 dark:text-white" : "font-medium text-neutral-600 dark:text-neutral-400")}>
                                                            {inquiry.subject}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className={cn("text-xs", isUnread ? "font-bold text-neutral-900 dark:text-neutral-100" : "font-medium text-neutral-600 dark:text-neutral-400")}>
                                                                {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-neutral-500">{date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", statusConf.color)}>
                                                            {statusConf.icon}
                                                            {statusConf.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); openInquiryDetails(inquiry); }}
                                                                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800/50"
                                                                title="Read Message"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            {isSuperAdmin && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setDeleteInquiryId(inquiry.id); setDeleteOpen(true); }}
                                                                    className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-800/50"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* View Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-[600px] bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-2xl p-0 overflow-hidden flex flex-col rounded-2xl">
                    {selectedInquiry && (
                        <>
                            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                <div className="relative z-10">
                                    <DialogTitle className="text-xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/50">
                                            <MessageSquare size={20} strokeWidth={2} />
                                        </div>
                                        Message Details
                                    </DialogTitle>
                                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-2">Received: {selectedInquiry.createdAt?.toDate?.().toLocaleString()}</p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger className={cn(
                                        "relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 outline-none shadow-sm",
                                        getStatusConfig(selectedInquiry.status || 'unread').color
                                    )}>
                                        {getStatusConfig(selectedInquiry.status || 'unread').icon}
                                        {getStatusConfig(selectedInquiry.status || 'unread').label}
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 font-bold text-xs rounded-xl">
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedInquiry.id, 'unread')} className="gap-2 focus:bg-amber-50 text-amber-700 dark:focus:bg-amber-900/20 dark:text-amber-400 rounded-lg cursor-pointer">
                                            <Clock size={14} /> Mark Unread
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedInquiry.id, 'read')} className="gap-2 focus:bg-blue-50 text-blue-700 dark:focus:bg-blue-900/20 dark:text-blue-400 rounded-lg cursor-pointer">
                                            <CheckCircle size={14} /> Mark Read
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedInquiry.id, 'replied')} className="gap-2 focus:bg-emerald-50 text-emerald-700 dark:focus:bg-emerald-900/20 dark:text-emerald-400 rounded-lg cursor-pointer">
                                            <Reply size={14} /> Mark Replied
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            
                            <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-8 bg-white dark:bg-black">
                                {/* Sender Info */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500 tracking-widest flex items-center gap-2">
                                        <User size={14} /> Sender Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 bg-neutral-50 dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Full Name</p>
                                            <p className="font-bold text-sm text-neutral-900 dark:text-white">{selectedInquiry.name}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Email</p>
                                            <a href={`mailto:${selectedInquiry.email}`} className="font-bold text-sm text-emerald-600 hover:text-emerald-700 hover:underline">{selectedInquiry.email}</a>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Phone Number</p>
                                            {selectedInquiry.phone ? (
                                                <a href={`tel:${selectedInquiry.phone}`} className="font-bold text-sm text-emerald-600 hover:text-emerald-700 hover:underline">{selectedInquiry.phone}</a>
                                            ) : (
                                                <p className="font-bold text-sm text-neutral-900 dark:text-white">—</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Subject</p>
                                            <p className="font-bold text-sm text-neutral-900 dark:text-white truncate">{selectedInquiry.subject}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Message */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500 tracking-widest flex items-center gap-2">
                                        <MessageSquare size={14} /> Message Content
                                    </h3>
                                    <div className="bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                                            {selectedInquiry.message}
                                        </p>
                                    </div>
                                    
                                    <div className="flex justify-end pt-4">
                                        <a 
                                            href={`mailto:${selectedInquiry.email}?subject=Re: ${selectedInquiry.subject}`}
                                            className="inline-flex items-center justify-center gap-2 px-6 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                                            onClick={() => {
                                                if (selectedInquiry.status !== 'replied') {
                                                    handleUpdateStatus(selectedInquiry.id, 'replied');
                                                }
                                            }}
                                        >
                                            <Reply size={16} />
                                            Reply via Email
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Alert */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-0 overflow-hidden">
                    <div className="bg-red-50 dark:bg-red-950/30 p-6 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle size={32} />
                        </div>
                        <AlertDialogTitle className="text-xl font-black text-red-600 dark:text-red-500 mb-2">Delete Inquiry?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                            Are you sure you want to permanently delete this message? This action cannot be undone.
                        </AlertDialogDescription>
                    </div>
                    <AlertDialogFooter className="p-4 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800">
                        <AlertDialogCancel className="h-10 px-6 rounded-xl border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="h-10 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold border-transparent">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

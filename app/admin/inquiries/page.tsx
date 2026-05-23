"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { 
    Search, ChevronLeft, MessageSquare, Eye, Trash2, CheckCircle, Clock, AlertCircle, User, Mail, Phone, MapPin, Reply
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import AccessDeniedDialog from '@/components/Auth/AccessDeniedDialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
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
    }, [isAdmin]);

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
                return { icon: <Clock size={14} />, color: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Unread' };
            case 'read': return { icon: <CheckCircle size={14} />, color: 'text-blue-700 bg-blue-50 border-blue-200', label: 'Read' };
            case 'replied': return { icon: <Reply size={14} />, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Replied' };
            default: return { icon: <AlertCircle size={14} />, color: 'text-neutral-700 bg-neutral-50 border-neutral-200', label: status || 'Unknown' };
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
        <div className="min-h-screen bg-neutral-50/50 dark:bg-black text-neutral-900 dark:text-neutral-100 font-sans">
            {/* Header */}
            <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-black/50 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500">
                            <ChevronLeft size={20} />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">Contact Inquiries</h1>
                                <p className="text-xs text-neutral-500 font-medium">Manage messages from the contact form</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="relative hidden md:block w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search inquiries..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-9 pl-9 pr-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
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
                        placeholder="Search inquiries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider text-neutral-500 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Sender</th>
                                    <th className="px-6 py-4">Subject</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                                <p>Loading inquiries...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredInquiries.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center text-neutral-400">
                                            <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                                            <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300">No inquiries found</p>
                                            <p className="text-sm mt-1">Try adjusting your search criteria</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInquiries.map((inquiry) => {
                                        const statusConf = getStatusConfig(inquiry.status || 'unread');
                                        const date = inquiry.createdAt?.toDate ? inquiry.createdAt.toDate() : new Date();
                                        
                                        return (
                                            <tr key={inquiry.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group cursor-pointer" onClick={() => openInquiryDetails(inquiry)}>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-neutral-900 dark:text-white">{inquiry.name}</span>
                                                        <span className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5"><Mail size={10} /> {inquiry.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-[200px] truncate">
                                                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{inquiry.subject}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-neutral-700 dark:text-neutral-300 font-medium">{date.toLocaleDateString()}</span>
                                                        <span className="text-[10px] text-neutral-400">{date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border", statusConf.color)}>
                                                        {statusConf.icon}
                                                        {statusConf.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); openInquiryDetails(inquiry); }}
                                                            className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                                                            title="Read Message"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        {isSuperAdmin && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setDeleteInquiryId(inquiry.id); setDeleteOpen(true); }}
                                                                className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* View Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-[600px] bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                    {selectedInquiry && (
                        <>
                            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
                                <div>
                                    <DialogTitle className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                                        <MessageSquare className="text-emerald-500" />
                                        Inquiry Details
                                    </DialogTitle>
                                    <p className="text-xs text-neutral-500 font-medium mt-1">Received on {selectedInquiry.createdAt?.toDate?.().toLocaleString()}</p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:opacity-80 outline-none focus:ring-2 focus:ring-offset-2",
                                        getStatusConfig(selectedInquiry.status || 'unread').color
                                    )}>
                                        {getStatusConfig(selectedInquiry.status || 'unread').icon}
                                        {getStatusConfig(selectedInquiry.status || 'unread').label}
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 font-medium text-xs">
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedInquiry.id, 'unread')} className="gap-2 focus:bg-amber-50 text-amber-700">
                                            <Clock size={14} /> Mark Unread
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedInquiry.id, 'read')} className="gap-2 focus:bg-blue-50 text-blue-700">
                                            <CheckCircle size={14} /> Mark Read
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedInquiry.id, 'replied')} className="gap-2 focus:bg-emerald-50 text-emerald-700">
                                            <Reply size={14} /> Mark Replied
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            
                            <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                                {/* Sender Info */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                                        <User size={12} /> Sender Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Full Name</p>
                                            <p className="font-semibold text-sm text-neutral-900 dark:text-white">{selectedInquiry.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Email</p>
                                            <a href={`mailto:${selectedInquiry.email}`} className="font-semibold text-sm text-emerald-600 hover:underline">{selectedInquiry.email}</a>
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Phone Number</p>
                                            <a href={`tel:${selectedInquiry.phone}`} className="font-semibold text-sm text-emerald-600 hover:underline">{selectedInquiry.phone || '—'}</a>
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Subject</p>
                                            <p className="font-semibold text-sm text-neutral-900 dark:text-white">{selectedInquiry.subject}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Message */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                                        <MessageSquare size={12} /> Message Content
                                    </h3>
                                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 sm:p-6 rounded-xl border border-neutral-100 dark:border-neutral-800">
                                        <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                                            {selectedInquiry.message}
                                        </p>
                                    </div>
                                    
                                    <div className="flex justify-end pt-4">
                                        <a 
                                            href={`mailto:${selectedInquiry.email}?subject=Re: ${selectedInquiry.subject}`}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-500/20 transition-colors"
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
                <AlertDialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle size={20} />
                            Delete Inquiry?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-neutral-500">
                            Are you sure you want to permanently delete this message? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white border-transparent">
                            Delete Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

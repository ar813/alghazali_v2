"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { 
    Search, ChevronLeft, GraduationCap, Eye, Trash2, CheckCircle, XCircle, Clock, CalendarDays, User, Mail, Phone, MapPin, AlertCircle, Loader2, ArrowRight
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

export default function AdminAdmissionsPage() {
    const { role, isSuperAdmin, loading: authLoading } = useAuth();
    const isAdmin = role === "admin" || role === "super_admin";
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAccessDenied, setShowAccessDenied] = useState(false);
    
    // View Details Modal
    const [selectedApp, setSelectedApp] = useState<any | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Delete Alert
    const [deleteAppId, setDeleteAppId] = useState<string | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!isAdmin) {
            setShowAccessDenied(true);
            return;
        }

        const q = query(collection(db, 'admission_applications'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const appsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setApplications(appsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching applications:", err);
            toast.error("Failed to load admission applications");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authLoading, isAdmin]);

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, 'admission_applications', id), {
                status: newStatus,
                updatedAt: new Date()
            });
            toast.success(`Status updated to ${newStatus}`);
            if (selectedApp && selectedApp.id === id) {
                setSelectedApp({ ...selectedApp, status: newStatus });
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async () => {
        if (!deleteAppId) return;
        try {
            await deleteDoc(doc(db, 'admission_applications', deleteAppId));
            toast.success("Application deleted successfully");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete application");
        } finally {
            setDeleteOpen(false);
            setDeleteAppId(null);
        }
    };

    const filteredApps = applications.filter(app => 
        app.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.applyingForClass?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.phone?.includes(searchQuery)
    );

    const getStatusConfig = (status: string) => {
        switch(status) {
            case 'pending': return { icon: <Clock size={14} />, color: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800', label: 'Pending' };
            case 'under_review': return { icon: <Search size={14} />, color: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800', label: 'Under Review' };
            case 'approved': return { icon: <CheckCircle size={14} />, color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800', label: 'Approved' };
            case 'rejected': return { icon: <XCircle size={14} />, color: 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800', label: 'Rejected' };
            default: return { icon: <AlertCircle size={14} />, color: 'text-neutral-700 bg-neutral-50 border-neutral-200 dark:text-neutral-400 dark:bg-neutral-900/20 dark:border-neutral-800', label: status || 'Unknown' };
        }
    };

    if (showAccessDenied) {
        return <AccessDeniedDialog open={showAccessDenied} onOpenChange={setShowAccessDenied} />;
    }

    return (
        <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-blue-500/30">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors">
                            <ChevronLeft size={20} />
                        </Link>
                        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-1"></div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <GraduationCap size={18} />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold tracking-tight">Admission Requests</h1>
                                <p className="text-[10px] text-neutral-500 font-medium">Manage student applications</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="relative hidden md:block w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search applicants..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-9 pl-9 pr-4 bg-neutral-100 dark:bg-neutral-900 border-none rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-neutral-400"
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
                        placeholder="Search applicants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    />
                </div>

                <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800 text-[10px] uppercase tracking-widest text-neutral-500 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Applicant</th>
                                    <th className="px-6 py-4">Applied Class</th>
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
                                                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                                                <p className="text-sm font-medium text-neutral-500">Loading applications...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredApps.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-200 dark:border-neutral-800">
                                                <GraduationCap size={24} className="text-neutral-400" />
                                            </div>
                                            <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">No applications found</p>
                                            <p className="text-sm text-neutral-500 mt-1">Try adjusting your search criteria</p>
                                        </td>
                                    </tr>
                                ) : (
                                    <AnimatePresence>
                                        {filteredApps.map((app, index) => {
                                            const statusConf = getStatusConfig(app.status);
                                            const date = app.createdAt?.toDate ? app.createdAt.toDate() : new Date();
                                            
                                            return (
                                                <motion.tr 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    key={app.id} 
                                                    className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors group"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-100 dark:border-blue-800/50">
                                                                {app.studentName?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-neutral-900 dark:text-white">{app.studentName}</span>
                                                                <span className="text-[10px] font-medium text-neutral-500 flex items-center gap-1 mt-0.5"><Phone size={10} /> {app.phone}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                                                            Class {app.applyingForClass}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-neutral-900 dark:text-neutral-100 font-semibold text-xs">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
                                                                onClick={() => { setSelectedApp(app); setDetailsOpen(true); }}
                                                                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-800/50"
                                                                title="View Details"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            {isSuperAdmin && (
                                                                <button 
                                                                    onClick={() => { setDeleteAppId(app.id); setDeleteOpen(true); }}
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
                    {selectedApp && (
                        <>
                            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                <div className="relative z-10">
                                    <DialogTitle className="text-xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/50">
                                            <GraduationCap size={20} strokeWidth={2} />
                                        </div>
                                        Application Details
                                    </DialogTitle>
                                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-2">Submitted: {selectedApp.createdAt?.toDate?.().toLocaleString()}</p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger className={cn(
                                        "relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 outline-none shadow-sm",
                                        getStatusConfig(selectedApp.status).color
                                    )}>
                                        {getStatusConfig(selectedApp.status).icon}
                                        {getStatusConfig(selectedApp.status).label}
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 font-bold text-xs rounded-xl">
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedApp.id, 'pending')} className="gap-2 focus:bg-amber-50 text-amber-700 dark:focus:bg-amber-900/20 dark:text-amber-400 rounded-lg cursor-pointer">
                                            <Clock size={14} /> Pending
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedApp.id, 'under_review')} className="gap-2 focus:bg-blue-50 text-blue-700 dark:focus:bg-blue-900/20 dark:text-blue-400 rounded-lg cursor-pointer">
                                            <Search size={14} /> Under Review
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedApp.id, 'approved')} className="gap-2 focus:bg-emerald-50 text-emerald-700 dark:focus:bg-emerald-900/20 dark:text-emerald-400 rounded-lg cursor-pointer">
                                            <CheckCircle size={14} /> Approve
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')} className="gap-2 focus:bg-red-50 text-red-700 dark:focus:bg-red-900/20 dark:text-red-400 rounded-lg cursor-pointer">
                                            <XCircle size={14} /> Reject
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            
                            <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-8 bg-white dark:bg-black">
                                {/* Student Info */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-500 tracking-widest flex items-center gap-2">
                                        <User size={14} /> Student Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 bg-neutral-50 dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Full Name</p>
                                            <p className="font-bold text-sm text-neutral-900 dark:text-white">{selectedApp.studentName}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Applying For</p>
                                            <p className="font-bold text-sm text-neutral-900 dark:text-white">Class {selectedApp.applyingForClass}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Date of Birth</p>
                                            <p className="font-bold text-sm text-neutral-900 dark:text-white">{selectedApp.dateOfBirth}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Gender</p>
                                            <p className="font-bold text-sm text-neutral-900 dark:text-white capitalize">{selectedApp.gender}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Parent Info */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-500 tracking-widest flex items-center gap-2">
                                        <Phone size={14} /> Parent Details
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 bg-neutral-50 dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Father's Name</p>
                                            <p className="font-bold text-sm text-neutral-900 dark:text-white">{selectedApp.fatherName}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Mother's Name</p>
                                            <p className="font-bold text-sm text-neutral-900 dark:text-white">{selectedApp.motherName || '—'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Phone Number</p>
                                            <p className="font-bold text-sm text-neutral-900 dark:text-white">{selectedApp.phone}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Email</p>
                                            <p className="font-bold text-sm text-neutral-900 dark:text-white">{selectedApp.email || '—'}</p>
                                        </div>
                                        <div className="col-span-2 space-y-1 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Address</p>
                                            <p className="font-bold text-sm text-neutral-900 dark:text-white">{selectedApp.address || '—'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Info */}
                                {(selectedApp.previousSchool || selectedApp.additionalNotes) && (
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-500 tracking-widest flex items-center gap-2">
                                            <CalendarDays size={14} /> Background
                                        </h3>
                                        <div className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                {selectedApp.previousSchool && (
                                                    <div className="col-span-2 sm:col-span-1 space-y-1">
                                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Previous School</p>
                                                        <p className="font-bold text-sm text-neutral-900 dark:text-white">{selectedApp.previousSchool}</p>
                                                    </div>
                                                )}
                                                {selectedApp.previousClass && (
                                                    <div className="col-span-2 sm:col-span-1 space-y-1">
                                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Last Class</p>
                                                        <p className="font-bold text-sm text-neutral-900 dark:text-white">{selectedApp.previousClass}</p>
                                                    </div>
                                                )}
                                                {selectedApp.reasonForLeaving && (
                                                    <div className="col-span-2 space-y-1">
                                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Reason for Leaving</p>
                                                        <p className="font-bold text-sm text-neutral-900 dark:text-white">{selectedApp.reasonForLeaving}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {selectedApp.additionalNotes && (
                                                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
                                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Notes</p>
                                                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-black p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 leading-relaxed">
                                                        {selectedApp.additionalNotes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
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
                        <AlertDialogTitle className="text-xl font-black text-red-600 dark:text-red-500 mb-2">Delete Application?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                            Are you sure you want to permanently delete this application? This action cannot be undone.
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

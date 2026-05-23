"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { 
    Search, ChevronLeft, GraduationCap, Eye, Trash2, CheckCircle, XCircle, Clock, CalendarDays, User, Mail, Phone, MapPin, AlertCircle
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
    }, [isAdmin]);

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
            case 'pending': return { icon: <Clock size={14} />, color: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Pending' };
            case 'under_review': return { icon: <Search size={14} />, color: 'text-blue-700 bg-blue-50 border-blue-200', label: 'Under Review' };
            case 'approved': return { icon: <CheckCircle size={14} />, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Approved' };
            case 'rejected': return { icon: <XCircle size={14} />, color: 'text-red-700 bg-red-50 border-red-200', label: 'Rejected' };
            default: return { icon: <AlertCircle size={14} />, color: 'text-neutral-700 bg-neutral-50 border-neutral-200', label: status || 'Unknown' };
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
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                <GraduationCap size={20} />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">Admission Requests</h1>
                                <p className="text-xs text-neutral-500 font-medium">Manage incoming student applications</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="relative hidden md:block w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search applicants..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-9 pl-9 pr-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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
                        className="w-full h-10 pl-9 pr-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider text-neutral-500 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Applicant</th>
                                    <th className="px-6 py-4">Applied Class</th>
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
                                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                                <p>Loading applications...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredApps.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center text-neutral-400">
                                            <GraduationCap size={48} className="mx-auto mb-4 opacity-20" />
                                            <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300">No applications found</p>
                                            <p className="text-sm mt-1">Try adjusting your search criteria</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredApps.map((app) => {
                                        const statusConf = getStatusConfig(app.status);
                                        const date = app.createdAt?.toDate ? app.createdAt.toDate() : new Date();
                                        
                                        return (
                                            <tr key={app.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-neutral-900 dark:text-white">{app.studentName}</span>
                                                        <span className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5"><Phone size={10} /> {app.phone}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                                                        Class {app.applyingForClass}
                                                    </span>
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
                                                            onClick={() => { setSelectedApp(app); setDetailsOpen(true); }}
                                                            className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                                            title="View Details"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        {isSuperAdmin && (
                                                            <button 
                                                                onClick={() => { setDeleteAppId(app.id); setDeleteOpen(true); }}
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
                    {selectedApp && (
                        <>
                            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
                                <div>
                                    <DialogTitle className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                                        <GraduationCap className="text-blue-500" />
                                        Application Details
                                    </DialogTitle>
                                    <p className="text-xs text-neutral-500 font-medium mt-1">Submitted on {selectedApp.createdAt?.toDate?.().toLocaleString()}</p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:opacity-80 outline-none focus:ring-2 focus:ring-offset-2",
                                        getStatusConfig(selectedApp.status).color
                                    )}>
                                        {getStatusConfig(selectedApp.status).icon}
                                        {getStatusConfig(selectedApp.status).label}
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 font-medium text-xs">
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedApp.id, 'pending')} className="gap-2 focus:bg-amber-50 text-amber-700">
                                            <Clock size={14} /> Mark Pending
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedApp.id, 'under_review')} className="gap-2 focus:bg-blue-50 text-blue-700">
                                            <Search size={14} /> Under Review
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedApp.id, 'approved')} className="gap-2 focus:bg-emerald-50 text-emerald-700">
                                            <CheckCircle size={14} /> Approve
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')} className="gap-2 focus:bg-red-50 text-red-700">
                                            <XCircle size={14} /> Reject
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            
                            <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                                {/* Student Info */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                                        <User size={12} /> Student Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Full Name</p>
                                            <p className="font-semibold text-sm text-neutral-900 dark:text-white">{selectedApp.studentName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Applying For</p>
                                            <p className="font-semibold text-sm text-neutral-900 dark:text-white">Class {selectedApp.applyingForClass}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Date of Birth</p>
                                            <p className="font-semibold text-sm text-neutral-900 dark:text-white">{selectedApp.dateOfBirth}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Gender</p>
                                            <p className="font-semibold text-sm text-neutral-900 dark:text-white capitalize">{selectedApp.gender}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Parent Info */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                                        <Phone size={12} /> Parent / Guardian Details
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Father's Name</p>
                                            <p className="font-semibold text-sm text-neutral-900 dark:text-white">{selectedApp.fatherName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Mother's Name</p>
                                            <p className="font-semibold text-sm text-neutral-900 dark:text-white">{selectedApp.motherName || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Phone Number</p>
                                            <p className="font-semibold text-sm text-neutral-900 dark:text-white">{selectedApp.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Email</p>
                                            <p className="font-semibold text-sm text-neutral-900 dark:text-white">{selectedApp.email || '—'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-neutral-500 mb-1">Address</p>
                                            <p className="font-semibold text-sm text-neutral-900 dark:text-white">{selectedApp.address || '—'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Info */}
                                {(selectedApp.previousSchool || selectedApp.additionalNotes) && (
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                                            <CalendarDays size={12} /> Academic Background
                                        </h3>
                                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                {selectedApp.previousSchool && (
                                                    <div className="col-span-2 sm:col-span-1">
                                                        <p className="text-xs text-neutral-500 mb-1">Previous School</p>
                                                        <p className="font-semibold text-sm text-neutral-900 dark:text-white">{selectedApp.previousSchool}</p>
                                                    </div>
                                                )}
                                                {selectedApp.previousClass && (
                                                    <div className="col-span-2 sm:col-span-1">
                                                        <p className="text-xs text-neutral-500 mb-1">Last Class Attended</p>
                                                        <p className="font-semibold text-sm text-neutral-900 dark:text-white">{selectedApp.previousClass}</p>
                                                    </div>
                                                )}
                                                {selectedApp.reasonForLeaving && (
                                                    <div className="col-span-2">
                                                        <p className="text-xs text-neutral-500 mb-1">Reason for Leaving</p>
                                                        <p className="font-semibold text-sm text-neutral-900 dark:text-white">{selectedApp.reasonForLeaving}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {selectedApp.additionalNotes && (
                                                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                                                    <p className="text-xs text-neutral-500 mb-1">Additional Notes</p>
                                                    <p className="text-sm text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 leading-relaxed">
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
                <AlertDialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle size={20} />
                            Delete Application?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-neutral-500">
                            Are you sure you want to permanently delete this admission application? This action cannot be undone.
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

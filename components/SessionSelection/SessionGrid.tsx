"use client";

import React, { useState } from 'react';
import { useSession } from '@/context/SessionContext';
import {
    Folder,
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    FolderOpen,
    Loader2,
    AlertTriangle,
    Search,
    ChevronRight,
    LayoutGrid,
    List as ListIcon,
    LogOut,
    AlertCircle,
    CheckCircle2,
    X,
    Code,
    Copy,
    Database,
    CalendarClock,
    UserCog,
    Users as UsersIcon,
    User,
    Lock as LockIcon,
    GraduationCap,
    MessageSquare,
    Globe,
    Megaphone,
    Calendar,
    Bot,
    School,
    BookMarked,
    FileDigit,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from 'next/link';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
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
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AccessDeniedDialog from '@/components/Auth/AccessDeniedDialog';
import LogoutConfirmationDialog from "../Auth/LogoutConfirmationDialog";
import ProfileUpdateDialog from "../Auth/ProfileUpdateDialog";

export default function SessionGrid() {
    const { sessions, addSession, renameSession, deleteSession, isLoading, refreshSessions, isSessionLocked, toggleSessionLock } = useSession();
    const router = useRouter();
    const { user, logout, isSuperAdmin, gender, photoURL } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [clickedSession, setClickedSession] = useState<string | null>(null);
    const [showAccessDenied, setShowAccessDenied] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showProfileUpdate, setShowProfileUpdate] = useState(false);

    // UI View State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);

    // New Session Dialog
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');

    // State for Dialogs
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [sessionToRename, setSessionToRename] = useState<string | null>(null);
    const [newName, setNewName] = useState('');

    // Multi-Step Delete Confirmation
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
    const [deleteConfirmChecks, setDeleteConfirmChecks] = useState({
        students: false,
        fees: false,
        name: ''
    });

    const isDeleteDisabled = !deleteConfirmChecks.students ||
        !deleteConfirmChecks.fees ||
        deleteConfirmChecks.name !== sessionToDelete;

    // Master API Confirmation Dialog
    const [masterApiDialogOpen, setMasterApiDialogOpen] = useState(false);

    // Gender Selection Dialog
    const [genderDialogOpen, setGenderDialogOpen] = useState(false);
    const [selectedSessionForGender, setSelectedSessionForGender] = useState<string | null>(null);

    // OTP State removed — session delete uses multi-step confirmation only

    // Lock state
    const [showLockedDialog, setShowLockedDialog] = useState(false);
    const [lockedSessionName, setLockedSessionName] = useState<string | null>(null);

    // Sanity API Configuration
    const SANITY_PROJECT_ID = "3u9cr7x9";
    const SANITY_DATASET = "production";
    const SANITY_API_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${SANITY_DATASET}?query=`;

    const handleCopySessionAPI = (session: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isSuperAdmin) {
            setShowAccessDenied(true);
            return;
        }
        const groqQuery = encodeURIComponent(`*[_type == "student" && session == "${session}"]`);
        const fullUrl = `${SANITY_API_URL}${groqQuery}`;
        navigator.clipboard.writeText(fullUrl);
        toast.success(`${session} API copied!`);
    };

    const handleCopyMasterAPI = () => {
        if (!isSuperAdmin) {
            setShowAccessDenied(true);
            setMasterApiDialogOpen(false);
            return;
        }
        const groqQuery = encodeURIComponent(`*[]`);
        const fullUrl = `${SANITY_API_URL}${groqQuery}`;
        navigator.clipboard.writeText(fullUrl);
        toast.success("Master DB API copied!");
        setMasterApiDialogOpen(false);
    };

    const filteredSessions = sessions.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleSessionClick = (session: string) => {
        // Block access if session is locked and user is not super admin
        if (!isSuperAdmin && isSessionLocked(session)) {
            setLockedSessionName(session);
            setShowLockedDialog(true);
            return;
        }
        setClickedSession(session);
        setSelectedSessionForGender(session);
        setGenderDialogOpen(true);
        // Reset after dialog is likely visible
        setTimeout(() => setClickedSession(null), 800);
    };

    const handleGenderSelect = (selectedGender: 'male' | 'female') => {
        if (!selectedSessionForGender) return;

        // Check permissions
        if (!isSuperAdmin) {
            if (gender && gender !== selectedGender) {
                setShowAccessDenied(true);
                return;
            }
            if (!gender) {
                // If gender is not set in profile, we should probably tell them to set it
                toast.error("Please set your gender in profile settings first.");
                setShowProfileUpdate(true);
                return;
            }
        }

        setIsNavigating(true);
        router.push(`/admin/${selectedSessionForGender}?gender=${selectedGender}`);
        setGenderDialogOpen(false);
    };

    const generateSessionOptions = () => {
        const currentYear = new Date().getFullYear();
        const options: string[] = [];
        let yearOffset = 0;
        
        while (options.length < 5) {
            const startYear = currentYear + yearOffset;
            const sessionString = `${startYear}-${startYear + 1}`;
            
            if (!sessions.includes(sessionString)) {
                options.push(sessionString);
            }
            yearOffset++;
            
            // Safety break
            if (yearOffset > 20) break;
        }
        return options;
    };
    const sessionOptions = generateSessionOptions();

    const handleSessionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/[^\d]/g, '');
        if (value.length > 4) {
            value = value.slice(0, 4) + '-' + value.slice(4, 8);
        }
        setNewSessionName(value);
    };

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newSessionName.trim()) {
            setIsProcessing(true);
            try {
                await addSession(newSessionName.trim());
                setNewSessionName('');
                setCreateDialogOpen(false);
                toast.success("Session created successfully!");
            } catch (error: any) {
                toast.error(error?.message || "Failed to create session");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleRename = async () => {
        if (!sessionToRename || !newName.trim()) return;
        setIsProcessing(true);
        try {
            await renameSession(sessionToRename, newName.trim());
            toast.success("Renamed successfully");
            setRenameDialogOpen(false);
        } catch {
            toast.error("Failed to rename");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!sessionToDelete || isDeleteDisabled) return;

        setIsProcessing(true);
        try {
            await deleteSession(sessionToDelete);
            toast.success("Deleted successfully");
            setDeleteAlertOpen(false);
        } catch {
            toast.error("Failed to delete");
        } finally {
            setIsProcessing(false);
        }
    };

    const openRenameDialog = (session: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessionToRename(session);
        setNewName(session);
        setRenameDialogOpen(true);
    };

    const handleToggleLock = async (session: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isSuperAdmin) {
            setShowAccessDenied(true);
            return;
        }
        const currentlyLocked = isSessionLocked(session);
        const toastId = toast.loading(
            currentlyLocked ? `Unlocking "${session}"...` : `Locking "${session}"...`
        );
        try {
            await toggleSessionLock(session, !currentlyLocked);
            toast.success(
                `Session "${session}" ${!currentlyLocked ? 'locked' : 'unlocked'} successfully.`,
                { id: toastId }
            );
        } catch {
            toast.error('Failed to update session lock.', { id: toastId });
        }
    };

    const openDeleteAlert = (session: string, e: React.MouseEvent) => {        e.stopPropagation();

        if (!isSuperAdmin) {
            setShowAccessDenied(true);
            return;
        }

        if (session === "2025-2026") {
            toast.error("Protected Session: Cannot delete Master Data");
            return;
        }

        setSessionToDelete(session);
        setDeleteConfirmChecks({ students: false, fees: false, name: '' });
        setDeleteAlertOpen(true);
    };

    const handleLogoutConfirm = async () => {
        try {
            await logout();
            router.refresh();
            toast.success("Logged out successfully");
        } catch {
            toast.error("Failed to logout");
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800">
            <AccessDeniedDialog open={showAccessDenied} onOpenChange={setShowAccessDenied} />

            {/* Session Locked Dialog */}
            <AlertDialog open={showLockedDialog} onOpenChange={setShowLockedDialog}>
                <AlertDialogContent className="max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <LockIcon size={18} /> Session Locked
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-neutral-600 dark:text-neutral-400">
                            The session <span className="font-semibold text-neutral-800 dark:text-neutral-200">{lockedSessionName}</span> has been locked by the Super Admin. You do not have permission to access it at this time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => setShowLockedDialog(false)}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            Got it
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Header / Toolbar */}
            <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                        <Link href="/" className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">alghazali</Link>
                        <ChevronRight className="w-4 h-4 text-neutral-300" />
                        <span className="text-black dark:text-white font-semibold flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-blue-500" />
                            Sessions
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-3 ml-auto sm:ml-0">
                        <div className="relative hidden md:block">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 pl-9 pr-4 bg-neutral-100 dark:bg-neutral-900 border-none rounded-md text-xs outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700 transition-all w-24 sm:w-32 md:w-48 lg:focus:w-64"
                            />
                        </div>

                        {/* Mobile Search Toggle */}
                        <button
                            onClick={() => setIsSearchVisible(!isSearchVisible)}
                            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors md:hidden text-neutral-500"
                        >
                            {isSearchVisible ? <X size={16} /> : <Search size={16} />}
                        </button>

                        <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 rounded-md p-0.5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-[4px] transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-black shadow-sm text-black dark:text-white' : 'text-neutral-400 hover:text-neutral-600'}`}
                            >
                                <LayoutGrid size={12} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-[4px] transition-all ${viewMode === 'list' ? 'bg-white dark:bg-black shadow-sm text-black dark:text-white' : 'text-neutral-400 hover:text-neutral-600'}`}
                            >
                                <ListIcon size={12} />
                            </button>
                        </div>

                        <Button
                            size="sm"
                            onClick={() => setCreateDialogOpen(true)}
                            className="bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black h-8 px-3 text-xs font-semibold rounded-md border border-transparent shadow-sm hidden sm:flex"
                        >
                            <Plus size={14} className="mr-1.5" />
                            New Session
                        </Button>

                        <div className="h-4 w-[1px] bg-neutral-200 dark:bg-neutral-800 mx-1"></div>

                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <button className="relative outline-none rounded-full transition-transform active:scale-95 focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-800 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black">
                                    <div className={cn(
                                        "h-9 w-9 rounded-full flex items-center justify-center overflow-hidden",
                                        "bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700",
                                        "hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors duration-200"
                                    )}>
                                        {photoURL ? (
                                            <Image
                                                src={photoURL}
                                                alt="Profile"
                                                width={36}
                                                height={36}
                                                className="h-full w-full object-cover"
                                                unoptimized
                                            />
                                        ) : (
                                            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 select-none">
                                                {user?.displayName
                                                    ? user.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
                                                    : "AD"}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent className="w-60 p-1.5" align="end" sideOffset={8}>
                                {/* Header */}
                                <div className="flex items-center gap-3 p-2 mb-1">
                                    <div className="h-8 w-8 shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400 font-medium text-xs border border-neutral-200 dark:border-neutral-700 select-none">
                                        {user?.displayName
                                            ? user.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
                                            : "AD"}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium truncate text-neutral-900 dark:text-neutral-100">
                                            {user?.displayName || "Admin User"}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-neutral-500 truncate">
                                                {user?.email}
                                            </span>
                                            <span className={cn(
                                                "text-[9px] px-1.5 py-px rounded-full font-medium uppercase tracking-wide border",
                                                isSuperAdmin
                                                    ? "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                                                    : "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                                            )}>
                                                {isSuperAdmin ? "S. Admin" : "Admin"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <DropdownMenuSeparator className="my-1" />

                                <DropdownMenuGroup>
                                    <DropdownMenuItem onClick={() => {
                                        if (!isSuperAdmin) {
                                            setShowAccessDenied(true);
                                            return;
                                        }
                                        setMasterApiDialogOpen(true);
                                    }} className="gap-2.5 py-2 cursor-pointer focus:bg-blue-50 dark:focus:bg-blue-950/20">
                                        <Database size={15} className="text-blue-500" />
                                        <span className="text-sm font-medium">Copy Master API</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => refreshSessions()} className="gap-2.5 py-2 cursor-pointer focus:bg-neutral-100 dark:focus:bg-neutral-800">
                                        <Loader2 size={15} className="text-neutral-500" />
                                        <span className="text-sm">Refresh List</span>
                                    </DropdownMenuItem>

                                    {isSuperAdmin && (
                                        <DropdownMenuItem asChild>
                                            <Link href="/admin/users" className="gap-2.5 py-2 cursor-pointer focus:bg-neutral-100 dark:focus:bg-neutral-800">
                                                <UserCog size={15} className="text-neutral-500" />
                                                <span className="text-sm font-medium">Manage Users</span>
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuGroup>

                                <DropdownMenuSeparator className="my-1" />

                                <div className="px-2 py-1.5 flex items-center gap-2 text-[10px] text-neutral-400 font-medium select-none">
                                    <CalendarClock size={12} />
                                    <span>Session: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                <DropdownMenuSeparator className="my-1" />

                                <DropdownMenuItem
                                    onClick={() => setShowProfileUpdate(true)}
                                    className="gap-2.5 py-2 cursor-pointer focus:bg-neutral-100 dark:focus:bg-neutral-800"
                                >
                                    <UserCog size={15} className="text-neutral-500" />
                                    <span className="text-sm">Edit Profile</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setShowLogoutConfirm(true);
                                    }}
                                    className="gap-2.5 py-2 text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer"
                                >
                                    <LogOut size={15} />
                                    <span className="text-sm font-medium">Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Mobile Expandable Search */}
                <AnimatePresence>
                    {isSearchVisible && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="md:hidden border-t border-neutral-200 dark:border-neutral-800 overflow-hidden"
                        >
                            <div className="p-3">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Search folders..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-10 pl-10 pr-4 bg-neutral-100 dark:bg-neutral-900 border-none rounded-lg text-sm outline-none"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Mobile New Session Button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateDialogOpen(true)}
                    className="w-full mb-6 flex sm:hidden border-dashed border-neutral-300 dark:border-neutral-700 h-10 rounded-xl"
                >
                    <Plus size={16} className="mr-2" />
                    New Session
                </Button>

                {isLoading ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-2 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4" : "flex flex-col gap-2"}>
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className={`
                                    animate-pulse bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800
                                    ${viewMode === 'grid'
                                        ? 'rounded-xl aspect-[4/3] sm:aspect-square md:aspect-[4/3] p-4 flex flex-col items-center justify-center gap-3'
                                        : 'rounded-lg p-3 flex items-center justify-between'
                                    }
                                `}
                            >
                                {viewMode === 'grid' ? (
                                    <>
                                        <div className="w-12 h-10 bg-neutral-200 dark:bg-neutral-800 rounded-lg mb-2" />
                                        <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-800 rounded mb-1" />
                                        <div className="w-10 h-2 bg-neutral-200 dark:bg-neutral-800 rounded" />
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="w-5 h-5 bg-neutral-200 dark:bg-neutral-800 rounded" />
                                            <div className="w-24 h-3 bg-neutral-200 dark:bg-neutral-800 rounded" />
                                        </div>
                                        <div className="w-20 h-2 bg-neutral-200 dark:bg-neutral-800 rounded hidden sm:block" />
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                        <FolderOpen size={48} strokeWidth={1} className="mb-4 text-neutral-200 dark:text-neutral-800" />
                        <p>No sessions found.</p>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-2 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4" : "flex flex-col gap-2"}>
                        {filteredSessions.map((session, index) => {
                            const isMasterSession = session === "2025-2026";
                            const isLocked = isSessionLocked(session);
                            return (
                                <motion.div
                                    key={session}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    onClick={() => handleSessionClick(session)}
                                    className={`
                                    group relative cursor-pointer
                                    ${isMasterSession
                                            ? 'border-2 border-red-500 dark:border-red-500 ring-2 ring-red-500/20'
                                            : isLocked
                                                ? 'border-2 border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20'
                                                : 'border border-neutral-200 dark:border-neutral-800'
                                        }
                                    bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900/50
                                    transition-all duration-200
                                    ${viewMode === 'grid'
                                            ? 'rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-2 sm:gap-3 aspect-[4/3] sm:aspect-square md:aspect-[4/3] hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700'
                                            : 'rounded-lg p-2.5 sm:p-3 flex items-center justify-between hover:border-neutral-300 dark:hover:border-neutral-700'
                                        }
                                    ${isMasterSession ? 'hover:border-red-400 dark:hover:border-red-400' : ''}
                                    ${isLocked && !isMasterSession ? 'hover:border-amber-400 dark:hover:border-amber-400' : ''}
                                `}
                                >
                                    {/* Master Session Badge */}
                                    {isMasterSession && (
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                                            <span className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-bold uppercase tracking-wider rounded-full shadow-sm whitespace-nowrap">
                                                Master Data
                                            </span>
                                        </div>
                                    )}
                                    {/* Lock Badge */}
                                    {isLocked && !isMasterSession && (
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                                            <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider rounded-full shadow-sm whitespace-nowrap flex items-center gap-1">
                                                <LockIcon size={8} /> Locked
                                            </span>
                                        </div>
                                    )}
                                    {isLocked && isMasterSession && (
                                        <div className="absolute -top-2 right-2 z-10">
                                            <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider rounded-full shadow-sm whitespace-nowrap flex items-center gap-1">
                                                <LockIcon size={8} /> Locked
                                            </span>
                                        </div>
                                    )}
                                    {/* Grid View Content */}
                                    {viewMode === 'grid' && (
                                        <>
                                            <div className="w-16 h-12 relative flex items-center justify-center">
                                                {clickedSession === session ? (
                                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Folder className={`w-full h-full ${isLocked ? 'text-amber-400 fill-amber-400/20 group-hover:fill-amber-400/30' : 'text-blue-500 fill-blue-500/20 group-hover:fill-blue-500/30'} transition-colors`} strokeWidth={1.5} />
                                                        <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 mt-1">
                                                            <span className="text-[0.6rem] font-bold text-blue-700 dark:text-blue-300 bg-white/80 dark:bg-black/80 px-1 py-0.5 rounded-[2px] shadow-sm tracking-tighter block w-max max-w-[50px] truncate">
                                                                {session}
                                                            </span>
                                                        </div>
                                                        {isLocked && !isSuperAdmin && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-white/30 dark:bg-black/30 rounded-md">
                                                                <LockIcon className="w-5 h-5 text-amber-500 drop-shadow" />
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            <div className="w-full px-2">
                                                <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate w-full">
                                                    {session}
                                                </h3>
                                                <p className="text-[10px] text-neutral-400 mt-0.5">Folder</p>
                                            </div>
                                        </>
                                    )}

                                    {/* List View Content */}
                                    {viewMode === 'list' && (
                                        <>
                                            <div className="flex items-center gap-3">
                                                {clickedSession === session ? (
                                                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                                ) : (
                                                    <Folder className={`w-5 h-5 ${isLocked ? 'text-amber-400 fill-amber-400/20' : 'text-blue-500 fill-blue-500/20'}`} />
                                                )}
                                                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{session}</span>
                                                {isLocked && !isSuperAdmin && <LockIcon size={13} className="text-amber-500 ml-1" />}
                                            </div>
                                            <div className="text-xs text-neutral-400 hidden sm:block">Academic Session</div>
                                        </>
                                    )}

                                    {/* Action Menu */}
                                    <div className={`${viewMode === 'grid' ? 'absolute top-1 sm:top-2 right-1 sm:right-2' : ''}`} onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-1.5 rounded-md text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
                                                    <MoreHorizontal size={14} />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={(e) => openRenameDialog(session, e)}>
                                                    <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => handleCopySessionAPI(session, e)}>
                                                    <Code className="mr-2 h-3.5 w-3.5 text-blue-500" /> Copy API
                                                </DropdownMenuItem>
                                                {isSuperAdmin && (
                                                    <DropdownMenuItem
                                                        onClick={(e) => handleToggleLock(session, e)}
                                                        className={isSessionLocked(session)
                                                            ? "text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-950/20"
                                                            : "text-amber-600 focus:text-amber-600 focus:bg-amber-50 dark:focus:bg-amber-950/20"
                                                        }
                                                    >
                                                        <LockIcon className="mr-2 h-3.5 w-3.5" />
                                                        {isSessionLocked(session) ? 'Unlock Session' : 'Lock Session'}
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={(e) => openDeleteAlert(session, e)} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
                                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Global Administration Section */}
                <div className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2 mb-6 text-neutral-800 dark:text-neutral-200">
                        <Globe size={18} className="text-blue-500" />
                        <h2 className="text-lg font-bold tracking-tight">Global Administration</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Classes Setup Card */}
                        <Link href="/admin/classes" className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:shadow-lg hover:border-indigo-500/50 transition-all duration-300 relative overflow-hidden flex items-start gap-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 dark:group-hover:bg-indigo-500/20 transition-all duration-500" />
                            
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800/50">
                                <School size={24} strokeWidth={1.5} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Class & Fees Setup</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Manage all academic classes and configure global fee structures.</p>
                            </div>
                            
                            <div className="shrink-0 self-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <ChevronRight className="w-5 h-5 text-indigo-500" />
                            </div>
                        </Link>

                        {/* Admissions Card */}
                        <Link href="/admin/admissions" className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:shadow-lg hover:border-blue-500/50 transition-all duration-300 relative overflow-hidden flex items-start gap-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 dark:group-hover:bg-blue-500/20 transition-all duration-500" />
                            
                            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/50">
                                <GraduationCap size={24} strokeWidth={1.5} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Admission Requests</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Review and manage incoming student applications from the website.</p>
                            </div>
                            
                            <div className="shrink-0 self-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <ChevronRight className="w-5 h-5 text-blue-500" />
                            </div>
                        </Link>

                        {/* Inquiries Card */}
                        <Link href="/admin/inquiries" className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:shadow-lg hover:border-emerald-500/50 transition-all duration-300 relative overflow-hidden flex items-start gap-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 dark:group-hover:bg-emerald-500/20 transition-all duration-500" />
                            
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50">
                                <MessageSquare size={24} strokeWidth={1.5} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Contact Inquiries</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Respond to messages and questions submitted through the Help & Support page.</p>
                            </div>
                            
                            <div className="shrink-0 self-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <ChevronRight className="w-5 h-5 text-emerald-500" />
                            </div>
                        </Link>

                        {/* Notice Board Card */}
                        <Link href="/admin/notice" className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:shadow-lg hover:border-amber-500/50 transition-all duration-300 relative overflow-hidden flex items-start gap-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/10 dark:group-hover:bg-amber-500/20 transition-all duration-500" />
                            
                            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800/50">
                                <Megaphone size={24} strokeWidth={1.5} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Notice Board</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Broadcast announcements and important alerts to all students globally.</p>
                            </div>
                            
                            <div className="shrink-0 self-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <ChevronRight className="w-5 h-5 text-amber-500" />
                            </div>
                        </Link>

                        {/* Schedule Card */}
                        <Link href="/admin/schedule" className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:shadow-lg hover:border-violet-500/50 transition-all duration-300 relative overflow-hidden flex items-start gap-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-500/10 dark:group-hover:bg-violet-500/20 transition-all duration-500" />
                            
                            <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-100 dark:border-violet-800/50">
                                <Calendar size={24} strokeWidth={1.5} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Class Schedule</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Manage master timetables and academic calendars across the school.</p>
                            </div>
                            
                            <div className="shrink-0 self-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <ChevronRight className="w-5 h-5 text-violet-500" />
                            </div>
                        </Link>

                        {/* OMR Sheet Generator Card */}
                        <Link href="/admin/omr" className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:shadow-lg hover:border-pink-500/50 transition-all duration-300 relative overflow-hidden flex items-start gap-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 dark:bg-pink-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-pink-500/10 dark:group-hover:bg-pink-500/20 transition-all duration-500" />
                            
                            <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 border border-pink-100 dark:border-pink-800/50">
                                <FileDigit size={24} strokeWidth={1.5} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">OMR Sheets</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Generate printable OMR sheets for exams and quizzes.</p>
                            </div>
                            
                            <div className="shrink-0 self-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <ChevronRight className="w-5 h-5 text-pink-500" />
                            </div>
                        </Link>

                        {/* AI Assistant Card */}
                        <Link href="/admin/chatbot" className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:shadow-lg hover:border-cyan-500/50 transition-all duration-300 relative overflow-hidden flex items-start gap-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-cyan-500/10 dark:group-hover:bg-cyan-500/20 transition-all duration-500" />
                            
                            <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-100 dark:border-cyan-800/50">
                                <Bot size={24} strokeWidth={1.5} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">AI Assistant</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Interact with the smart assistant for reports, stats, and school insights.</p>
                            </div>
                            
                            <div className="shrink-0 self-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <ChevronRight className="w-5 h-5 text-cyan-500" />
                            </div>
                        </Link>

                        {/* Diary Manager Card */}
                        <Link href="/admin/diary" className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:shadow-lg hover:border-teal-500/50 transition-all duration-300 relative overflow-hidden flex items-start gap-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-teal-500/10 dark:group-hover:bg-teal-500/20 transition-all duration-500" />
                            
                            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-100 dark:border-teal-800/50">
                                <BookMarked size={24} strokeWidth={1.5} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Diary Manager</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Record daily lesson plans, topics taught, homework and tests. Export as PDF.</p>
                            </div>
                            
                            <div className="shrink-0 self-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <ChevronRight className="w-5 h-5 text-teal-500" />
                            </div>
                        </Link>

                        {/* User Management Card */}
                        {isSuperAdmin && (
                        <Link href="/admin/users" className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:shadow-lg hover:border-rose-500/50 transition-all duration-300 relative overflow-hidden flex items-start gap-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-rose-500/10 dark:group-hover:bg-rose-500/20 transition-all duration-500" />
                            
                            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-800/50">
                                <UsersIcon size={24} strokeWidth={1.5} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">User Management</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Manage super admin and admin access across the platform.</p>
                            </div>
                            
                            <div className="shrink-0 self-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <ChevronRight className="w-5 h-5 text-rose-500" />
                            </div>
                        </Link>
                        )}
                    </div>
                </div>
            </main>

            {/* New Session Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent 
                    onInteractOutside={(e) => {
                        const target = e.target as Element;
                        if (target?.closest?.('[role="listbox"], [role="option"], [data-radix-popper-content-wrapper], [id^="radix-"]')) {
                            return;
                        }
                        e.preventDefault();
                    }}
                    className="w-[calc(100%-2rem)] sm:max-w-[400px] border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden p-0 shadow-2xl"
                >
                    <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-3 sm:mb-4">
                            <Plus size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                        </div>
                        <DialogTitle className="text-base sm:text-lg font-bold">New Academic Session</DialogTitle>
                        <p className="text-[10px] sm:text-xs text-neutral-500 mt-1">Create a separate workspace for a new academic year.</p>
                    </div>
                    <form onSubmit={handleCreateSession} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 ml-1">Select Session</label>
                                <Select onValueChange={setNewSessionName} value={newSessionName || undefined}>
                                    <SelectTrigger className="w-full h-10 text-sm font-medium rounded-lg">
                                        <SelectValue placeholder="Choose a session" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[10000]">
                                        {newSessionName && !sessionOptions.includes(newSessionName) && (
                                            <SelectItem value={newSessionName} className="hidden">{newSessionName}</SelectItem>
                                        )}
                                        {sessionOptions.map(option => (
                                            <SelectItem key={option} value={option}>{option}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="relative flex items-center py-1">
                                <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                                <span className="flex-shrink-0 mx-4 text-neutral-400 text-xs font-medium">OR TYPE</span>
                                <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 ml-1">Custom Session</label>
                                <Input
                                    autoFocus
                                    value={newSessionName}
                                    onChange={handleSessionInputChange}
                                    placeholder="e.g. 2025-2026"
                                    className="h-10 text-sm font-medium border-neutral-200 dark:border-neutral-800 focus:ring-offset-0 focus:ring-1 focus:ring-blue-500 transition-all rounded-lg"
                                    maxLength={9}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <Button type="button" variant="ghost" className="order-2 sm:order-1 flex-1 text-xs h-10 rounded-lg" onClick={() => setCreateDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isProcessing}
                                className="order-1 sm:order-2 flex-[1.5] bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 text-xs h-10 rounded-lg font-semibold shadow-lg shadow-blue-500/10"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create Session"
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Rename Dialog */}
            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[400px] border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden p-0 shadow-2xl">
                    <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-600 dark:text-neutral-400 mb-3 sm:mb-4">
                            <Pencil size={14} className="sm:w-4 sm:h-4" />
                        </div>
                        <DialogTitle className="text-base sm:text-lg font-bold">Rename Folder</DialogTitle>
                        <p className="text-[10px] sm:text-xs text-neutral-500 mt-1">Change the display name for this session's folder.</p>
                    </div>
                    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 ml-1">New Name</label>
                            <Input
                                value={newName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                                placeholder="Enter name"
                                className="h-10 text-sm font-medium border-neutral-200 dark:border-neutral-800 focus:ring-offset-0 focus:ring-1 focus:ring-blue-500 transition-all rounded-lg"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <Button type="button" variant="ghost" className="order-2 sm:order-1 flex-1 text-xs h-10 rounded-lg" onClick={() => setRenameDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="order-1 sm:order-2 flex-1 h-10 text-xs bg-black text-white dark:bg-white dark:text-black font-semibold rounded-lg shadow-lg hover:bg-neutral-800 dark:hover:bg-neutral-200"
                                onClick={handleRename}
                                disabled={isProcessing}
                            >
                                {isProcessing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                                Update Name
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[450px] border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden p-0 shadow-2xl max-h-[95vh] flex flex-col">
                    <div className="bg-red-50 dark:bg-red-950/20 p-4 sm:p-6 border-b border-red-100 dark:border-red-900/10 flex-shrink-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 mb-2 sm:mb-4 border border-red-200 dark:border-red-800">
                            <AlertTriangle size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                        </div>
                        <DialogTitle className="text-base sm:text-lg font-black text-red-700 dark:text-red-400 uppercase tracking-tight">Destructive Action</DialogTitle>
                        <p className="text-[10px] sm:text-xs text-red-600/70 dark:text-red-400/50 mt-1 font-medium italic">Extreme caution required. This will purge all data associated with this session.</p>
                    </div>

                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-3">
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => setDeleteConfirmChecks(prev => ({ ...prev, students: !prev.students }))}
                                    className={`mt-0.5 w-4 h-4 rounded border transition-all flex-shrink-0 flex items-center justify-center ${deleteConfirmChecks.students ? 'bg-red-500 border-red-500 text-white' : 'border-neutral-300 dark:border-neutral-600'}`}
                                >
                                    {deleteConfirmChecks.students && <CheckCircle2 size={12} strokeWidth={3} />}
                                </button>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Purge Student Directory</p>
                                    <p className="text-[10px] text-neutral-400 leading-normal line-clamp-2 sm:line-clamp-none">I understand that all students and their historical profiles in <span className="text-red-600 font-mono">{sessionToDelete}</span> will be deleted.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => setDeleteConfirmChecks(prev => ({ ...prev, fees: !prev.fees }))}
                                    className={`mt-0.5 w-4 h-4 rounded border transition-all flex-shrink-0 flex items-center justify-center ${deleteConfirmChecks.fees ? 'bg-red-500 border-red-500 text-white' : 'border-neutral-300 dark:border-neutral-600'}`}
                                >
                                    {deleteConfirmChecks.fees && <CheckCircle2 size={12} strokeWidth={3} />}
                                </button>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Wipe Financial History</p>
                                    <p className="text-[10px] text-neutral-400 leading-normal line-clamp-2 sm:line-clamp-none">I understand that all fee records and collections for this session will be permanently erased.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest px-1">Verify Session Name</p>
                            <Input
                                value={deleteConfirmChecks.name}
                                onChange={(e) => setDeleteConfirmChecks(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={`Type \"${sessionToDelete}\"`}
                                className="h-10 bg-white dark:bg-black border-red-200 dark:border-red-900 focus:ring-red-500 text-sm font-mono placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
                            />
                        </div>

                        <div className="flex gap-2 pt-2 flex-shrink-0">
                            <Button variant="ghost" className="flex-1 h-10 text-xs font-semibold rounded-xl" onClick={() => setDeleteAlertOpen(false)}>
                                Safe Exit
                            </Button>
                            <Button
                                className={`flex-[1.5] h-10 text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all ${isDeleteDisabled ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none' : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'}`}
                                disabled={isDeleteDisabled || isProcessing}
                                onClick={handleDelete}
                            >
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />}
                                Final Delete
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Master API Confirmation Dialog */}
            <AlertDialog open={masterApiDialogOpen} onOpenChange={setMasterApiDialogOpen}>
                <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 overflow-hidden border-neutral-200 dark:border-neutral-800 shadow-2xl">
                    <AlertDialogHeader className="p-6 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4 border border-blue-200 dark:border-blue-800">
                            <Database size={20} strokeWidth={2.5} />
                        </div>
                        <AlertDialogTitle className="text-xl font-black text-blue-900 dark:text-blue-400">Master Database API</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-blue-700/70 dark:text-blue-400/60 mt-2 font-medium">
                            Generate and copy the direct API endpoint for the entire project database. This URL provides raw JSON access to all records.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="p-6 bg-white dark:bg-black flex flex-col sm:flex-row gap-2">
                        <AlertDialogCancel asChild>
                            <Button variant="ghost" className="flex-1 rounded-xl font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900">
                                Cancel
                            </Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                onClick={handleCopyMasterAPI}
                                className="flex-[1.5] bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 gap-2"
                            >
                                <Copy size={16} />
                                Copy Endpoint
                            </Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <LogoutConfirmationDialog
                open={showLogoutConfirm}
                onOpenChange={setShowLogoutConfirm}
                onConfirm={handleLogoutConfirm}
            />

            <ProfileUpdateDialog
                open={showProfileUpdate}
                onOpenChange={setShowProfileUpdate}
            />

            {/* Gender Selection Dialog */}
            <Dialog open={genderDialogOpen} onOpenChange={setGenderDialogOpen}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[400px] border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden p-0 shadow-2xl">
                    <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 border-b border-neutral-200 dark:border-neutral-800">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-4">
                            <UsersIcon size={20} strokeWidth={2.5} />
                        </div>
                        <DialogTitle className="text-lg font-bold">Select Section</DialogTitle>
                        <p className="text-xs text-neutral-500 mt-1">Choose which section you want to access for {selectedSessionForGender}.</p>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => handleGenderSelect('male')}
                                className="group relative flex items-center gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all text-left"
                            >
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-neutral-900 dark:text-white">Male Section</h4>
                                    <p className="text-xs text-neutral-500">Access male students and records.</p>
                                </div>
                                {!isSuperAdmin && gender === 'female' && (
                                    <div className="ml-auto">
                                        <LockIcon size={14} className="text-neutral-400" />
                                    </div>
                                )}
                            </button>

                            <button
                                onClick={() => handleGenderSelect('female')}
                                className="group relative flex items-center gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-pink-500 dark:hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/20 transition-all text-left"
                            >
                                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/40 rounded-lg flex items-center justify-center text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-neutral-900 dark:text-white">Female Section</h4>
                                    <p className="text-xs text-neutral-500">Access female students and records.</p>
                                </div>
                                {!isSuperAdmin && gender === 'male' && (
                                    <div className="ml-auto">
                                        <LockIcon size={14} className="text-neutral-400" />
                                    </div>
                                )}
                            </button>
                        </div>

                        <Button
                            variant="ghost"
                            className="w-full h-10 text-xs rounded-lg"
                            onClick={() => setGenderDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Navigation Loader */}
            <AnimatePresence>
                {isNavigating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md z-[10000] flex flex-col items-center justify-center gap-6"
                    >
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-neutral-200 dark:border-white/10 border-t-black dark:border-t-white rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Folder className="w-8 h-8 text-black dark:text-white animate-pulse" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Opening Section</h3>
                            <p className="text-sm text-neutral-500 animate-pulse">Please wait while we prepare the dashboard...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

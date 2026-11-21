"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Drawer, DrawerOverlay, DrawerContent, DrawerBody } from "@chakra-ui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { toast } from "sonner";
import {
    AlertCircle,
    ArrowLeft,
    Camera,
    Check,
    CheckCircle2,
    Crop,
    Eye,
    EyeOff,
    IdCard,
    KeyRound,
    Loader2,
    Lock,
    Mail,
    Phone,
    Trash2,
    Upload,
    User as UserIcon,
    UserCog,
    UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { compressImage, toLocalImageSource } from "@/lib/compressImage";
import { PASSWORD_RULES, getPasswordIssues, getPasswordStrength } from "@/lib/password-policy";
import DeletePhotoConfirmationDialog from "@/components/Auth/DeletePhotoConfirmationDialog";
import ImageCropperDialog from "@/components/ImageCropper/ImageCropperDialog";
import ChangePasswordDialog from "@/components/AdminUsers/ChangePasswordDialog";

export type AdminRole = "admin" | "super_admin";
export type AdminGender = "male" | "female";

export interface EditorUserData {
    uid: string;
    email: string;
    displayName?: string;
    role?: AdminRole;
    gender?: AdminGender;
    photoURL?: string;
    designation?: string;
    assignedClass?: string;
    employeeId?: string;
    fatherName?: string;
    cnic?: string;
    phoneNumber?: string;
}

export interface UserEditorPayload {
    uid?: string;
    email: string;
    password?: string;
    displayName: string;
    role: AdminRole;
    gender: AdminGender | "";
    photoURL: string | null;
    designation: string;
    assignedClass: string | null;
    employeeId: string | null;
    fatherName: string | null;
    cnic: string | null;
    phoneNumber: string | null;
}

const DESIGNATIONS = ["Admin", "Teacher", "Staff", "Principal"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface UserEditorDrawerProps {
    open: boolean;
    mode: "create" | "edit";
    user: EditorUserData | null;
    classes: string[];
    isSelf: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (payload: UserEditorPayload) => Promise<void>;
}

/**
 * Add / Edit admin user drawer.
 *
 * Layout, spacing, colors and controls intentionally mirror
 * `components/Auth/ProfileUpdateDialog.tsx` so both admin editors feel
 * identical. All avatar work (upload → crop → save) runs through the shared
 * portalled `ImageCropperDialog`, which always renders above this drawer.
 */
const UserEditorDrawer = ({
    open,
    mode,
    user,
    classes,
    isSelf,
    isSubmitting,
    onClose,
    onSubmit,
}: UserEditorDrawerProps) => {
    const isCreate = mode === "create";

    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<AdminRole>("admin");
    const [designation, setDesignation] = useState("Admin");
    const [assignedClass, setAssignedClass] = useState("");
    const [gender, setGender] = useState<AdminGender | "">("");
    const [photoURL, setPhotoURL] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [fatherName, setFatherName] = useState("");
    const [cnic, setCnic] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");

    const [cropSource, setCropSource] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [processingPhoto, setProcessingPhoto] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset to a clean slate every time the drawer opens
    useEffect(() => {
        if (!open) return;
        setDisplayName(user?.displayName || "");
        setEmail(user?.email || "");
        setPassword("");
        setShowPassword(false);
        setRole(user?.role || "admin");
        setDesignation(user?.designation || "Admin");
        setAssignedClass(user?.assignedClass || "");
        setGender(user?.gender || "");
        setPhotoURL(user?.photoURL || "");
        setEmployeeId(user?.employeeId || "");
        setFatherName(user?.fatherName || "");
        setCnic(user?.cnic || "");
        setPhoneNumber(user?.phoneNumber || "");
        setCropSource(null);
        setShowCropper(false);
        setShowRemoveConfirm(false);
        setShowChangePassword(false);
        setProcessingPhoto(false);
    }, [open, user]);

    const originalEmail = user?.email || "";
    const emailChanged = !isCreate && originalEmail !== email.trim();
    const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
    const passwordIssues = useMemo(() => getPasswordIssues(password), [password]);

    const initials = (displayName || email || "AD")
        .split(/[\s@._-]+/)
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2) || "AD";

    // ── Avatar handlers ───────────────────────────────────────────────────────

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file (PNG, JPG, WEBP)");
            return;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            toast.error("Image size must be less than 10MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setCropSource(String(reader.result));
            setShowCropper(true);
        };
        reader.onerror = () => toast.error("Could not read that image");
        reader.readAsDataURL(file);
    };

    // Crop the photo that's already saved, without tainting the canvas
    const handleEditCurrentPhoto = async () => {
        if (!photoURL) return;
        setProcessingPhoto(true);
        try {
            setCropSource(await toLocalImageSource(photoURL));
            setShowCropper(true);
        } catch {
            toast.error("Could not load that photo");
        } finally {
            setProcessingPhoto(false);
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
        try {
            setPhotoURL(await compressImage(file));
        } catch {
            toast.error("Could not process the cropped image");
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!displayName.trim()) {
            toast.error("Full name is required");
            return;
        }
        if (!email.trim()) {
            toast.error("Email address is required");
            return;
        }
        if (isCreate && passwordIssues.length > 0) {
            toast.error(passwordIssues[0]);
            return;
        }

        const payload: UserEditorPayload = {
            email: email.trim(),
            displayName: displayName.trim(),
            role,
            gender,
            photoURL: photoURL || null,
            designation,
            assignedClass: role === "admin" ? assignedClass || null : null,
            employeeId: employeeId.trim() || null,
            fatherName: fatherName.trim() || null,
            cnic: cnic.trim() || null,
            phoneNumber: phoneNumber.trim() || null,
        };

        if (isCreate) {
            payload.password = password;
        } else {
            // Passwords are never sent from this form — editing one opens the
            // verified change-password flow instead.
            payload.uid = user?.uid;
        }

        try {
            await onSubmit(payload);
        } catch {
            /* toast already surfaced by the parent — keep the drawer open */
        }
    };

    const roleLocked = !isCreate && isSelf;

    return (
        <>
            <Drawer
                isOpen={open}
                onClose={onClose}
                placement="right"
                size="full"
                blockScrollOnMount={false}
            >
                <DrawerOverlay className="backdrop-blur-md bg-black/60" />
                <DrawerContent className="bg-neutral-50 dark:bg-neutral-950 p-0 m-0 w-full max-w-full overflow-hidden font-sans">
                    <DrawerBody
                        className="p-0 m-0 flex flex-col w-full overflow-y-auto overscroll-contain custom-scrollbar"
                        style={{ WebkitOverflowScrolling: "touch" }}
                    >
                        {/* ── Top Responsive Sticky Header ── */}
                        <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between shadow-sm min-w-0">
                            <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 pr-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1.5 sm:p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1 text-xs font-semibold shrink-0"
                                    title="Close"
                                >
                                    <ArrowLeft size={18} />
                                    <span className="hidden sm:inline">Back</span>
                                </button>

                                <div className="h-4 w-px bg-neutral-200 dark:border-neutral-800 hidden sm:block shrink-0" />

                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 shrink-0">
                                        {isCreate ? <UserPlus size={15} /> : <UserCog size={15} />}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-xs sm:text-sm md:text-base font-bold text-neutral-900 dark:text-white truncate">
                                            {isCreate ? "Add Admin User" : "Edit Admin User"}
                                        </h2>
                                        <p className="text-[10px] sm:text-[11px] text-neutral-500 hidden md:block truncate">
                                            {isCreate
                                                ? "Create a new administrative account and grant access"
                                                : `Managing ${user?.displayName || user?.email || "this admin"}`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                                >
                                    Discard
                                </button>
                                <Button
                                    type="submit"
                                    form="user-editor-drawer-form"
                                    disabled={isSubmitting}
                                    className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={13} className="animate-spin" />
                                            <span className="hidden sm:inline">Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={14} />
                                            <span className="hidden sm:inline">
                                                {isCreate ? "Create Account" : "Save Changes"}
                                            </span>
                                            <span className="sm:hidden">
                                                {isCreate ? "Create" : "Save"}
                                            </span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </header>

                        {/* ── Main Body Container ── */}
                        <div className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
                            <form
                                id="user-editor-drawer-form"
                                onSubmit={handleSubmit}
                                className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8"
                            >
                                {/* Left Column: Avatar & Identity Card (5 cols) */}
                                <div className="lg:col-span-5 space-y-5">
                                    <div className="bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col items-center text-center">
                                        <div className="w-full flex items-center justify-between pb-3.5 mb-3 border-b border-neutral-100 dark:border-neutral-800">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                                                <Camera size={13} className="text-emerald-500" />
                                                Profile Picture
                                            </span>
                                            {photoURL ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                    Unsaved Photo
                                                </span>
                                            ) : null}
                                        </div>

                                        {/* Avatar Circular Preview */}
                                        <div className="relative group my-2">
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className={cn(
                                                    "w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden cursor-pointer relative transition-all duration-300 shadow-xl border-4",
                                                    photoURL
                                                        ? "border-white dark:border-neutral-800 ring-2 ring-emerald-500/30"
                                                        : "border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800"
                                                )}
                                            >
                                                {photoURL ? (
                                                    <Image
                                                        src={photoURL}
                                                        alt="Avatar"
                                                        fill
                                                        className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl font-black text-neutral-400 dark:text-neutral-500 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900">
                                                        {initials}
                                                    </div>
                                                )}

                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white backdrop-blur-[2px]">
                                                    <Upload size={18} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                                                </div>
                                            </div>

                                            {/* Role Badge on Avatar */}
                                            <div
                                                className={cn(
                                                    "absolute bottom-0 right-0 sm:bottom-1 sm:right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white dark:border-neutral-900 flex items-center justify-center text-white text-xs shadow-md",
                                                    role === "super_admin" ? "bg-emerald-500" : "bg-blue-500"
                                                )}
                                                title={role === "super_admin" ? "Super Admin" : "Staff Admin"}
                                            >
                                                {role === "super_admin" ? <UserCog size={13} /> : <UserIcon size={13} />}
                                            </div>
                                        </div>

                                        {/* Name & Role */}
                                        <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white mt-2 truncate max-w-[240px]">
                                            {displayName || (isCreate ? "New Admin" : "Admin User")}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap justify-center">
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                {role.replace("_", " ")}
                                            </span>
                                            {assignedClass && role === "admin" && (
                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                                    Class {assignedClass}
                                                </span>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="w-full mt-5 space-y-2">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileSelect}
                                            />

                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full h-9 sm:h-10 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 shadow-sm flex items-center justify-center gap-2 transition-all"
                                            >
                                                <Upload size={14} />
                                                Upload New Photo
                                            </button>

                                            {photoURL && (
                                                <button
                                                    type="button"
                                                    onClick={handleEditCurrentPhoto}
                                                    disabled={processingPhoto}
                                                    className="w-full h-9 sm:h-10 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                                >
                                                    {processingPhoto ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <Crop size={14} />
                                                    )}
                                                    Crop &amp; Adjust Photo
                                                </button>
                                            )}

                                            {photoURL && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRemoveConfirm(true)}
                                                    className="w-full h-8 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                    Remove Current Photo
                                                </button>
                                            )}
                                        </div>

                                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-3.5 leading-normal">
                                            Recommended: 1:1 Square, Min 300x300px. JPG, PNG or WEBP.
                                        </p>
                                    </div>
                                </div>

                                {/* Right Column: Form Settings (7 cols) */}
                                <div className="lg:col-span-7 space-y-5">
                                    {isCreate && (
                                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
                                            <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                            <span>
                                                Account creation is permanent. Use correct details — the new admin
                                                will be asked to complete their own profile on first sign in.
                                            </span>
                                        </div>
                                    )}

                                    {/* Personal Information Card */}
                                    <div className="bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                                <UserIcon size={15} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                                                    Personal Profile
                                                </h4>
                                                <p className="text-[11px] text-neutral-500">
                                                    Basic administrative identification details
                                                </p>
                                            </div>
                                        </div>

                                        {/* Display Name */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                                Public Full Name
                                            </label>
                                            <Input
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                placeholder="Arsalan Ahmed"
                                                className="h-10 sm:h-11 rounded-xl text-sm font-medium border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 focus:bg-white dark:focus:bg-neutral-900 focus:border-emerald-500"
                                                required
                                            />
                                        </div>

                                        {/* Gender */}
                                        <div className="space-y-1.5 pt-1">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                                Gender Identity
                                            </label>
                                            <div className="grid grid-cols-2 gap-2 sm:gap-3 p-1 rounded-xl sm:rounded-2xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setGender("male")}
                                                    className={cn(
                                                        "h-9 sm:h-10 rounded-lg sm:rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2",
                                                        gender === "male"
                                                            ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm border border-neutral-200/60 dark:border-neutral-700"
                                                            : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
                                                    )}
                                                >
                                                    <span>👦</span>
                                                    <span>Male</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setGender("female")}
                                                    className={cn(
                                                        "h-9 sm:h-10 rounded-lg sm:rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2",
                                                        gender === "female"
                                                            ? "bg-white dark:bg-neutral-800 text-pink-600 dark:text-pink-400 shadow-sm border border-neutral-200/60 dark:border-neutral-700"
                                                            : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
                                                    )}
                                                >
                                                    <span>👧</span>
                                                    <span>Female</span>
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                                Regular admins only see student data matching their gender.
                                            </p>
                                        </div>

                                        {/* Role */}
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                                    Access Role
                                                </label>
                                                {roleLocked && (
                                                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                                        Cannot demote yourself
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 sm:gap-3 p-1 rounded-xl sm:rounded-2xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                                                <button
                                                    type="button"
                                                    disabled={roleLocked}
                                                    onClick={() => setRole("admin")}
                                                    className={cn(
                                                        "h-9 sm:h-10 rounded-lg sm:rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                                                        role === "admin"
                                                            ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm border border-neutral-200/60 dark:border-neutral-700"
                                                            : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
                                                    )}
                                                >
                                                    <UserIcon size={14} />
                                                    <span>Admin</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={roleLocked}
                                                    onClick={() => setRole("super_admin")}
                                                    className={cn(
                                                        "h-9 sm:h-10 rounded-lg sm:rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                                                        role === "super_admin"
                                                            ? "bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-neutral-200/60 dark:border-neutral-700"
                                                            : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
                                                    )}
                                                >
                                                    <UserCog size={14} />
                                                    <span>Super Admin</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Designation */}
                                        <div className="space-y-1.5 pt-1">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                                Designation
                                            </label>
                                            <select
                                                value={designation}
                                                onChange={(e) => setDesignation(e.target.value)}
                                                className="w-full h-10 sm:h-11 px-3.5 text-sm font-medium border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900 cursor-pointer"
                                            >
                                                {DESIGNATIONS.map((d) => (
                                                    <option key={d} value={d}>
                                                        {d}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Class Teacher Of */}
                                        {role === "admin" && (
                                            <div className="space-y-1.5 pt-1">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                                    Class Teacher Of
                                                </label>
                                                <select
                                                    value={assignedClass}
                                                    onChange={(e) => setAssignedClass(e.target.value)}
                                                    className="w-full h-10 sm:h-11 px-3.5 text-sm font-medium border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900 cursor-pointer"
                                                >
                                                    <option value="">None</option>
                                                    {classes.map((c) => (
                                                        <option key={c} value={c}>
                                                            Class {c}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Personal & Contact Card */}
                                    <div className="bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                                <IdCard size={15} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                                                    Personal &amp; Contact
                                                </h4>
                                                <p className="text-[11px] text-neutral-500">
                                                    Optional staff records — used on letters and exports
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label
                                                    htmlFor="employeeId"
                                                    className="text-[11px] font-bold uppercase tracking-wider text-neutral-500"
                                                >
                                                    Employee ID
                                                </label>
                                                <div className="relative">
                                                    <Input
                                                        id="employeeId"
                                                        value={employeeId}
                                                        onChange={(e) => setEmployeeId(e.target.value)}
                                                        placeholder="EMP-014"
                                                        className="h-10 sm:h-11 rounded-xl text-sm font-medium pl-10 border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 focus:bg-white dark:focus:bg-neutral-900 focus:border-emerald-500"
                                                    />
                                                    <UserCog
                                                        size={16}
                                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label
                                                    htmlFor="fatherName"
                                                    className="text-[11px] font-bold uppercase tracking-wider text-neutral-500"
                                                >
                                                    Father&apos;s Name
                                                </label>
                                                <div className="relative">
                                                    <Input
                                                        id="fatherName"
                                                        value={fatherName}
                                                        onChange={(e) => setFatherName(e.target.value)}
                                                        placeholder="Muhammad Ali"
                                                        className="h-10 sm:h-11 rounded-xl text-sm font-medium pl-10 border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 focus:bg-white dark:focus:bg-neutral-900 focus:border-emerald-500"
                                                    />
                                                    <UserIcon
                                                        size={16}
                                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label
                                                    htmlFor="cnic"
                                                    className="text-[11px] font-bold uppercase tracking-wider text-neutral-500"
                                                >
                                                    CNIC Number
                                                </label>
                                                <div className="relative">
                                                    <Input
                                                        id="cnic"
                                                        inputMode="numeric"
                                                        value={cnic}
                                                        onChange={(e) => setCnic(e.target.value)}
                                                        placeholder="42101-1234567-1"
                                                        className="h-10 sm:h-11 rounded-xl text-sm font-medium pl-10 border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 focus:bg-white dark:focus:bg-neutral-900 focus:border-emerald-500"
                                                    />
                                                    <IdCard
                                                        size={16}
                                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-neutral-400">
                                                    Format: 42101-1234567-1 (saved exactly as typed)
                                                </p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label
                                                    htmlFor="phoneNumber"
                                                    className="text-[11px] font-bold uppercase tracking-wider text-neutral-500"
                                                >
                                                    Phone Number
                                                </label>
                                                <div className="relative">
                                                    <Input
                                                        id="phoneNumber"
                                                        type="tel"
                                                        inputMode="tel"
                                                        value={phoneNumber}
                                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                                        placeholder="0300-1234567"
                                                        className="h-10 sm:h-11 rounded-xl text-sm font-medium pl-10 border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 focus:bg-white dark:focus:bg-neutral-900 focus:border-emerald-500"
                                                    />
                                                    <Phone
                                                        size={16}
                                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Security & Credentials Card */}
                                    <div className="bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                                <KeyRound size={15} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                                                    Account &amp; Security
                                                </h4>
                                                <p className="text-[11px] text-neutral-500">
                                                    Update login email and administrative password
                                                </p>
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                                Email Address
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="admin@alghazali.edu"
                                                    className="h-10 sm:h-11 rounded-xl text-sm font-medium pl-10 border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 focus:bg-white dark:focus:bg-neutral-900 focus:border-emerald-500"
                                                    required
                                                />
                                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                            </div>
                                        </div>

                                        {/* Password — create only. Editing one opens the
                                            verified change-password flow below. */}
                                        {isCreate ? (
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                                    Password
                                                </label>
                                                <div className="relative">
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        value={password}
                                                        autoComplete="new-password"
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        placeholder="At least 8 characters"
                                                        required
                                                        className="h-10 sm:h-11 rounded-xl text-sm font-medium pl-10 pr-10 border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 focus:bg-white dark:focus:bg-neutral-900 focus:border-emerald-500"
                                                    />
                                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword((p) => !p)}
                                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
                                                    >
                                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>

                                                {password && (
                                                    <div className="pt-1 space-y-1.5">
                                                        <div className="grid grid-cols-4 gap-1.5">
                                                            {[0, 1, 2, 3].map((i) => (
                                                                <div
                                                                    key={i}
                                                                    className={cn(
                                                                        "h-1.5 rounded-full transition-colors",
                                                                        i < passwordStrength.score
                                                                            ? passwordStrength.barColor
                                                                            : "bg-neutral-200 dark:bg-neutral-800"
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                        <p
                                                            className={cn(
                                                                "text-[11px] font-bold uppercase tracking-wider",
                                                                passwordStrength.color
                                                            )}
                                                        >
                                                            {passwordStrength.label}
                                                        </p>
                                                    </div>
                                                )}

                                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                                    {PASSWORD_RULES.map((rule) => {
                                                        const pass = rule.test(password);
                                                        return (
                                                            <li
                                                                key={rule.id}
                                                                className={cn(
                                                                    "flex items-center gap-1.5 text-[11px] font-medium transition-colors",
                                                                    pass
                                                                        ? "text-emerald-600 dark:text-emerald-500"
                                                                        : "text-neutral-400"
                                                                )}
                                                            >
                                                                <span
                                                                    className={cn(
                                                                        "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0",
                                                                        pass
                                                                            ? "bg-emerald-500 text-white"
                                                                            : "bg-neutral-200 dark:bg-neutral-800"
                                                                    )}
                                                                >
                                                                    {pass && <Check size={10} />}
                                                                </span>
                                                                {rule.label}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        ) : (
                                            <div className="space-y-2.5">
                                                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                                        <Lock size={15} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100">
                                                            Password
                                                        </p>
                                                        <p className="text-[11px] text-neutral-500 leading-relaxed mt-0.5">
                                                            {isSelf
                                                                ? "Changing your own password signs you out of your other devices."
                                                                : "You'll confirm your own admin password first, then set theirs."}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={() => setShowChangePassword(true)}
                                                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                >
                                                    <KeyRound size={15} /> Change password
                                                </Button>
                                                {emailChanged && (
                                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
                                                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                                        <span>
                                                            Changing the email address will require this admin to sign in
                                                            again with the new address.
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Permissions Privileges Summary */}
                                    <div className="bg-neutral-100/60 dark:bg-neutral-900/40 rounded-2xl p-4 border border-neutral-200/50 dark:border-neutral-800/60">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                                            <CheckCircle2 size={15} className="text-emerald-500" />
                                            Access Level
                                        </div>
                                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                                            {role === "super_admin"
                                                ? "Super Admins have full administrative privileges: access to global settings, all student records, audit logs and user role management."
                                                : assignedClass
                                                  ? `Regular Admins see standard staff administrative access, plus student records scoped to Class ${assignedClass} and their own gender group.`
                                                  : "Regular Admins have standard staff administrative access to schedules, student records and their own gender group."}
                                        </p>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>

            {/* Remove Photo Confirm Dialog */}
            <DeletePhotoConfirmationDialog
                open={showRemoveConfirm}
                onOpenChange={setShowRemoveConfirm}
                onConfirm={() => {
                    setPhotoURL("");
                    setShowRemoveConfirm(false);
                }}
                title="Remove Profile Photo"
                description={`Remove the profile picture for ${displayName || "this user"}?`}
            />

            {/* Portalled cropper — always above this drawer */}
            <ImageCropperDialog
                open={showCropper}
                onClose={() => setShowCropper(false)}
                src={cropSource}
                aspect={1}
                cropShape="round"
                onCropped={handleCropComplete}
            />

            {/* Portalled change-password flow — always above this drawer */}
            {!isCreate && user && (
                <ChangePasswordDialog
                    open={showChangePassword}
                    onOpenChange={setShowChangePassword}
                    target={{
                        uid: user.uid,
                        displayName: user.displayName || "",
                        email: user.email,
                    }}
                    actorEmail={auth.currentUser?.email || user.email}
                    isSelf={isSelf}
                />
            )}
        </>
    );
};

export default UserEditorDrawer;

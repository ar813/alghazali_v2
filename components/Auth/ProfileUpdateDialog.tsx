"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Image from 'next/image';
import { 
    Camera, 
    Trash2, 
    Upload, 
    User as UserIcon, 
    ShieldCheck, 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    Crop, 
    ArrowLeft,
    Check,
    Loader2,
    CheckCircle2,
    KeyRound
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Drawer,
    DrawerOverlay,
    DrawerContent,
    DrawerBody,
} from "@chakra-ui/react";
import DeletePhotoConfirmationDialog from './DeletePhotoConfirmationDialog';
import ImageCropperDialog from '@/components/ImageCropper/ImageCropperDialog';

interface ProfileUpdateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ProfileUpdateDialog = ({ open, onOpenChange }: ProfileUpdateDialogProps) => {
    const { 
        user, 
        gender, 
        photoURL, 
        updateName, 
        updateGender, 
        updateEmail, 
        updatePassword, 
        updatePhoto, 
        removePhoto, 
        isSuperAdmin, 
        role 
    } = useAuth();

    const [newName, setNewName] = useState(user?.displayName || '');
    const [newGender, setNewGender] = useState<"male" | "female" | "">(gender || '');
    const [newEmail, setNewEmail] = useState(user?.email || '');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [cropSource, setCropSource] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync state when drawer opens
    useEffect(() => {
        if (open) {
            setNewName(user?.displayName || '');
            setNewGender(gender || '');
            setNewEmail(user?.email || '');
            setNewPassword('');
            setPreviewUrl(null);
            setSelectedFile(null);
            setShowRemoveConfirm(false);
            setCropSource(null);
            setShowCropper(false);
        }
    }, [open, user?.displayName, user?.email, gender]);

    // CSS handles background scroll lock via globals.css
    // No manual JS overflow manipulation needed

    const currentPhoto = previewUrl || photoURL;
    const initials = (user?.displayName || 'AD')
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2) || 'AD';

    // File selection from disk
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file (PNG, JPG, WEBP)');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size must be less than 10MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = () => {
            setCropSource(String(reader.result));
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Crop current photo safely (avoiding CORS canvas freeze)
    const handleEditCurrentPhoto = async () => {
        if (!currentPhoto) return;
        try {
            if (currentPhoto.startsWith('data:') || currentPhoto.startsWith('blob:')) {
                setCropSource(currentPhoto);
                setShowCropper(true);
                return;
            }
            // Fetch as blob to prevent cross-origin canvas tainting
            const res = await fetch(currentPhoto);
            const blob = await res.blob();
            const localBlobUrl = URL.createObjectURL(blob);
            setCropSource(localBlobUrl);
            setShowCropper(true);
        } catch {
            setCropSource(currentPhoto);
            setShowCropper(true);
        }
    };

    // Crop completed callback
    const handleCropComplete = async (croppedBlob: Blob) => {
        const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(croppedBlob));
        toast.success("Avatar cropped! Click 'Save' to update.");
    };

    // Remove photo
    const handleRemovePhoto = async () => {
        setIsUpdating(true);
        try {
            await removePhoto();
            setPreviewUrl(null);
            setSelectedFile(null);
            toast.success('Profile photo removed');
        } catch {
            toast.error('Failed to remove photo');
        } finally {
            setIsUpdating(false);
        }
    };

    // Submit form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) {
            toast.error('Name cannot be empty');
            return;
        }
        if (isSuperAdmin && !newGender) {
            toast.error('Please select your gender');
            return;
        }

        const credentialsChanged = (newEmail.trim() && newEmail !== user?.email) || !!newPassword;

        setIsUpdating(true);
        try {
            if (selectedFile) {
                await updatePhoto(selectedFile);
                setSelectedFile(null);
                setPreviewUrl(null);
            }
            await updateName(newName.trim());
            if (isSuperAdmin && newGender) {
                await updateGender(newGender as "male" | "female");
            }
            // Email/password changes — triggers auto-logout
            if (newEmail.trim() && newEmail !== user?.email) {
                await updateEmail(newEmail.trim(), newPassword || '');
            } else if (newPassword) {
                await updatePassword(newPassword);
            }

            if (credentialsChanged) {
                toast.success('Credentials updated. Signing you out for security...');
                onOpenChange(false);
                setTimeout(async () => {
                    const { auth } = await import('@/lib/firebase');
                    const { signOut } = await import('firebase/auth');
                    await signOut(auth);
                    localStorage.removeItem('adminSession');
                    localStorage.removeItem('adminCredentials');
                    window.location.href = '/admin';
                }, 1500);
            } else {
                toast.success('Profile updated successfully!');
                onOpenChange(false);
            }
        } catch {
            toast.error('Failed to update profile.');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <>
            <Drawer
                isOpen={open}
                onClose={() => onOpenChange(false)}
                placement="right"
                size="full"
                blockScrollOnMount={false}
            >
                <DrawerOverlay className="backdrop-blur-md bg-black/60" />
                <DrawerContent className="bg-neutral-50 dark:bg-neutral-950 p-0 m-0 w-full max-w-full overflow-hidden font-sans">
                    <DrawerBody 
                    className="p-0 m-0 flex flex-col w-full overflow-y-auto overscroll-contain custom-scrollbar"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                        
                        {/* ── Top Responsive Sticky Header ── */}
                        <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between shadow-sm min-w-0">
                            {/* Left: Back + Title */}
                            <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 pr-2">
                                <button
                                    type="button"
                                    onClick={() => onOpenChange(false)}
                                    className="p-1.5 sm:p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1 text-xs font-semibold shrink-0"
                                    title="Close settings"
                                >
                                    <ArrowLeft size={18} />
                                    <span className="hidden sm:inline">Back</span>
                                </button>
                                
                                <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block shrink-0" />

                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 shrink-0">
                                        <UserIcon size={15} />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-xs sm:text-sm md:text-base font-bold text-neutral-900 dark:text-white truncate">
                                            Account Settings
                                        </h2>
                                        <p className="text-[10px] sm:text-[11px] text-neutral-500 hidden md:block truncate">
                                            Manage your administrative profile, avatar and security
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Discard & Save Actions */}
                            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => onOpenChange(false)}
                                    className="px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    Discard
                                </button>
                                <Button
                                    type="submit"
                                    form="profile-drawer-form"
                                    disabled={isUpdating || !newName.trim() || (isSuperAdmin && !newGender)}
                                    className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                                >
                                    {isUpdating ? (
                                        <>
                                            <Loader2 size={13} className="animate-spin" />
                                            <span className="hidden sm:inline">Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={14} />
                                            <span className="hidden sm:inline">Save Changes</span>
                                            <span className="sm:hidden">Save</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </header>

                        {/* ── Main Body Container ── */}
                        <div className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
                            <form id="profile-drawer-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8">
                                
                                {/* Left Column: Avatar & Identity Card (5 cols) */}
                                <div className="lg:col-span-5 space-y-5">
                                    <div className="bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col items-center text-center">
                                        <div className="w-full flex items-center justify-between pb-3.5 mb-3 border-b border-neutral-100 dark:border-neutral-800">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                                                <Camera size={13} className="text-emerald-500" />
                                                Profile Picture
                                            </span>
                                            {selectedFile && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                    Unsaved Photo
                                                </span>
                                            )}
                                        </div>

                                        {/* Avatar Circular Preview */}
                                        <div className="relative group my-2">
                                            <div 
                                                onClick={() => fileInputRef.current?.click()}
                                                className={cn(
                                                    "w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden cursor-pointer relative transition-all duration-300 shadow-xl border-4",
                                                    currentPhoto 
                                                        ? "border-white dark:border-neutral-800 ring-2 ring-emerald-500/30" 
                                                        : "border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800"
                                                )}
                                            >
                                                {currentPhoto ? (
                                                    <Image
                                                        src={currentPhoto}
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

                                                {/* Hover Overlay */}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white backdrop-blur-[2px]">
                                                    <Upload size={18} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                                                </div>
                                            </div>

                                            {/* Role Badge on Avatar */}
                                            <div 
                                                className={cn(
                                                    "absolute bottom-0 right-0 sm:bottom-1 sm:right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white dark:border-neutral-900 flex items-center justify-center text-white text-xs shadow-md",
                                                    isSuperAdmin ? "bg-emerald-500" : "bg-blue-500"
                                                )}
                                                title={isSuperAdmin ? "Super Admin" : "Staff Admin"}
                                            >
                                                <ShieldCheck size={13} />
                                            </div>
                                        </div>

                                        {/* Admin Name & Role */}
                                        <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white mt-2 truncate max-w-[240px]">
                                            {newName || user?.displayName || 'Admin User'}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                {role?.replace('_', ' ') || 'Admin'}
                                            </span>
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

                                            {currentPhoto && (
                                                <button
                                                    type="button"
                                                    onClick={handleEditCurrentPhoto}
                                                    className="w-full h-9 sm:h-10 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <Crop size={14} />
                                                    Crop & Adjust Photo
                                                </button>
                                            )}

                                            {photoURL && !selectedFile && (
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
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                placeholder="Enter your name"
                                                className="h-10 sm:h-11 rounded-xl text-sm font-medium border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 focus:bg-white dark:focus:bg-neutral-900 focus:border-emerald-500"
                                                required
                                            />
                                        </div>

                                        {/* Gender (Super Admin) */}
                                        {isSuperAdmin && (
                                            <div className="space-y-1.5 pt-1">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                                    Gender Identity
                                                </label>
                                                <div className="grid grid-cols-2 gap-2 sm:gap-3 p-1 rounded-xl sm:rounded-2xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewGender('male')}
                                                        className={cn(
                                                            "h-9 sm:h-10 rounded-lg sm:rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2",
                                                            newGender === 'male' 
                                                                ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm border border-neutral-200/60 dark:border-neutral-700" 
                                                                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
                                                        )}
                                                    >
                                                        <span>👦</span>
                                                        <span>Male</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewGender('female')}
                                                        className={cn(
                                                            "h-9 sm:h-10 rounded-lg sm:rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2",
                                                            newGender === 'female' 
                                                                ? "bg-white dark:bg-neutral-800 text-pink-600 dark:text-pink-400 shadow-sm border border-neutral-200/60 dark:border-neutral-700" 
                                                                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
                                                        )}
                                                    >
                                                        <span>👧</span>
                                                        <span>Female</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Security & Credentials Card */}
                                    <div className="bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                                <KeyRound size={15} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                                                    Account & Security
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
                                                    value={newEmail}
                                                    onChange={(e) => setNewEmail(e.target.value)}
                                                    placeholder="admin@school.com"
                                                    className="h-10 sm:h-11 rounded-xl text-sm font-medium pl-10 border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 focus:bg-white dark:focus:bg-neutral-900 focus:border-emerald-500"
                                                />
                                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                            </div>
                                        </div>

                                        {/* Password */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                                    New Password
                                                </label>
                                                <span className="text-[10px] text-neutral-400">Leave blank to retain current password</span>
                                            </div>
                                            <div className="relative">
                                                <Input 
                                                    type={showPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="Enter new password (min. 6 chars)"
                                                    className="h-10 sm:h-11 rounded-xl text-sm font-medium pl-10 pr-10 border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 focus:bg-white dark:focus:bg-neutral-900 focus:border-emerald-500"
                                                />
                                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            {(newEmail !== user?.email || newPassword) && (
                                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2 mt-2">
                                                    <span className="text-sm">⚠️</span>
                                                    <span>Changing email address or password will immediately log you out and require re-login with updated credentials.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Permissions Privileges Summary */}
                                    <div className="bg-neutral-100/60 dark:bg-neutral-900/40 rounded-2xl p-4 border border-neutral-200/50 dark:border-neutral-800/60">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                                            <CheckCircle2 size={15} className="text-emerald-500" />
                                            Active Access Level
                                        </div>
                                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                                            {isSuperAdmin 
                                                ? "You have full administrative privileges, including access to global settings, student records, audit logs, and user role management."
                                                : "You have standard staff administrative access to class schedules, student records, and assigned academic portals."}
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
                onConfirm={handleRemovePhoto}
            />

            {/* Portalled cropper — always stacked above this drawer on mobile & desktop */}
            <ImageCropperDialog
                open={showCropper}
                onClose={() => setShowCropper(false)}
                src={cropSource}
                aspect={1}
                cropShape="round"
                onCropped={handleCropComplete}
            />
        </>
    );
};

export default ProfileUpdateDialog;

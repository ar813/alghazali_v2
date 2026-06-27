"use client";

import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Image from 'next/image';
import { Camera, Trash2, Upload, X, User as UserIcon, ShieldCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import DeletePhotoConfirmationDialog from './DeletePhotoConfirmationDialog';

interface ProfileUpdateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ProfileUpdateDialog = ({ open, onOpenChange }: ProfileUpdateDialogProps) => {
    const { user, gender, photoURL, updateName, updateGender, updateEmail, updatePassword, updatePhoto, removePhoto, isSuperAdmin, role } = useAuth();
    const [newName, setNewName] = useState(user?.displayName || '');
    const [newGender, setNewGender] = useState<"male" | "female" | "">(gender || '');
    const [newEmail, setNewEmail] = useState(user?.email || '');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isPhotoUpdating, setIsPhotoUpdating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync name/gender when dialog opens
    React.useEffect(() => {
        if (open) {
            setNewName(user?.displayName || '');
            setNewGender(gender || '');
            setNewEmail(user?.email || '');
            setNewPassword('');
            setPreviewUrl(null);
            setSelectedFile(null);
            setShowRemoveConfirm(false);
        }
    }, [open, user?.displayName, user?.email, gender]);

    const currentPhoto = previewUrl || photoURL;
    const initials = (user?.displayName || 'AD')
        .split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleUploadPhoto = async () => {
        if (!selectedFile) return;
        setIsPhotoUpdating(true);
        try {
            await updatePhoto(selectedFile);
            setSelectedFile(null);
            setPreviewUrl(null);
            toast.success('Profile photo updated!');
        } catch {
            toast.error('Failed to upload photo');
        } finally {
            setIsPhotoUpdating(false);
        }
    };

    const handleRemovePhoto = async () => {
        setIsPhotoUpdating(true);
        try {
            await removePhoto();
            setPreviewUrl(null);
            setSelectedFile(null);
            toast.success('Profile photo removed');
        } catch {
            toast.error('Failed to remove photo');
        } finally {
            setIsPhotoUpdating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        if (isSuperAdmin && !newGender) return;

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
                toast.success('Credentials updated. Signing you out now...');
                onOpenChange(false);
                // Short delay so toast is visible, then logout + redirect
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                className="max-w-[95vw] sm:max-w-[800px] p-0 overflow-hidden border-none rounded-2xl shadow-2xl bg-white dark:bg-neutral-950 [&>button]:hidden"
            >
                <div className="flex flex-col md:flex-row h-full max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-visible">
                    
                    {/* Manual Close Button (Fixed at top right) */}
                    <button 
                        onClick={() => onOpenChange(false)}
                        className="absolute right-4 top-4 z-[101] p-2 rounded-full bg-black/20 hover:bg-black/40 md:bg-neutral-100 md:hover:bg-neutral-200 text-white md:text-neutral-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    
                    {/* Left Panel: Appearance & Photo */}
                    <div className="w-full md:w-[280px] bg-neutral-950 text-white p-6 md:p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-neutral-800">
                        <div className="w-full flex flex-col items-center">
                            <div className="flex items-center gap-2 mb-6 md:mb-10 w-full justify-center md:justify-start">
                                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                                    <Camera size={14} className="text-emerald-500" />
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Identity</span>
                            </div>

                            <div className="relative group mx-auto w-24 h-24 md:w-40 md:h-40 mb-6">
                                <div className={cn("w-full h-full flex items-center justify-center transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer", currentPhoto ? "bg-white" : "bg-neutral-900")} onClick={() => fileInputRef.current?.click()}>
                                    {currentPhoto ? (
                                        <Image
                                            src={currentPhoto}
                                            alt="Profile"
                                            width={160}
                                            height={160}
                                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl font-medium text-emerald-500/20">
                                            {initials}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center flex-col gap-2 backdrop-blur-[2px]">
                                        <Upload size={20} className="text-white" />
                                        <span className="text-[10px] font-medium uppercase tracking-widest text-white">Change</span>
                                    </div>
                                </div>

                                {photoURL && !selectedFile && (
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setShowRemoveConfirm(true); }}
                                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-xl rounded-full text-white z-[105]"
                                        title="Remove Photo"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 mt-4 w-full">
                                <button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors py-2"
                                >
                                    <Upload size={12} />
                                    Update Image
                                </button>
                                {currentPhoto && (
                                    <button 
                                        type="button"
                                        onClick={() => setShowRemoveConfirm(true)}
                                        className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors py-2"
                                    >
                                        <Trash2 size={12} />
                                        Remove Image
                                    </button>
                                )}
                            </div>

                            <div className="text-center space-y-2 mt-6">
                                <h3 className="text-base font-semibold truncate px-2">{user?.displayName || 'Admin'}</h3>
                                <div className="flex items-center justify-center gap-2">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                                        isSuperAdmin ? "bg-emerald-500" : "bg-blue-500"
                                    )} />
                                    <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">
                                        {role?.replace('_', ' ') || 'Admin'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full space-y-3 mt-8 md:mt-auto">
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                            {selectedFile ? (
                                <button 
                                    onClick={handleUploadPhoto}
                                    disabled={isPhotoUpdating}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 text-[10px] uppercase tracking-widest font-semibold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                                >
                                    {isPhotoUpdating ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : <ShieldCheck size={14} />}
                                    {isPhotoUpdating ? "Uploading..." : "Confirm Photo"}
                                </button>
                            ) : (
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl h-11 text-[10px] uppercase tracking-widest font-semibold transition-all flex items-center justify-center gap-2"
                                >
                                    <Upload size={14} />
                                    Update Image
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Form Fields */}
                    <div className="flex-1 bg-white dark:bg-neutral-950 p-6 md:p-10 flex flex-col">
                        <div className="mb-8 md:mb-12">
                            <DialogTitle className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-neutral-900 dark:text-white">Account Settings</DialogTitle>
                            <p className="text-xs md:text-sm text-neutral-500 font-medium tracking-tight">Configure your administrative identity</p>
                        </div>

                        <form id="profile-form" onSubmit={handleSubmit} className="space-y-8 flex-1 flex flex-col">
                            <div className="space-y-6">
                                {/* Display Name */}
                                <div className="space-y-3 group">
                                    <div className="flex items-center gap-2">
                                        <UserIcon size={12} className="text-neutral-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <label className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 group-focus-within:text-emerald-500 transition-colors">Public Name</label>
                                    </div>
                                    <Input 
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Enter your name"
                                        className="border-neutral-200 dark:border-neutral-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-0 rounded-xl h-12 text-sm font-semibold transition-all bg-neutral-50/30"
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-2 group">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Mail size={12} className="text-neutral-400" />
                                        <label className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Email Address</label>
                                    </div>
                                    <Input 
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded-xl h-12 text-sm font-medium focus:border-emerald-500"
                                        placeholder="your@email.com"
                                    />
                                </div>

                                {/* Password */}
                                <div className="space-y-2 group">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Lock size={12} className="text-neutral-400" />
                                        <label className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">New Password</label>
                                        <span className="text-[9px] text-neutral-400 ml-auto">(leave blank to keep current)</span>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Min. 6 characters"
                                            className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded-xl h-12 text-sm font-medium pr-10 focus:border-emerald-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {(newEmail !== user?.email || newPassword) && (
                                        <p className="text-[10px] text-amber-500 font-semibold mt-1">
                                            ⚠ Changing email or password will sign you out.
                                        </p>
                                    )}
                                </div>

                                {/* Gender (Super Admin only) */}
                                {isSuperAdmin && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={12} className="text-neutral-400" />
                                            <label className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Gender Identity</label>
                                        </div>
                                        <div className="flex gap-2 p-1.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                                            <button
                                                type="button"
                                                onClick={() => setNewGender('male')}
                                                className={cn(
                                                    "flex-1 h-10 text-[10px] font-semibold uppercase tracking-widest transition-all rounded-xl",
                                                    newGender === 'male' ? "bg-white dark:bg-neutral-800 shadow-sm text-blue-600" : "text-neutral-500 hover:text-neutral-700"
                                                )}
                                            >
                                                Male
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewGender('female')}
                                                className={cn(
                                                    "flex-1 h-10 text-[10px] font-semibold uppercase tracking-widest transition-all rounded-xl",
                                                    newGender === 'female' ? "bg-white dark:bg-neutral-800 shadow-sm text-pink-600" : "text-neutral-500 hover:text-neutral-700"
                                                )}
                                            >
                                                Female
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 mt-auto pt-6 border-t border-neutral-100 dark:border-neutral-800">
                                <button 
                                    type="button" 
                                    className="flex-1 h-12 rounded-xl text-[10px] uppercase tracking-widest font-semibold text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Discard
                                </button>
                                <Button 
                                    type="submit"
                                    disabled={isUpdating || !newName.trim() || (isSuperAdmin && !newGender)}
                                    className="flex-[2] h-12 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] uppercase tracking-widest font-semibold transition-all active:scale-95 shadow-xl shadow-emerald-600/10"
                                >
                                    {isUpdating ? "Syncing..." : "Save Identity"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </DialogContent>
            <DeletePhotoConfirmationDialog 
                open={showRemoveConfirm}
                onOpenChange={setShowRemoveConfirm}
                onConfirm={handleRemovePhoto}
            />
        </Dialog>
    );
};

export default ProfileUpdateDialog;

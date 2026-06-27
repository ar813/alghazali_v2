"use client";

import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Trash2, Shield, UserCog, Search, Plus, X, AlertCircle, Edit3, Loader2, Mail, RefreshCw, Clock, Eye, EyeOff, Camera, Upload, ChevronRight } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DeletePhotoConfirmationDialog from "@/components/Auth/DeletePhotoConfirmationDialog";
import { client } from "@/sanity/lib/client";
import { getAllClassesQuery } from "@/sanity/lib/queries";

interface UserData {
    uid: string;
    email: string;
    displayName?: string;
    role?: "admin" | "super_admin";
    gender?: "male" | "female";
    photoURL?: string;
    lastLoginAt?: string;
    createdAt?: string;
    designation?: string;
    assignedClass?: string;
}

const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new window.Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX = 400;
                let { width, height } = img;
                if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
                else { if (height > MAX) { width *= MAX / height; height = MAX; } }
                canvas.width = width; canvas.height = height;
                canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.7));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });

// ─── Shared field styles ───────────────────────────────────────────────────────
const field = "w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-neutral-400";
const label = "block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5";

// ─── Slide-up modal wrapper (mobile bottom-sheet, desktop center) ──────────────
function SlideModal({ open, onClose, title, subtitle, children, footer }: {
    open: boolean; onClose: () => void; title: string; subtitle?: string;
    children: React.ReactNode; footer?: React.ReactNode;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:pt-16 sm:pb-4 sm:px-4">
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            {/* panel */}
            <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[calc(100vh-6rem)] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
                {/* drag handle (mobile only) */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                    <div className="w-10 h-1 bg-neutral-200 rounded-full" />
                </div>
                {/* header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-neutral-900">{title}</h3>
                        {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all">
                        <X size={18} />
                    </button>
                </div>
                {/* scrollable body */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">
                    {children}
                </div>
                {/* sticky footer */}
                {footer && (
                    <div className="shrink-0 px-5 py-4 border-t border-neutral-100 bg-white rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

const AdminUsers = ({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const currentUserUid = auth.currentUser?.uid;
    const [isRefreshing, setIsRefreshing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fetchedClasses, setFetchedClasses] = useState<string[]>([]);

    // Add form
    const [showAdd, setShowAdd] = useState(false);
    const [addName, setAddName] = useState(""); const [addEmail, setAddEmail] = useState("");
    const [addPass, setAddPass] = useState(""); const [showAddPass, setShowAddPass] = useState(false);
    const [addRole, setAddRole] = useState<"admin" | "super_admin">("admin");
    const [addDesig, setAddDesig] = useState("Admin"); const [addClass, setAddClass] = useState("");
    const [addGender, setAddGender] = useState<"male" | "female" | "">("");

    // Edit form
    const [showEdit, setShowEdit] = useState(false);
    const [editUser, setEditUser] = useState<UserData | null>(null);
    const [editName, setEditName] = useState(""); const [editEmail, setEditEmail] = useState("");
    const [editPass, setEditPass] = useState(""); const [showEditPass, setShowEditPass] = useState(false);
    const [editRole, setEditRole] = useState<"admin" | "super_admin">("admin");
    const [editDesig, setEditDesig] = useState("Admin"); const [editClass, setEditClass] = useState("");
    const [editGender, setEditGender] = useState<"male" | "female" | "">("");
    const [editPhoto, setEditPhoto] = useState("");
    const [showRemovePhoto, setShowRemovePhoto] = useState(false);

    // Delete
    const [showDel, setShowDel] = useState(false);
    const [delUser, setDelUser] = useState<UserData | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [updatingRoleUid, setUpdatingRoleUid] = useState<string | null>(null);

    useEffect(() => {
        client.fetch(getAllClassesQuery).then((data: any[]) => {
            const set = new Set<string>();
            data.forEach(s => { if (s.admissionFor) set.add(s.admissionFor); });
            setFetchedClasses(Array.from(set).sort());
        }).catch(console.error);
    }, []);

    const fetchUsers = async (silent = false) => {
        if (!silent) { setLoading(true); onLoadingChange?.(true); }
        try {
            const snap = await getDocs(collection(db, "users"));
            setUsers(snap.docs.map(d => d.data() as UserData));
        } catch { toast.error("Failed to load users."); }
        finally { if (!silent) { setLoading(false); onLoadingChange?.(false); } }
    };

    useEffect(() => { fetchUsers(); }, [onLoadingChange]); // eslint-disable-line

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchUsers(true);
        setTimeout(() => setIsRefreshing(false), 600);
        toast.success("User list updated");
    };

    const getToken = () => auth.currentUser?.getIdToken();

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
                body: JSON.stringify({ email: addEmail, password: addPass, displayName: addName, role: addRole, gender: addGender, designation: addDesig, assignedClass: addRole === "admin" ? addClass : null }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success("User added successfully");
            setShowAdd(false);
            setAddName(""); setAddEmail(""); setAddPass(""); setAddRole("admin"); setAddDesig("Admin"); setAddClass(""); setAddGender("");
            fetchUsers();
        } catch (e: any) { toast.error(e.message); }
        finally { setIsSubmitting(false); }
    };

    const openEdit = (u: UserData) => {
        setEditUser(u); setEditName(u.displayName || ""); setEditEmail(u.email || "");
        setEditRole(u.role || "admin"); setEditDesig(u.designation || "Admin");
        setEditClass(u.assignedClass || ""); setEditGender(u.gender || "");
        setEditPhoto(u.photoURL || ""); setEditPass(""); setShowEditPass(false);
        setShowEdit(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editUser) return;
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
                body: JSON.stringify({ uid: editUser.uid, displayName: editName, email: editEmail, role: editRole, gender: editGender, photoURL: editPhoto, designation: editDesig, assignedClass: editRole === "admin" ? editClass : null, ...(editPass ? { password: editPass } : {}) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success("Profile updated");
            setShowEdit(false); setEditUser(null);
            fetchUsers();
        } catch (e: any) { toast.error(e.message); }
        finally { setIsSubmitting(false); }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error("Image must be < 2MB"); return; }
        try { setEditPhoto(await compressImage(file)); } catch { toast.error("Failed to process image"); }
    };

    const handleQuickRoleChange = async (u: UserData) => {
        if (u.uid === currentUserUid) { toast.error("You cannot demote yourself."); return; }
        const newRole = u.role === "super_admin" ? "admin" : "super_admin";
        setUpdatingRoleUid(u.uid);
        try {
            const res = await fetch("/api/admin/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
                body: JSON.stringify({ uid: u.uid, role: newRole }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(`Role → ${newRole}`);
            setUsers(prev => prev.map(x => x.uid === u.uid ? { ...x, role: newRole } : x));
        } catch (e: any) { toast.error(e.message); }
        finally { setUpdatingRoleUid(null); }
    };

    const handleDelete = (u: UserData) => {
        if (u.uid === currentUserUid) { toast.error("Cannot delete your own account."); return; }
        setDelUser(u); setShowDel(true);
    };

    const confirmDelete = async () => {
        if (!delUser) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/admin/users?uid=${delUser.uid}`, {
                method: "DELETE", headers: { Authorization: `Bearer ${await getToken()}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success("User removed permanently.");
            setUsers(prev => prev.filter(u => u.uid !== delUser.uid));
            setShowDel(false); setDelUser(null);
        } catch (e: any) { toast.error(e.message); }
        finally { setIsSubmitting(false); }
    };

    const filtered = users.filter(u =>
        (u.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (u.displayName?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    // ─── Avatar helper ──────────────────────────────────────────────────────────
    const Avatar = ({ u, size = 10 }: { u: UserData; size?: number }) => (
        <div className={cn(`w-${size} h-${size} rounded-xl bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center shrink-0 text-indigo-600 font-bold`, size === 10 ? "text-base" : "text-xl")}>
            {u.photoURL ? <Image src={u.photoURL} alt="" width={size * 4} height={size * 4} className="w-full h-full object-cover" unoptimized /> : (u.displayName || u.email)[0].toUpperCase()}
        </div>
    );

    return (
        <>
            <div className="space-y-4 pb-24">
                {/* ── Toolbar ── */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text" placeholder="Search name or email…"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                        />
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={handleRefresh} disabled={isRefreshing || loading}
                            className="p-2.5 border border-neutral-200 rounded-xl text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 transition-all">
                            <RefreshCw size={18} className={cn(isRefreshing && "animate-spin")} />
                        </button>
                        <button onClick={() => setShowAdd(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                            <Plus size={16} /> Add User
                        </button>
                    </div>
                </div>

                {/* ── Loading skeleton ── */}
                {loading && (
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                )}

                {/* ── User list ── */}
                {!loading && filtered.length === 0 && (
                    <div className="text-center py-16 text-neutral-400 text-sm">No users found.</div>
                )}

                {!loading && filtered.map((u) => {
                    const isMe = u.uid === currentUserUid;
                    const isSA = u.role === "super_admin";
                    return (
                        <div key={u.uid} className={cn(
                            "bg-white border rounded-2xl p-4 transition-all",
                            isMe ? "border-indigo-200 ring-1 ring-indigo-100" : "border-neutral-100 hover:border-neutral-200 hover:shadow-sm"
                        )}>
                            {/* top row */}
                            <div className="flex items-start gap-3">
                                <Avatar u={u} size={11} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-neutral-900 text-sm truncate max-w-[160px] sm:max-w-none">{u.displayName || "Admin User"}</span>
                                        {isMe && <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">You</span>}
                                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", isSA ? "bg-violet-100 text-violet-700" : "bg-neutral-100 text-neutral-600")}>
                                            {isSA ? "Super Admin" : (u.designation || "Admin")}
                                        </span>
                                        {!isSA && u.assignedClass && (
                                            <span className="text-[9px] font-bold bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded-full">Class {u.assignedClass}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-neutral-500">
                                        <Mail size={11} />
                                        <span className="text-xs truncate">{u.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                        {u.gender && (
                                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md", u.gender === "male" ? "bg-sky-50 text-sky-600" : "bg-pink-50 text-pink-600")}>
                                                {u.gender.charAt(0).toUpperCase() + u.gender.slice(1)}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                            <Clock size={9} />
                                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never logged in"}
                                        </span>
                                    </div>
                                </div>
                                {/* actions — desktop inline */}
                                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                                    <button onClick={() => handleQuickRoleChange(u)} disabled={!!updatingRoleUid || isMe}
                                        className="px-3 py-1.5 text-xs font-semibold border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 min-w-[70px] flex items-center justify-center transition-all">
                                        {updatingRoleUid === u.uid ? <Loader2 size={13} className="animate-spin" /> : isSA ? "Demote" : "Promote"}
                                    </button>
                                    <button onClick={() => openEdit(u)} className="p-2 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Edit3 size={16} /></button>
                                    <button onClick={() => handleDelete(u)} disabled={isMe} className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-20 transition-all"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            {/* actions — mobile row */}
                            <div className="flex sm:hidden items-center gap-2 mt-3 pt-3 border-t border-neutral-50">
                                <button onClick={() => handleQuickRoleChange(u)} disabled={!!updatingRoleUid || isMe}
                                    className="flex-1 py-2 text-xs font-semibold border border-neutral-200 rounded-xl text-neutral-600 flex items-center justify-center gap-1.5 disabled:opacity-40">
                                    {updatingRoleUid === u.uid ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
                                    {isSA ? "Demote" : "Promote"}
                                </button>
                                <button onClick={() => openEdit(u)} className="flex-1 py-2 text-xs font-semibold border border-indigo-100 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center gap-1.5">
                                    <Edit3 size={12} /> Edit
                                </button>
                                <button onClick={() => handleDelete(u)} disabled={isMe} className="flex-1 py-2 text-xs font-semibold border border-red-100 bg-red-50 text-red-600 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-20">
                                    <Trash2 size={12} /> Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ══ ADD USER MODAL ══════════════════════════════════════════════════════ */}
            <SlideModal open={showAdd} onClose={() => setShowAdd(false)} title="Add User" subtitle="Create a new admin account"
                footer={
                    <button form="add-form" type="submit" disabled={isSubmitting}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98]">
                        {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Adding…</> : "Create Account"}
                    </button>
                }>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2.5 text-sm text-amber-800">
                    <AlertCircle size={16} className="shrink-0 text-amber-500 mt-0.5" />
                    <p>Account creation is permanent. Use correct details.</p>
                </div>
                <form id="add-form" onSubmit={handleAddUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className={label}>Full Name</label>
                            <input required value={addName} onChange={e => setAddName(e.target.value)} placeholder="Arsalan Ahmed" className={field} />
                        </div>
                        <div>
                            <label className={label}>Role</label>
                            <select value={addRole} onChange={e => setAddRole(e.target.value as any)} className={cn(field, "cursor-pointer")}>
                                <option value="admin">Regular Admin</option>
                                <option value="super_admin">Super Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className={label}>Designation</label>
                            <select value={addDesig} onChange={e => setAddDesig(e.target.value)} className={cn(field, "cursor-pointer")}>
                                <option>Admin</option><option>Teacher</option><option>Staff</option><option>Principal</option>
                            </select>
                        </div>
                        {addRole === "admin" && (
                            <div className="col-span-2">
                                <label className={label}>Class Teacher Of</label>
                                <select value={addClass} onChange={e => setAddClass(e.target.value)} className={cn(field, "cursor-pointer")}>
                                    <option value="">None</option>
                                    {fetchedClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="col-span-2">
                            <label className={label}>Gender</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(["male", "female"] as const).map(g => (
                                    <button key={g} type="button" onClick={() => setAddGender(g)}
                                        className={cn("py-2.5 rounded-xl text-sm font-semibold border transition-all capitalize",
                                            addGender === g ? (g === "male" ? "bg-sky-500 text-white border-sky-500" : "bg-pink-500 text-white border-pink-500") : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100")}>
                                        {g}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-neutral-400 mt-1.5">Regular admins see only their gender's student data.</p>
                        </div>
                        <div className="col-span-2">
                            <label className={label}>Email Address</label>
                            <input type="email" required value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="admin@alghazali.edu" className={field} />
                        </div>
                        <div className="col-span-2">
                            <label className={label}>Password</label>
                            <div className="relative">
                                <input type={showAddPass ? "text" : "password"} required minLength={6} value={addPass} onChange={e => setAddPass(e.target.value)} placeholder="At least 6 characters" className={cn(field, "pr-11")} />
                                <button type="button" onClick={() => setShowAddPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                                    {showAddPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </SlideModal>

            {/* ══ EDIT USER MODAL ═════════════════════════════════════════════════════ */}
            <SlideModal open={showEdit && !!editUser} onClose={() => setShowEdit(false)} title="Edit User" subtitle={`Editing ${editUser?.displayName || "admin"}`}
                footer={
                    <button form="edit-form" type="submit" disabled={isSubmitting}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98]">
                        {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Saving…</> : "Save Changes"}
                    </button>
                }>
                {editUser && (
                    <form id="edit-form" onSubmit={handleUpdateUser} className="space-y-4">
                        {/* avatar */}
                        <div className="flex flex-col items-center gap-3 pb-2">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center text-indigo-600 text-2xl font-bold">
                                    {editPhoto ? <Image src={editPhoto} alt="" width={80} height={80} className="w-full h-full object-cover" unoptimized /> : (editName || editEmail)[0]?.toUpperCase()}
                                </div>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 p-1.5 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 active:scale-90 transition-all">
                                    <Camera size={13} />
                                </button>
                            </div>
                            {editPhoto && (
                                <button type="button" onClick={() => setShowRemovePhoto(true)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                                    <Trash2 size={11} /> Remove photo
                                </button>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className={label}>Full Name</label>
                                <input required value={editName} onChange={e => setEditName(e.target.value)} className={field} />
                            </div>
                            <div className="col-span-2">
                                <label className={label}>Email</label>
                                <input type="email" required value={editEmail} onChange={e => setEditEmail(e.target.value)} className={field} />
                            </div>
                            <div className="col-span-2">
                                <label className={label}>New Password (blank = keep current)</label>
                                <div className="relative">
                                    <input type={showEditPass ? "text" : "password"} minLength={6} value={editPass} onChange={e => setEditPass(e.target.value)} placeholder="Min 6 characters" className={cn(field, "pr-11")} />
                                    <button type="button" onClick={() => setShowEditPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                                        {showEditPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={label}>Role</label>
                                <select value={editRole} onChange={e => setEditRole(e.target.value as any)} disabled={editUser.uid === currentUserUid} className={cn(field, "cursor-pointer disabled:opacity-50")}>
                                    <option value="admin">Regular Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                                {editUser.uid === currentUserUid && <p className="text-[10px] text-amber-600 mt-1">Cannot demote yourself.</p>}
                            </div>
                            <div>
                                <label className={label}>Designation</label>
                                <select value={editDesig} onChange={e => setEditDesig(e.target.value)} className={cn(field, "cursor-pointer")}>
                                    <option>Admin</option><option>Teacher</option><option>Staff</option><option>Principal</option>
                                </select>
                            </div>
                            {editRole === "admin" && (
                                <div className="col-span-2">
                                    <label className={label}>Class Teacher Of</label>
                                    <select value={editClass} onChange={e => setEditClass(e.target.value)} className={cn(field, "cursor-pointer")}>
                                        <option value="">None</option>
                                        {fetchedClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="col-span-2">
                                <label className={label}>Gender</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(["male", "female"] as const).map(g => (
                                        <button key={g} type="button" onClick={() => setEditGender(g)}
                                            className={cn("py-2.5 rounded-xl text-sm font-semibold border transition-all capitalize",
                                                editGender === g ? (g === "male" ? "bg-sky-500 text-white border-sky-500" : "bg-pink-500 text-white border-pink-500") : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100")}>
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </SlideModal>

            {/* ══ DELETE CONFIRM ══════════════════════════════════════════════════════ */}
            {showDel && delUser && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:pt-16 sm:pb-4 p-4">
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !isSubmitting && setShowDel(false)} />
                    <div className="relative w-full sm:max-w-sm bg-[#141414] border border-white/10 rounded-3xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
                        <div className="h-1 bg-gradient-to-r from-red-600 to-rose-500" />
                        <div className="p-7 text-center space-y-4">
                            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
                                <Trash2 size={24} className="text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Remove This User?</h3>
                                <p className="text-sm text-neutral-400 mt-1">
                                    Permanently delete <span className="text-white font-semibold">{delUser.displayName || delUser.email}</span>? This cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => setShowDel(false)} disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-sm font-semibold transition-all">
                                    Cancel
                                </button>
                                <button onClick={confirmDelete} disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20">
                                    {isSubmitting ? <><Loader2 size={14} className="animate-spin" />Deleting…</> : "Yes, Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <DeletePhotoConfirmationDialog
                open={showRemovePhoto} onOpenChange={setShowRemovePhoto}
                onConfirm={() => { setEditPhoto(""); setShowRemovePhoto(false); }}
                title="Remove Profile Photo"
                description={`Remove photo for ${editUser?.displayName || "this user"}?`}
            />
        </>
    );
};

export default AdminUsers;

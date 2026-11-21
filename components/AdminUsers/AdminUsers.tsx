"use client";

import React, { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Trash2, Shield, Search, Plus, Loader2, Mail, RefreshCw, Clock, Edit3 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/sanity/lib/client";
import { getAllClassesQuery } from "@/sanity/lib/queries";
import UserEditorDrawer, { UserEditorPayload } from "@/components/AdminUsers/UserEditorDrawer";

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
    employeeId?: string;
    fatherName?: string;
    cnic?: string;
    phoneNumber?: string;
    passwordChangedAt?: string;
}

const AdminUsers = ({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    // Prefer the reactive auth user so the anti-lockout guards never race the
    // first render (auth.currentUser can still be undefined there).
    const { user: authUser } = useAuth();
    const currentUserUid = authUser?.uid ?? auth.currentUser?.uid;
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [fetchedClasses, setFetchedClasses] = useState<string[]>([]);

    // Add / Edit drawer
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
    const [editUser, setEditUser] = useState<UserData | null>(null);

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

    // ── Drawer open helpers ──────────────────────────────────────────────────
    const openCreate = () => {
        setEditUser(null);
        setEditorMode("create");
        setEditorOpen(true);
    };

    const openEdit = (u: UserData) => {
        setEditUser(u);
        setEditorMode("edit");
        setEditorOpen(true);
    };

    // ── Create / Update ───────────────────────────────────────────────────────
    const submitUser = async (payload: UserEditorPayload) => {
        setIsSubmitting(true);
        try {
            const isEdit = editorMode === "edit" && !!payload.uid;

            // The password only ever travels on create. Changing an existing
            // one goes through the verified flow in ChangePasswordDialog.
            const shared = {
                email: payload.email,
                displayName: payload.displayName,
                role: payload.role,
                gender: payload.gender,
                photoURL: payload.photoURL,
                designation: payload.designation,
                assignedClass: payload.assignedClass,
                employeeId: payload.employeeId,
                fatherName: payload.fatherName,
                cnic: payload.cnic,
                phoneNumber: payload.phoneNumber,
            };

            const res = await fetch("/api/admin/users", {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
                body: JSON.stringify(
                    isEdit ? { uid: payload.uid, ...shared } : { ...shared, password: payload.password }
                ),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(isEdit ? "Profile updated" : "User added successfully");
            setEditorOpen(false);
            setEditUser(null);
            fetchUsers();
        } catch (e: any) {
            toast.error(e.message);
            throw e;
        } finally {
            setIsSubmitting(false);
        }
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
        <div className={cn(`w-${size} h-${size} rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 overflow-hidden flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm`, size === 10 ? "text-base" : "text-xl")}>
            {u.photoURL ? <Image src={u.photoURL} alt="" width={size * 4} height={size * 4} className="w-full h-full object-cover object-center" unoptimized /> : (u.displayName || u.email)[0].toUpperCase()}
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
                        <button onClick={openCreate}
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

            {/* ══ ADD / EDIT USER DRAWER ════════════════════════════════════════════ */}
            <UserEditorDrawer
                open={editorOpen}
                mode={editorMode}
                user={editUser}
                classes={fetchedClasses}
                isSelf={!!editUser && editUser.uid === currentUserUid}
                isSubmitting={isSubmitting}
                onClose={() => { setEditorOpen(false); setEditUser(null); }}
                onSubmit={submitUser}
            />

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
        </>
    );
};

export default AdminUsers;


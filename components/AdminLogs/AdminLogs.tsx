"use client";

import React, { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    where,
    Timestamp,
    startAfter,
    getDocs,
} from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import {
    Shield,
    Activity,
    RefreshCw,
    Search,
    Filter,
    User,
    Clock,
    ChevronDown,
    Download,
    Trash2,
    AlertTriangle,
    LogIn,
    LogOut,
    FolderPlus,
    FolderMinus,
    FolderEdit,
    UserPlus,
    UserMinus,
    FileText,
    Mail,
    Printer,
    BarChart2,
    Lock,
    Unlock,
    Eye,
    Settings,
    Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface LogEntry {
    id: string;
    uid: string;
    displayName: string | null;
    email: string | null;
    role: "admin" | "super_admin" | null;
    gender: "male" | "female" | null;
    action: string;
    description: string;
    session?: string | null;
    meta?: Record<string, any>;
    timestamp: Timestamp | null;
    userAgent?: string | null;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
    login: LogIn,
    logout: LogOut,
    session_created: FolderPlus,
    session_deleted: FolderMinus,
    session_renamed: FolderEdit,
    session_locked: Lock,
    session_unlocked: Unlock,
    student_added: UserPlus,
    student_updated: User,
    student_deleted: UserMinus,
    fee_recorded: FileText,
    fee_deleted: Trash2,
    profile_updated: Settings,
    user_created: UserPlus,
    user_deleted: UserMinus,
    user_role_changed: Shield,
    card_printed: Printer,
    admit_card_printed: Printer,
    report_exported: BarChart2,
    email_sent: Mail,
    notice_published: Bell,
    page_visited: Eye,
    attendance_taken: Activity,
    quiz_created: FileText,
    quiz_deleted: Trash2,
    result_announced: BarChart2,
};

const ACTION_COLORS: Record<string, string> = {
    login: "bg-emerald-100 text-emerald-700",
    logout: "bg-slate-100 text-slate-600",
    session_created: "bg-blue-100 text-blue-700",
    session_deleted: "bg-red-100 text-red-700",
    session_renamed: "bg-amber-100 text-amber-700",
    session_locked: "bg-orange-100 text-orange-700",
    session_unlocked: "bg-green-100 text-green-700",
    student_added: "bg-cyan-100 text-cyan-700",
    student_updated: "bg-sky-100 text-sky-700",
    student_deleted: "bg-rose-100 text-rose-700",
    fee_recorded: "bg-purple-100 text-purple-700",
    fee_deleted: "bg-red-100 text-red-700",
    profile_updated: "bg-indigo-100 text-indigo-700",
    user_created: "bg-teal-100 text-teal-700",
    user_deleted: "bg-red-100 text-red-700",
    user_role_changed: "bg-violet-100 text-violet-700",
    card_printed: "bg-pink-100 text-pink-700",
    admit_card_printed: "bg-pink-100 text-pink-700",
    report_exported: "bg-yellow-100 text-yellow-700",
    email_sent: "bg-blue-100 text-blue-700",
    notice_published: "bg-amber-100 text-amber-700",
    page_visited: "bg-gray-100 text-gray-600",
    attendance_taken: "bg-lime-100 text-lime-700",
};

const PAGE_SIZE = 50;

function formatTimestamp(ts: Timestamp | null): string {
    if (!ts) return "—";
    const d = ts.toDate();
    return d.toLocaleString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
}

function ActionBadge({ action }: { action: string }) {
    const Icon = ACTION_ICONS[action] || Activity;
    const colorClass = ACTION_COLORS[action] || "bg-gray-100 text-gray-600";
    const label = action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${colorClass}`}
        >
            <Icon size={10} />
            {label}
        </span>
    );
}

export default function AdminLogs({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) {
    const { isSuperAdmin, user } = useAuth();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterAction, setFilterAction] = useState<string>("all");
    const [filterRole, setFilterRole] = useState<string>("all");
    const [filterGender, setFilterGender] = useState<string>("all");
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchLogs = useCallback(() => {
        setLoading(true);
        onLoadingChange?.(true);

        const q = query(
            collection(db, "admin_logs"),
            orderBy("timestamp", "desc"),
            limit(PAGE_SIZE)
        );

        const unsub = onSnapshot(q, (snap) => {
            const data: LogEntry[] = snap.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<LogEntry, "id">),
            }));
            setLogs(data);
            setLastDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === PAGE_SIZE);
            setLoading(false);
            onLoadingChange?.(false);
        }, (err) => {
            console.error("Failed to fetch admin logs:", err);
            toast.error("Failed to load admin logs.");
            setLoading(false);
            onLoadingChange?.(false);
        });

        return unsub;
    }, [onLoadingChange]);

    useEffect(() => {
        if (!isSuperAdmin) {
            setLoading(false);
            return;
        }
        const unsub = fetchLogs();
        return () => unsub?.();
    }, [fetchLogs, isSuperAdmin]);

    const loadMore = async () => {
        if (!lastDoc || loadingMore) return;
        setLoadingMore(true);
        try {
            const q = query(
                collection(db, "admin_logs"),
                orderBy("timestamp", "desc"),
                startAfter(lastDoc),
                limit(PAGE_SIZE)
            );
            const snap = await getDocs(q);
            const more: LogEntry[] = snap.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<LogEntry, "id">),
            }));
            setLogs((prev) => [...prev, ...more]);
            setLastDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === PAGE_SIZE);
        } catch (err) {
            toast.error("Failed to load more logs.");
        } finally {
            setLoadingMore(false);
        }
    };

    const exportCSV = () => {
        const headers = ["Timestamp", "User", "Email", "Role", "Gender", "Action", "Description", "Session"];
        const rows = filteredLogs.map((l) => [
            formatTimestamp(l.timestamp),
            l.displayName || "—",
            l.email || "—",
            l.role || "—",
            l.gender || "—",
            l.action,
            l.description,
            l.session || "—",
        ]);
        const csvContent = [headers, ...rows]
            .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `admin_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Logs exported!");
    };

    // Client-side filtering
    const filteredLogs = logs.filter((log) => {
        const searchLower = search.toLowerCase();
        const matchesSearch =
            !search ||
            (log.displayName || "").toLowerCase().includes(searchLower) ||
            (log.email || "").toLowerCase().includes(searchLower) ||
            log.action.toLowerCase().includes(searchLower) ||
            log.description.toLowerCase().includes(searchLower) ||
            (log.session || "").toLowerCase().includes(searchLower);

        const matchesAction = filterAction === "all" || log.action === filterAction;
        const matchesRole = filterRole === "all" || log.role === filterRole;
        const matchesGender = filterGender === "all" || log.gender === filterGender;

        return matchesSearch && matchesAction && matchesRole && matchesGender;
    });

    // Unique action types for filter dropdown
    const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort();

    // Only super admins can see this
    if (!isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
                    <Shield size={36} className="text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-neutral-800 mb-2">Super Admin Only</h2>
                <p className="text-sm text-neutral-500 max-w-sm">
                    Admin Logs are restricted to Super Administrators only.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                        <Activity size={20} className="text-violet-600" />
                        Admin Activity Logs
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                        Real-time log of all admin actions across the system
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportCSV}
                        disabled={filteredLogs.length === 0}
                        className="text-xs"
                    >
                        <Download size={13} className="mr-1" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <Input
                        placeholder="Search by user, action, description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 text-sm h-9"
                    />
                </div>
                <Select value={filterAction} onValueChange={setFilterAction}>
                    <SelectTrigger className="w-full sm:w-40 h-9 text-sm">
                        <Filter size={13} className="mr-1 text-neutral-400" />
                        <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        {uniqueActions.map((a) => (
                            <SelectItem key={a} value={a}>
                                {a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
                        <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterGender} onValueChange={setFilterGender}>
                    <SelectTrigger className="w-full sm:w-32 h-9 text-sm">
                        <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
                <span className="bg-neutral-100 px-2.5 py-1 rounded-full font-medium">
                    {filteredLogs.length} logs shown
                </span>
                {search && (
                    <span className="bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full font-medium">
                        Filtered by: &quot;{search}&quot;
                    </span>
                )}
            </div>

            {/* Logs Table */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-neutral-100 p-4 animate-pulse">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-100" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-1/3 bg-gray-100 rounded" />
                                    <div className="h-3 w-2/3 bg-gray-100 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="bg-neutral-50 rounded-2xl border border-neutral-100 py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center mb-3">
                        <Activity size={24} className="text-neutral-400" />
                    </div>
                    <p className="text-sm font-semibold text-neutral-600">No logs found</p>
                    <p className="text-xs text-neutral-400 mt-1">
                        {search || filterAction !== "all" || filterRole !== "all" || filterGender !== "all"
                            ? "Try adjusting your filters"
                            : "Admin activity will appear here once actions are performed"}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredLogs.map((log) => {
                        const Icon = ACTION_ICONS[log.action] || Activity;
                        const colorClass = ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600";
                        return (
                            <div
                                key={log.id}
                                className="bg-white border border-neutral-100 rounded-xl p-3.5 hover:border-neutral-200 hover:shadow-sm transition-all"
                            >
                                <div className="flex gap-3 items-start">
                                    {/* Icon */}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                        <Icon size={15} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm text-neutral-800">
                                                {log.displayName || "Unknown User"}
                                            </span>
                                            <ActionBadge action={log.action} />
                                            {log.role === "super_admin" && (
                                                <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-bold">
                                                    SUPER
                                                </span>
                                            )}
                                            {log.gender && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${log.gender === 'male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                                    {log.gender === 'male' ? '♂' : '♀'}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-neutral-600 mb-1.5 leading-relaxed">
                                            {log.description}
                                        </p>

                                        <div className="flex flex-wrap gap-3 text-[11px] text-neutral-400">
                                            {log.email && (
                                                <span className="flex items-center gap-1">
                                                    <User size={10} />
                                                    {log.email}
                                                </span>
                                            )}
                                            {log.session && (
                                                <span className="bg-neutral-50 px-1.5 py-0.5 rounded font-medium text-neutral-500">
                                                    Session: {log.session}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock size={10} />
                                                {formatTimestamp(log.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Load More */}
                    {hasMore && (
                        <div className="flex justify-center pt-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="text-xs"
                            >
                                {loadingMore ? (
                                    <RefreshCw size={13} className="mr-1 animate-spin" />
                                ) : (
                                    <ChevronDown size={13} className="mr-1" />
                                )}
                                Load More
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

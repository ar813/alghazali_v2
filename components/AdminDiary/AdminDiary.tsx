"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import {
    Plus, Trash2, BookOpen, Download, FileText, Edit3,
    CheckCircle2, X, ChevronDown, Loader2, BookMarked,
    ClipboardList, PenLine, Users
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const DIARY_KEY = 'admin_diary_entries';
const CLASSES = ['Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const SECTIONS = ['None', 'A', 'B', 'C', 'D'];
const SUBJECTS = ['English', 'Urdu', 'Maths', 'Science', 'S.Studies', 'Islamiyat', 'Computer', 'Quran', 'Art', 'P.E', 'G.K', 'Other'];

function getCurrentSession() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function getLocalDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function generateId() {
    return `diary_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface SubjectEntry { name: string; topic: string; homeworkGiven: boolean; testTaken: boolean; }
interface DiaryEntry {
    id: string; date: string; class: string; section: string;
    subjects: SubjectEntry[]; remarks: string;
    teacherName: string; session: string; createdAt: string;
}
type SubjectsForm = Record<string, { topic: string; hw: boolean; test: boolean }>;

function blankForm(): { id?: string; date: string; class: string; section: string; remarks: string; subjects: SubjectsForm } {
    return {
        date: getLocalDateString(), class: '1', section: 'None', remarks: '',
        subjects: SUBJECTS.reduce((acc, s) => { acc[s] = { topic: '', hw: false, test: false }; return acc; }, {} as SubjectsForm),
    };
}

// ─── PDF Generator ────────────────────────────────────────────────────────────
async function generatePDF(entries: DiaryEntry[], teacherName: string, filterClass?: string) {
    const toExport = filterClass ? entries.filter(e => e.class === filterClass) : entries;
    if (toExport.length === 0) { toast.error('No entries to export'); return; }

    const session = getCurrentSession();
    const now = new Date();
    const dateTimeStr = now.toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });
    const clsInfo = filterClass ? `Class-${filterClass}` : 'AllClasses';

    // Logo: try fetching as base64, fallback to URL
    let logoSrc = '/logo.png';
    try {
        const res = await fetch('/logo.png');
        if (res.ok) {
            const blob = await res.blob();
            logoSrc = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        }
    } catch { /* fallback to URL */ }

    const grouped: Record<string, DiaryEntry[]> = {};
    toExport.forEach(e => { if (!grouped[e.date]) grouped[e.date] = []; grouped[e.date].push(e); });

    const entriesHtml = Object.entries(grouped)
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([date, dayEntries]) => {
            const d = new Date(date);
            const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const rows = dayEntries.map(e => {
                const clsLabel = `Class ${e.class}${e.section ? `-${e.section}` : ''}`;
                const remarksText = e.remarks || '';
                if (!e.subjects || e.subjects.length === 0) {
                    return `<tr><td class="cls">${clsLabel}</td><td colspan="4" style="text-align:center;color:#64748b;">No subjects recorded</td></tr>
                    ${remarksText ? `<tr><td colspan="5"><div class="remarks-box"><strong>📝 Remarks</strong>${remarksText}</div></td></tr>` : ''}`;
                }
                const subRows = e.subjects.map((sub, idx) => `
                    <tr>
                        ${idx === 0 ? `<td rowspan="${e.subjects.length}" class="cls" style="writing-mode:vertical-lr;text-orientation:mixed;transform:rotate(180deg);text-align:center;vertical-align:middle;white-space:nowrap;width:28px;padding:8px 4px;">${clsLabel}</td>` : ''}
                        <td><span class="subj">${sub.name}</span></td>
                        <td>${sub.topic || '—'}</td>
                        <td style="text-align:center">${sub.homeworkGiven ? '<span class="yes">✓ Yes</span>' : '<span class="no">✗ No</span>'}</td>
                        <td style="text-align:center">${sub.testTaken ? '<span class="yes">✓ Yes</span>' : '<span class="no">✗ No</span>'}</td>
                    </tr>`).join('');
                const remarkRow = remarksText ? `<tr><td colspan="5"><div class="remarks-box"><strong>📝 Remarks</strong>${remarksText}</div></td></tr>` : '';
                return subRows + remarkRow;
            }).join('');

            return `<div class="day-section">
                <div class="day-header">📅 ${dayLabel}</div>
                <table><thead><tr><th>Class</th><th>Subject</th><th>Topic Taught</th><th>Homework</th><th>Test</th></tr></thead>
                <tbody>${rows}</tbody></table></div>`;
        }).join('');

    const logoFallback = `<div style="width:50px;height:50px;border-radius:10px;background:#047857;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:white;letter-spacing:-1px;flex-shrink:0;">AG</div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#1e293b;background:#f8fafc;display:flex;flex-direction:column;min-height:100vh}
        .cover{background:linear-gradient(135deg,#064e3b,#047857);color:white;padding:30px 36px;margin-bottom:0}
        .cover-header{display:flex;align-items:center;gap:16px;margin-bottom:8px}
        .cover-logo{width:50px;height:50px;border-radius:10px;background:white;padding:3px;object-fit:contain;flex-shrink:0}
        .cover h1{font-size:24px;font-weight:900;margin:0}
        .cover .sub{color:#a7f3d0;font-size:13px;margin-left:66px}
        .cover .meta{display:flex;gap:30px;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.2)}
        .cover .mi{flex:1}.cover .ml{color:#6ee7b7;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
        .cover .mv{color:white;font-size:14px;font-weight:700;margin-top:3px}
        .sys{background:#fffbeb;border-left:4px solid #f59e0b;padding:10px 20px;font-size:11px;color:#78350f;margin-bottom:20px}
        .content{padding:24px 32px;flex:1}
        .day-section{margin-bottom:24px}
        .day-header{background:#1e293b;color:white;padding:9px 16px;border-radius:10px;font-weight:700;font-size:12px;margin-bottom:10px}
        table{width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden}
        th{background:#f1f5f9;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.5px;padding:8px 10px;text-align:left}
        td{padding:9px 10px;border-bottom:1px solid #f1f5f9;font-size:11.5px;color:#334155;vertical-align:middle}
        tr:last-child td{border-bottom:none}
        .cls{font-weight:800;color:#0f172a;background:#f0fdf4;border-right:2px solid #a7f3d0;font-size:10px}
        .subj{background:#dcfce7;color:#166534;font-weight:700;padding:3px 8px;border-radius:6px;white-space:nowrap}
        .yes{color:#166534;font-weight:700}.no{color:#991b1b;font-weight:700}
        .remarks-box{margin:10px 0 4px;padding:10px 14px;background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;font-size:11.5px;color:#78350f}
        .remarks-box strong{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#b45309;margin-bottom:4px}
        .footer{padding:20px 32px;border-top:2px solid #e2e8f0;margin-top:auto}
        .sys-msg{text-align:center;color:#64748b;font-size:11px;padding:14px 20px;background:#f1f5f9;border-radius:10px;margin-bottom:10px}
        .foot-note{font-size:10px;color:#94a3b8;text-align:center}
        @media print{body{background:white}@page{margin:0}}
    </style></head><body>
    <div class="cover">
        <div class="cover-header">
            <img src="${logoSrc}" alt="Logo" class="cover-logo" onerror="this.style.display='none'" />
            <h1>Al-Ghazali High School</h1>
        </div>
        <div class="sub">Mahad Usman Bin Affan · Daily Diary Report</div>
        <div class="meta">
            <div class="mi"><div class="ml">Session</div><div class="mv">${session}</div></div>
            <div class="mi"><div class="ml">Class Teacher</div><div class="mv">${teacherName}</div></div>
            <div class="mi"><div class="ml">Generated</div><div class="mv">${dateTimeStr}</div></div>
            <div class="mi"><div class="ml">Scope</div><div class="mv">${clsInfo.replace('Class-', 'Class ')}</div></div>
        </div>
    </div>
    <div class="content">
        <div class="sys">⚙️ <strong>Auto-Generated</strong> · Al-Ghazali High School IT Department · ${dateTimeStr} · ${teacherName}</div>
        ${entriesHtml}
    </div>
    <div class="footer">
        <div class="sys-msg"><strong>Note:</strong> This is a system-generated document by Al-Ghazali High School IT Department and does not require a physical signature.</div>
        <div class="foot-note">Generated by Al-Ghazali High School IT Department © ${new Date().getFullYear()}</div>
    </div></body></html>`;

    // Download as HTML file — browser will render/print it. No popup blocker issue.
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const firstEntry = toExport[0];
    const clsLabel = firstEntry ? `Class-${firstEntry.class}${firstEntry.section ? firstEntry.section : ''}` : 'AllClasses';
    const dateStamp = firstEntry ? firstEntry.date : new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `AGHS-Diary-${clsLabel}-${dateStamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('Diary exported — open the file and print/save as PDF');
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDiary() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(blankForm());
    const [customSubject, setCustomSubject] = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [filterDate, setFilterDate] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const teacherName = (() => {
        const n = user?.displayName || 'Class Teacher';
        return n.toLowerCase().startsWith('master ') ? n : `Master ${n}`;
    })();

    // Load from localStorage
    const loadEntries = useCallback(() => {
        try {
            const raw = localStorage.getItem(DIARY_KEY);
            if (raw) {
                const parsed: DiaryEntry[] = JSON.parse(raw);
                parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setEntries(parsed);
            }
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => { loadEntries(); }, [loadEntries]);

    const persist = (updated: DiaryEntry[]) => {
        const sorted = [...updated].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(sorted);
        localStorage.setItem(DIARY_KEY, JSON.stringify(sorted));
    };

    const saveEntry = () => {
        const filled = Object.keys(form.subjects).filter(s => form.subjects[s].topic.trim());
        if (filled.length === 0 && !form.remarks.trim()) {
            toast.error('Please write a topic for at least one subject or add remarks');
            return;
        }
        const entry: DiaryEntry = {
            id: form.id || generateId(),
            date: form.date,
            class: form.class,
            section: form.section === 'None' ? '' : form.section,
            subjects: filled.map(s => ({ name: s, topic: form.subjects[s].topic.trim(), homeworkGiven: form.subjects[s].hw, testTaken: form.subjects[s].test })),
            remarks: form.remarks,
            teacherName,
            session: getCurrentSession(),
            createdAt: form.id ? (entries.find(e => e.id === form.id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        };
        const updated = form.id ? entries.map(e => e.id === form.id ? entry : e) : [entry, ...entries];
        persist(updated);
        toast.success(form.id ? 'Entry updated' : 'Diary entry saved');
        setShowModal(false);
        setForm(blankForm());
    };

    const deleteEntry = (id: string) => {
        persist(entries.filter(e => e.id !== id));
        setDeleteId(null);
        toast.success('Entry deleted');
    };

    const openEdit = (e: DiaryEntry) => {
        const f = blankForm();
        f.id = e.id; f.date = e.date; f.class = e.class;
        f.section = e.section || 'None'; f.remarks = e.remarks || '';
        e.subjects.forEach(s => { f.subjects[s.name] = { topic: s.topic, hw: s.homeworkGiven, test: s.testTaken }; });
        setForm(f); setShowModal(true);
    };

    const addCustomSubject = () => {
        const s = customSubject.trim();
        if (!s || form.subjects[s]) return;
        setForm(f => ({ ...f, subjects: { ...f.subjects, [s]: { topic: '', hw: false, test: false } } }));
        setCustomSubject('');
    };

    const handleGeneratePDF = async () => {
        setGenerating(true);
        await generatePDF(filteredEntries, teacherName, filterClass !== 'All' ? filterClass : undefined);
        setGenerating(false);
    };

    // Filter entries
    const filteredEntries = entries.filter(e => {
        if (filterClass !== 'All' && e.class !== filterClass) return false;
        if (filterDate && e.date !== filterDate) return false;
        return true;
    });

    // Group by date for display
    const grouped: Record<string, DiaryEntry[]> = {};
    filteredEntries.forEach(e => { if (!grouped[e.date]) grouped[e.date] = []; grouped[e.date].push(e); });

    return (
        <div className="space-y-5 pb-20">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">Diary Manager</h1>
                    <p className="text-sm text-neutral-500 mt-0.5">👤 {teacherName} · Session {getCurrentSession()}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={handleGeneratePDF} disabled={generating || entries.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 transition-all">
                        {generating ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                        Export PDF
                    </button>
                    <button onClick={() => { setForm(blankForm()); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-700/20 active:scale-95">
                        <Plus size={15} /> New Entry
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none cursor-pointer">
                    <option value="All">All Classes</option>
                    {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none cursor-pointer" />
                {(filterClass !== 'All' || filterDate) && (
                    <button onClick={() => { setFilterClass('All'); setFilterDate(''); }}
                        className="px-3 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 rounded-xl transition-all">
                        Clear filters
                    </button>
                )}
                <span className="ml-auto text-xs text-neutral-400 font-medium">{filteredEntries.length} entr{filteredEntries.length === 1 ? 'y' : 'ies'}</span>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-emerald-600" size={28} />
                </div>
            ) : filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-center">
                    <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-4">
                        <BookMarked size={22} className="text-emerald-600" />
                    </div>
                    <p className="font-bold text-neutral-900 dark:text-white">No diary entries yet</p>
                    <p className="text-sm text-neutral-400 mt-1">Click "New Entry" to record today's lessons</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime()).map(([date, dayEntries]) => {
                        const d = new Date(date);
                        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                        return (
                            <div key={date}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-xs font-black uppercase tracking-wide">
                                        📅 {dayLabel}
                                    </div>
                                    <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
                                </div>
                                <div className="space-y-3">
                                    {dayEntries.map(entry => (
                                        <div key={entry.id} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-4 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                                        <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-black rounded-lg uppercase">
                                                            Class {entry.class}{entry.section ? `-${entry.section}` : ''}
                                                        </span>
                                                        <span className="text-xs text-neutral-400">{entry.subjects.length} subject{entry.subjects.length !== 1 ? 's' : ''}</span>
                                                        {entry.subjects.some(s => s.homeworkGiven) && (
                                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full">HW Given</span>
                                                        )}
                                                        {entry.subjects.some(s => s.testTaken) && (
                                                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold rounded-full">Test</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {entry.subjects.map(s => (
                                                            <div key={s.name} className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-lg">
                                                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{s.name}</span>
                                                                {s.topic && <span className="text-[11px] text-neutral-500 truncate max-w-[120px]">— {s.topic}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {entry.remarks && (
                                                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-800">
                                                            📝 {entry.remarks}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => generatePDF([entry], teacherName, entry.class)} title="Download this entry as PDF"
                                                        className="p-2 rounded-xl text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                                                        <Download size={14} />
                                                    </button>
                                                    <button onClick={() => openEdit(entry)} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all">
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button onClick={() => setDeleteId(entry.id)} className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete confirm */}
            {deleteId && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative w-full sm:max-w-xs bg-[#141414] border border-white/10 rounded-3xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
                        <div className="h-1 bg-gradient-to-r from-red-600 to-rose-500" />
                        <div className="p-6 text-center space-y-3">
                            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
                                <Trash2 size={20} className="text-red-400" />
                            </div>
                            <p className="text-white font-bold">Delete this entry?</p>
                            <p className="text-sm text-neutral-400">This cannot be undone.</p>
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-sm font-semibold">Cancel</button>
                                <button onClick={() => deleteEntry(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
                    {/* backdrop — NOT clickable */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative w-full sm:max-w-2xl bg-white dark:bg-neutral-950 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col h-[95dvh] sm:max-h-[calc(100vh-5rem)] animate-in slide-in-from-bottom-4 duration-200">
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                            <div className="w-10 h-1 bg-neutral-200 rounded-full" />
                        </div>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                                    <PenLine size={16} className="text-emerald-700 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">{form.id ? 'Edit Entry' : 'New Diary Entry'}</h3>
                                    <p className="text-xs text-neutral-500">Session {getCurrentSession()}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-5">
                            {/* Row 1: Date, Class, Section */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Date</label>
                                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:border-emerald-500 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Class</label>
                                    <select value={form.class} onChange={e => setForm(f => ({ ...f, class: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:border-emerald-500 cursor-pointer">
                                        {CLASSES.map(c => <option key={c} value={c}>{c === 'Nursery' || c === 'Prep' ? c : `Class ${c}`}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Section</label>
                                    <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:border-emerald-500 cursor-pointer">
                                        {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Subjects */}
                            <div>
                                <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Subjects — Topic / Homework / Test</label>
                                <div className="space-y-2">
                                    {Object.keys(form.subjects).map(sub => (
                                        <div key={sub} className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl">
                                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 w-20 shrink-0 truncate">{sub}</span>
                                            <input
                                                type="text"
                                                placeholder="Topic taught..."
                                                value={form.subjects[sub].topic}
                                                onChange={e => setForm(f => ({ ...f, subjects: { ...f.subjects, [sub]: { ...f.subjects[sub], topic: e.target.value } } }))}
                                                className="flex-1 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:border-emerald-500 transition-all min-w-0"
                                            />
                                            <button
                                                onClick={() => setForm(f => ({ ...f, subjects: { ...f.subjects, [sub]: { ...f.subjects[sub], hw: !f.subjects[sub].hw } } }))}
                                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all shrink-0 ${form.subjects[sub].hw ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700'}`}
                                                title="Homework Given">HW</button>
                                            <button
                                                onClick={() => setForm(f => ({ ...f, subjects: { ...f.subjects, [sub]: { ...f.subjects[sub], test: !f.subjects[sub].test } } }))}
                                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all shrink-0 ${form.subjects[sub].test ? 'bg-purple-500 text-white border-purple-500' : 'bg-white dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700'}`}
                                                title="Test Taken">Test</button>
                                        </div>
                                    ))}
                                </div>
                                {/* Custom subject */}
                                <div className="flex gap-2 mt-2">
                                    <input type="text" placeholder="Add custom subject..." value={customSubject} onChange={e => setCustomSubject(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addCustomSubject()}
                                        className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl text-xs outline-none focus:border-emerald-500" />
                                    <button onClick={addCustomSubject} className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all">+ Add</button>
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Remarks (optional)</label>
                                <textarea rows={3} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                                    placeholder="Any general remarks or notes for this class..."
                                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:border-emerald-500 transition-all resize-none" />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 px-5 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                            <button onClick={saveEntry} className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} />
                                {form.id ? 'Update Entry' : 'Save Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

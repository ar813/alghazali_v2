"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    CheckCircle2,
    Zap,
    RefreshCcw,
    Loader2,
    Users,
    UserCheck,
    Search,
    Filter,
    ChevronRight,
    ChevronLeft,
    GraduationCap,
    Info,
    Settings2,
    Hash,
    ArrowUp,
    ArrowDown,
    ArrowRight,
    ArrowRightCircle,
    AlertCircle,
    X,
    Check
} from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { client } from '@/sanity/lib/client';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

// Standard Class Order
const CLASS_ORDER = ['PG', 'Nursery', 'KG', '1', '2', '3', '4', '5', '6', '7', '8', 'SSCI', 'SSCII'];

const sortClasses = (a: string, b: string) => {
    const idxA = CLASS_ORDER.indexOf(a);
    const idxB = CLASS_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return a.localeCompare(b);
};

interface Student {
    _id: string;
    fullName: string;
    grNumber: string;
    rollNumber: string;
    admissionFor: string;
    gender?: string;
}

interface RefinedStudent extends Student {
    targetClass: string;
    nextRollNumber: string;
}

type SortConfig = {
    key: 'name' | 'gr' | 'class' | 'roll';
    direction: 'asc' | 'desc';
};

export default function StudentPromotionPage() {
    const router = useRouter();
    const { sessions, selectedSession } = useSession();
    const [step, setStep] = useState(1);
    const [mode, setMode] = useState<'bulk' | 'manual'>('bulk');
    const [sourceSession, setSourceSession] = useState('');

    // Bulk State
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [classStats, setClassStats] = useState<{ className: string, count: number }[]>([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(false);
    const [selectedBulkClasses, setSelectedBulkClasses] = useState<Set<string>>(new Set());

    // Manual State
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    const [manualTargetClass, setManualTargetClass] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [filterGender, setFilterGender] = useState('All');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'class', direction: 'asc' });

    // Refinement State
    const [refinedStudents, setRefinedStudents] = useState<RefinedStudent[]>([]);
    const [bulkRollPrefix, setBulkRollPrefix] = useState('');

    const [isExecuting, setIsExecuting] = useState(false);

    // Helpers
    const getNextClass = (currentClass: string) => {
        const idx = CLASS_ORDER.indexOf(currentClass);
        if (idx !== -1 && idx + 1 < CLASS_ORDER.length) return CLASS_ORDER[idx + 1];
        return currentClass;
    };

    const suggestNextRoll = (roll: string, currentCls: string, targetCls: string) => {
        if (!roll) return '';
        const match = roll.match(/^(\d+)(.*)$/);
        if (match) {
            const numPart = match[1];
            const rest = match[2];
            const currentNum = parseInt(currentCls);
            const targetNum = parseInt(targetCls);
            if (!isNaN(currentNum) && !isNaN(targetNum)) {
                const currentStr = String(currentNum);
                const targetStr = String(targetNum);
                if (numPart.startsWith(currentStr)) {
                    return numPart.replace(currentStr, targetStr) + rest;
                }
            }
            const firstDigit = parseInt(numPart[0]);
            if (!isNaN(firstDigit)) {
                return (firstDigit + 1) + numPart.substring(1) + rest;
            }
        }
        return roll;
    };

    // Load Data
    useEffect(() => {
        if (!sourceSession) return;
        if (mode === 'bulk') {
            setIsLoadingClasses(true);
            const query = `*[_type == "student" && (session == $session || (!defined(session) && $session == "2025-2026"))] { admissionFor }`;
            client.fetch(query, { session: sourceSession }).then((data: any[]) => {
                const statsMap: Record<string, number> = {};
                data.forEach(s => {
                    const cls = s.admissionFor || 'Unassigned';
                    statsMap[cls] = (statsMap[cls] || 0) + 1;
                });
                const statsArray = Object.entries(statsMap).map(([className, count]) => ({
                    className,
                    count
                })).sort((a, b) => sortClasses(a.className, b.className));
                setClassStats(statsArray);
                const initialMapping: Record<string, string> = {};
                const initialSelected = new Set<string>();
                statsArray.forEach(({ className }) => {
                    initialMapping[className] = getNextClass(className);
                    initialSelected.add(className);
                });
                setMapping(initialMapping);
                setSelectedBulkClasses(initialSelected);
                setIsLoadingClasses(false);
            });
        } else {
            setIsLoadingStudents(true);
            const query = `*[_type == "student" && (session == $session || (!defined(session) && $session == "2025-2026"))] | order(fullName asc) {
                _id, fullName, grNumber, rollNumber, admissionFor, gender
            }`;
            client.fetch(query, { session: sourceSession }).then((data: Student[]) => {
                setStudents(data);
                setIsLoadingStudents(false);
            });
        }
    }, [sourceSession, mode]);

    const filteredStudents = useMemo(() => {
        let result = students.filter(s => {
            const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.grNumber?.includes(searchQuery) ||
                s.rollNumber?.includes(searchQuery);
            const matchesClass = filterClass === 'All' || s.admissionFor === filterClass;
            const matchesGender = filterGender === 'All' || s.gender?.toLowerCase() === filterGender.toLowerCase();
            return matchesSearch && matchesClass && matchesGender;
        });

        result.sort((a, b) => {
            // Level 1: Class
            const classComp = sortClasses(a.admissionFor, b.admissionFor);
            if (classComp !== 0) return sortConfig.direction === 'asc' ? classComp : -classComp;

            // Level 2: Roll Number
            const rollA = parseInt(a.rollNumber) || 0;
            const rollB = parseInt(b.rollNumber) || 0;
            if (rollA !== rollB) return sortConfig.direction === 'asc' ? rollA - rollB : rollB - rollA;

            // Level 3: Name
            return a.fullName.localeCompare(b.fullName);
        });

        return result;
    }, [students, searchQuery, filterClass, filterGender, sortConfig]);

    const handlePrepareRefinement = () => {
        const selected = students.filter(s => selectedStudentIds.has(s._id));
        const refined = selected.map(s => {
            const targetCls = manualTargetClass || getNextClass(s.admissionFor);
            return {
                ...s,
                targetClass: targetCls,
                nextRollNumber: suggestNextRoll(s.rollNumber, s.admissionFor, targetCls)
            };
        });
        setRefinedStudents(refined);
        setStep(3);
    };

    const applyBulkRollNumbers = () => {
        if (!bulkRollPrefix) return;
        const start = parseInt(bulkRollPrefix);
        if (isNaN(start)) return;
        setRefinedStudents(prev => prev.map((s, idx) => ({ ...s, nextRollNumber: String(start + idx) })));
        toast.success(`Applied roll numbers starting from ${start}`);
    };

    const handleExecute = async () => {
        setIsExecuting(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                toast.error("Authentication required. Please log in again.");
                setIsExecuting(false);
                return;
            }
            const token = await user.getIdToken();
            let payload: any = { sourceSession, targetSession: selectedSession };
            
            if (mode === 'bulk') {
                // Filter mapping to only include selected classes
                const filteredMapping: Record<string, string> = {};
                selectedBulkClasses.forEach(cls => {
                    if (mapping[cls]) filteredMapping[cls] = mapping[cls];
                });
                payload.mapping = filteredMapping;
            } else {
                payload.items = refinedStudents.map(s => ({ id: s._id, targetClass: s.targetClass, rollNumber: s.nextRollNumber }));
            }

            const res = await fetch('/api/students/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.ok) {
                toast.success('Promotion successful!');
                setStep(5);
            } else throw new Error(json.error || 'Failed to promote students');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsExecuting(false);
        }
    };

    const toggleSort = (key: SortConfig['key']) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    // --- Renderers ---

    const renderHeader = () => (
        <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push(`/admin/${encodeURIComponent(selectedSession || "")}`)}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-neutral-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-neutral-900 dark:text-white leading-tight">Student Promotion</h1>
                        <p className="text-xs text-neutral-500 font-medium">Session Transition Wizard</p>
                    </div>
                </div>

                {/* Progress Tracker */}
                <div className="hidden md:flex items-center gap-8">
                    {[
                        { id: 1, label: 'Strategy' },
                        { id: 2, label: 'Selection' },
                        { id: 3, label: 'Refine' },
                        { id: 4, label: 'Execute' }
                    ].map((s) => {
                        const isClickable = (
                            (s.id === 1) ||
                            (s.id === 2 && sourceSession) ||
                            (s.id === 3 && mode === 'manual' && selectedStudentIds.size > 0) ||
                            (s.id === 4 && (
                                (mode === 'bulk' && selectedBulkClasses.size > 0) ||
                                (mode === 'manual' && refinedStudents.length > 0)
                            ))
                        );

                        return (
                            <div 
                                key={s.id} 
                                onClick={() => isClickable && !isExecuting && setStep(s.id)}
                                className={`flex items-center gap-3 ${isClickable ? 'cursor-pointer group/step' : 'cursor-not-allowed'}`}
                            >
                                <div className={`flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold transition-all ${
                                    step === s.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : step > s.id || isClickable
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-100 dark:border-blue-800'
                                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                                } ${isClickable && step !== s.id ? 'group-hover/step:bg-blue-600 group-hover/step:text-white' : ''}`}>
                                    {step > s.id ? <Check size={14} strokeWidth={3} /> : s.id}
                                </div>
                                <span className={`text-xs font-semibold transition-colors ${
                                    step === s.id 
                                        ? 'text-neutral-900 dark:text-white' 
                                        : isClickable 
                                            ? 'text-neutral-500 group-hover/step:text-blue-600' 
                                            : 'text-neutral-400'
                                }`}>
                                    {s.label}
                                </span>
                                {s.id < 4 && <ChevronRight size={14} className="text-neutral-200 ml-2" />}
                            </div>
                        );
                    })}
                </div>

                <div className="flex md:hidden items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">Step {step}/4</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Target Session</p>
                        <p className="text-sm font-semibold text-blue-600">{selectedSession}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                </div>
            </div>
        </header>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA] dark:bg-neutral-950 flex flex-col font-sans">
            {renderHeader()}

            <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-3xl mx-auto space-y-8"
                        >
                            <div className="text-center space-y-1">
                                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Start New Promotion</h2>
                                <p className="text-sm text-neutral-500 max-w-lg mx-auto">Configure your promotion strategy and source session to begin.</p>
                            </div>

                            <div className="grid gap-6">
                                {/* Source Session Card */}
                                <section className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2 relative">
                                        <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                                        Step 1: Select Source Session
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                                        {sessions.filter(s => s !== selectedSession).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setSourceSession(s)}
                                                className={`p-4 rounded-xl border-2 text-left transition-all relative group ${sourceSession === s
                                                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                                                        : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 hover:border-neutral-200'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className={`text-base font-bold block transition-colors ${sourceSession === s ? 'text-blue-600' : 'text-neutral-900 dark:text-white'}`}>{s}</span>
                                                        <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                                                            Previous Cycle
                                                        </span>
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${sourceSession === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-300 group-hover:text-neutral-400'}`}>
                                                        <RefreshCcw size={16} className={sourceSession === s ? 'animate-spin-slow' : ''} />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                {/* Strategy Card */}
                                <section className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden">
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -ml-16 -mb-16" />
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2 relative">
                                        <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                                        Step 2: Choose Strategy
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                                        <button
                                            onClick={() => setMode('bulk')}
                                            className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-all text-left group ${mode === 'bulk'
                                                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                                                    : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 hover:border-neutral-200'
                                                }`}
                                        >
                                            <div className={`p-3.5 rounded-xl transition-all ${mode === 'bulk' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 group-hover:scale-110'}`}>
                                                <Users size={24} />
                                            </div>
                                            <div>
                                                <div className={`font-bold transition-colors ${mode === 'bulk' ? 'text-blue-600' : 'text-neutral-900 dark:text-white'}`}>Bulk Mode</div>
                                                <div className="text-xs text-neutral-500 mt-0.5 leading-relaxed">Promote entire classes with auto-mapping.</div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setMode('manual')}
                                            className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left group ${mode === 'manual'
                                                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                                                    : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 hover:border-neutral-200'
                                                }`}
                                        >
                                            <div className={`p-3 rounded-lg transition-all ${mode === 'manual' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 group-hover:scale-105'}`}>
                                                <UserCheck size={20} />
                                            </div>
                                            <div>
                                                <div className={`font-bold transition-colors ${mode === 'manual' ? 'text-blue-600' : 'text-neutral-900 dark:text-white'}`}>Selective Mode</div>
                                                <div className="text-xs text-neutral-500 mt-0.5 leading-relaxed">Customize specific student details.</div>
                                            </div>
                                        </button>
                                    </div>
                                </section>
                            </div>

                            <div className="flex flex-col items-center gap-4 pt-4">
                                <button
                                    disabled={!sourceSession}
                                    onClick={() => setStep(2)}
                                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                                >
                                    Proceed to Selection
                                    <ChevronRight size={16} />
                                </button>

                                <button
                                    onClick={() => router.push(`/admin/${encodeURIComponent(selectedSession || "")}`)}
                                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-[10px] font-bold uppercase tracking-wider transition-colors"
                                >
                                    Cancel and Return
                                </button>
                            </div>
                        </motion.div>
                    )}
                    {step === 2 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            {mode === 'bulk' ? (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                                                <Users size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Class Rollover Mapping</h3>
                                                <p className="text-[11px] text-neutral-500 font-medium">Select classes to promote and their destination.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setSelectedBulkClasses(new Set(classStats.map(s => s.className)))}
                                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                            >
                                                Select All
                                            </button>
                                            <button 
                                                onClick={() => setSelectedBulkClasses(new Set())}
                                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {classStats.map(({ className: cls, count }) => (
                                            <div 
                                                key={cls} 
                                                onClick={() => {
                                                    const next = new Set(selectedBulkClasses);
                                                    if (next.has(cls)) next.delete(cls); else next.add(cls);
                                                    setSelectedBulkClasses(next);
                                                }}
                                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative group ${
                                                    selectedBulkClasses.has(cls)
                                                        ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/5'
                                                        : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 hover:border-neutral-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                                        selectedBulkClasses.has(cls) ? 'bg-blue-600 border-blue-600 text-white' : 'border-neutral-300'
                                                    }`}>
                                                        {selectedBulkClasses.has(cls) && <Check size={12} strokeWidth={4} />}
                                                    </div>
                                                    <span className="text-sm font-bold">Class {cls}</span>
                                                </div>

                                                <div className="flex justify-between items-center opacity-80 group-hover:opacity-100 transition-opacity">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Target</span>
                                                        <select
                                                            disabled={!selectedBulkClasses.has(cls)}
                                                            value={mapping[cls]}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => setMapping(prev => ({ ...prev, [cls]: e.target.value }))}
                                                            className="bg-transparent font-bold text-sm text-blue-600 focus:outline-none cursor-pointer disabled:text-neutral-400"
                                                        >
                                                            <option value="Graduated">Graduated</option>
                                                            {CLASS_ORDER.map(c => <option key={c} value={c}>Class {c}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Students</span>
                                                        <span className="text-xs font-bold">{count} Records</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 flex flex-col h-full">
                                    <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
                                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                            <div className="relative flex-1 min-w-[240px]">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                                <input
                                                    type="text"
                                                    placeholder="Search name, GR, or roll..."
                                                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all text-neutral-900 dark:text-white"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl text-xs font-black uppercase tracking-wider focus:ring-2 focus:ring-blue-500 text-neutral-600 dark:text-neutral-400 cursor-pointer"
                                                    value={filterClass}
                                                    onChange={(e) => setFilterClass(e.target.value)}
                                                >
                                                    <option value="All">All Classes</option>
                                                    {CLASS_ORDER.map(cls => <option key={cls} value={cls}>Class {cls}</option>)}
                                                </select>
                                                <select
                                                    className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl text-xs font-black uppercase tracking-wider focus:ring-2 focus:ring-blue-500 text-neutral-600 dark:text-neutral-400 cursor-pointer"
                                                    value={filterGender}
                                                    onChange={(e) => setFilterGender(e.target.value)}
                                                >
                                                    <option value="All">Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setSelectedStudentIds(new Set(filteredStudents.map(s => s._id)))}
                                                    className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                                >
                                                    Select All
                                                </button>
                                                <button
                                                    onClick={() => setSelectedStudentIds(new Set())}
                                                    className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-neutral-500 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                                                >
                                                    Deselect
                                                </button>
                                            </div>
                                            <div className="h-8 w-[1px] bg-neutral-200 dark:bg-neutral-800 hidden lg:block" />
                                            <span className="text-[11px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-800/50 uppercase tracking-widest">
                                                {selectedStudentIds.size} Selected
                                            </span>
                                        </div>
                                    </div>

                                    {/* Selection Table */}
                                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm flex-1">
                                        <div className="max-h-[500px] overflow-y-auto relative">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="sticky top-0 z-20 bg-neutral-50/90 dark:bg-neutral-800/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
                                                    <tr>
                                                        <th className="px-4 py-3 w-12">
                                                            <input
                                                                type="checkbox"
                                                                checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedStudentIds(new Set(filteredStudents.map(s => s._id)));
                                                                    } else {
                                                                        setSelectedStudentIds(new Set());
                                                                    }
                                                                }}
                                                                className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                            />
                                                        </th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Student Details</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">GR Number</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Class</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Roll No</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Gender</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                                                    {filteredStudents.map((s) => {
                                                        const isSelected = selectedStudentIds.has(s._id);
                                                        return (
                                                            <tr
                                                                key={s._id}
                                                                onClick={() => {
                                                                    const next = new Set(selectedStudentIds);
                                                                    if (next.has(s._id)) next.delete(s._id); else next.add(s._id);
                                                                    setSelectedStudentIds(next);
                                                                }}
                                                                className={`group cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/5' : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30'}`}
                                                            >
                                                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => {
                                                                            const next = new Set(selectedStudentIds);
                                                                            if (next.has(s._id)) next.delete(s._id); else next.add(s._id);
                                                                            setSelectedStudentIds(next);
                                                                        }}
                                                                        className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] ${isSelected ? 'bg-blue-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
                                                                            {s.fullName[0]}
                                                                        </div>
                                                                        <p className="text-xs font-bold text-neutral-900 dark:text-white">{s.fullName}</p>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className="text-[11px] font-bold text-neutral-500">{s.grNumber}</span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                                                                        {s.admissionFor}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className="text-[11px] font-medium text-neutral-500">{s.rollNumber || '—'}</span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`text-[9px] font-bold uppercase ${s.gender === 'Male' ? 'text-blue-500' : 'text-pink-500'}`}>
                                                                        {s.gender || '—'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Compact Sticky Footer */}
                            <div className="sticky bottom-0 left-0 right-0 p-3 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border-t border-neutral-200/60 dark:border-neutral-800/60 z-50 -mx-4 sm:-mx-8">
                                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-8">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="text-[11px] font-bold text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 py-2"
                                    >
                                        <ArrowLeft size={14} />
                                        Back
                                    </button>
                                    <button
                                        onClick={mode === 'bulk' ? () => setStep(4) : handlePrepareRefinement}
                                        disabled={(mode === 'manual' && selectedStudentIds.size === 0) || (mode === 'bulk' && selectedBulkClasses.size === 0)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        {mode === 'bulk' ? `Review ${selectedBulkClasses.size} Classes` : `Refine ${selectedStudentIds.size} Students`}
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}


                    {step === 3 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                             <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                                <div>
                                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Individual Refinement</h3>
                                    <p className="text-xs text-neutral-500 font-medium mt-0.5">Verify roll numbers and target class assignments.</p>
                                </div>
                                <div className="flex items-center gap-2 p-1.5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-inner w-full md:w-auto">
                                    <div className="relative flex-1 md:w-48">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Roll start (e.g. 101)"
                                            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-900 border-none rounded-xl text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            value={bulkRollPrefix}
                                            onChange={(e) => setBulkRollPrefix(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={applyBulkRollNumbers}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 text-[10px] font-black uppercase tracking-widest active:scale-95"
                                    >
                                        <RefreshCcw size={14} />
                                        Auto-Assign
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Student Info</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Source Info</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Target Class</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Next Roll No.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                                            {refinedStudents.map((s, idx) => (
                                                <tr key={s._id} className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-500">
                                                                {s.fullName[0]}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-neutral-900 dark:text-white">{s.fullName}</p>
                                                                <p className="text-[10px] font-bold text-neutral-400 uppercase">GR: {s.grNumber}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">{s.admissionFor}</p>
                                                        <p className="text-[10px] font-medium text-neutral-400">Roll: {s.rollNumber || 'N/A'}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <select
                                                            value={s.targetClass}
                                                            onChange={e => {
                                                                const next = [...refinedStudents];
                                                                next[idx].targetClass = e.target.value;
                                                                next[idx].nextRollNumber = suggestNextRoll(s.rollNumber, s.admissionFor, e.target.value);
                                                                setRefinedStudents(next);
                                                            }}
                                                            className="bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-blue-600 focus:ring-1 focus:ring-blue-500"
                                                        >
                                                            {CLASS_ORDER.map(cls => <option key={cls} value={cls}>Class {cls}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="text"
                                                            value={s.nextRollNumber}
                                                            onChange={e => {
                                                                const next = [...refinedStudents];
                                                                next[idx].nextRollNumber = e.target.value;
                                                                setRefinedStudents(next);
                                                            }}
                                                            className="w-24 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-blue-500"
                                                            placeholder="Roll No"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Compact Sticky Footer */}
                            <div className="sticky bottom-0 left-0 right-0 p-3 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border-t border-neutral-200/60 dark:border-neutral-800/60 z-50 -mx-4 sm:-mx-8">
                                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-8">
                                    <button
                                        onClick={() => setStep(2)}
                                        className="text-[11px] font-bold text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 py-2"
                                    >
                                        <ArrowLeft size={14} />
                                        Back
                                    </button>
                                    <button
                                        onClick={() => setStep(4)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        Review Authorization
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="max-w-2xl mx-auto space-y-8 py-6"
                        >
                            <div className="text-center space-y-4">
                                <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-600/30 rotate-3 hover:rotate-0 transition-transform duration-500">
                                    <Zap size={44} className={isExecuting ? "animate-pulse" : ""} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">Final Authorization</h2>
                                    <p className="text-xs text-neutral-500 font-bold mt-1">Review details before committing.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <ArrowUp className="w-10 h-10 rotate-45" />
                                    </div>
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Promotion Source</span>
                                    <p className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">{sourceSession}</p>
                                    <p className="text-[10px] font-medium text-neutral-400 mt-0.5">Source Session</p>
                                </div>
                                <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border-2 border-blue-50 dark:border-blue-900 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-blue-600">
                                        <ArrowDown className="w-10 h-10 -rotate-45" />
                                    </div>
                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block mb-1">Target Destination</span>
                                    <p className="text-xl font-bold text-blue-600 tracking-tight">{selectedSession}</p>
                                    <p className="text-[10px] font-medium text-blue-400 mt-0.5">Target Session</p>
                                </div>
                                
                                <div className="sm:col-span-2 bg-neutral-900 dark:bg-neutral-800 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-3xl rounded-full -mr-32 -mt-32" />
                                    <div className="relative flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center shrink-0">
                                            <AlertCircle className="text-blue-500" size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-white uppercase tracking-wider">Promotion Impact</p>
                                            <div className="grid grid-cols-2 gap-4 mt-3">
                                                <div>
                                                    <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Students</p>
                                                    <p className="text-lg font-bold text-white">{mode === 'bulk' ? `${selectedBulkClasses.size} Classes` : `${refinedStudents.length} Students`}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Mode</p>
                                                    <p className="text-lg font-bold text-blue-500 uppercase">{mode}</p>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-neutral-400 mt-4 leading-relaxed font-medium">
                                                This action will migrate student records to the new session. Roll numbers and class assignments will be updated as per your configuration.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                 <button
                                     disabled={isExecuting}
                                     onClick={handleExecute}
                                     className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 group text-xs"
                                 >
                                     {isExecuting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />}
                                     {isExecuting ? 'Updating Records...' : 'Authorize & Commit'}
                                 </button>
                                 <button
                                     disabled={isExecuting}
                                     onClick={() => setStep(mode === 'bulk' ? 2 : 3)}
                                     className="w-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-[9px] font-bold uppercase tracking-wider transition-colors py-2"
                                 >
                                     Modify Configuration
                                 </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 5 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-md mx-auto text-center space-y-6 py-12"
                        >
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                <CheckCircle2 size={32} />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Promotion Successful</h2>
                                <p className="text-sm text-neutral-500 font-medium">Academic transition for {selectedSession} has been completed.</p>
                            </div>
                            <button
                                onClick={() => router.push(`/admin/${encodeURIComponent(selectedSession || "")}`)}
                                className="bg-neutral-900 dark:bg-white text-white dark:text-black px-10 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-md"
                            >
                                Return to Dashboard
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

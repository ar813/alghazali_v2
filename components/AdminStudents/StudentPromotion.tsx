"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    Zap,
    RefreshCcw,
    X,
    Loader2,
    Users,
    UserCheck,
    Search,
    ChevronRight,
    GraduationCap,
    Hash,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { client } from '@/sanity/lib/client';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';

// Standard Class Order
const CLASS_ORDER = ['PG', 'Nursery', 'KG', '1', '2', '3', '4', '5', '6', '7', '8', 'SSCI', 'SSCII'];

const sortClasses = (a: string, b: string) => {
    const idxA = CLASS_ORDER.indexOf(a);
    const idxB = CLASS_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return a.localeCompare(b);
};

interface StudentPromotionProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface ClassStat {
    className: string;
    count: number;
}

interface Student {
    _id: string;
    fullName: string;
    grNumber: string;
    rollNumber: string;
    admissionFor: string;
    gender?: string;
    photoUrl?: string;
}

interface RefinedStudent extends Student {
    targetClass: string;
    nextRollNumber: string;
}

type SortConfig = {
    key: 'name' | 'gr' | 'class' | 'roll';
    direction: 'asc' | 'desc';
};

const StudentPromotion = ({ onClose, onSuccess }: StudentPromotionProps) => {
    const { sessions, selectedSession } = useSession();
    const [step, setStep] = useState(1);
    const [mode, setMode] = useState<'bulk' | 'manual'>('bulk');
    const [sourceSession, setSourceSession] = useState('');
    
    // Bulk State
    const [mapping, setMapping] = useState<Record<string, string>>({});
    
    // Manual State
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isLoadingClasses, setIsLoadingClasses] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [filterGender, setFilterGender] = useState('All');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

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
                const initialMapping: Record<string, string> = {};
                statsArray.forEach(({ className }) => {
                    initialMapping[className] = getNextClass(className);
                });
                setMapping(initialMapping);
                setIsLoadingClasses(false);
            }).catch(() => {
                setIsLoadingClasses(false);
                toast.error("Failed to load classes");
            });
        } else {
            setIsLoadingStudents(true);
            const query = `*[_type == "student" && (session == $session || (!defined(session) && $session == "2025-2026"))] | order(fullName asc) {
                _id, fullName, grNumber, rollNumber, admissionFor, gender, "photoUrl": photo.asset->url
            }`;
            client.fetch(query, { session: sourceSession }).then((data: Student[]) => {
                setStudents(data);
                setIsLoadingStudents(false);
            }).catch(() => {
                toast.error("Failed to load students");
                setIsLoadingStudents(false);
            });
        }
    }, [sourceSession, mode]);

    const filteredStudents = useMemo(() => {
        const result = students.filter(s => {
            const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 s.grNumber?.includes(searchQuery) ||
                                 s.rollNumber?.includes(searchQuery);
            const matchesClass = filterClass === 'All' || s.admissionFor === filterClass;
            const matchesGender = filterGender === 'All' || s.gender?.toLowerCase() === filterGender.toLowerCase();
            return matchesSearch && matchesClass && matchesGender;
        });

        result.sort((a, b) => {
            let comparison = 0;
            switch(sortConfig.key) {
                case 'name': comparison = a.fullName.localeCompare(b.fullName); break;
                case 'gr': comparison = (a.grNumber || '').localeCompare(b.grNumber || ''); break;
                case 'class': comparison = sortClasses(a.admissionFor, b.admissionFor); break;
                case 'roll': comparison = (a.rollNumber || '').localeCompare(b.rollNumber || ''); break;
            }
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [students, searchQuery, filterClass, filterGender, sortConfig]);

    const handlePrepareRefinement = () => {
        const selected = students.filter(s => selectedStudentIds.has(s._id));
        const refined = selected.map(s => {
            const targetCls = getNextClass(s.admissionFor);
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
        
        setRefinedStudents(prev => prev.map((s, idx) => ({
            ...s,
            nextRollNumber: String(start + idx)
        })));
        toast.success(`Applied roll numbers starting from ${start}`);
    };

    const handleExecute = async () => {
        setIsExecuting(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const payload: any = { sourceSession, targetSession: selectedSession };
            if (mode === 'bulk') {
                payload.mapping = mapping;
            } else {
                payload.items = refinedStudents.map(s => ({
                    id: s._id,
                    targetClass: s.targetClass,
                    rollNumber: s.nextRollNumber
                }));
            }
            const res = await fetch('/api/students/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.ok) {
                toast.success('Promotion successful!');
                onSuccess();
                setStep(5);
            } else throw new Error(json.error || 'Failed to promote students');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsExecuting(false);
        }
    };

    const toggleSort = (key: SortConfig['key']) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleStudentSelection = (id: string) => {
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // --- Components ---

    const ProgressHeader = () => (
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <GraduationCap className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-sm sm:text-base font-medium text-neutral-900 dark:text-white leading-tight">Student Promotion</h2>
                        <p className="text-[10px] text-neutral-500">Academic Year Transition</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 flex-1 w-full max-w-xl sm:mx-8">
                    {[1, 2, 3, 4].map((s) => (
                        <React.Fragment key={s}>
                            <div className="flex flex-col items-center gap-1 group relative">
                                <div className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[10px] font-bold transition-all border-2 ${
                                    step >= s 
                                    ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-black shadow-sm' 
                                    : 'bg-transparent border-neutral-100 dark:border-neutral-800 text-neutral-300'
                                }`}>
                                    {step > s ? <CheckCircle2 size={14} /> : s}
                                </div>
                                <span className={`hidden sm:block absolute -bottom-4 whitespace-nowrap text-[8px] font-bold uppercase tracking-widest ${step >= s ? 'text-neutral-900 dark:text-white' : 'text-neutral-300'}`}>
                                    {s === 1 ? 'Session' : s === 2 ? 'Selection' : s === 3 ? 'Refine' : 'Review'}
                                </span>
                            </div>
                            {s < 4 && <div className={`flex-1 h-[1px] sm:h-[1.5px] rounded-full mx-1 sm:mx-2 ${step > s ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-50 dark:bg-neutral-900'}`} />}
                        </React.Fragment>
                    ))}
                </div>

                <button onClick={onClose} className="hidden sm:block p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    const renderStep1 = () => (
        <div className="space-y-6 p-4 sm:p-6 max-w-3xl mx-auto">
            <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-medium text-neutral-900 dark:text-white">Promotion Setup</h3>
                <p className="text-[10px] sm:text-xs text-neutral-500">Select the source session and promotion method.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sessions.filter(s => s !== selectedSession).map(s => (
                    <button
                        key={s}
                        onClick={() => setSourceSession(s)}
                        className={`p-4 sm:p-5 rounded-xl border text-left transition-all ${
                            sourceSession === s 
                            ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900 shadow-sm ring-1 ring-neutral-900 dark:ring-white' 
                            : 'border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-base">{s}</span>
                            {sourceSession === s && <CheckCircle2 className="text-neutral-900 dark:text-white" size={18} />}
                        </div>
                        <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">From this session</span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    onClick={() => setMode('bulk')}
                    className={`flex gap-4 p-4 rounded-xl border text-left transition-all ${
                        mode === 'bulk' ? 'border-blue-500 bg-blue-50/20 shadow-sm' : 'border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50'
                    }`}
                >
                    <div className={`p-2.5 rounded-lg ${mode === 'bulk' ? 'bg-blue-600 text-white' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400'}`}>
                        <Users size={18} />
                    </div>
                    <div>
                        <div className="font-medium text-xs">Bulk Classes</div>
                        <div className="text-[10px] text-neutral-500">Automated class transfer</div>
                    </div>
                </button>
                <button
                    onClick={() => setMode('manual')}
                    className={`flex gap-4 p-4 rounded-xl border text-left transition-all ${
                        mode === 'manual' ? 'border-purple-500 bg-purple-50/20 shadow-sm' : 'border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50'
                    }`}
                >
                    <div className={`p-2.5 rounded-lg ${mode === 'manual' ? 'bg-purple-600 text-white' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400'}`}>
                        <UserCheck size={18} />
                    </div>
                    <div>
                        <div className="font-medium text-xs">Selective Selection</div>
                        <div className="text-[10px] text-neutral-500">Individual student control</div>
                    </div>
                </button>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    disabled={!sourceSession}
                    onClick={() => setStep(2)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-black px-10 py-3 rounded-xl font-medium shadow-lg hover:opacity-90 active:scale-95 disabled:opacity-30 transition-all"
                >
                    Continue <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );

    const renderStep2Manual = () => (
        <div className="flex flex-col h-full p-4 sm:p-6 gap-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-white">Selection Phase</h3>
                    <p className="text-xs text-neutral-500">{selectedStudentIds.size} students selected for promotion</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setSelectedStudentIds(new Set(filteredStudents.map(s => s._id)))}
                        className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
                    >
                        Select All
                    </button>
                    <button 
                        onClick={() => setSelectedStudentIds(new Set())}
                        className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:bg-neutral-50 px-3 py-1.5 rounded-lg transition-all"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                    <input
                        type="text"
                        placeholder="Search Name, GR, or Roll No..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-100 dark:border-neutral-900 rounded-xl bg-neutral-50/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                <select 
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="text-xs font-medium border border-neutral-100 dark:border-neutral-800 rounded-xl px-3 py-2 bg-white dark:bg-neutral-900"
                >
                    <option value="All">All Classes</option>
                    {CLASS_ORDER.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
                <select 
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className="text-xs font-medium border border-neutral-100 dark:border-neutral-800 rounded-xl px-3 py-2 bg-white dark:bg-neutral-900"
                >
                    <option value="All">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                </select>
            </div>

            {/* Sorting Header */}
            <div className="flex items-center gap-4 px-4 py-2 bg-neutral-50/50 dark:bg-neutral-900/50 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mr-auto">Sort By:</span>
                {[
                    { key: 'name', label: 'Name' },
                    { key: 'gr', label: 'GR' },
                    { key: 'roll', label: 'Roll' },
                    { key: 'class', label: 'Class' }
                ].map(item => (
                    <button
                        key={item.key}
                        onClick={() => toggleSort(item.key as any)}
                        className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                            sortConfig.key === item.key ? 'text-blue-600' : 'text-neutral-400'
                        }`}
                    >
                        {item.label}
                        {sortConfig.key === item.key && (sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto border border-neutral-100 dark:border-neutral-900 rounded-xl bg-white dark:bg-neutral-950 custom-scrollbar">
                {isLoadingStudents ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                        <Loader2 className="animate-spin text-neutral-200" />
                        <span className="text-[10px] uppercase font-bold text-neutral-400">Syncing Students...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
                        {filteredStudents.map(s => (
                            <div 
                                key={s._id}
                                onClick={() => toggleStudentSelection(s._id)}
                                className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                    selectedStudentIds.has(s._id) 
                                    ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/5' 
                                    : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900'
                                }`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                    selectedStudentIds.has(s._id) ? 'bg-blue-600 border-blue-600' : 'border-neutral-200 dark:border-neutral-800'
                                }`}>
                                    {selectedStudentIds.has(s._id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-neutral-900 dark:text-white truncate">{s.fullName}</p>
                                    <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">
                                        Roll: {s.rollNumber || 'N/A'} • GR: {s.grNumber}
                                    </p>
                                </div>
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-bold">
                                    {s.admissionFor}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-2">
                <button onClick={() => setStep(1)} className="text-xs font-medium text-neutral-400 hover:text-neutral-900">Back</button>
                <button
                    onClick={handlePrepareRefinement}
                    disabled={selectedStudentIds.size === 0}
                    className="bg-neutral-900 dark:bg-white text-white dark:text-black px-8 py-2.5 rounded-xl text-sm font-medium shadow-md disabled:opacity-30"
                >
                    Continue to Refine
                </button>
            </div>
        </div>
    );

    const renderStep3Refine = () => (
        <div className="flex flex-col h-full p-4 sm:p-6 gap-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-white">Refine Details</h3>
                    <p className="text-xs text-neutral-500">Edit individual roll numbers and classes</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Starting Roll No..."
                            value={bulkRollPrefix}
                            onChange={(e) => setBulkRollPrefix(e.target.value)}
                            className="pl-9 pr-3 py-2 text-xs border border-neutral-100 dark:border-neutral-900 rounded-lg w-40 bg-neutral-50/50"
                        />
                    </div>
                    <button 
                        onClick={applyBulkRollNumbers}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                        title="Apply sequence to all"
                    >
                        <RefreshCcw size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto border border-neutral-100 dark:border-neutral-900 rounded-xl overflow-y-auto bg-white dark:bg-neutral-950 custom-scrollbar shadow-sm">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-neutral-50/50 dark:bg-neutral-900/50 sticky top-0 z-10 border-b border-neutral-100 dark:border-neutral-900">
                        <tr>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Student</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Target Class</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Current Roll</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Next Roll Number</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50 dark:divide-neutral-900">
                        {refinedStudents.map((s, idx) => (
                            <tr key={s._id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-900/20 transition-colors">
                                <td className="px-4 py-3">
                                    <p className="text-xs font-medium">{s.fullName}</p>
                                    <p className="text-[9px] text-neutral-400 font-bold">GR: {s.grNumber}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={s.targetClass}
                                        onChange={(e) => {
                                            const next = [...refinedStudents];
                                            next[idx].targetClass = e.target.value;
                                            next[idx].nextRollNumber = suggestNextRoll(s.rollNumber, s.admissionFor, e.target.value);
                                            setRefinedStudents(next);
                                        }}
                                        className="text-xs font-medium text-blue-600 bg-transparent border-none p-0 focus:ring-0"
                                    >
                                        {CLASS_ORDER.map(cls => <option key={cls} value={cls}>Class {cls}</option>)}
                                    </select>
                                </td>
                                <td className="px-4 py-3 text-xs text-neutral-400">{s.rollNumber || '---'}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 focus-within:border-blue-500 transition-all max-w-[120px]">
                                        <Hash size={12} className="text-neutral-300" />
                                        <input
                                            type="text"
                                            value={s.nextRollNumber}
                                            onChange={(e) => {
                                                const next = [...refinedStudents];
                                                next[idx].nextRollNumber = e.target.value;
                                                setRefinedStudents(next);
                                            }}
                                            className="bg-transparent border-none focus:ring-0 p-0 text-xs font-medium w-full"
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between pt-2">
                <button onClick={() => setStep(2)} className="text-xs font-medium text-neutral-400 hover:text-neutral-900">Back</button>
                <button
                    onClick={() => setStep(4)}
                    className="bg-neutral-900 dark:bg-white text-white dark:text-black px-8 py-2.5 rounded-xl text-sm font-medium shadow-md"
                >
                    Review Final
                </button>
            </div>
        </div>
    );

    const renderSuccess = () => (
        <div className="flex flex-col items-center justify-center text-center p-8 h-full space-y-6">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 shadow-inner">
                <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
                <h3 className="text-2xl font-medium text-neutral-900">Success!</h3>
                <p className="text-sm text-neutral-500">Students have been promoted to the {selectedSession} session.</p>
            </div>
            <button onClick={onClose} className="bg-neutral-900 text-white px-10 py-3 rounded-xl font-medium">Close Wizard</button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-neutral-950 w-full max-w-7xl h-[95vh] sm:h-[90vh] rounded-xl sm:rounded-2xl border border-neutral-100 dark:border-neutral-900 shadow-2xl overflow-hidden flex flex-col relative"
            >
                {step < 5 && <ProgressHeader />}
                <div className="flex-1 overflow-y-auto">
                    {step === 1 && renderStep1()}
                    {step === 2 && (mode === 'bulk' ? <div>Bulk Step...</div> : renderStep2Manual())}
                    {step === 3 && renderStep3Refine()}
                    {step === 4 && <div className="p-8 text-center"><Zap className="mx-auto mb-4 text-blue-600" /><h3 className="text-xl font-medium">Ready to Execute?</h3><button onClick={handleExecute} className="mt-4 bg-neutral-900 text-white px-10 py-3 rounded-xl">{isExecuting ? 'Processing...' : 'Execute Promotion'}</button></div>}
                    {step === 5 && renderSuccess()}
                </div>
            </motion.div>
        </div>
    );
};

export default StudentPromotion;

"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  ClipboardList, 
  Calendar, 
  Users, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ArrowUpDown, 
  ChevronDown, 
  Lock 
} from 'lucide-react';
import { client } from '@/sanity/lib/client';
import { getAllStudentsQuery } from '@/sanity/lib/queries';
import { useSession } from '@/context/SessionContext';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import type { Student } from '@/types/student';

interface StudentAttendanceRow {
  studentId: string;
  fullName: string;
  rollNumber: string;
  grNumber: string;
  gender: string;
  photoUrl?: string;
  totalDays: number | '';
  present: number | '';
  absent: number | '';
  leave: number | '';
  isValid: boolean;
}

const AdminManualAttendance = ({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) => {
  const { selectedSession } = useSession();
  const { isSuperAdmin } = useAuth();

  // Filters state
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedGender, setSelectedGender] = useState<string>('All');

  // Core data states
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<StudentAttendanceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Bulk apply states
  const [bulkTotalDays, setBulkTotalDays] = useState<string>('26');
  const [bulkPresentDays, setBulkPresentDays] = useState<string>('26');

  // Hardcoded options to match school settings
  const classOptions = ['KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'SSCI', 'SSCII'];
  const genderOptions = [
    { label: 'All Genders', value: 'All' },
    { label: 'Boys', value: 'male' },
    { label: 'Girls', value: 'female' }
  ];

  // Set default current month
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${yyyy}-${mm}`);
  }, []);

  // Fetch all students for the session
  const loadStudentsAndData = async () => {
    if (!selectedSession || !selectedMonth || selectedClass === 'All') {
      return;
    }

    setLoading(true);
    if (onLoadingChange) onLoadingChange(true);

    try {
      // 1. Fetch Students of selected class & session from Sanity
      const fetchedStudents = await client.fetch<Student[]>(getAllStudentsQuery, { 
        session: selectedSession 
      });

      // Filter by class and optionally by gender
      const filtered = fetchedStudents.filter(s => {
        const matchesClass = s.admissionFor === selectedClass || s.admissionFor === `Class ${selectedClass}`;
        const matchesGender = selectedGender === 'All' || s.gender === selectedGender;
        return matchesClass && matchesGender;
      });

      // Sort by Roll Number numerically
      filtered.sort((a, b) => {
        const numA = parseInt(a.rollNumber?.toString().replace(/\D/g, '')) || 99999;
        const numB = parseInt(b.rollNumber?.toString().replace(/\D/g, '')) || 99999;
        if (numA !== numB) return numA - numB;
        return (a.rollNumber || '').localeCompare(b.rollNumber || '', undefined, { numeric: true });
      });

      setStudents(filtered);

      // 2. Fetch existing Manual Attendance Record from Firebase
      const docId = `manual_monthly__${selectedSession}__${selectedMonth}__${selectedClass}`;
      const docRef = doc(db, 'attendance', docId);
      const docSnap = await getDoc(docRef);

      let savedRecords: Record<string, { present: number; absent: number; leave: number; totalDays: number }> = {};
      let defaultTotalDays = 26;
      let hasSavedManualDoc = false;

      if (docSnap.exists()) {
        const data = docSnap.data();
        savedRecords = data.records || {};
        defaultTotalDays = data.totalDays || 26;
        setBulkTotalDays(String(defaultTotalDays));
        hasSavedManualDoc = true;
      }

      // 3. Fetch and Aggregate Mobile Daily Attendance Logs to act as smart defaults
      const startStr = `${selectedMonth}-01`;
      const endStr = `${selectedMonth}-31`;

      const mobileQuery = query(
        collection(db, 'daily_attendance'),
        where("date", ">=", startStr),
        where("date", "<=", endStr)
      );
      
      const mobileSnap = await getDocs(mobileQuery);
      
      // Calculate total active school days in this class based on unique scan dates
      const activeDates = new Set<string>();
      const mobileAggMap: Record<string, { present: number; absent: number; leave: number; total: number }> = {};

      mobileSnap.docs.forEach(docSnap => {
        const record = docSnap.data();
        const gr = record.grNumber;
        const status = (record.status || 'present').toLowerCase().trim();
        const recordClass = record.class || '';
        const matchesClass = recordClass === selectedClass || recordClass === `Class ${selectedClass}`;
        
        if (gr && matchesClass) {
          if (record.date) {
            activeDates.add(record.date);
          }
          if (!mobileAggMap[gr]) {
            mobileAggMap[gr] = { present: 0, absent: 0, leave: 0, total: 0 };
          }
          if (status === 'present') mobileAggMap[gr].present += 1;
          else if (status === 'leave') mobileAggMap[gr].leave += 1;
          else if (status === 'absent') mobileAggMap[gr].absent += 1;
        }
      });

      // Define default total active school days matching scanner dates (or default 26 if no scans)
      const calculatedTotalDays = activeDates.size > 0 ? activeDates.size : defaultTotalDays;

      // 4. Map students to attendance spreadsheet rows
      const rows: StudentAttendanceRow[] = filtered.map(student => {
        const studentId = student.grNumber || student._id || '';
        const saved = savedRecords[studentId];
        const mob = mobileAggMap[studentId];

        let tDays: number | '' = '';
        let p: number | '' = '';
        let a: number | '' = '';
        let l: number | '' = '';

        if (saved) {
          // If manual records have been saved before, load them as authoritative truth
          tDays = saved.totalDays;
          p = saved.present;
          a = saved.absent;
          l = saved.leave;
        } else if (mob) {
          // Smart Sync Strategy: Pre-populate from Mobile logs!
          // Absent is mathematically derived: Total Scanner Days - Presents - Leaves
          tDays = calculatedTotalDays;
          p = mob.present;
          l = mob.leave;
          a = Math.max(0, calculatedTotalDays - mob.present - mob.leave);
        }

        // Check validation
        const totalNum = tDays === '' ? 0 : tDays;
        const presentNum = p === '' ? 0 : p;
        const absentNum = a === '' ? 0 : a;
        const leaveNum = l === '' ? 0 : l;
        const isValid = (totalNum > 0) && (presentNum + absentNum + leaveNum) === totalNum;

        return {
          studentId,
          fullName: student.fullName,
          rollNumber: student.rollNumber || '—',
          grNumber: student.grNumber || '—',
          gender: student.gender,
          photoUrl: student.photoUrl,
          totalDays: tDays,
          present: p,
          absent: a,
          leave: l,
          isValid: isValid
        };
      });

      setAttendanceRows(rows);
      if (hasSavedManualDoc) {
        toast.success(`Loaded manual monthly overrides for ${rows.length} students.`);
      } else if (mobileSnap.size > 0) {
        toast.success(`Smart Sync: Pre-populated manual sheet using mobile app daily logs!`);
      } else {
        toast.success(`Loaded empty registry directory for ${rows.length} students.`);
      }
    } catch (error) {
      console.error("Error loading manual attendance sheet:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to load attendance directory: ${errMsg}`);
    } finally {
      setLoading(false);
      if (onLoadingChange) onLoadingChange(false);
    }
  };

  // Trigger load when selections change
  useEffect(() => {
    loadStudentsAndData();
  }, [selectedSession, selectedMonth, selectedClass, selectedGender]);

  // Handle cell value change in spreadsheet
  const handleCellChange = (index: number, field: 'totalDays' | 'present' | 'absent' | 'leave', valStr: string) => {
    let val: number | '' = '';
    if (valStr !== '') {
      val = Math.max(0, parseInt(valStr) || 0);
    }
    
    setAttendanceRows(prev => {
      const copy = [...prev];
      const row = { ...copy[index] };
      row[field] = val;
      
      // Smart Auto-Calculation Autocomplete (T = P + A + L)
      const t = row.totalDays;
      const p = row.present;
      const a = row.absent;
      const l = row.leave;

      // Scenario 1: Total, Present, Absent are entered -> Auto calculate Leave
      if (t !== '' && p !== '' && a !== '' && l === '') {
        row.leave = Math.max(0, t - p - a);
      }
      // Scenario 2: Total, Present, Leave are entered -> Auto calculate Absent
      else if (t !== '' && p !== '' && l !== '' && a === '') {
        row.absent = Math.max(0, t - p - l);
      }
      // Scenario 3: Total, Absent, Leave are entered -> Auto calculate Present
      else if (t !== '' && a !== '' && l !== '' && p === '') {
        row.present = Math.max(0, t - a - l);
      }
      // Scenario 4: Present, Absent, Leave are entered -> Auto calculate Total Days
      else if (p !== '' && a !== '' && l !== '' && t === '') {
        row.totalDays = p + a + l;
      }
      // Scenario 5: Total and Present are equal, and others are empty -> Auto fill Absent and Leave to 0
      else if (t !== '' && p !== '' && p === t && a === '' && l === '') {
        row.absent = 0;
        row.leave = 0;
      }

      // Re-run validation with updated/autocompleted values
      const tDays = row.totalDays === '' ? 0 : row.totalDays;
      const finalP = row.present === '' ? 0 : row.present;
      const finalA = row.absent === '' ? 0 : row.absent;
      const finalL = row.leave === '' ? 0 : row.leave;
      
      row.isValid = (finalP + finalA + finalL) === tDays;
      copy[index] = row;
      return copy;
    });
  };

  // Excel-style Keyboard Arrow Navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: 'totalDays' | 'present' | 'absent' | 'leave') => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.getElementById(`cell-${rowIndex + 1}-${field}`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`cell-${rowIndex - 1}-${field}`) as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  };

  // Bulk apply total days to all loaded rows
  const handleBulkApply = () => {
    const total = parseInt(bulkTotalDays) || 0;
    const presentVal = bulkPresentDays === '' ? '' : (parseInt(bulkPresentDays) || 0);

    if (total <= 0) {
      toast.error("Please enter a valid number of Total Days.");
      return;
    }

    setAttendanceRows(prev => {
      return prev.map(row => {
        const p = presentVal === '' ? '' : Math.min(presentVal, total);
        
        // If presents equals total days, then absents and leaves are mathematically forced to be 0!
        const a = (p !== '' && p === total) ? 0 : '';
        const l = (p !== '' && p === total) ? 0 : '';
        
        return {
          ...row,
          totalDays: total,
          present: p,
          absent: a,
          leave: l,
          isValid: p === total // Only automatically valid if presents equals total, otherwise requires editing
        };
      });
    });

    toast.success(`Applied ${total} Total Days to all students!`);
  };

  // Save/Publish Manual Attendance
  const handlePublish = async () => {
    if (!isSuperAdmin) {
      toast.error("Access Denied: Only Super Admins can publish records.");
      return;
    }

    if (attendanceRows.length === 0) {
      toast.error("No student records to save.");
      return;
    }

    // Enforce completeness: no empty or blank rows are permitted in published monthly registers
    const emptyRows = attendanceRows.filter(r => r.totalDays === '' || r.totalDays === 0);
    if (emptyRows.length > 0) {
      toast.error(`${emptyRows.length} student records are Empty. Please fill in all student rows or use Bulk Apply before publishing.`);
      return;
    }

    // Validate that all rows have correct sum matching total days
    const invalidRows = attendanceRows.filter(r => !r.isValid);
    if (invalidRows.length > 0) {
      toast.error(`${invalidRows.length} students have mismatching present/absent/leave values. Please resolve warnings before publishing.`);
      return;
    }

    setSaving(true);
    try {
      const docId = `manual_monthly__${selectedSession}__${selectedMonth}__${selectedClass}`;
      
      // Transform records array to Firestore Map keyed by grNumber
      const recordsMap: Record<string, any> = {};
      attendanceRows.forEach(row => {
        recordsMap[row.studentId] = {
          fullName: row.fullName,
          rollNumber: row.rollNumber,
          present: row.present === '' ? 0 : row.present,
          absent: row.absent === '' ? 0 : row.absent,
          leave: row.leave === '' ? 0 : row.leave,
          totalDays: row.totalDays === '' ? 0 : row.totalDays
        };
      });

      const payload = {
        month: selectedMonth,
        class: selectedClass,
        session: selectedSession,
        totalDays: parseInt(bulkTotalDays) || 26,
        records: recordsMap,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'attendance', docId), payload, { merge: true });
      toast.success("Manual aggregate attendance published successfully!");
    } catch (error) {
      console.error("Save Manual Attendance error:", error);
      toast.error("Failed to publish manual records.");
    } finally {
      setSaving(false);
    }
  };

  // Metrics
  const totalStudentsCount = attendanceRows.length;
  const errorCount = attendanceRows.filter(r => !r.isValid).length;

  return (
    <div className="space-y-4">
      {/* 1. Header Hero Card */}
      <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden transition-all">
        {/* Subtle backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
        <div className="absolute right-0 top-0 w-64 h-64 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.02),transparent_60%)] pointer-events-none" />
        
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="p-3 bg-blue-50 dark:bg-neutral-900 border border-blue-100 dark:border-neutral-800 text-blue-600 dark:text-blue-500 rounded-xl shadow-sm shrink-0">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-0.5 flex items-center gap-2">
              Manual Monthly Attendance
              <span className="px-2 py-0.5 text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-semibold rounded-md border border-amber-100 dark:border-amber-900/30">
                Spreadsheet Hub
              </span>
            </h1>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-none">
              Publish and override monthly aggregate student registers manually.
            </p>
          </div>
        </div>

        <button 
          onClick={loadStudentsAndData} 
          disabled={loading || selectedClass === 'All'}
          className="w-full md:w-auto px-4 py-2 bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-850 border border-gray-200 dark:border-neutral-800 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-semibold text-gray-700 dark:text-neutral-300 disabled:opacity-50 shadow-sm active:scale-95"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Sync Sheet
        </button>
      </div>

      {/* 2. Filters Grid Panel */}
      <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-4 rounded-2xl shadow-sm relative transition-all">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Month Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Calendar size={13} className="text-blue-500" />
              Target Month
            </label>
            <div className="relative">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer shadow-sm"
              />
            </div>
          </div>

          {/* Academic Session (Locked Context) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Sparkles size={13} className="text-indigo-500" />
              Session Locked
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-800 rounded-lg text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide select-none shadow-sm">
              {selectedSession || 'No Active Session'}
            </div>
          </div>

          {/* Class Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Users size={13} className="text-emerald-500" />
              Select Class
            </label>
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 pr-9 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg text-sm font-semibold text-gray-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer appearance-none shadow-sm uppercase"
              >
                <option value="All">Choose a Class...</option>
                {classOptions.map(cls => (
                  <option key={cls} value={cls}>Class {cls}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Gender Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <ArrowUpDown size={13} className="text-amber-500" />
              Filter Gender
            </label>
            <div className="relative">
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="w-full px-3 py-2 pr-9 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg text-sm font-semibold text-gray-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer appearance-none shadow-sm"
              >
                {genderOptions.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

        </div>
      </div>

      {selectedClass === 'All' ? (
        /* 3. Empty State / Guide Board */
        <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-16 text-center rounded-2xl shadow-sm flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-blue-50 dark:bg-neutral-900 text-blue-600 dark:text-blue-500 rounded-xl border border-blue-100 dark:border-neutral-800 flex items-center justify-center mb-5 shadow-sm">
            <ClipboardList size={26} />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">
            No Class Selected
          </h2>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
            Please choose a target Class and Academic Session from the dropdowns above to initialize the manual spreadsheet editor.
          </p>
        </div>
      ) : (
        /* 4. Loaded Sheet Area */
        <div className="space-y-4">
          
          {/* Quick-Actions / Sheet Status Controller */}
          <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
            {/* Quick Bulk Inputs */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <Sparkles size={13} className="text-yellow-500" />
                Quick Apply:
              </span>
              
              <div className="flex items-center">
                <span className="px-3 py-1.5 bg-gray-50 dark:bg-neutral-900 text-gray-500 border border-r-0 border-gray-200 dark:border-neutral-800 text-[11px] font-semibold rounded-l-lg">
                  Total
                </span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={bulkTotalDays}
                  onChange={(e) => setBulkTotalDays(e.target.value)}
                  className="w-16 px-2.5 py-1.5 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs font-bold text-gray-800 dark:text-white text-center rounded-r-lg"
                />
              </div>

              <div className="flex items-center">
                <span className="px-3 py-1.5 bg-gray-50 dark:bg-neutral-900 text-gray-500 border border-r-0 border-gray-200 dark:border-neutral-800 text-[11px] font-semibold rounded-l-lg">
                  Presents
                </span>
                <input
                  type="number"
                  min="0"
                  max="31"
                  value={bulkPresentDays}
                  onChange={(e) => setBulkPresentDays(e.target.value)}
                  className="w-16 px-2.5 py-1.5 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs font-bold text-gray-800 dark:text-white text-center rounded-r-lg"
                />
              </div>

              <button
                onClick={handleBulkApply}
                className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
              >
                Apply To All
              </button>
            </div>

            {/* Warnings / Metrics Stats */}
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-gray-400 uppercase text-[10px] tracking-wider">Class Size:</span>
                <span className="text-gray-900 dark:text-white font-bold">{totalStudentsCount}</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400">
                  <AlertCircle size={13} className="animate-pulse" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">{errorCount} Math Warnings</span>
                </div>
              )}
            </div>
          </div>

          {/* Spreadsheet Table Container */}
          <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto scrollbar-none max-w-full">
              <table className="w-full min-w-[900px] border-collapse text-[12px]">
                
                {/* Header */}
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-neutral-900/80 border-b border-gray-200 dark:border-neutral-800">
                    <th className="py-3 px-4 text-center font-semibold text-gray-500 uppercase w-16 border-r border-gray-200 dark:border-neutral-800">
                      Roll
                    </th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-500 uppercase w-24 border-r border-gray-200 dark:border-neutral-800">
                      GR No
                    </th>
                    <th className="py-3 px-6 text-left font-semibold text-gray-500 uppercase border-r border-gray-200 dark:border-neutral-800">
                      Student Name
                    </th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-500 uppercase w-20 border-r border-gray-200 dark:border-neutral-800">
                      Gender
                    </th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-500 uppercase w-28 border-r border-gray-200 dark:border-neutral-800 bg-gray-50/30 dark:bg-neutral-900/20">
                      Total Days
                    </th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-500 uppercase w-28 border-r border-gray-200 dark:border-neutral-800 bg-emerald-50/10">
                      Present
                    </th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-500 uppercase w-28 border-r border-gray-200 dark:border-neutral-800 bg-rose-50/10">
                      Absent
                    </th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-500 uppercase w-28 border-r border-gray-200 dark:border-neutral-800 bg-amber-50/10">
                      Leave
                    </th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-500 uppercase w-28">
                      Sheet Check
                    </th>
                  </tr>
                </thead>

                {/* Rows */}
                <tbody className="divide-y divide-gray-150 dark:divide-neutral-900">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, sIdx) => (
                      <tr key={`skeleton-${sIdx}`} className="animate-pulse">
                        {/* Roll */}
                        <td className="py-4 px-4 text-center border-r border-gray-100 dark:border-neutral-800">
                          <div className="h-4 w-6 bg-neutral-200 dark:bg-neutral-800 rounded-md mx-auto" />
                        </td>
                        {/* GR Number */}
                        <td className="py-4 px-4 text-center border-r border-gray-100 dark:border-neutral-800">
                          <div className="h-4 w-12 bg-neutral-200 dark:bg-neutral-800 rounded-md mx-auto" />
                        </td>
                        {/* Photo & Name */}
                        <td className="py-4 px-6 border-r border-gray-100 dark:border-neutral-800">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg shrink-0" />
                            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
                          </div>
                        </td>
                        {/* Gender */}
                        <td className="py-4 px-4 text-center border-r border-gray-100 dark:border-neutral-800">
                          <div className="h-4 w-8 bg-neutral-200 dark:bg-neutral-800 rounded-md mx-auto" />
                        </td>
                        {/* Total Days */}
                        <td className="py-4 px-4 text-center border-r border-gray-100 dark:border-neutral-800 bg-gray-50/10 dark:bg-neutral-900/10">
                          <div className="h-8 w-20 bg-neutral-200/80 dark:bg-neutral-800/80 rounded-lg mx-auto" />
                        </td>
                        {/* Present */}
                        <td className="py-4 px-4 text-center border-r border-gray-100 dark:border-neutral-800 bg-emerald-50/5 dark:bg-emerald-950/5">
                          <div className="h-8 w-20 bg-neutral-200/80 dark:bg-neutral-800/80 rounded-lg mx-auto" />
                        </td>
                        {/* Absent */}
                        <td className="py-4 px-4 text-center border-r border-gray-100 dark:border-neutral-800 bg-rose-50/5 dark:bg-rose-950/5">
                          <div className="h-8 w-20 bg-neutral-200/80 dark:bg-neutral-800/80 rounded-lg mx-auto" />
                        </td>
                        {/* Leave */}
                        <td className="py-4 px-4 text-center border-r border-gray-100 dark:border-neutral-800 bg-amber-50/5 dark:bg-amber-950/5">
                          <div className="h-8 w-20 bg-neutral-200/80 dark:bg-neutral-800/80 rounded-lg mx-auto" />
                        </td>
                        {/* Sheet Check */}
                        <td className="py-4 px-4 text-center">
                          <div className="h-5 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-md mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : attendanceRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        No student registers match the search/filter criteria.
                      </td>
                    </tr>
                  ) : (
                    attendanceRows.map((row, idx) => (
                    <tr 
                      key={row.studentId}
                      className="hover:bg-gray-50/30 dark:hover:bg-neutral-900/20 transition-colors"
                    >
                      {/* Roll */}
                      <td className="py-3 px-4 text-center font-semibold text-gray-500 border-r border-gray-150 dark:border-neutral-800">
                        {row.rollNumber}
                      </td>

                      {/* GR Number */}
                      <td className="py-3 px-4 text-center font-bold text-gray-800 dark:text-neutral-300 border-r border-gray-150 dark:border-neutral-800">
                        {row.grNumber}
                      </td>

                      {/* Photo & Name */}
                      <td className="py-3 px-6 border-r border-gray-150 dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 rounded-lg border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                            {row.photoUrl ? (
                              <Image src={row.photoUrl} alt="" fill className="object-cover" unoptimized />
                            ) : (
                              <span className="text-[10px] font-semibold text-gray-400">{row.fullName.charAt(0)}</span>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white leading-none">
                            {row.fullName}
                          </span>
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="py-3 px-4 text-center border-r border-gray-150 dark:border-neutral-800">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                          row.gender === 'male' 
                            ? 'bg-blue-50/50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30' 
                            : 'bg-rose-50/50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                        }`}>
                          {row.gender === 'male' ? 'Boy' : 'Girl'}
                        </span>
                      </td>

                      {/* Total Days Box */}
                      <td className="py-3 px-4 border-r border-gray-150 dark:border-neutral-800 bg-gray-50/20 dark:bg-neutral-900/10">
                        <div className="flex justify-center">
                          <input
                            id={`cell-${idx}-totalDays`}
                            type="number"
                            min="1"
                            value={row.totalDays}
                            onChange={(e) => handleCellChange(idx, 'totalDays', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx, 'totalDays')}
                            className="w-16 px-2 py-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-850 rounded-lg text-center font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm"
                          />
                        </div>
                      </td>

                      {/* Present Box */}
                      <td className="py-3 px-4 border-r border-gray-150 dark:border-neutral-800 bg-emerald-50/10">
                        <div className="flex justify-center">
                          <input
                            id={`cell-${idx}-present`}
                            type="number"
                            min="0"
                            value={row.present}
                            onChange={(e) => handleCellChange(idx, 'present', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx, 'present')}
                            className="w-16 px-2 py-1 bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-neutral-800 rounded-lg text-center font-bold text-emerald-600 dark:text-emerald-450 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-550 shadow-sm"
                          />
                        </div>
                      </td>

                      {/* Absent Box */}
                      <td className="py-3 px-4 border-r border-gray-150 dark:border-neutral-800 bg-rose-50/10">
                        <div className="flex justify-center">
                          <input
                            id={`cell-${idx}-absent`}
                            type="number"
                            min="0"
                            value={row.absent}
                            onChange={(e) => handleCellChange(idx, 'absent', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx, 'absent')}
                            className="w-16 px-2 py-1 bg-white dark:bg-neutral-900 border border-rose-200 dark:border-neutral-800 rounded-lg text-center font-bold text-rose-600 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-550 shadow-sm"
                          />
                        </div>
                      </td>

                      {/* Leave Box */}
                      <td className="py-3 px-4 border-r border-gray-150 dark:border-neutral-800 bg-amber-50/10">
                        <div className="flex justify-center">
                          <input
                            id={`cell-${idx}-leave`}
                            type="number"
                            min="0"
                            value={row.leave}
                            onChange={(e) => handleCellChange(idx, 'leave', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx, 'leave')}
                            className="w-16 px-2 py-1 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-neutral-800 rounded-lg text-center font-bold text-amber-600 dark:text-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-550 shadow-sm"
                          />
                        </div>
                      </td>

                      {/* Validation Badges */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          {row.totalDays === '' || row.totalDays === 0 ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-neutral-500">
                              <AlertCircle size={13} className="text-gray-300 dark:text-neutral-700" />
                              Empty
                            </span>
                          ) : row.isValid ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                              <CheckCircle2 size={12} />
                              Match
                            </span>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded-lg border border-rose-100 dark:border-rose-900/30 animate-pulse">
                                <AlertCircle size={10} />
                                Warning
                              </span>
                              <span className="text-[10px] font-medium text-gray-400 mt-0.5">
                               {(Number(row.present) || 0) + (Number(row.absent) || 0) + (Number(row.leave) || 0)} vs {Number(row.totalDays) || 0}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>

              </table>
            </div>
          </div>

          {/* 5. Sticky Publish Save Action Footer */}
          <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 leading-none">
                Data Verification Status
              </p>
              {errorCount === 0 ? (
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-500 flex items-center justify-center sm:justify-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  All Records Matched & Valid
                </p>
              ) : (
                <p className="text-sm font-semibold text-rose-500 flex items-center justify-center sm:justify-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  Cannot Publish: Math warnings detected
                </p>
              )}
            </div>

            <button
              onClick={handlePublish}
              disabled={saving || loading || errorCount > 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {saving ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {saving ? 'Publishing Sheet...' : 'Publish Monthly Register'}
              {!isSuperAdmin && <Lock size={12} className="opacity-70 ml-1" />}
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default AdminManualAttendance;

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FileSpreadsheet,
  Download,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
  Search,
  ArrowRightLeft,
  FileText,
  RefreshCw,
  Smartphone,
  ClipboardList,
  SlidersHorizontal,
  ChevronRight,
  Trophy,
  Award,
  Crown,
  Star
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { client } from '@/sanity/lib/client';
import { getAllStudentsQuery } from '@/sanity/lib/queries';
import { useSession } from '@/context/SessionContext';
import { toast } from 'sonner';
import type { Student } from '@/types/student';

interface CombinedRecord {
  grNumber: string;
  rollNumber: string;
  fullName: string;
  gender: string;
  photoUrl?: string;

  // Mobile (Daily Logs) Totals
  mobileTotalDays: number;
  mobilePresent: number;
  mobileAbsent: number;
  mobileLeave: number;

  // Manual Sheet Totals
  manualTotalDays: number;
  manualPresent: number;
  manualAbsent: number;
  manualLeave: number;

  hasMismatch: boolean;
  hasManualData: boolean;
  hasMobileData: boolean;
}

type RangeMode = 'single-month' | 'custom-range' | 'whole-year';

const formatMonthYear = (monthStr: string) => {
  if (!monthStr) return '';
  if (/[a-zA-Z]/.test(monthStr)) return monthStr.toUpperCase();
  const parts = monthStr.split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const monthNum = parseInt(parts[1], 10);
    const months = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    if (monthNum >= 1 && monthNum <= 12) {
      return `${months[monthNum - 1]} ${year}`;
    }
  }
  return monthStr.toUpperCase();
};

const AdminAttendanceOverview = ({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) => {
  const { selectedSession } = useSession();

  // Filter settings
  const [rangeMode, setRangeMode] = useState<RangeMode>('single-month');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'mismatch' | 'matched'>('all');

  // Loaded Data
  const [combinedRecords, setCombinedRecords] = useState<CombinedRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // School-Wide Perfect Attendance Modal States
  const [schoolModalOpen, setSchoolModalOpen] = useState<boolean>(false);
  const [schoolLoading, setSchoolLoading] = useState<boolean>(false);
  const [schoolLegends, setSchoolLegends] = useState<any[]>([]);
  const [schoolSearchTerm, setSchoolSearchTerm] = useState<string>('');
  const [selectedLegendForCertificate, setSelectedLegendForCertificate] = useState<any | null>(null);
  const [showLegendsOnHome, setShowLegendsOnHome] = useState<boolean>(false);
  const [savingHomeToggle, setSavingHomeToggle] = useState<boolean>(false);

  const classOptions = ['KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'SSCI', 'SSCII'];

  // Set default months on mount
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => {
    setMounted(true);
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${yyyy}-${mm}`);
    setStartMonth(`${yyyy}-01`);
    setEndMonth(`${yyyy}-${mm}`);
  }, []);

  // Helper: Get list of months between start and end inclusive (YYYY-MM)
  const getMonthsInRange = (start: string, end: string): string[] => {
    if (!start || !end) return [];
    const startParts = start.split('-');
    const endParts = end.split('-');
    if (startParts.length !== 2 || endParts.length !== 2) return [];

    const startYear = parseInt(startParts[0]);
    const startMonthVal = parseInt(startParts[1]);
    const endYear = parseInt(endParts[0]);
    const endMonthVal = parseInt(endParts[1]);

    const months: string[] = [];
    let currYear = startYear;
    let currMonth = startMonthVal;

    while (currYear < endYear || (currYear === endYear && currMonth <= endMonthVal)) {
      months.push(`${currYear}-${String(currMonth).padStart(2, '0')}`);
      currMonth++;
      if (currMonth > 12) {
        currMonth = 1;
        currYear++;
      }
    }
    return months;
  };

  // Helper: Get list of months for whole academic session (e.g. 2025-2026 -> June 2025 to May 2026)
  const getMonthsForSession = (sessionStr: string): string[] => {
    const parts = sessionStr.split('-');
    if (parts.length === 2) {
      const startYear = parseInt(parts[0]);
      const endYear = parseInt(parts[1]);
      if (!isNaN(startYear) && !isNaN(endYear)) {
        const months: string[] = [];
        // June of startYear to December of startYear
        for (let m = 6; m <= 12; m++) {
          months.push(`${startYear}-${String(m).padStart(2, '0')}`);
        }
        // January of endYear to May of endYear
        for (let m = 1; m <= 5; m++) {
          months.push(`${endYear}-${String(m).padStart(2, '0')}`);
        }
        return months;
      }
    }
    // Fallback to months of current calendar year
    const currentYear = new Date().getFullYear();
    const months: string[] = [];
    for (let m = 1; m <= 12; m++) {
      months.push(`${currentYear}-${String(m).padStart(2, '0')}`);
    }
    return months;
  };

  // Memoized months array based on active Range Mode
  const targetMonthsList = useMemo(() => {
    if (rangeMode === 'single-month') {
      return selectedMonth ? [selectedMonth] : [];
    }
    if (rangeMode === 'custom-range') {
      return getMonthsInRange(startMonth, endMonth);
    }
    if (rangeMode === 'whole-year') {
      return selectedSession ? getMonthsForSession(selectedSession) : [];
    }
    return [];
  }, [rangeMode, selectedMonth, startMonth, endMonth, selectedSession]);

  const loadData = async () => {
    if (!selectedSession || selectedClass === 'All' || targetMonthsList.length === 0) {
      return;
    }

    setLoading(true);
    if (onLoadingChange) onLoadingChange(true);

    try {
      // 1. Fetch students of selected class from Sanity
      const fetchedStudents = await client.fetch<Student[]>(getAllStudentsQuery, {
        session: selectedSession
      });

      const filteredStudents = fetchedStudents.filter(s => {
        return s.admissionFor === selectedClass || s.admissionFor === `Class ${selectedClass}`;
      });

      // Sort by Roll Number numerically
      filteredStudents.sort((a, b) => {
        const numA = parseInt(a.rollNumber?.toString().replace(/\D/g, '')) || 99999;
        const numB = parseInt(b.rollNumber?.toString().replace(/\D/g, '')) || 99999;
        if (numA !== numB) return numA - numB;
        return (a.rollNumber || '').localeCompare(b.rollNumber || '', undefined, { numeric: true });
      });

      if (filteredStudents.length === 0) {
        setCombinedRecords([]);
        setLoading(false);
        if (onLoadingChange) onLoadingChange(false);
        return;
      }

      // 2. Fetch & Aggregate Mobile daily logs for the entire date range
      const startStr = `${targetMonthsList[0]}-01`;
      const endStr = `${targetMonthsList[targetMonthsList.length - 1]}-31`;

      const mobileQuery = query(
        collection(db, 'daily_attendance'),
        where("date", ">=", startStr),
        where("date", "<=", endStr)
      );

      const mobileSnap = await getDocs(mobileQuery);

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

      const calculatedTotalDays = activeDates.size;

      // 3. Fetch & Aggregate Manual summaries across all targeted months in parallel
      const manualDocsPromises = targetMonthsList.map(async (monthStr) => {
        const manualDocId = `manual_monthly__${selectedSession}__${monthStr}__${selectedClass}`;
        const docRef = doc(db, 'attendance', manualDocId);
        const snap = await getDoc(docRef);
        return { exists: snap.exists(), data: snap.data() };
      });

      const manualSnaps = await Promise.all(manualDocsPromises);

      // Accumulate manual values per student GR number
      const manualAggMap: Record<string, { present: number; absent: number; leave: number; totalDays: number }> = {};
      let hasAnyManualData = false;

      manualSnaps.forEach(snap => {
        if (snap.exists && snap.data) {
          hasAnyManualData = true;
          const records = snap.data.records || {};

          Object.keys(records).forEach(gr => {
            const row = records[gr];
            if (!manualAggMap[gr]) {
              manualAggMap[gr] = { present: 0, absent: 0, leave: 0, totalDays: 0 };
            }
            manualAggMap[gr].present += (row.present || 0);
            manualAggMap[gr].absent += (row.absent || 0);
            manualAggMap[gr].leave += (row.leave || 0);
            manualAggMap[gr].totalDays += (row.totalDays || 0);
          });
        }
      });

      // 4. Combine mobile logs and manual aggregates
      const combined: CombinedRecord[] = filteredStudents.map(student => {
        const gr = student.grNumber || student._id || '';

        const rawMob = mobileAggMap[gr];
        const mob = rawMob ? {
          total: calculatedTotalDays,
          present: rawMob.present,
          leave: rawMob.leave,
          absent: Math.max(0, calculatedTotalDays - rawMob.present - rawMob.leave)
        } : { present: 0, absent: 0, leave: 0, total: 0 };

        const man = manualAggMap[gr] || { present: 0, absent: 0, leave: 0, totalDays: 0 };

        const hasMob = rawMob !== undefined && calculatedTotalDays > 0;
        const hasMan = man.totalDays > 0;

        const mismatch = hasMob && hasMan && (
          mob.present !== man.present ||
          mob.absent !== man.absent ||
          mob.leave !== man.leave ||
          mob.total !== man.totalDays
        );

        return {
          grNumber: student.grNumber || '—',
          rollNumber: student.rollNumber || '—',
          fullName: student.fullName,
          gender: student.gender,
          photoUrl: student.photoUrl,

          mobileTotalDays: mob.total,
          mobilePresent: mob.present,
          mobileAbsent: mob.absent,
          mobileLeave: mob.leave,

          manualTotalDays: man.totalDays,
          manualPresent: man.present,
          manualAbsent: man.absent,
          manualLeave: man.leave,

          hasMismatch: mismatch,
          hasManualData: hasMan,
          hasMobileData: hasMob
        };
      });

      setCombinedRecords(combined);
      toast.success(`Calculations complete for range. Synced ${combined.length} student registers.`);
    } catch (error) {
      console.error("Error loading combined attendance overview:", error);
      toast.error("Failed to sync attendance overview registers.");
    } finally {
      setLoading(false);
      if (onLoadingChange) onLoadingChange(false);
    }
  };

  const loadSchoolLegends = async () => {
    if (!selectedSession) return;
    setSchoolLoading(true);
    try {
      // Fetch Homepage display configuration
      try {
        const configRef = doc(db, "attendance", "legends_config__" + selectedSession);
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          setShowLegendsOnHome(!!configSnap.data().showOnHomePage);
        } else {
          setShowLegendsOnHome(false);
        }
      } catch (err) {
        console.error("Error loading homepage legends config:", err);
      }

      // 1. Fetch ALL students for this session from Sanity
      const allStudents = await client.fetch<Student[]>(getAllStudentsQuery, {
        session: selectedSession
      });

      if (allStudents.length === 0) {
        setSchoolLegends([]);
        setSchoolLoading(false);
        return;
      }

      // 2. Fetch all manual registers for targeted months/session from Firestore
      let allDocs: any[] = [];
      if (rangeMode === 'whole-year' || targetMonthsList.length === 0) {
        const prefixStart = `manual_monthly__${selectedSession}__`;
        const prefixEnd = `manual_monthly__${selectedSession}__\uf8ff`;
        const manualQuery = query(
          collection(db, 'attendance'),
          where("__name__", ">=", prefixStart),
          where("__name__", "<=", prefixEnd)
        );
        const snap = await getDocs(manualQuery);
        allDocs = snap.docs;
      } else {
        const manualSnapsPromises = targetMonthsList.map(async (monthStr) => {
          const prefixStart = `manual_monthly__${selectedSession}__${monthStr}__`;
          const prefixEnd = `manual_monthly__${selectedSession}__${monthStr}__\uf8ff`;
          const manualQuery = query(
            collection(db, 'attendance'),
            where("__name__", ">=", prefixStart),
            where("__name__", "<=", prefixEnd)
          );
          const snap = await getDocs(manualQuery);
          return snap.docs;
        });
        const allMonthSnaps = await Promise.all(manualSnapsPromises);
        allDocs = allMonthSnaps.flat();
      }

      // 3. Accumulate manual totals per student globally
      const globalAggMap: Record<string, { present: number; absent: number; leave: number; totalDays: number }> = {};

      allDocs.forEach(docSnap => {
        const data = docSnap.data();
        const records = data.records || {};
        Object.keys(records).forEach(gr => {
          const row = records[gr];
          if (!globalAggMap[gr]) {
            globalAggMap[gr] = { present: 0, absent: 0, leave: 0, totalDays: 0 };
          }
          globalAggMap[gr].present += (row.present || 0);
          globalAggMap[gr].absent += (row.absent || 0);
          globalAggMap[gr].leave += (row.leave || 0);
          globalAggMap[gr].totalDays += (row.totalDays || 0);
        });
      });

      // 4. Filter for absolute legends (total days > 0, 0 absents, 0 leaves)
      const legends: any[] = [];
      allStudents.forEach(student => {
        const gr = student.grNumber || student._id || '';
        const agg = globalAggMap[gr];
        
        if (agg && agg.totalDays > 0 && agg.absent === 0 && agg.leave === 0) {
          legends.push({
            grNumber: student.grNumber || '—',
            rollNumber: student.rollNumber || '—',
            fullName: student.fullName,
            gender: student.gender,
            photoUrl: student.photoUrl,
            className: student.admissionFor || 'Unassigned',
            totalDays: agg.totalDays,
            present: agg.present
          });
        }
      });

      // Group & Sort legends: Sort alphabetically/numerically by class, then by roll number
      legends.sort((a, b) => {
        const classComp = (a.className || '').localeCompare(b.className || '');
        if (classComp !== 0) return classComp;
        const numA = parseInt(a.rollNumber?.toString().replace(/\D/g, '')) || 99999;
        const numB = parseInt(b.rollNumber?.toString().replace(/\D/g, '')) || 99999;
        return numA - numB;
      });

      setSchoolLegends(legends);
    } catch (err) {
      console.error("Error loading school legends:", err);
      toast.error("Failed to load school-wide legends register.");
    } finally {
      setSchoolLoading(false);
    }
  };

  const handleToggleHomeLegends = async () => {
    if (!selectedSession) return;
    setSavingHomeToggle(true);
    try {
      const newValue = !showLegendsOnHome;
      const configRef = doc(db, "attendance", "legends_config__" + selectedSession);
      await setDoc(configRef, { 
        showOnHomePage: newValue,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setShowLegendsOnHome(newValue);
      if (newValue) {
        toast.success(`Session ${selectedSession} legends will now show on Homepage!`);
      } else {
        toast.success(`Session ${selectedSession} legends hidden from Homepage.`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to update homepage visibility settings.");
    } finally {
      setSavingHomeToggle(false);
    }
  };

  useEffect(() => {
    if (schoolModalOpen) {
      loadSchoolLegends();
    }
  }, [schoolModalOpen, targetMonthsList, selectedSession]);

  useEffect(() => {
    loadData();
  }, [selectedSession, rangeMode, selectedMonth, startMonth, endMonth, selectedClass]);

  // Handle Search and Tab Filters
  const processedRecords = combinedRecords.filter(r => {
    const matchesSearch = r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.grNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' ||
      (filterType === 'mismatch' && r.hasMismatch) ||
      (filterType === 'matched' && !r.hasMismatch && r.hasManualData && r.hasMobileData);

    return matchesSearch && matchesType;
  });

  // Calculate Metrics
  const totalStudents = combinedRecords.length;
  const mismatchCount = combinedRecords.filter(r => r.hasMismatch).length;
  const manualCoverage = combinedRecords.filter(r => r.hasManualData).length;
  const mobileCoverage = combinedRecords.filter(r => r.hasMobileData).length;

  // Calculate Top Attended Students (highest attendance percentage)
  const topPerformers = useMemo(() => {
    if (combinedRecords.length === 0) return [];
    
    const performers = combinedRecords.map(r => {
      let present = 0;
      let total = 0;
      if (r.hasManualData && r.manualTotalDays > 0) {
        present = r.manualPresent;
        total = r.manualTotalDays;
      } else if (r.hasMobileData && r.mobileTotalDays > 0) {
        present = r.mobilePresent;
        total = r.mobileTotalDays;
      }
      
      const pct = total > 0 ? (present / total) * 100 : 0;
      return {
        ...r,
        attendancePercentage: Math.round(pct * 10) / 10,
        presentCount: present,
        totalCount: total
      };
    });
    
    // Highlight students with active records and >= 85% attendance
    const validPerformers = performers.filter(p => p.totalCount > 0 && p.attendancePercentage >= 85);
    
    // Sort descending by percentage
    return validPerformers
      .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
      .slice(0, 3);
  }, [combinedRecords]);

  // Format active range string for headers
  const activeRangeStr = useMemo(() => {
    if (rangeMode === 'single-month') return selectedMonth;
    if (rangeMode === 'custom-range') return `${startMonth} to ${endMonth}`;
    if (rangeMode === 'whole-year') return `${selectedSession} (Whole Academic Session)`;
    return '';
  }, [rangeMode, selectedMonth, startMonth, endMonth, selectedSession]);

  // Export to CSV spreadsheet
  const handleExportCSV = () => {
    if (processedRecords.length === 0) {
      toast.error("No data available to export.");
      return;
    }

    const headers = [
      "Roll No",
      "GR No",
      "Student Name",
      "Gender",
      "Mobile Total Days",
      "Mobile Presents",
      "Mobile Absents",
      "Mobile Leaves",
      "Manual Total Days",
      "Manual Presents",
      "Manual Absents",
      "Manual Leaves",
      "Has Mismatch?"
    ];

    const csvRows = [
      headers.join(","),
      ...processedRecords.map(r => [
        `"${r.rollNumber}"`,
        `"${r.grNumber}"`,
        `"${r.fullName.replace(/"/g, '""')}"`,
        `"${r.gender === 'male' ? 'Boy' : 'Girl'}"`,
        r.mobileTotalDays,
        r.mobilePresent,
        r.mobileAbsent,
        r.mobileLeave,
        r.manualTotalDays,
        r.manualPresent,
        r.manualAbsent,
        r.manualLeave,
        `"${r.hasMismatch ? 'YES' : 'NO'}"`
      ].join(","))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Overview_Class_${selectedClass}_Range_${activeRangeStr.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Spreadsheet CSV report downloaded!");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!selectedLegendForCertificate) return;
    const legend = selectedLegendForCertificate;
    const toastId = toast.loading('Generating high-quality PDF certificate...');
    
    try {
      // Helper function to dynamically load and convert image to Base64 in canvas
      const getBase64Image = (imgUrl: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          // Convert relative to absolute URL to ensure correct loading
          img.src = imgUrl.startsWith('http') ? imgUrl : (window.location.origin + imgUrl);
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } else {
              reject(new Error('Canvas context null'));
            }
          };
          img.onerror = (err) => reject(err);
        });
      };

      // Load School Logo
      let logoBase64: string | null = null;
      try {
        logoBase64 = await getBase64Image('/logo.png');
      } catch (e) {
        console.warn('Failed to load logo base64:', e);
      }

      // Load Student Photo
      let studentPhotoBase64: string | null = null;
      if (legend.photoUrl) {
        try {
          studentPhotoBase64 = await getBase64Image(legend.photoUrl);
        } catch (e) {
          console.warn('Failed to load student photo base64:', e);
        }
      }

      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = 297;
      const pageH = 210;

      // 1. Double border frame
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(1.5);
      doc.rect(8, 8, pageW - 16, pageH - 16);
      doc.setLineWidth(0.5);
      doc.rect(12, 12, pageW - 24, pageH - 24);

      // 2. Corner accents
      doc.setLineWidth(1);
      const cs = 12;
      doc.line(14, 14, 14 + cs, 14); doc.line(14, 14, 14, 14 + cs);
      doc.line(pageW - 14, 14, pageW - 14 - cs, 14); doc.line(pageW - 14, 14, pageW - 14, 14 + cs);
      doc.line(14, pageH - 14, 14 + cs, pageH - 14); doc.line(14, pageH - 14, 14, pageH - 14 - cs);
      doc.line(pageW - 14, pageH - 14, pageW - 14 - cs, pageH - 14); doc.line(pageW - 14, pageH - 14, pageW - 14, pageH - 14 - cs);

      // 3. School Logo (Top-Center) - Placed further down with top breathing space
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', pageW / 2 - 9, 20, 18, 18);
      }

      // 4. School Name & Tagline - Positioned with an elegant gap below the Logo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(30, 30, 30);
      doc.text('AL-GHAZALI HIGH SCHOOL', pageW / 2, 45, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(217, 119, 6);
      doc.text('CAMPUS OF PIONEERS & SCHOLARS', pageW / 2, 51, { align: 'center' });

      // Divider line
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(0.3);
      doc.line(pageW / 2 - 30, 55, pageW / 2 + 30, 55);

      // 5. Certificate title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(120, 120, 120);
      doc.text('CERTIFICATE OF PERFECT ATTENDANCE', pageW / 2, 65, { align: 'center' });

      // Presented to
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(140, 140, 140);
      doc.text('This testimonial of honor is proudly presented to', pageW / 2, 74, { align: 'center' });

      // 6. Student Frame & Details Stack (Centered Alignment)
      const photoW = 22;
      const photoH = 22;
      const photoX = pageW / 2 - photoW / 2; // Centered photo
      const photoY = 82;

      // Photo Border Frame
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(0.8);
      doc.rect(photoX, photoY, photoW, photoH);

      if (studentPhotoBase64) {
        doc.addImage(studentPhotoBase64, 'JPEG', photoX + 1, photoY + 1, photoW - 2, photoH - 2);
      } else {
        // Initials Placeholder
        doc.setFillColor(252, 248, 235);
        doc.rect(photoX + 1, photoY + 1, photoW - 2, photoH - 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(217, 119, 6);
        doc.text(legend.fullName.substring(0, 2).toUpperCase(), pageW / 2, photoY + photoH / 2 + 3.5, { align: 'center' });
      }

      // Star Medal Badge Overlay on Photo
      doc.setFillColor(217, 119, 6);
      doc.circle(photoX + photoW - 1, photoY + photoH - 1, 3.2, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.4);
      doc.circle(photoX + photoW - 1, photoY + photoH - 1, 2.6, 'S');

      // Student Name (Centered, slightly bigger)
      doc.setFont('times', 'bold');
      doc.setFontSize(32);
      doc.setTextColor(217, 119, 6);
      doc.text(legend.fullName.toUpperCase(), pageW / 2, 115, { align: 'center' });

      // Student Details (Centered, slightly bigger)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(110, 110, 110);
      doc.text(`Class: ${legend.className}  |  Roll No: ${legend.rollNumber}  |  GR No: ${legend.grNumber}`, pageW / 2, 123, { align: 'center' });

      // 7. Description Text - Shifted lower to balance the centered block
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text('For outstanding commitment, punctuality, and scholarly dedication in maintaining a flawless', pageW / 2, 133, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text('100% attendance record with zero absent days and zero leaves.', pageW / 2, 139, { align: 'center' });

      // 8. Duration Label - Balanced spacing & Formatted Month
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(217, 119, 6);
      let durText = '';
      if (rangeMode === 'single-month') durText = `AWARDED FOR THE MONTH OF ${formatMonthYear(selectedMonth)}`;
      if (rangeMode === 'custom-range') durText = `AWARDED FOR THE RANGE ${formatMonthYear(startMonth)} TO ${formatMonthYear(endMonth)}`;
      if (rangeMode === 'whole-year') durText = `AWARDED FOR THE ACADEMIC SESSION ${(selectedSession ?? '').toUpperCase()}`;
      doc.text(durText, pageW / 2, 149, { align: 'center' });

      // 9. Signatures (Seal removed completely for clean elegant visual)
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.4);
      doc.line(40, 176, 90, 176);
      doc.line(pageW - 90, 176, pageW - 40, 176);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text('CLASS TEACHER', 65, 182, { align: 'center' });
      doc.text('OFFICE OF PRINCIPAL', pageW - 65, 182, { align: 'center' });

      // 10. Footer System-Generated message
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text('GENERATED BY IT DEPARTMENT OF AL GHAZALI', pageW / 2, 192, { align: 'center' });

      // 11. Credential ID (Relocated to Top Right Corner inside border)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(160, 160, 160);
      doc.text(`ID: AG-PRFT-${legend.grNumber}-${(selectedSession ?? '').toUpperCase()}`, pageW - 16, 17, { align: 'right' });

      doc.save(`Certificate_${legend.fullName.replace(/\s+/g, '_')}_${selectedSession ?? 'Session'}.pdf`);
      toast.dismiss(toastId);
      toast.success('Certificate PDF downloaded successfully!');
    } catch (err) {
      toast.dismiss(toastId);
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF certificate.');
    }
  };

  return (
    <div className="space-y-4 print:space-y-0 print:p-0">

      {/* 1. Header Hero Panel */}
      <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden transition-all print:hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
        <div className="absolute right-0 top-0 w-64 h-64 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.02),transparent_60%)] pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          <div className="p-3 bg-emerald-50 dark:bg-neutral-900 border border-emerald-100 dark:border-neutral-800 text-emerald-600 dark:text-emerald-500 rounded-xl shadow-sm shrink-0">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-0.5 flex items-center gap-2">
              Attendance Overview & Auditor
              <span className="px-2 py-0.5 text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 font-semibold rounded-md border border-emerald-100 dark:border-emerald-900/30">
                Auditor Hub
              </span>
            </h1>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-none">
              Side-by-side comparison, discrepancy analysis, and printable monthly registers.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading || selectedClass === 'All'}
          className="px-4 py-2 bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-850 border border-gray-200 dark:border-neutral-800 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-semibold text-gray-700 dark:text-neutral-300 disabled:opacity-50 shadow-sm active:scale-95"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Sync Hub
        </button>
      </div>

      {/* 2. Advanced Multi-Month Selection Toolbox */}
      <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-4 rounded-2xl shadow-sm relative transition-all print:hidden space-y-4">

        {/* Aggregation Mode Controls & School Legends */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 shrink-0">
              <SlidersHorizontal size={13} className="text-emerald-500" />
              Select Aggregation Mode:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRangeMode('single-month')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all active:scale-95 ${rangeMode === 'single-month'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-850 text-gray-700 dark:text-neutral-400 border-gray-200 dark:border-neutral-850'
                  }`}
              >
                📅 Single Month
              </button>
              <button
                onClick={() => setRangeMode('custom-range')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all active:scale-95 ${rangeMode === 'custom-range'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-850 text-gray-700 dark:text-neutral-400 border-gray-200 dark:border-neutral-850'
                  }`}
              >
                🗓️ Custom Month Range
              </button>
              <button
                onClick={() => setRangeMode('whole-year')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all active:scale-95 ${rangeMode === 'whole-year'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-850 text-gray-700 dark:text-neutral-400 border-gray-200 dark:border-neutral-850'
                  }`}
              >
                🎓 Whole Academic Session
              </button>
            </div>
          </div>

          <button
            onClick={() => setSchoolModalOpen(true)}
            className="sm:self-end px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shadow-amber-500/15 border border-amber-400/20 shrink-0"
          >
            <Trophy size={15} className="fill-white/20 animate-pulse" />
            School Perfect Attendance Legends
          </button>
        </div>

        <div className="border-t border-gray-150 dark:border-neutral-900 pt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">

          {/* Dynamic Month Pickers depending on rangeMode */}
          {rangeMode === 'single-month' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-500" />
                Target Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 cursor-pointer shadow-sm"
              />
            </div>
          )}

          {rangeMode === 'custom-range' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Calendar size={13} className="text-blue-500" />
                  Start Month
                </label>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 cursor-pointer shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <ChevronRight size={13} className="text-blue-500" />
                  End Month
                </label>
                <input
                  type="month"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 cursor-pointer shadow-sm"
                />
              </div>
            </>
          )}

          {rangeMode === 'whole-year' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-500" />
                Active Academic Session
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-850 rounded-lg text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide select-none shadow-sm">
                {selectedSession || 'No Active Session'}
              </div>
            </div>
          )}

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
                className="w-full px-3 py-2 pr-9 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg text-sm font-semibold text-gray-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 cursor-pointer appearance-none shadow-sm uppercase"
              >
                <option value="All">Choose a Class...</option>
                {classOptions.map(cls => (
                  <option key={cls} value={cls}>Class {cls}</option>
                ))}
              </select>
              <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" />
            </div>
          </div>

          {/* Student Search */}
          <div className="flex flex-col gap-1.5 lg:col-span-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Search size={13} className="text-indigo-500" />
              Search Student
            </label>
            <input
              type="text"
              placeholder="SEARCH BY NAME, ROLL, GR NO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 placeholder-gray-400 shadow-sm"
            />
          </div>

        </div>

        {/* Aggregated Months Breadcrumbs Info */}
        {targetMonthsList.length > 0 && selectedClass !== 'All' && (
          <div className="px-3.5 py-2 bg-gray-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-800 text-[11px] font-semibold text-gray-500 dark:text-neutral-450 tracking-wider flex flex-wrap items-center gap-1.5 rounded-xl">
            <span>Range Details ({targetMonthsList.length} months):</span>
            {targetMonthsList.map((m) => (
              <span key={m} className="px-2 py-0.5 bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 font-bold rounded-md shadow-xs border border-gray-200/50 dark:border-neutral-700">
                {m}
              </span>
            ))}
          </div>
        )}

      </div>
      {selectedClass === 'All' ? (
        /* Empty Filter State */
        <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-16 text-center rounded-2xl shadow-sm flex flex-col items-center justify-center print:hidden">
          <div className="w-14 h-14 bg-emerald-50 dark:bg-neutral-900 text-emerald-600 dark:text-emerald-500 rounded-xl border border-emerald-100 dark:border-neutral-800 flex items-center justify-center mb-5 shadow-sm">
            <FileSpreadsheet size={26} />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">
            No Class Selected
          </h2>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
            Please choose a Class and Target Month from the filters above to compare mobile daily logs with manual monthly registers side-by-side.
          </p>
        </div>
      ) : (
        /* Main Dashboard & Report Area */
        <div className="space-y-4 print:space-y-4">

          {/* Star Attendance Performers Ribbon */}
          {topPerformers.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/5 via-emerald-500/5 to-blue-500/5 dark:from-amber-950/10 dark:via-emerald-950/10 dark:to-blue-950/10 border border-gray-205 dark:border-neutral-900 p-4 rounded-2xl shadow-sm space-y-3.5 print:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 dark:bg-neutral-900 border border-amber-100 dark:border-neutral-800 text-amber-600 dark:text-amber-550 shadow-xs">
                    <Trophy size={15} />
                  </span>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider leading-none mb-0.5">
                      Class Attendance Stars
                    </h3>
                    <p className="text-[10px] font-medium text-gray-400">
                      Celebrating top students with the highest attendance rates this term.
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-500 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 px-2 py-0.5 rounded-lg">
                  <Star size={10} className="fill-amber-600 dark:fill-amber-500" />
                  Performance Shield
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {topPerformers.map((performer, idx) => {
                  // Determine rank specific icon/colors
                  const rankConfig = [
                    {
                      bg: "bg-amber-500/10 border-amber-250 dark:border-amber-900/40",
                      badgeBg: "bg-amber-50 text-amber-700 dark:bg-neutral-900 dark:text-amber-500 border-amber-100 dark:border-neutral-800",
                      badgeText: "Gold Star",
                      icon: <Crown size={12} className="text-amber-600 fill-amber-500/20" />,
                      border: "border-amber-300 dark:border-amber-800"
                    },
                    {
                      bg: "bg-slate-500/5 border-slate-200 dark:border-slate-800/40",
                      badgeBg: "bg-slate-50 text-slate-700 dark:bg-neutral-900 dark:text-slate-400 border-slate-100 dark:border-neutral-800",
                      badgeText: "Silver Star",
                      icon: <Award size={12} className="text-slate-500 fill-slate-500/20" />,
                      border: "border-slate-350 dark:border-slate-750"
                    },
                    {
                      bg: "bg-orange-500/5 border-orange-200 dark:border-orange-900/40",
                      badgeBg: "bg-orange-50 text-orange-700 dark:bg-neutral-900 dark:text-orange-550 border-orange-100 dark:border-neutral-800",
                      badgeText: "Bronze Star",
                      icon: <Trophy size={12} className="text-orange-600 fill-orange-500/20" />,
                      border: "border-orange-350 dark:border-orange-750"
                    }
                  ][idx] || {
                    bg: "bg-gray-50/50 border-gray-200 dark:border-neutral-900/40",
                    badgeBg: "bg-gray-50 text-gray-700 dark:bg-neutral-900 dark:text-gray-400 border-gray-100 dark:border-neutral-800",
                    badgeText: "Achiever",
                    icon: <Star size={12} className="text-gray-500" />,
                    border: "border-gray-300"
                  };

                  return (
                    <div
                      key={performer.grNumber}
                      className={`flex items-center gap-3 p-3 bg-white/70 dark:bg-neutral-950/70 border rounded-2xl shadow-xs transition-all hover:scale-[1.01] ${rankConfig.bg}`}
                    >
                      {/* Rank Crown/Trophy Badge */}
                      <span className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${rankConfig.badgeBg}`}>
                        {rankConfig.icon}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5 mb-0.5">
                          <h4 className="text-xs font-semibold text-gray-800 dark:text-white truncate">
                            {performer.fullName}
                          </h4>
                          <span className="text-[9px] font-bold text-gray-400 shrink-0">
                            R-{performer.rollNumber}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Percentage progress bar */}
                          <div className="flex-1 h-1.5 bg-gray-150 dark:bg-neutral-900 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                performer.attendancePercentage >= 95
                                  ? 'bg-emerald-500'
                                  : performer.attendancePercentage >= 90
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${performer.attendancePercentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-gray-700 dark:text-neutral-300 shrink-0">
                            {performer.attendancePercentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Audit Analytics Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">

            <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-none block mb-1">
                  Class Size
                </span>
                <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                  {totalStudents}
                </span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-neutral-900 text-blue-600 dark:text-blue-500 border border-blue-100 dark:border-neutral-800 rounded-xl shadow-xs">
                <Users size={16} />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-none block mb-1">
                  Mobile Attendance Logs
                </span>
                <span className="text-xl font-bold text-gray-900 dark:text-white leading-none flex items-center gap-1.5">
                  {mobileCoverage}
                  <span className="text-xs font-medium text-gray-400">students</span>
                </span>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-neutral-900 text-purple-600 dark:text-purple-500 border border-purple-100 dark:border-neutral-800 rounded-xl shadow-xs">
                <Smartphone size={16} />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-none block mb-1">
                  Manual Monthly Sheet
                </span>
                <span className="text-xl font-bold text-gray-900 dark:text-white leading-none flex items-center gap-1.5">
                  {manualCoverage}
                  <span className="text-xs font-medium text-gray-400">students</span>
                </span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-neutral-900 text-amber-600 dark:text-amber-500 border border-amber-100 dark:border-neutral-800 rounded-xl shadow-xs">
                <ClipboardList size={16} />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-none block mb-1">
                  Audit Discrepancies
                </span>
                <span className={`text-xl font-bold leading-none ${mismatchCount > 0 ? 'text-rose-600 dark:text-rose-500 animate-pulse' : 'text-emerald-600 dark:text-emerald-550'}`}>
                  {mismatchCount}
                </span>
              </div>
              <div className={`p-3 border rounded-xl shadow-xs ${mismatchCount > 0
                  ? 'bg-rose-50 dark:bg-neutral-900 text-rose-600 dark:text-rose-550 border-rose-100 dark:border-neutral-800'
                  : 'bg-emerald-50 dark:bg-neutral-900 text-emerald-600 dark:text-emerald-550 border-emerald-100 dark:border-neutral-800'
                }`}>
                {mismatchCount > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
              </div>
            </div>

          </div>

          {/* 4. Filter Options & Download Utility Header */}
          <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all print:hidden">
            {/* Audit Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all active:scale-95 ${filterType === 'all'
                    ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-neutral-950 shadow-sm'
                    : 'bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-850 text-gray-700 dark:text-neutral-400 border-gray-200 dark:border-neutral-850'
                  }`}
              >
                All Students ({totalStudents})
              </button>

              <button
                onClick={() => setFilterType('mismatch')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 active:scale-95 ${filterType === 'mismatch'
                    ? 'bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-500/10'
                    : 'bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-455 border-rose-105 dark:border-rose-900/30'
                  }`}
              >
                <AlertTriangle size={13} />
                Mismatches ({combinedRecords.filter(r => r.hasMismatch).length})
              </button>

              <button
                onClick={() => setFilterType('matched')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 active:scale-95 ${filterType === 'matched'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-500/10'
                    : 'bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-455 border-emerald-105 dark:border-emerald-900/30'
                  }`}
              >
                <CheckCircle2 size={13} />
                Audit Perfect ({combinedRecords.filter(r => !r.hasMismatch && r.hasManualData && r.hasMobileData).length})
              </button>
            </div>

            {/* Export and Print Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-neutral-900 dark:hover:bg-neutral-850 text-gray-700 dark:text-neutral-200 border border-gray-200 dark:border-neutral-850 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <Printer size={13} />
                Print Register
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95 shadow-emerald-500/10"
              >
                <Download size={13} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Printable Header Block (Visible only during Printing) */}
          <div className="hidden print:block border-b-2 border-neutral-900 pb-4 mb-4">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-wider text-neutral-900">
                  Al-Ghazali High School Portal
                </h1>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                  Official Attendance Register Summary (Cumulative)
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black uppercase text-neutral-900">Class: {selectedClass}</p>
                <p className="text-[10px] font-bold text-neutral-500 uppercase">Range: {activeRangeStr}</p>
              </div>
            </div>
          </div>

          {/* 5. Main Comparison Sheet Table */}
          <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none">
            <div className="overflow-x-auto scrollbar-none max-w-full">
              <table className="w-full min-w-[950px] border-collapse text-[11px] print:min-w-0 print:w-full">

                {/* Table Header */}
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-neutral-900 border-b border-gray-150 dark:border-neutral-800 text-[10px]">
                    <th colSpan={4} className="py-2 px-4 text-center font-semibold uppercase text-gray-500 tracking-wider border-r border-b border-gray-150 dark:border-neutral-800">
                      Basic Student Details
                    </th>
                    <th colSpan={4} className="py-2 px-4 text-center font-semibold uppercase text-purple-600 dark:text-purple-450 tracking-wider bg-purple-50/5 dark:bg-purple-950/5 border-r border-b border-gray-150 dark:border-neutral-800">
                      📱 Mobile Device Attendance
                    </th>
                    <th colSpan={4} className="py-2 px-4 text-center font-semibold uppercase text-amber-600 dark:text-amber-500 tracking-wider bg-amber-50/5 dark:bg-amber-950/5 border-r border-b border-gray-150 dark:border-neutral-800">
                      ✍️ Manual Spreadsheet Summary
                    </th>
                    <th className="py-2 px-4 text-center font-semibold uppercase text-gray-500 tracking-wider border-b border-gray-150 dark:border-neutral-800 print:hidden">
                      Audit Checks
                    </th>
                  </tr>
                  <tr className="bg-gray-50/20 dark:bg-neutral-900/50 border-b border-gray-150 dark:border-neutral-800 text-[9px]">
                    {/* Basic info fields */}
                    <th className="py-2 px-3 text-center font-semibold text-gray-400 uppercase w-12 border-r border-gray-150 dark:border-neutral-800">Roll</th>
                    <th className="py-2 px-3 text-center font-semibold text-gray-400 uppercase w-20 border-r border-gray-150 dark:border-neutral-800">GR No</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-400 uppercase border-r border-gray-150 dark:border-neutral-800">Name</th>
                    <th className="py-2 px-3 text-center font-semibold text-gray-400 uppercase w-16 border-r border-gray-150 dark:border-neutral-800">Gender</th>

                    {/* Mobile fields */}
                    <th className="py-2 px-2 text-center font-semibold text-purple-550 dark:text-purple-400 uppercase bg-purple-50/5 border-r border-gray-100 dark:border-neutral-850">Total</th>
                    <th className="py-2 px-2 text-center font-semibold text-purple-550 dark:text-purple-400 uppercase bg-purple-50/5 border-r border-gray-100 dark:border-neutral-850">Presents</th>
                    <th className="py-2 px-2 text-center font-semibold text-purple-550 dark:text-purple-400 uppercase bg-purple-50/5 border-r border-gray-100 dark:border-neutral-850">Absents</th>
                    <th className="py-2 px-2 text-center font-semibold text-purple-550 dark:text-purple-400 uppercase bg-purple-50/5 border-r border-gray-150 dark:border-neutral-800">Leaves</th>

                    {/* Manual fields */}
                    <th className="py-2 px-2 text-center font-semibold text-amber-600 dark:text-amber-400 uppercase bg-amber-50/5 border-r border-gray-100 dark:border-neutral-850">Total</th>
                    <th className="py-2 px-2 text-center font-semibold text-amber-600 dark:text-amber-400 uppercase bg-amber-50/5 border-r border-gray-100 dark:border-neutral-850">Presents</th>
                    <th className="py-2 px-2 text-center font-semibold text-amber-600 dark:text-amber-400 uppercase bg-amber-50/5 border-r border-gray-100 dark:border-neutral-850">Absents</th>
                    <th className="py-2 px-2 text-center font-semibold text-amber-600 dark:text-amber-400 uppercase bg-amber-50/5 border-r border-gray-150 dark:border-neutral-800">Leaves</th>

                    {/* Audit Checks */}
                    <th className="py-2 px-3 text-center font-semibold text-gray-400 uppercase print:hidden">Mismatch status</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-gray-150 dark:divide-neutral-900">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, sIdx) => (
                      <tr key={`skeleton-${sIdx}`} className="animate-pulse">
                        {/* Roll */}
                        <td className="py-3 px-3 text-center border-r border-gray-150 dark:border-neutral-850">
                          <div className="h-4 w-6 bg-neutral-200 dark:bg-neutral-800 rounded-md mx-auto" />
                        </td>
                        {/* GR */}
                        <td className="py-3 px-3 text-center border-r border-gray-150 dark:border-neutral-850">
                          <div className="h-4 w-12 bg-neutral-200 dark:bg-neutral-800 rounded-md mx-auto" />
                        </td>
                        {/* Name */}
                        <td className="py-3 px-4 border-r border-gray-150 dark:border-neutral-850">
                          <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
                        </td>
                        {/* Gender */}
                        <td className="py-3 px-3 text-center border-r border-gray-150 dark:border-neutral-850">
                          <div className="h-4 w-10 bg-neutral-200 dark:bg-neutral-800 rounded-md mx-auto" />
                        </td>
                        {/* Mobile Total */}
                        <td className="py-3 px-2 text-center bg-purple-50/5 border-r border-gray-100 dark:border-neutral-850">
                          <div className="h-4 w-6 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-md mx-auto" />
                        </td>
                        {/* Mobile Present */}
                        <td className="py-3 px-2 text-center bg-purple-50/5 border-r border-gray-100 dark:border-neutral-850">
                          <div className="h-4 w-6 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-md mx-auto" />
                        </td>
                        {/* Mobile Absent */}
                        <td className="py-3 px-2 text-center bg-purple-50/5 border-r border-gray-100 dark:border-neutral-850">
                          <div className="h-4 w-6 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-md mx-auto" />
                        </td>
                        {/* Mobile Leave */}
                        <td className="py-3 px-2 text-center bg-purple-50/5 border-r border-gray-150 dark:border-neutral-850">
                          <div className="h-4 w-6 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-md mx-auto" />
                        </td>
                        {/* Manual Total */}
                        <td className="py-3 px-2 text-center bg-amber-50/5 border-r border-gray-100 dark:border-neutral-850">
                          <div className="h-4 w-6 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-md mx-auto" />
                        </td>
                        {/* Manual Present */}
                        <td className="py-3 px-2 text-center bg-amber-50/5 border-r border-gray-100 dark:border-neutral-850">
                          <div className="h-4 w-6 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-md mx-auto" />
                        </td>
                        {/* Manual Absent */}
                        <td className="py-3 px-2 text-center bg-amber-50/5 border-r border-gray-100 dark:border-neutral-850">
                          <div className="h-4 w-6 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-md mx-auto" />
                        </td>
                        {/* Manual Leave */}
                        <td className="py-3 px-2 text-center bg-amber-50/5 border-r border-gray-150 dark:border-neutral-850">
                          <div className="h-4 w-6 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-md mx-auto" />
                        </td>
                        {/* Mismatch status */}
                        <td className="py-3 px-3 text-center print:hidden">
                          <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-md mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : processedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-8 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        No student registers match the search/filter criteria.
                      </td>
                    </tr>
                  ) : (
                    processedRecords.map((r) => {
                      const hasPerfectAttendance = (r.hasManualData && r.manualTotalDays > 0 && r.manualAbsent === 0 && r.manualLeave === 0) ||
                        (!r.hasManualData && r.hasMobileData && r.mobileTotalDays > 0 && r.mobileAbsent === 0 && r.mobileLeave === 0);

                      return (
                        <tr
                          key={r.grNumber}
                          className={`hover:bg-gray-50/30 dark:hover:bg-neutral-900/10 transition-colors ${
                            r.hasMismatch
                              ? 'bg-rose-50/10 dark:bg-rose-950/5'
                              : hasPerfectAttendance
                              ? 'bg-emerald-50/20 dark:bg-emerald-950/5 border-l-2 border-l-emerald-550'
                              : ''
                          }`}
                        >

                          {/* Roll */}
                          <td className="py-3 px-3 text-center font-semibold text-gray-500 border-r border-gray-150 dark:border-neutral-850">
                            {r.rollNumber}
                          </td>

                          {/* GR */}
                          <td className="py-3 px-3 text-center font-bold text-gray-800 dark:text-neutral-300 border-r border-gray-150 dark:border-neutral-850">
                            {r.grNumber}
                          </td>

                          {/* Name */}
                          <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white border-r border-gray-150 dark:border-neutral-850">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{r.fullName}</span>
                              {hasPerfectAttendance && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 text-[9px] font-bold tracking-tight shrink-0">
                                  <Star size={8} className="fill-emerald-500" />
                                  100%
                                </span>
                              )}
                            </div>
                          </td>

                        {/* Gender */}
                        <td className="py-3 px-3 text-center border-r border-gray-150 dark:border-neutral-850">
                          <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-lg border ${r.gender === 'male'
                              ? 'bg-blue-50/50 text-blue-600 border-blue-105 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/20'
                              : 'bg-rose-50/50 text-rose-600 border-rose-105 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/20'
                            }`}>
                            {r.gender === 'male' ? 'Boy' : 'Girl'}
                          </span>
                        </td>

                        {/* Mobile fields */}
                        <td className="py-3 px-2 text-center bg-purple-50/5 border-r border-gray-100 dark:border-neutral-850 font-semibold text-gray-500">
                          {r.hasMobileData ? r.mobileTotalDays : '—'}
                        </td>
                        <td className="py-3 px-2 text-center bg-purple-50/5 border-r border-gray-100 dark:border-neutral-850 font-bold text-purple-600 dark:text-purple-400">
                          {r.hasMobileData ? r.mobilePresent : '—'}
                        </td>
                        <td className="py-3 px-2 text-center bg-purple-50/5 border-r border-gray-100 dark:border-neutral-850 font-semibold text-rose-650 dark:text-rose-400">
                          {r.hasMobileData ? r.mobileAbsent : '—'}
                        </td>
                        <td className="py-3 px-2 text-center bg-purple-50/5 border-r border-gray-150 dark:border-neutral-850 font-semibold text-amber-600 dark:text-amber-400">
                          {r.hasMobileData ? r.mobileLeave : '—'}
                        </td>

                        {/* Manual fields */}
                        <td className="py-3 px-2 text-center bg-amber-50/5 border-r border-gray-100 dark:border-neutral-850 font-semibold text-gray-500">
                          {r.hasManualData ? r.manualTotalDays : '—'}
                        </td>
                        <td className="py-3 px-2 text-center bg-amber-50/5 border-r border-gray-100 dark:border-neutral-850 font-bold text-amber-650 dark:text-amber-405">
                          {r.hasManualData ? r.manualPresent : '—'}
                        </td>
                        <td className="py-3 px-2 text-center bg-amber-50/5 border-r border-gray-100 dark:border-neutral-850 font-semibold text-rose-650 dark:text-rose-400">
                          {r.hasManualData ? r.manualAbsent : '—'}
                        </td>
                        <td className="py-3 px-2 text-center bg-amber-50/5 border-r border-gray-150 dark:border-neutral-850 font-semibold text-amber-600 dark:text-amber-400">
                          {r.hasManualData ? r.manualLeave : '—'}
                        </td>

                        {/* Mismatch status Check */}
                        <td className="py-3 px-3 text-center print:hidden">
                          <div className="flex justify-center">
                            {!r.hasManualData && !r.hasMobileData ? (
                              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                No Records
                              </span>
                            ) : r.hasMismatch ? (
                              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 px-2 py-0.5 rounded-lg animate-pulse">
                                <AlertTriangle size={10} />
                                Mismatch
                              </span>
                            ) : (r.hasManualData !== r.hasMobileData) ? (
                              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-amber-650 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 px-2 py-0.5 rounded-lg">
                                <AlertTriangle size={10} />
                                Pending Audit
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 px-2 py-0.5 rounded-lg">
                                <CheckCircle2 size={10} />
                                Audited
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>

              </table>
            </div>
          </div>

          {/* Sticky Summary / Mismatch Alert Banner */}
          {mismatchCount > 0 && (
            <div className="bg-rose-50/50 dark:bg-neutral-900/50 border border-rose-200 dark:border-rose-900/60 p-4 rounded-2xl shadow-sm flex items-start gap-3 print:hidden">
              <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 animate-bounce" size={16} />
              <div>
                <h4 className="text-xs font-semibold text-rose-800 dark:text-rose-400 uppercase tracking-widest mb-0.5">
                  Audit Alert: {mismatchCount} Student Registers Mismatching in Range!
                </h4>
                <p className="text-[11px] font-medium text-rose-600 dark:text-neutral-400 uppercase tracking-wider leading-relaxed">
                  Discrepancies have been detected between the mobile daily logs and manual override spreadsheet registers. Verify values with teachers or select the "Mismatches" filter above to investigate.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 6. School-Wide Perfect Attendance Legends Modal */}
      {schoolModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 print:hidden">
          {/* Backdrop Blur Overlay */}
          <div 
            className="absolute inset-0 bg-neutral-950/60 backdrop-blur-md transition-all duration-300 animate-fade-in"
            onClick={() => setSchoolModalOpen(false)}
          />
          
          {/* Modal Card */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-950 border border-gray-250 dark:border-neutral-900 rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up z-10">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 p-5 border-b border-gray-150 dark:border-neutral-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-none bg-amber-500/20 text-amber-600 dark:text-amber-500 border border-amber-500/20 shadow-xs">
                  <Trophy size={18} className="fill-amber-500/20 animate-pulse" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider leading-none mb-1">
                    School Perfect Attendance Legends
                  </h3>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                    {rangeMode === 'single-month' && `Honoring students with a flawless 100% attendance record during the month of ${selectedMonth}.`}
                    {rangeMode === 'custom-range' && `Honoring students with a flawless 100% attendance record from ${startMonth} to ${endMonth}.`}
                    {rangeMode === 'whole-year' && `Honoring students with a flawless 100% attendance record since the start of academic session ${selectedSession}.`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSchoolModalOpen(false)}
                className="w-7 h-7 rounded-none bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-850 text-gray-400 hover:text-gray-700 dark:hover:text-white flex items-center justify-center transition-all text-xs font-bold border border-gray-200 dark:border-neutral-850"
              >
                ✕
              </button>
            </div>

            {/* Modal Body & Filters */}
            <div className="p-4 border-b border-gray-100 dark:border-neutral-900 bg-gray-50/50 dark:bg-neutral-900/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={13} />
                <input
                  type="text"
                  placeholder="Search legends by name, class, roll..."
                  value={schoolSearchTerm}
                  onChange={(e) => setSchoolSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 rounded-none text-xs font-medium placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:text-white transition-all"
                />
              </div>

              {/* Show/Hide Toggler Button */}
              <button
                onClick={handleToggleHomeLegends}
                disabled={savingHomeToggle}
                className={`flex items-center gap-2 px-3.5 py-1.5 border transition-all text-[11px] font-black uppercase tracking-wider rounded-none shrink-0 disabled:opacity-50 select-none ${
                  showLegendsOnHome
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "bg-gray-50 dark:bg-neutral-900 border-gray-200 dark:border-neutral-850 hover:border-amber-500/40 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  showLegendsOnHome ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                }`} />
                {showLegendsOnHome ? "Show on Homepage: Active" : "Show on Homepage: Inactive"}
              </button>

              <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-none bg-amber-500 animate-ping" />
                Total Legends: {schoolLegends.filter(l => 
                  l.fullName.toLowerCase().includes(schoolSearchTerm.toLowerCase()) ||
                  l.className.toLowerCase().includes(schoolSearchTerm.toLowerCase()) ||
                  l.rollNumber.toString().includes(schoolSearchTerm)
                ).length} Students
              </div>
            </div>

            {/* Legends List Container */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-none min-h-[300px]">
              {schoolLoading ? (
                /* Loading State */
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-amber-550 border-t-transparent rounded-none animate-spin" />
                    <Trophy size={16} className="absolute text-amber-550 fill-amber-550/20" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                    Auditing Whole School Registers...
                  </p>
                </div>
              ) : schoolLegends.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="w-12 h-12 rounded-none bg-amber-50 dark:bg-neutral-900 text-amber-600 dark:text-amber-500 border border-amber-100 dark:border-neutral-800 flex items-center justify-center mb-4 shadow-sm">
                    <Star size={20} />
                  </span>
                  <h4 className="text-xs font-semibold text-gray-850 dark:text-white mb-1 uppercase tracking-wider">
                    No Legends Found
                  </h4>
                  <p className="text-[10px] font-medium text-gray-400 max-w-xs leading-relaxed">
                    {rangeMode === 'single-month' && `No students have maintained a 100% flawless attendance record in ${selectedMonth}.`}
                    {rangeMode === 'custom-range' && `No students have maintained a 100% flawless attendance record from ${startMonth} to ${endMonth}.`}
                    {rangeMode === 'whole-year' && `No students have maintained a 100% flawless attendance record since the start of academic session ${selectedSession}.`}
                  </p>
                </div>
              ) : (
                /* Filtered Legends list */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {schoolLegends
                    .filter(l => 
                      l.fullName.toLowerCase().includes(schoolSearchTerm.toLowerCase()) ||
                      l.className.toLowerCase().includes(schoolSearchTerm.toLowerCase()) ||
                      l.rollNumber.toString().includes(schoolSearchTerm)
                    )
                    .map((legend) => (
                      <div
                        key={legend.grNumber}
                        className="bg-white dark:bg-neutral-950 border border-gray-150 dark:border-neutral-900 p-3.5 rounded-none flex items-center gap-3.5 transition-all hover:scale-[1.01] hover:border-amber-250 dark:hover:border-amber-900/40 hover:shadow-xs group"
                      >
                        {/* Profile Photo / Dynamic Initial Placeholder */}
                        <div className="relative">
                          {legend.photoUrl ? (
                            <img
                              src={legend.photoUrl}
                              alt={legend.fullName}
                              className="w-10 h-10 rounded-none object-cover border-2 border-amber-400 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-none bg-gradient-to-br from-amber-50 to-orange-50 dark:from-neutral-900 dark:to-neutral-850 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-neutral-800 flex items-center justify-center font-bold text-xs shadow-sm uppercase">
                              {legend.fullName.substring(0, 2)}
                            </div>
                          )}
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 border border-white dark:border-neutral-950 rounded-none flex items-center justify-center text-[8px] font-bold text-white shadow-xs">
                            ★
                          </span>
                        </div>

                        {/* Legend Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <h4 className="text-[11px] font-bold text-gray-800 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
                              {legend.fullName}
                            </h4>
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-500 bg-amber-50/50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded-none border border-amber-100 dark:border-amber-900/30 tracking-wider shrink-0 uppercase">
                              {legend.className}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] font-medium text-gray-400 uppercase">
                            <span>Roll: {legend.rollNumber}</span>
                            <span>GR: {legend.grNumber}</span>
                          </div>
                          
                          {/* Perfect stat ribbon */}
                          <div className="mt-1.5 flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/20 px-2 py-0.5 rounded-none w-max uppercase tracking-wider">
                            <CheckCircle2 size={8} />
                            {legend.totalDays} Days Present (100%)
                          </div>
                        </div>

                        {/* Certificate Trigger Button */}
                        <button
                          onClick={() => setSelectedLegendForCertificate(legend)}
                          title="Generate Appreciation Certificate"
                          className="h-9 w-9 shrink-0 bg-amber-500/10 hover:bg-amber-500 text-amber-650 dark:text-amber-500 hover:text-white border border-amber-500/25 hover:border-amber-500 transition-all duration-200 flex items-center justify-center rounded-none active:scale-95 shadow-sm"
                        >
                          <Award size={16} className="fill-amber-500/10 hover:fill-white animate-pulse" />
                        </button>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-150 dark:border-neutral-900 bg-gray-50/50 dark:bg-neutral-900/30 flex items-center justify-end gap-3">
              <button
                onClick={() => setSchoolModalOpen(false)}
                className="px-4 py-2.5 bg-neutral-950 hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 rounded-none text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 border border-neutral-950 dark:border-white"
              >
                Close Register
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* 7. Student Appreciation Certificate Modal */}
      {selectedLegendForCertificate && mounted && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 print:p-0 print:bg-white overflow-y-auto"
          style={{ zIndex: 9999 }}
        >
          {/* Deep dark glass backdrop overlay */}
          <div 
            className="absolute inset-0 bg-neutral-950/85 backdrop-blur-xl transition-all duration-300 animate-fade-in print:hidden"
            style={{ zIndex: 9998 }}
            onClick={() => setSelectedLegendForCertificate(null)}
          />
          
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-certificate, #printable-certificate * {
                visibility: visible !important;
              }
              #printable-certificate {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 297mm !important;
                height: 210mm !important;
                margin: 0 !important;
                padding: 15mm !important;
                border: 12px double #d97706 !important;
                background: white !important;
                color: black !important;
                box-shadow: none !important;
                z-index: 99999 !important;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
              }
              .print-hide {
                display: none !important;
              }
            }
            @page {
              size: landscape;
              margin: 0;
            }
          `}</style>

          {/* Dialog Container */}
          <div 
            className="w-full max-w-2xl flex flex-col gap-4 animate-scale-up print:m-0 print:w-full print:max-w-none"
            style={{ zIndex: 9999 }}
          >
            
            {/* Header Controls (Screen Only) */}
            <div className="flex flex-wrap items-center justify-between bg-neutral-900/90 dark:bg-neutral-950/90 p-4 border border-neutral-800 backdrop-blur-md rounded-xl print-hide gap-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-lg">
                  <Award size={16} className="fill-amber-500/20" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Appreciation Certificate</h4>
                  <p className="text-[9px] text-gray-400 font-semibold uppercase">Official system-generated credential</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition-all shadow-md active:scale-95 border border-emerald-500/30 rounded-lg"
                >
                  <Download size={12} />
                  Download PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition-all shadow-md active:scale-95 border border-amber-400 rounded-lg"
                >
                  <Printer size={12} />
                  Print
                </button>
                <button
                  onClick={() => setSelectedLegendForCertificate(null)}
                  className="px-3.5 py-2 bg-neutral-850 hover:bg-neutral-800 text-white font-black uppercase tracking-wider text-[10px] transition-all border border-neutral-700 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Certificate Frame Wrapper (Enables responsive scaling on screen) */}
            <div className="w-full flex justify-center p-2 print:p-0">
              
              {/* Certificate Canvas (Fully Responsive Aspect Ratio Layout) */}
              <div 
                id="printable-certificate"
                className="w-full max-w-2xl aspect-[1.414] bg-white dark:bg-neutral-950 border-[10px] md:border-[16px] border-double border-amber-500/40 p-6 md:p-10 flex flex-col justify-between relative shadow-2xl overflow-hidden print:w-[297mm] print:h-[210mm] print:border-amber-600 print:bg-white print:shadow-none print:rounded-none"
              >
                
                {/* Geometric Corner Accents */}
                <div className="absolute top-2 left-2 w-6 h-6 md:w-10 md:h-10 border-t-2 md:border-t-4 border-l-2 md:border-l-4 border-amber-500/50 print:border-amber-600" />
                <div className="absolute top-2 right-2 w-6 h-6 md:w-10 md:h-10 border-t-2 md:border-t-4 border-r-2 md:border-r-4 border-amber-500/50 print:border-amber-600" />
                <div className="absolute bottom-2 left-2 w-6 h-6 md:w-10 md:h-10 border-b-2 md:border-b-4 border-l-2 md:border-l-4 border-amber-500/50 print:border-amber-600" />
                <div className="absolute bottom-2 right-2 w-6 h-6 md:w-10 md:h-10 border-b-2 md:border-b-4 border-r-2 md:border-r-4 border-amber-500/50 print:border-amber-600" />
                
                {/* Faint Background Watermark Seal */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] dark:opacity-[0.01] print:opacity-[0.025]">
                  <Award className="w-[60%] h-[60%] text-amber-600 fill-current" />
                </div>

                {/* Top - School Brand */}
                <div className="text-center relative z-10 flex flex-col items-center pt-2 md:pt-4">
                  {/* School Logo - Transparent & Blended */}
                  <img
                    src="/logo.png"
                    alt="Al Ghazali Logo"
                    className="w-10 h-10 md:w-14 md:h-14 object-contain mb-2 md:mb-3"
                  />
                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-neutral-800 dark:text-white print:text-neutral-900 uppercase tracking-[0.2em] font-sans leading-none mt-0.5">
                    Al-Ghazali High School
                  </h1>
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-amber-600 dark:text-amber-555 print:text-amber-700 uppercase tracking-[0.15em] mt-1">
                    Campus of Pioneers & Scholars
                  </p>
                  <div className="w-32 md:w-48 h-[1px] md:h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto mt-2 print:via-amber-600" />
                </div>

                {/* Middle - Certificate Main Body */}
                <div className="text-center my-auto relative z-10 flex flex-col items-center py-2">
                  <h2 className="text-xs sm:text-sm md:text-base font-black text-gray-400 dark:text-neutral-500 print:text-gray-550 uppercase tracking-[0.15em] mb-2 md:mb-3">
                    Certificate of Perfect Attendance
                  </h2>
                  
                  <p className="text-xs sm:text-sm font-semibold text-gray-550 dark:text-neutral-400 print:text-gray-550 uppercase tracking-wider italic mb-2 md:mb-3">
                    This testimonial of honor is proudly presented to
                  </p>
 
                  {/* Student Photo and Details Center Stack */}
                  <div className="flex flex-col items-center justify-center gap-2.5 my-2">
                    
                    {/* Photo frame */}
                    <div className="relative shrink-0 mb-1">
                      {selectedLegendForCertificate.photoUrl ? (
                        <img
                          src={selectedLegendForCertificate.photoUrl}
                          alt={selectedLegendForCertificate.fullName}
                          className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-none object-cover border-2 md:border-4 border-amber-500/30 print:border-amber-600 shadow-md"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-none bg-gradient-to-br from-amber-50 to-orange-50 dark:from-neutral-900 dark:to-neutral-850 text-amber-600 dark:text-amber-555 border-2 md:border-4 border-amber-500/30 print:border-amber-600 flex items-center justify-center font-black text-lg md:text-xl shadow-md uppercase">
                          {selectedLegendForCertificate.fullName.substring(0, 2)}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-amber-500 border border-white dark:border-neutral-950 rounded-full flex items-center justify-center text-[8px] md:text-xs font-black text-white shadow-md print:border-white z-10">
                        ★
                      </span>
                    </div>
 
                    {/* Name and class block */}
                    <div className="text-center">
                      <h3 className="text-xl sm:text-3xl md:text-4xl font-serif font-black text-amber-600 dark:text-amber-555 print:text-amber-700 uppercase tracking-wide leading-tight">
                        {selectedLegendForCertificate.fullName}
                      </h3>
                      <p className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-gray-500 dark:text-neutral-450 print:text-gray-550 uppercase tracking-widest mt-1.5">
                        Class: <span className="text-neutral-800 dark:text-white print:text-black font-extrabold">{selectedLegendForCertificate.className}</span> | 
                        Roll No: <span className="text-neutral-800 dark:text-white print:text-black font-extrabold">{selectedLegendForCertificate.rollNumber}</span> | 
                        GR No: <span className="text-neutral-800 dark:text-white print:text-black font-extrabold">{selectedLegendForCertificate.grNumber}</span>
                      </p>
                    </div>
                  </div>
 
                  {/* Description Text */}
                  <p className="text-[8px] sm:text-[10px] md:text-xs text-gray-700 dark:text-neutral-300 print:text-neutral-900 max-w-md md:max-w-xl mx-auto leading-relaxed mt-2 md:mt-3 uppercase tracking-wide font-semibold">
                    For outstanding commitment, punctuality, and scholarly dedication in maintaining a flawless <span className="font-extrabold text-amber-600 dark:text-amber-555 print:text-amber-700">100% attendance record</span> with <span className="font-bold underline decoration-amber-500 decoration-1 md:decoration-2">zero absent days</span> and <span className="font-bold underline decoration-amber-500 decoration-1 md:decoration-2">zero leaves</span>.
                  </p>
 
                  {/* Duration Label */}
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] text-amber-600 dark:text-amber-555 print:text-amber-700 uppercase tracking-widest mt-3 md:mt-4 font-black">
                    {rangeMode === 'single-month' && `AWARDED FOR THE MONTH OF ${formatMonthYear(selectedMonth)}`}
                    {rangeMode === 'custom-range' && `AWARDED FOR THE RANGE ${formatMonthYear(startMonth)} TO ${formatMonthYear(endMonth)}`}
                    {rangeMode === 'whole-year' && `AWARDED FOR THE ACADEMIC SESSION ${(selectedSession ?? '').toUpperCase()}`}
                  </p>
 
                </div>
 
                {/* Bottom - Signatures */}
                <div className="flex items-end justify-between mt-2 md:mt-4 relative z-10 px-4 md:px-8">
                  
                  {/* Class Teacher */}
                  <div className="text-center w-24 sm:w-32 md:w-36">
                    <div className="h-6" />
                    <div className="w-full h-[1px] bg-gray-200 dark:bg-neutral-800 print:bg-gray-400 mt-0.5" />
                    <p className="text-[7px] sm:text-[8px] font-black text-gray-400 dark:text-neutral-500 print:text-gray-600 uppercase tracking-wider mt-1">
                      Class Teacher
                    </p>
                  </div>
 
                  {/* Principal Sign */}
                  <div className="text-center w-24 sm:w-32 md:w-36">
                    <div className="h-6" />
                    <div className="w-full h-[1px] bg-gray-200 dark:bg-neutral-800 print:bg-gray-400 mt-0.5" />
                    <p className="text-[7px] sm:text-[8px] font-black text-gray-400 dark:text-neutral-500 print:text-gray-600 uppercase tracking-wider mt-1">
                      Office of Principal
                    </p>
                  </div>
 
                </div>
 
                {/* Bottom System-Generated Message */}
                <div className="text-center relative z-10 mt-3 md:mt-4 border-t border-gray-100 dark:border-neutral-900/50 pt-2 print:border-gray-200">
                  <p className="text-[6px] sm:text-[7.5px] text-gray-400 dark:text-neutral-500 print:text-gray-550 uppercase tracking-widest font-black max-w-xs sm:max-w-md md:max-w-xl mx-auto leading-normal">
                    🛡️ GENERATED BY IT DEPARTMENT OF AL GHAZALI
                  </p>
                </div>
 
                {/* Top Credential ID (Tuck in top-right corner inside double frame) */}
                <div className="absolute top-3.5 right-4 md:right-6 text-[5.5px] sm:text-[6.5px] font-black text-gray-400 dark:text-neutral-600 print:text-gray-550 uppercase tracking-widest z-20">
                  ID: AG-PRFT-{selectedLegendForCertificate.grNumber}-{(selectedSession ?? '').toUpperCase()}
                </div>

              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminAttendanceOverview;

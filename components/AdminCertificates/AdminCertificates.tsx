"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  Search,
  Download,
  Printer,
  Users,
  Calendar,
  SlidersHorizontal,
  Check,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  X,
  FileSpreadsheet,
  Sparkles,
  UserCheck,
  CheckCircle2,
  Lock,
  ChevronDown
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { client } from '@/sanity/lib/client';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getAllStudentsQuery } from '@/sanity/lib/queries';
import { useSession } from '@/context/SessionContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Student } from '@/types/student';

interface AttendanceStats {
  present: number;
  absent: number;
  leave: number;
  total: number;
  percentage: number;
}

interface StudentCertificateRecord extends Student {
  stats: AttendanceStats;
  eligibility: 'perfect' | 'honors' | 'regular' | 'not-eligible';
}

type PeriodMode = 'whole-session' | 'single-month';

export default function AdminCertificates({ genderFilter, onLoadingChange }: { genderFilter?: string; onLoadingChange?: (loading: boolean) => void }) {
  const { selectedSession } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filters & State
  const [periodMode, setPeriodMode] = useState<PeriodMode>('single-month');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [eligibilityFilter, setEligibilityFilter] = useState<'all' | 'perfect' | 'honors' | 'eligible'>('all');
  const [sortBy, setSortBy] = useState<'attendance-desc' | 'roll-asc' | 'name-asc'>('attendance-desc');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Signature Inputs (World class customizability!)
  const [teacherName, setTeacherName] = useState<string>('Class Teacher');
  const [principalName, setPrincipalName] = useState<string>('Principal');

  // Student list data state
  const [students, setStudents] = useState<StudentCertificateRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});

  // Single preview certificate modal states
  const [previewStudent, setPreviewStudent] = useState<StudentCertificateRecord | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Bulk downloader states
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);

  const classOptions = ['All', 'KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'SSCI', 'SSCII'];

  // Initialize selected month to previous month or current month on mount
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${yyyy}-${mm}`);
  }, []);

  // Format Helper for Certificate Subtitle Month
  const formatMonthYear = (monthStr: string) => {
    if (!monthStr) return '';
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

  // Helper to generate dynamic Verification ID (matches AG-PRFT-GRNumber-PERIOD-SESSION format)
  const generateVerificationId = (student: Student, session: string, mode: PeriodMode, month: string) => {
    const cleanSession = session.replace("-", "").toUpperCase();
    const cleanGr = student.grNumber ? student.grNumber.trim() : student.rollNumber || (student._id || '').substring(0, 5);
    const cleanPeriod = mode === 'whole-session' ? 'YEAR' : month.replace("-", "").toUpperCase();
    return `AG-CERT-${cleanGr}-${cleanPeriod}-${cleanSession}`;
  };

  // Main Data fetch and aggregate calculations
  const calculateAttendanceData = async () => {
    if (!selectedSession) return;
    setLoading(true);
    if (onLoadingChange) onLoadingChange(true);

    try {
      // 1. Fetch all matching students from Sanity
      const sanityStudents = await client.fetch<Student[]>(getAllStudentsQuery, {
        session: selectedSession,
        gender: genderFilter || null
      });

      if (sanityStudents.length === 0) {
        setStudents([]);
        setLoading(false);
        if (onLoadingChange) onLoadingChange(false);
        return;
      }

      // Filter by Class if not "All"
      const classFiltered = sanityStudents.filter(s => {
        if (selectedClass === 'All') return true;
        return s.admissionFor === selectedClass || s.admissionFor === `Class ${selectedClass}`;
      });

      // 2. Fetch manual registers from Firestore
      let allDocs: any[] = [];
      if (periodMode === 'whole-session') {
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
        // Fetch only for the selected month
        if (!selectedMonth) return;
        const prefixStart = `manual_monthly__${selectedSession}__${selectedMonth}__`;
        const prefixEnd = `manual_monthly__${selectedSession}__${selectedMonth}__\uf8ff`;
        const manualQuery = query(
          collection(db, 'attendance'),
          where("__name__", ">=", prefixStart),
          where("__name__", "<=", prefixEnd)
        );
        const snap = await getDocs(manualQuery);
        allDocs = snap.docs;
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

      // 4. Combine students and map statistics + eligibility
      const mappedStudents: StudentCertificateRecord[] = classFiltered.map(student => {
        const gr = student.grNumber || student._id || '';
        const agg = globalAggMap[gr] || { present: 0, absent: 0, leave: 0, totalDays: 0 };

        const percentage = agg.totalDays > 0 ? (agg.present / agg.totalDays) * 100 : 0;

        let eligibility: StudentCertificateRecord['eligibility'] = 'not-eligible';
        if (agg.totalDays > 0) {
          if (agg.absent === 0 && agg.leave === 0) {
            eligibility = 'perfect'; // 100% Attendance
          } else if (percentage >= 90) {
            eligibility = 'honors'; // 90%-99% Attendance
          } else if (percentage >= 80) {
            eligibility = 'regular'; // 80%-89% Attendance
          }
        }

        return {
          ...student,
          stats: {
            present: agg.present,
            absent: agg.absent,
            leave: agg.leave,
            total: agg.totalDays,
            percentage
          },
          eligibility
        };
      });

      setStudents(mappedStudents);
      // Reset selected student IDs
      setSelectedStudentIds({});
    } catch (error) {
      console.error("[AdminCertificates] Error loading/calculating certificate data:", error);
      toast.error("Failed to load attendance registers for certificates.");
    } finally {
      setLoading(false);
      if (onLoadingChange) onLoadingChange(false);
    }
  };

  useEffect(() => {
    calculateAttendanceData();
  }, [selectedSession, periodMode, selectedMonth, selectedClass, genderFilter]);

  // Filtering and Sorting Memo
  const filteredAndSortedStudents = useMemo(() => {
    // Apply filters
    const result = students.filter(student => {
      // Search filter
      const matchesSearch =
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.grNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.rollNumber || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Eligibility filter
      if (eligibilityFilter === 'perfect') return student.eligibility === 'perfect';
      if (eligibilityFilter === 'honors') return student.eligibility === 'honors';
      if (eligibilityFilter === 'eligible') return student.eligibility !== 'not-eligible';

      return true;
    });

    // Apply Sorting
    result.sort((a, b) => {
      if (sortBy === 'attendance-desc') {
        return b.stats.percentage - a.stats.percentage;
      }
      if (sortBy === 'roll-asc') {
        const numA = parseInt(a.rollNumber?.toString().replace(/\D/g, '')) || 99999;
        const numB = parseInt(b.rollNumber?.toString().replace(/\D/g, '')) || 99999;
        return numA - numB;
      }
      if (sortBy === 'name-asc') {
        return a.fullName.localeCompare(b.fullName);
      }
      return 0;
    });

    return result;
  }, [students, searchTerm, eligibilityFilter, sortBy]);

  // Bulk check handling
  const handleToggleSelectAll = () => {
    if (Object.keys(selectedStudentIds).length === filteredAndSortedStudents.length) {
      setSelectedStudentIds({});
    } else {
      const newSelected: Record<string, boolean> = {};
      filteredAndSortedStudents.forEach(s => {
        if (s.eligibility !== 'not-eligible' && s._id) {
          newSelected[s._id] = true;
        }
      });
      setSelectedStudentIds(newSelected);
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const selectedCount = useMemo(() => Object.keys(selectedStudentIds).length, [selectedStudentIds]);

  // Helper to load image securely into canvas (resolves CORS issues)
  const loadImageElement = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  // Dynamic High-Resolution Canvas Renderer Method (Returns Canvas)
  const generateCertificateCanvas = async (student: StudentCertificateRecord): Promise<HTMLCanvasElement> => {
    return new Promise(async (resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        // A4 High-DPI Landscape dimensions (2000 x 1414 pixels)
        canvas.width = 2000;
        canvas.height = 1414;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not construct 2D context");

        // 1. Fill background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Double amber/gold border
        ctx.lineWidth = 26;
        ctx.strokeStyle = "rgba(217, 119, 6, 0.4)";
        ctx.strokeRect(13, 13, canvas.width - 26, canvas.height - 26);
        
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#D97706";
        ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

        // 3. Corner brackets
        const drawCornerBracket = (x: number, y: number, xSign: number, ySign: number) => {
          ctx.strokeStyle = "#D97706";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (60 * xSign), y);
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + (60 * ySign));
          ctx.stroke();
        };
        drawCornerBracket(55, 55, 1, 1);
        drawCornerBracket(canvas.width - 55, 55, -1, 1);
        drawCornerBracket(55, canvas.height - 55, 1, -1);
        drawCornerBracket(canvas.width - 55, canvas.height - 55, -1, -1);

        // 4. Large background watermark seal
        ctx.save();
        ctx.globalAlpha = 0.025;
        ctx.fillStyle = "#D97706";
        ctx.font = "normal 500px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("★", canvas.width / 2, canvas.height / 2);
        ctx.restore();

        const centerX = canvas.width / 2;

        // 5. Drawing School Logo securely on Canvas if it exists
        try {
          const logoImg = await loadImageElement("/logo.png");
          ctx.drawImage(logoImg, centerX - 50, 100, 100, 100);
        } catch (logoErr) {
          console.warn("Could not load logo image for canvas, drawing fallback icon:", logoErr);
          ctx.fillStyle = "#D97706";
          ctx.font = "normal 60px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("🎓", centerX, 160);
        }

        // 6. School Brand Text
        ctx.fillStyle = "#1E293B";
        ctx.font = "900 42px Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText("AL-GHAZALI HIGH SCHOOL", centerX, 260);

        ctx.fillStyle = "#D97706";
        ctx.font = "bold 16px Courier New, monospace";
        ctx.fillText("CAMPUS OF PIONEERS & SCHOLARS", centerX, 300);

        ctx.strokeStyle = "rgba(217, 119, 6, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - 160, 325);
        ctx.lineTo(centerX + 160, 325);
        ctx.stroke();

        // 7. Certificate Title depends on performance
        ctx.fillStyle = "#64748B";
        ctx.font = "bold 20px monospace";
        const titleText = student.eligibility === 'perfect' 
          ? "CERTIFICATE OF PERFECT ATTENDANCE"
          : "CERTIFICATE OF ATTENDANCE HONORS";
        ctx.fillText(titleText, centerX, 400);

        ctx.fillStyle = "#475569";
        ctx.font = "italic 24px Georgia, serif";
        ctx.fillText("This testimonial of honor is proudly presented to", centerX, 450);

        // Drawing student image if exists inside beautiful frame
        if (student.photoUrl) {
          try {
            const studentImg = await loadImageElement(student.photoUrl);
            ctx.save();
            // Draw border round frame
            ctx.strokeStyle = "#D97706";
            ctx.lineWidth = 6;
            ctx.strokeRect(centerX - 80, 490, 160, 160);
            ctx.drawImage(studentImg, centerX - 77, 493, 154, 154);
            ctx.restore();
          } catch (imgErr) {
            console.warn("Could not draw student image on canvas:", imgErr);
          }
        }

        const nameY = student.photoUrl ? 710 : 570;
        const detailsY = student.photoUrl ? 770 : 635;
        const descY = student.photoUrl ? 860 : 735;
        const awardY = student.photoUrl ? 990 : 880;
        const verificationY = student.photoUrl ? 1060 : 960;

        // 8. Student Name
        ctx.fillStyle = "#D97706";
        ctx.font = "italic 900 64px Georgia, serif";
        ctx.fillText(student.fullName.toUpperCase(), centerX, nameY);

        // 9. Student Details line
        ctx.fillStyle = "#64748B";
        ctx.font = "bold 20px monospace";
        ctx.fillText(
          `CLASS: Class ${student.admissionFor}  |  ROLL NO: ${student.rollNumber || "---"}  |  GR NO: ${student.grNumber || "---"}`,
          centerX,
          detailsY
        );

        // 10. Detailed Attendance Description based on selected period
        ctx.fillStyle = "#1E293B";
        ctx.font = "bold 22px Georgia, serif";
        
        const periodStr = periodMode === 'whole-session' 
          ? `the whole academic session ${selectedSession}` 
          : `the month of ${formatMonthYear(selectedMonth)}`;

        if (student.eligibility === 'perfect') {
          ctx.fillText(`For outstanding commitment, punctuality, and scholarly dedication in maintaining a flawless`, centerX, descY);
          ctx.fillText(`100% attendance record with zero absent days and zero leaves during ${periodStr}.`, centerX, descY + 45);
        } else {
          ctx.fillText(`For consistent attendance, punctuality, and scholarly dedication in maintaining an outstanding`, centerX, descY);
          ctx.fillText(`${student.stats.percentage.toFixed(0)}% attendance record with ${student.stats.absent} absent days and ${student.stats.leave} leaves during ${periodStr}.`, centerX, descY + 45);
        }

        // 11. Session Duration Tag
        ctx.fillStyle = "#D97706";
        ctx.font = "900 18px monospace";
        ctx.fillText(`AWARDED FOR THE ACADEMIC SESSION ${(selectedSession || '').toUpperCase()}`, centerX, awardY);

        // 12. Verification block inside frame
        const vId = generateVerificationId(student, selectedSession || '', periodMode, selectedMonth);
        ctx.fillStyle = "#F8FAFC";
        ctx.fillRect(centerX - 350, verificationY, 700, 85);
        ctx.strokeStyle = "#E2E8F0";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(centerX - 350, verificationY, 700, 85);

        ctx.fillStyle = "#0F172A";
        ctx.font = "900 17px monospace";
        ctx.fillText(`SECURE CREDENTIAL VERIFICATION ID: ${vId}`, centerX, verificationY + 35);
        
        ctx.fillStyle = "#64748B";
        ctx.font = "bold 12px monospace";
        ctx.fillText("VERIFY AUTHENTICITY SECURELY AT: ALGHAZALI.VERCEL.APP/HALL-OF-FAME", centerX, verificationY + 65);

        // 13. Signatures Footer
        const sigY = student.photoUrl ? 1230 : 1200;
        ctx.strokeStyle = "#E2E8F0";
        ctx.lineWidth = 1.5;

        // Class Teacher Signature Line
        ctx.beginPath();
        ctx.moveTo(centerX - 420, sigY);
        ctx.lineTo(centerX - 220, sigY);
        ctx.stroke();
        ctx.fillStyle = "#64748B";
        ctx.font = "bold 13px monospace";
        ctx.fillText(teacherName.toUpperCase(), centerX - 320, sigY + 25);
        ctx.font = "normal 11px monospace";
        ctx.fillText("CLASS TEACHER", centerX - 320, sigY + 45);

        // Principal Signature Line
        ctx.beginPath();
        ctx.moveTo(centerX + 220, sigY);
        ctx.lineTo(centerX + 420, sigY);
        ctx.stroke();
        ctx.fillStyle = "#64748B";
        ctx.font = "bold 13px monospace";
        ctx.fillText(principalName.toUpperCase(), centerX + 320, sigY + 25);
        ctx.font = "normal 11px monospace";
        ctx.fillText("OFFICE OF PRINCIPAL", centerX + 320, sigY + 45);

        // Faint central ornament
        ctx.fillStyle = "rgba(217, 119, 6, 0.4)";
        ctx.font = "24px sans-serif";
        ctx.fillText("★", centerX, sigY + 10);

        // 14. System Generated Footer message
        ctx.fillStyle = "#94A3B8";
        ctx.font = "bold 11px monospace";
        ctx.fillText("🛡️ GENERATED BY IT DEPARTMENT OF AL GHAZALI", centerX, 1330);

        // 15. Tuck System ID top-right
        ctx.textAlign = "right";
        ctx.fillStyle = "#94A3B8";
        ctx.font = "bold 14px monospace";
        ctx.fillText(`ID: ${vId}`, canvas.width - 70, 90);
        ctx.textAlign = "center";

        resolve(canvas);
      } catch (e) {
        reject(e);
      }
    });
  };

  // Single download handler
  const handleSingleDownload = async (student: StudentCertificateRecord, format: 'png' | 'pdf') => {
    setIsDownloading(true);
    const toastId = toast.loading(`Generating ${format.toUpperCase()} certificate for ${student.fullName}...`);
    try {
      const canvas = await generateCertificateCanvas(student);
      const cleanName = student.fullName.replace(/\s+/g, "_");
      const cleanMonth = periodMode === 'whole-session' ? 'Session' : formatMonthYear(selectedMonth).replace(/\s+/g, "_");
      
      if (format === 'png') {
        canvas.toBlob((blob) => {
          if (blob) {
            saveAs(blob, `Certificate_${cleanName}_${cleanMonth}.png`);
            toast.success(`Certificate downloaded successfully!`, { id: toastId });
          } else {
            throw new Error("Failed to create blob");
          }
        }, "image/png", 1.0);
      } else {
        const imgData = canvas.toDataURL('image/png', 1.0);
        // A4 proportions: 297mm x 210mm
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
        pdf.save(`Certificate_${cleanName}_${cleanMonth}.pdf`);
        toast.success(`PDF downloaded successfully!`, { id: toastId });
      }
    } catch (e) {
      console.error(e);
      toast.error(`Failed to generate certificate for ${student.fullName}.`, { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  // Bulk Generator loop
  const handleBulkDownload = async () => {
    const ids = Object.keys(selectedStudentIds);
    if (ids.length === 0) {
      toast.error("Please select at least one student.");
      return;
    }

    setIsBulkProcessing(true);
    setBulkProgress({ current: 0, total: ids.length, currentName: 'Initializing ZIP archive...' });
    
    let processed = 0;
    const toastId = toast.loading(`Initiating bulk generation of ${ids.length} certificates...`);

    try {
      const zip = new JSZip();
      const folderName = `Certificates_${periodMode === 'whole-session' ? 'Session' : formatMonthYear(selectedMonth).replace(/\s+/g, "_")}`;
      const folder = zip.folder(folderName);

      for (const id of ids) {
        const student = students.find(s => s._id === id);
        if (student) {
          setBulkProgress({
            current: processed + 1,
            total: ids.length,
            currentName: student.fullName
          });
          toast.loading(`Processing [${processed + 1}/${ids.length}]: ${student.fullName}`, { id: toastId });
          
          try {
            const canvas = await generateCertificateCanvas(student);
            const blob = await new Promise<Blob>((resolve, reject) => {
              canvas.toBlob(b => {
                if (b) resolve(b);
                else reject(new Error("Failed to create blob"));
              }, "image/png", 1.0);
            });

            const cleanName = student.fullName.replace(/\s+/g, "_");
            folder?.file(`Certificate_${cleanName}.png`, blob);
            
            // Wait briefly to avoid UI freeze
            await new Promise(r => setTimeout(r, 100));
          } catch (e) {
            console.error(`Bulk generation failed for ${student.fullName}:`, e);
          }
          processed++;
        }
      }

      setBulkProgress({ current: processed, total: ids.length, currentName: 'Zipping files...' });
      toast.loading(`Zipping ${processed} files...`, { id: toastId });
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${folderName}.zip`);

      toast.success(`Successfully processed and downloaded ${processed} certificates!`, { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error(`Bulk download failed.`, { id: toastId });
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress(null);
      setSelectedStudentIds({});
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[85px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[85px] pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3.5 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-2xl border border-amber-500/20 shadow-sm shrink-0">
            <Award size={28} className="fill-amber-500/5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600 font-mono flex items-center gap-1">
              <Sparkles size={11} className="animate-pulse" />
              Official Scholastic Honors
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mt-0.5">
              Attendance Certificate Center
            </h3>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Design, customize signatures, verify credentials, and bulk-generate ultra-high-resolution printable student testimonials.
            </p>
          </div>
        </div>

        {/* Dynamic statistics overview */}
        <div className="flex items-center gap-2 relative z-10 shrink-0 bg-slate-50 dark:bg-neutral-900 border border-gray-150 dark:border-neutral-850 p-3 rounded-xl">
          <Users size={16} className="text-amber-500" />
          <div className="text-right">
            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block leading-none">Total Candidates</span>
            <span className="text-base font-black text-gray-950 dark:text-white">{filteredAndSortedStudents.length} Students</span>
          </div>
        </div>
      </div>

      {/* 2. Intelligent Configurations Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Parameters Column */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-900 pb-3">
            <SlidersHorizontal size={15} className="text-amber-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-neutral-200">Generator Parameters</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Period Mode */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Duration Range</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 dark:bg-neutral-900 border border-gray-150 dark:border-neutral-850 rounded-lg">
                <button
                  onClick={() => setPeriodMode('single-month')}
                  className={cn(
                    "py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all active:scale-98 border-none cursor-pointer",
                    periodMode === 'single-month' 
                      ? "bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-500 shadow-sm border border-slate-200/50" 
                      : "bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
                  )}
                >
                  Single Month
                </button>
                <button
                  onClick={() => setPeriodMode('whole-session')}
                  className={cn(
                    "py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all active:scale-98 border-none cursor-pointer",
                    periodMode === 'whole-session' 
                      ? "bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-500 shadow-sm border border-slate-200/50" 
                      : "bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
                  )}
                >
                  Whole Session
                </button>
              </div>
            </div>

            {/* Month Picker (Only for Single Month mode) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Target Month</label>
              <input
                type="month"
                disabled={periodMode === 'whole-session'}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-855 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-neutral-200 outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
            </div>

            {/* Class filter selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Target Class</label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-855 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-neutral-200 outline-none focus:border-amber-500 appearance-none cursor-pointer transition-all"
                >
                  {classOptions.map((c) => (
                    <option key={c} value={c}>{c === 'All' ? 'All Classes' : `Class ${c}`}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
              </div>
            </div>

            {/* Eligibility Threshold Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Attendance Standard</label>
              <div className="relative">
                <select
                  value={eligibilityFilter}
                  onChange={(e) => setEligibilityFilter(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-855 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-neutral-200 outline-none focus:border-amber-500 appearance-none cursor-pointer transition-all"
                >
                  <option value="all">All Available Records</option>
                  <option value="perfect">Perfect Legends Only (100%)</option>
                  <option value="honors">Attendance Honor Roll (&ge;90%)</option>
                  <option value="eligible">Eligible Candidates (&ge;80%)</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
              </div>
            </div>

          </div>
        </div>

        {/* Signatures & Bulk column */}
        <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-900 pb-3">
            <UserCheck size={15} className="text-amber-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-neutral-200">Custom Signatures</h4>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Class Teacher Name</label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="e.g. Ms. Fatima Khan"
                className="w-full bg-slate-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-855 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-neutral-200 outline-none focus:border-amber-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Principal Signature Name</label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                placeholder="e.g. Principal Al Ghazali"
                className="w-full bg-slate-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-855 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-neutral-200 outline-none focus:border-amber-500 transition-all"
              />
            </div>
          </div>
        </div>

      </div>

      {/* 3. Search and Active Filter Row */}
      <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search and Sorting */}
        <div className="flex flex-wrap items-center gap-3.5 flex-1">
          
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search candidate by Name, Roll No or GR Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-855 rounded-lg pl-10 pr-4 py-1.5 text-xs font-semibold text-gray-850 dark:text-neutral-200 placeholder:text-gray-400 outline-none focus:bg-white focus:border-amber-500 transition-all"
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-855 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-neutral-200 outline-none focus:border-amber-500 appearance-none cursor-pointer pr-8 transition-all"
            >
              <option value="attendance-desc">Sort: Attendance (High &rarr; Low)</option>
              <option value="roll-asc">Sort: Roll Number (Low &rarr; High)</option>
              <option value="name-asc">Sort: Student Name (A &rarr; Z)</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
          </div>

        </div>

        {/* Bulk Download Indicator & Action Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          
          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 border border-amber-250 rounded-md">
                {selectedCount} Selected
              </span>
              <button
                onClick={handleBulkDownload}
                disabled={isBulkProcessing}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-md active:scale-95 border-none transition-all cursor-pointer"
              >
                <Download size={13} className={cn(isBulkProcessing && "animate-bounce")} />
                {isBulkProcessing ? "Processing..." : "Download ZIP"}
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Bulk Processing Progress Overlay (If active) */}
      {isBulkProcessing && bulkProgress && (
        <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 p-4 rounded-xl flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <RefreshCw className="text-amber-500 animate-spin" size={16} />
            <div>
              <p className="text-xs font-black uppercase text-amber-700 dark:text-amber-500 leading-none">
                Bulk Generation in Progress... [{bulkProgress.current} / {bulkProgress.total}]
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase font-semibold">
                Drawing & Downloading: <span className="font-extrabold text-neutral-850 dark:text-white">{bulkProgress.currentName}</span>
              </p>
            </div>
          </div>
          <div className="h-2 w-48 bg-slate-200 dark:bg-neutral-800 rounded-full overflow-hidden shrink-0">
            <div 
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 4. Student Data Grid Table */}
      <div className="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-900 rounded-2xl shadow-sm overflow-hidden">
        
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw size={28} className="animate-spin text-amber-500 mx-auto mb-3" />
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Recalculating Registers...</p>
          </div>
        ) : filteredAndSortedStudents.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <AlertTriangle size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-black uppercase tracking-widest">No matching candidates found</p>
            <p className="text-[10px] mt-1 font-semibold text-gray-450 uppercase">Try relaxing your search query or attendance criteria filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full border-collapse text-left text-xs">
              
              <thead>
                <tr className="bg-slate-50 dark:bg-neutral-900 border-b border-gray-150 dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-gray-400 select-none">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedCount > 0 && selectedCount === filteredAndSortedStudents.filter(s => s.eligibility !== 'not-eligible').length}
                      onChange={handleToggleSelectAll}
                      className="rounded border-gray-300 focus:ring-amber-500 text-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 w-12 text-center">Roll</th>
                  <th className="py-3 px-4 w-20 text-center">GR No</th>
                  <th className="py-3 px-4">Student Candidate</th>
                  <th className="py-3 px-4 text-center w-24">Class</th>
                  <th className="py-3 px-4 text-center w-24">Presents</th>
                  <th className="py-3 px-4 text-center w-24">Abs / Lve</th>
                  <th className="py-3 px-4 text-center w-24">Percentage</th>
                  <th className="py-3 px-4 text-center w-28">Status Badge</th>
                  <th className="py-3 px-4 text-center w-36">Action Tool</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-neutral-900">
                {filteredAndSortedStudents.map((student) => {
                  const isChecked = student._id ? !!selectedStudentIds[student._id] : false;
                  const canSelect = student.eligibility !== 'not-eligible';

                  return (
                    <tr 
                      key={student._id}
                      className={cn(
                        "hover:bg-slate-50/50 dark:hover:bg-neutral-900/30 transition-colors group",
                        isChecked && "bg-amber-50/10 dark:bg-amber-950/5"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          disabled={!canSelect}
                          checked={isChecked}
                          onChange={() => student._id && handleToggleSelectStudent(student._id)}
                          className="rounded border-gray-300 focus:ring-amber-500 text-amber-500 w-3.5 h-3.5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        />
                      </td>

                      {/* Roll Number */}
                      <td className="py-3 px-4 font-bold text-center text-gray-500 dark:text-neutral-400">
                        {student.rollNumber || '—'}
                      </td>

                      {/* GR Number */}
                      <td className="py-3 px-4 font-mono font-bold text-center text-gray-500 dark:text-neutral-400">
                        {student.grNumber || '—'}
                      </td>

                      {/* Name details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-neutral-800 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                            {student.photoUrl ? (
                              <img
                                src={student.photoUrl}
                                alt={student.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-[10px] font-black uppercase text-amber-600">
                                {student.fullName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-extrabold text-neutral-850 dark:text-white group-hover:text-amber-600 transition-colors block uppercase">
                              {student.fullName}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase block tracking-wider mt-0.5">
                              ID: {(student._id || '').substring(0, 8)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3 px-4 font-bold text-center text-gray-700 dark:text-neutral-300">
                        Class {student.admissionFor || '—'}
                      </td>

                      {/* Presents */}
                      <td className="py-3 px-4 font-bold text-center text-emerald-600 dark:text-emerald-500">
                        {student.stats.present} / {student.stats.total} <span className="text-[9px] font-semibold text-gray-400">Days</span>
                      </td>

                      {/* Absents / Leaves */}
                      <td className="py-3 px-4 text-center font-bold">
                        <span className="text-red-500">{student.stats.absent}</span>
                        <span className="text-gray-300 dark:text-neutral-800 mx-1.5">|</span>
                        <span className="text-amber-500">{student.stats.leave}</span>
                      </td>

                      {/* Percentage */}
                      <td className="py-3 px-4 text-center font-black text-neutral-850 dark:text-white">
                        {student.stats.percentage.toFixed(0)}%
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {student.eligibility === 'perfect' && (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-250 dark:bg-amber-950/20 dark:text-amber-550 dark:border-amber-900/30 px-2 py-0.5 rounded">
                            Perfect 100%
                          </span>
                        )}
                        {student.eligibility === 'honors' && (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-550 dark:border-emerald-900/30 px-2 py-0.5 rounded">
                            Honors &ge;90%
                          </span>
                        )}
                        {student.eligibility === 'regular' && (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-255 dark:bg-blue-950/20 dark:text-blue-550 dark:border-blue-900/30 px-2 py-0.5 rounded">
                            Regular &ge;80%
                          </span>
                        )}
                        {student.eligibility === 'not-eligible' && (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider bg-gray-50 text-gray-400 border border-gray-200 dark:bg-neutral-900 dark:text-neutral-500 dark:border-neutral-805 px-2 py-0.5 rounded">
                            Ineligible
                          </span>
                        )}
                      </td>

                      {/* Action trigger */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setPreviewStudent(student)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-gray-600 dark:bg-neutral-900 dark:hover:bg-neutral-850 dark:text-neutral-300 border border-gray-200 dark:border-neutral-800 rounded-md transition-all cursor-pointer"
                            title="Preview Certificate Layout"
                          >
                            <Sparkles size={13} />
                          </button>
                          
                          <button
                            onClick={() => handleSingleDownload(student, 'png')}
                            disabled={!canSelect || isDownloading}
                            className="px-2 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black uppercase tracking-wider text-[9px] rounded-md flex items-center gap-1 shadow-sm active:scale-95 border-none transition-all cursor-pointer"
                            title="Direct Download Certificate as PNG"
                          >
                            <Download size={10} />
                            PNG
                          </button>
                          
                          <button
                            onClick={() => handleSingleDownload(student, 'pdf')}
                            disabled={!canSelect || isDownloading}
                            className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black uppercase tracking-wider text-[9px] rounded-md flex items-center gap-1 shadow-sm active:scale-95 border-none transition-all cursor-pointer"
                            title="Direct Download Certificate as PDF"
                          >
                            <Download size={10} />
                            PDF
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}
      </div>

      {/* 5. PRISTINE REGAL CERTIFICATE PREVIEW MODAL */}
      {previewStudent && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setPreviewStudent(null)}
        >
          
          <div 
            className="relative w-full max-w-2xl flex flex-col gap-4 my-8 z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header controls bar */}
            <div className="flex flex-wrap items-center justify-between bg-neutral-900/95 border border-neutral-800 p-4 gap-3 rounded-xl shadow-lg">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-500/20 text-amber-500 border border-amber-500/20">
                  <Award size={16} className="fill-amber-500/20" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Appreciation Certificate Preview</h4>
                  <p className="text-[9px] text-gray-400 font-semibold uppercase">Official system-generated credential</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSingleDownload(previewStudent, 'png')}
                  disabled={isDownloading || previewStudent.eligibility === 'not-eligible'}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition-all shadow-md active:scale-95 border border-emerald-500/30 cursor-pointer"
                >
                  <Download size={12} className={cn(isDownloading && "animate-bounce")} />
                  {isDownloading ? "Downloading..." : "PNG"}
                </button>
                <button
                  onClick={() => handleSingleDownload(previewStudent, 'pdf')}
                  disabled={isDownloading || previewStudent.eligibility === 'not-eligible'}
                  className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition-all shadow-md active:scale-95 border border-blue-500/30 cursor-pointer"
                >
                  <Download size={12} className={cn(isDownloading && "animate-bounce")} />
                  {isDownloading ? "Downloading..." : "PDF"}
                </button>
                <button
                  onClick={() => setPreviewStudent(null)}
                  className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-750 text-white font-black uppercase tracking-wider text-[10px] transition-all border border-neutral-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Warning Message if student is not eligible */}
            {previewStudent.eligibility === 'not-eligible' && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-500 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>Notice: This student does not meet the necessary attendance standards (needs &ge;80% attendance) to authorize a certificate.</span>
              </div>
            )}

            {/* Certificate Canvas Mock Visualizer */}
            <div className="w-full flex justify-center">
              
              <div 
                id="printable-certificate-mock"
                className="w-full aspect-[1.414] bg-white border-[10px] md:border-[16px] border-double border-amber-500/40 p-6 md:p-10 flex flex-col justify-between relative shadow-2xl overflow-hidden rounded-none text-black select-none"
              >
                
                {/* Geometric Corner Accents */}
                <div className="absolute top-2 left-2 w-6 h-6 md:w-10 md:h-10 border-t-2 md:border-t-4 border-l-2 md:border-l-4 border-amber-500/50" />
                <div className="absolute top-2 right-2 w-6 h-6 md:w-10 md:h-10 border-t-2 md:border-t-4 border-r-2 md:border-r-4 border-amber-500/50" />
                <div className="absolute bottom-2 left-2 w-6 h-6 md:w-10 md:h-10 border-b-2 md:border-b-4 border-l-2 md:border-l-4 border-amber-500/50" />
                <div className="absolute bottom-2 right-2 w-6 h-6 md:w-10 md:h-10 border-b-2 md:border-b-4 border-r-2 md:border-r-4 border-amber-500/50" />
                
                {/* Faint Background Watermark Seal */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] text-amber-600">
                  <Award className="w-[60%] h-[60%] fill-current" />
                </div>

                {/* Top - School Brand */}
                <div className="text-center relative z-10 flex flex-col items-center pt-2">
                  <img
                    src="/logo.png"
                    alt="Al Ghazali Logo"
                    className="w-10 h-10 md:w-14 md:h-14 object-contain mb-2"
                  />
                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-neutral-800 uppercase tracking-[0.2em] font-sans leading-none mt-0.5">
                    Al-Ghazali High School
                  </h1>
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-amber-600 uppercase tracking-[0.15em] mt-1">
                    Campus of Pioneers & Scholars
                  </p>
                  <div className="w-32 md:w-48 h-[1px] md:h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto mt-2" />
                </div>

                {/* Middle - Certificate Main Body */}
                <div className="text-center my-auto relative z-10 flex flex-col items-center py-2">
                  <h2 className="text-xs sm:text-sm md:text-base font-black text-gray-400 uppercase tracking-[0.15em] mb-2 md:mb-3">
                    {previewStudent.eligibility === 'perfect' ? 'Certificate of Perfect Attendance' : 'Certificate of Attendance Honors'}
                  </h2>
                  
                  <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider italic mb-2">
                    This testimonial of honor is proudly presented to
                  </p>

                  {/* Student Photo and Details Center Stack */}
                  <div className="flex flex-col items-center justify-center gap-2.5 my-2">
                    
                    {/* Photo frame */}
                    <div className="relative shrink-0 mb-1">
                      {previewStudent.photoUrl ? (
                        <img
                          src={previewStudent.photoUrl}
                          alt={previewStudent.fullName}
                          className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-none object-cover border-2 md:border-4 border-amber-500/30 shadow-md"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-none bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600 border-2 md:border-4 border-amber-500/30 flex items-center justify-center font-black text-lg shadow-md uppercase">
                          {previewStudent.fullName.substring(0, 2)}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-amber-500 border border-white rounded-full flex items-center justify-center text-[8px] md:text-xs font-black text-white shadow-md z-10">
                        ★
                      </span>
                    </div>

                    {/* Name and class block */}
                    <div className="text-center">
                      <h3 className="text-xl sm:text-3xl md:text-4xl font-serif font-black text-amber-600 uppercase tracking-wide leading-tight">
                        {previewStudent.fullName}
                      </h3>
                      <p className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-1.5">
                        Class: <span className="text-neutral-800 font-extrabold">Class {previewStudent.admissionFor}</span> | 
                        Roll No: <span className="text-neutral-800 font-extrabold">{previewStudent.rollNumber || "---"}</span> | 
                        GR No: <span className="text-neutral-800 font-extrabold">{previewStudent.grNumber || "---"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Description Text */}
                  <p className="text-[8px] sm:text-[10px] md:text-xs text-gray-700 max-w-md md:max-w-xl mx-auto leading-relaxed mt-2 uppercase tracking-wide font-semibold">
                    {previewStudent.eligibility === 'perfect' ? (
                      <span>For outstanding commitment, punctuality, and scholarly dedication in maintaining a flawless <span className="font-extrabold text-amber-600">100% attendance record</span> with <span className="font-bold underline decoration-amber-500 decoration-1 md:decoration-2">zero absent days</span> and <span className="font-bold underline decoration-amber-500 decoration-1 md:decoration-2">zero leaves</span>.</span>
                    ) : (
                      <span>For consistent attendance, punctuality, and scholarly dedication in maintaining an outstanding <span className="font-extrabold text-amber-600">{previewStudent.stats.percentage.toFixed(0)}% attendance record</span> with <span className="font-bold underline decoration-amber-500">{previewStudent.stats.absent} absents</span> and <span className="font-bold underline decoration-amber-500">{previewStudent.stats.leave} leaves</span>.</span>
                    )}
                  </p>

                  {/* Duration Label */}
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] text-amber-600 uppercase tracking-widest mt-3 md:mt-4 font-black">
                    AWARDED FOR {periodMode === 'whole-session' ? `THE ACADEMIC SESSION ${(selectedSession || '').toUpperCase()}` : `THE MONTH OF ${formatMonthYear(selectedMonth)}`}
                  </p>

                </div>

                {/* Bottom - Signatures */}
                <div className="flex items-end justify-between mt-2 md:mt-4 relative z-10 px-4 md:px-8">
                  
                  {/* Class Teacher */}
                  <div className="text-center w-24 sm:w-32 md:w-36">
                    <p className="text-[9px] font-bold text-gray-800 uppercase truncate">{teacherName || 'Class Teacher'}</p>
                    <div className="w-full h-[1px] bg-gray-200 mt-0.5" />
                    <p className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-wider mt-1">
                      Class Teacher
                    </p>
                  </div>

                  {/* Principal Sign */}
                  <div className="text-center w-24 sm:w-32 md:w-36">
                    <p className="text-[9px] font-bold text-gray-800 uppercase truncate">{principalName || 'Principal'}</p>
                    <div className="w-full h-[1px] bg-gray-200 mt-0.5" />
                    <p className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-wider mt-1">
                      Office of Principal
                    </p>
                  </div>

                </div>

                {/* Bottom System-Generated Message */}
                <div className="text-center relative z-10 mt-3 md:mt-4 border-t border-gray-100 pt-2">
                  <p className="text-[6px] sm:text-[7.5px] text-gray-400 uppercase tracking-widest font-black max-w-xs sm:max-w-md md:max-w-xl mx-auto leading-normal">
                    🛡️ GENERATED BY IT DEPARTMENT OF AL GHAZALI
                  </p>
                </div>

                {/* Top Credential ID */}
                <div className="absolute top-6 right-6 md:top-10 md:right-10 text-[5.5px] sm:text-[6.5px] font-black text-gray-400 uppercase tracking-widest z-20">
                  ID: {generateVerificationId(previewStudent, selectedSession || '', periodMode, selectedMonth)}
                </div>

              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

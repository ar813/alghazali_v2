"use client";

import React, { useEffect, useMemo, useState } from "react";
import { client } from "@/sanity/lib/client";
import { getAllStudentsQuery } from "@/sanity/lib/queries";
import type { Student } from "@/types/student";
import { auth } from '@/lib/firebase';
import { toast } from "sonner";
import { useSession } from '@/context/SessionContext';
import { Search, Printer, FileDown, Layers, User, Users, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

// Helper for image loading
const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const AdminAdmitCards = ({ genderFilter, onLoadingChange }: { genderFilter?: string; onLoadingChange?: (loading: boolean) => void }) => {
  const { selectedSession } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Selection
  const [search, setSearch] = useState("");
  const [klass, setKlass] = useState<string>("All");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Config
  const [examName, setExamName] = useState("Final Term Examination 2024");
  const [cardsPerPage, setCardsPerPage] = useState<1 | 2>(2);
  const [isDownloading, setIsDownloading] = useState(false);

  // Load Data
  const loadStudents = React.useCallback(async () => {
    try {
      if (!selectedSession) return;
      setLoading(true);
      onLoadingChange?.(true);
      const data: Student[] = await client.fetch(getAllStudentsQuery, {
        session: selectedSession,
        gender: genderFilter || null
      });
      setStudents(data);
    } catch (error) {
      toast.error("Failed to load students");
      console.error(error);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [onLoadingChange, selectedSession, genderFilter]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Derived State
  const classes = useMemo(() => {
    const unique = Array.from(new Set(students.map((s) => (s.admissionFor || "").toString().trim()).filter(Boolean)));
    return ["All", ...unique.sort((a, b) => {
      const na = parseInt(a); const nb = parseInt(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    })];
  }, [students]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchesClass = klass === "All" || (s.admissionFor || "").toString() === klass;
      const matchesTerm = !term
        ? true
        : [s.fullName, s.fatherName, s.grNumber, s.rollNumber, s.phoneNumber]
          .map((v) => (v || "").toString().toLowerCase())
          .some((v) => v.includes(term));
      return matchesClass && matchesTerm;
    });
  }, [students, search, klass]);

  const sorted = useMemo(() => {
    const parseNum = (v?: string | number | null) => {
      const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10);
      return isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
    };
    return [...filtered].sort((a, b) => {
      const ca = parseNum(a.admissionFor as any);
      const cb = parseNum(b.admissionFor as any);
      if (ca !== cb) return ca - cb;
      const ra = parseNum(a.rollNumber as any);
      const rb = parseNum(b.rollNumber as any);
      return ra - rb;
    });
  }, [filtered]);

  const toPrint = useMemo(() =>
    sorted.filter((s) => selectedIds.size === 0 || selectedIds.has(s._id!)),
    [sorted, selectedIds]);

  // Handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => setSelectedIds(new Set(filtered.map((s) => s._id!)));
  const handleClearSelection = () => setSelectedIds(new Set());

  const handleDownloadPDF = async () => {
    if (toPrint.length === 0) {
      toast.error("No students selected");
      return;
    }

    try {
      setIsDownloading(true);
      const { jsPDF } = await import("jspdf");

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const cardWidth = pageWidth - (margin * 2);
      const cardHeight = (pageHeight - (margin * 3)) / 2;

      // Prepare images
      const logo = await loadImage('/logo.png');

      // Cache QR codes if possible, but for now we'll fetch them in the loop
      // (Alternative: Promise.all for all QR codes first if performance is an issue)

      for (let i = 0; i < toPrint.length; i++) {
        const s = toPrint[i];
        const isSecondOnPage = cardsPerPage === 2 && i % 2 !== 0;

        if (i > 0 && !isSecondOnPage) {
          doc.addPage();
        }

        const yOffset = isSecondOnPage ? (cardHeight + (margin * 2)) : margin;
        const currentCardHeight = cardsPerPage === 1 ? pageHeight - (margin * 2) : cardHeight;

        // Draw Card Border
        doc.setDrawColor(0);
        doc.setLineWidth(0.8);
        doc.rect(margin, yOffset, cardWidth, currentCardHeight);

        // Inner thin border for premium look
        doc.setLineWidth(0.2);
        doc.rect(margin + 1.5, yOffset + 1.5, cardWidth - 3, currentCardHeight - 3);

        // --- Watermark ---
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
        doc.addImage(logo, 'PNG', pageWidth / 2 - 40, yOffset + (currentCardHeight / 2) - 40, 80, 80);
        doc.restoreGraphicsState();

        // Header Section
        const headerY = yOffset + 12;
        doc.addImage(logo, 'PNG', margin + 8, headerY - 4, 18, 18);

        // QR Code (Top Right)
        try {
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(s.grNumber || 'N/A')}`;
          const qr = await loadImage(qrUrl);
          doc.addImage(qr, 'PNG', cardWidth + margin - 26, headerY - 4, 18, 18);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0);
          doc.text("GR: " + (s.grNumber || '---'), cardWidth + margin - 17, headerY + 18, { align: 'center' });
        } catch (e) { }

        doc.setTextColor(0);
        doc.setFontSize(24);
        doc.setFont('times', 'bold');
        doc.text("AL-GHAZALI HIGH SCHOOL", pageWidth / 2, headerY + 1, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text("41/25-28, Area 36-B Landhi, Karachi 75160, Pakistan", pageWidth / 2, headerY + 7, { align: 'center' });
        doc.text("Phone: 0324-8266424", pageWidth / 2, headerY + 11, { align: 'center' });

        // Exam Title - Premium Ribbon Style
        const examY = headerY + 16;
        doc.setFillColor(248, 248, 248); // Even lighter grey
        doc.rect(margin + 10, examY, cardWidth - 20, 10, 'F');
        doc.setDrawColor(0);
        doc.setLineWidth(0.4);
        doc.line(margin + 10, examY, cardWidth + margin - 10, examY);
        doc.line(margin + 10, examY + 10, cardWidth + margin - 10, examY + 10);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(examName.toUpperCase(), pageWidth / 2, examY + 6.5, { align: 'center' });

        // Student Info Section
        const infoY = examY + 14;
        const col1 = margin + 12;
        const col2 = margin + 55;

        // Photo Box
        doc.setLineWidth(0.6);
        doc.setDrawColor(0);
        doc.rect(cardWidth + margin - 45, infoY, 35, 42);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        if (!s.photoUrl) {
          doc.text("AFFIX PHOTO", cardWidth + margin - 27.5, infoY + 21, { align: 'center' });
        }

        if (s.photoUrl) {
          try {
            const photo = await loadImage(s.photoUrl);
            doc.addImage(photo, 'JPEG', cardWidth + margin - 45, infoY, 35, 42);
          } catch (e) { }
        }

        doc.setTextColor(0);
        doc.setFontSize(11);

        const drawField = (label: string, value: string, y: number) => {
          doc.setFont('helvetica', 'bold');
          doc.text(label + ":", col1, y);
          doc.setFont('helvetica', 'normal');
          doc.text(String(value || "---"), col2, y);
        };

        let currentY = infoY + 5;
        drawField("STUDENT NAME", s.fullName.toUpperCase(), currentY);
        currentY += 8;
        drawField("FATHER NAME", s.fatherName.toUpperCase(), currentY);
        currentY += 8;
        drawField("ROLL NUMBER", s.rollNumber || "---", currentY);
        currentY += 8;
        drawField("GR NUMBER", s.grNumber || "---", currentY);
        currentY += 8;
        drawField("CLASS", String(s.admissionFor || "---"), currentY);
        currentY += 8;
        drawField("PHONE", s.phoneNumber || "---", currentY);

        // Divider line for status
        currentY += 3;
        doc.setLineWidth(0.1);
        doc.setDrawColor(150);
        doc.line(col1, currentY, cardWidth + margin - 10, currentY);

        // --- Attendance & Fees Section ---
        currentY += 11;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');

        // Attendance Table
        const attTableX = col1;
        const attTableY = currentY;
        const attCellW = 12;
        const attCellH = 6;

        doc.text("ATTENDANCE STATUS", attTableX + (attCellW * 2), attTableY - 3.5, { align: 'center' });

        // Table Header
        doc.setLineWidth(0.4);
        doc.setDrawColor(0);
        doc.rect(attTableX, attTableY, attCellW * 4, attCellH * 2);
        doc.line(attTableX, attTableY + attCellH, attTableX + (attCellW * 4), attTableY + attCellH);

        // Vertical lines
        for (let j = 1; j < 4; j++) {
          doc.line(attTableX + (attCellW * j), attTableY, attTableX + (attCellW * j), attTableY + (attCellH * 2));
        }

        doc.setFontSize(7);
        doc.text("T.D", attTableX + (attCellW / 2), attTableY + 4, { align: 'center' });
        doc.text("T.P", attTableX + attCellW + (attCellW / 2), attTableY + 4, { align: 'center' });
        doc.text("T.A", attTableX + (attCellW * 2) + (attCellW / 2), attTableY + 4, { align: 'center' });
        doc.text("T.L", attTableX + (attCellW * 3) + (attCellW / 2), attTableY + 4, { align: 'center' });

        // Fees Status
        const feesX = col1 + (attCellW * 4) + 12;
        doc.setFontSize(8);
        doc.text("FEES STATUS:", feesX, attTableY + 4);

        // Checkboxes
        const checkSize = 4;
        const drawCheckbox = (x: number, y: number, label: string) => {
          doc.rect(x, y - 3, checkSize, checkSize);
          doc.setFont('helvetica', 'normal');
          doc.text(label, x + checkSize + 2, y);
        };

        drawCheckbox(feesX + 24, attTableY + 4, "Clear");
        drawCheckbox(feesX + 46, attTableY + 4, "Not Clear");

        // Remaining Fees
        doc.setFont('helvetica', 'bold');
        doc.text("REMAINING FEES:", feesX, attTableY + 12);
        doc.setLineWidth(0.2);
        doc.line(feesX + 30, attTableY + 12.5, cardWidth + margin - 10, attTableY + 12.5);

        // System Footer
        const cardBottom = (cardsPerPage === 1 ? pageHeight - margin : yOffset + currentCardHeight);
        const footerY = cardBottom - 8;

        doc.setLineWidth(0.1);
        doc.setDrawColor(180);
        doc.line(margin + 5, footerY - 5, cardWidth + margin - 5, footerY - 5);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        const now = new Date();
        const dateTimeStr = now.toLocaleDateString() + " " + now.toLocaleTimeString();
        doc.text(`* This is a system-generated admit card and does not require a physical signature.`, pageWidth / 2, footerY, { align: 'center' });
        doc.text(`Generated on: ${dateTimeStr} | IT Department `, pageWidth / 2, footerY + 3.5, { align: 'center' });
      }

      doc.save(`Admit_Cards_${klass}.pdf`);
      toast.success("PDF Downloaded successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>

      {/* Toolbar - Compact & Clean */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm mb-4 shrink-0">
        <div className="flex flex-col lg:flex-row items-end gap-4">
          {/* Search & Class Filter */}
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input type="text" placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            </div>
            <select value={klass} onChange={(e) => setKlass(e.target.value)}
              className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 min-w-[130px]">
              {classes.map(c => <option key={c} value={c}>{c === 'All' ? 'All Classes' : `Class ${c}`}</option>)}
            </select>
          </div>
          {/* Exam Name */}
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Exam Title</label>
            <input type="text" placeholder="e.g. Final Term Examination 2024" value={examName} onChange={(e) => setExamName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
          </div>
          {/* Cards per page toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 h-[38px]">
            <button onClick={() => setCardsPerPage(1)} className={cn("px-3 py-1.5 rounded-md text-xs font-bold transition-all", cardsPerPage === 1 ? "bg-white dark:bg-zinc-800 shadow-sm text-primary" : "text-zinc-500")}>
              <Layers size={14} className="inline mr-1" />1/A4
            </button>
            <button onClick={() => setCardsPerPage(2)} className={cn("px-3 py-1.5 rounded-md text-xs font-bold transition-all", cardsPerPage === 2 ? "bg-white dark:bg-zinc-800 shadow-sm text-primary" : "text-zinc-500")}>
              <Layers size={14} className="inline mr-1" />2/A4
            </button>
          </div>
          {/* Download */}
          <button onClick={handleDownloadPDF} disabled={isDownloading || toPrint.length === 0}
            className="px-5 py-2 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 transition-all shrink-0">
            {isDownloading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FileDown size={16} />}
            Download PDF ({toPrint.length})
          </button>
        </div>
      </div>

      {/* Main Content - Fixed height, no page scroll */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">

        {/* Student List Panel */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 flex items-center justify-between">
            <h3 className="font-bold text-sm">Select Students ({selectedIds.size || filtered.length})</h3>
            <div className="flex gap-2">
              <button onClick={handleSelectAll} className="text-[10px] font-bold text-primary hover:underline uppercase">All</button>
              <button onClick={handleClearSelection} className="text-[10px] font-bold text-zinc-400 hover:underline uppercase">None</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {loading ? (
              [...Array(10)].map((_, i) => <div key={i} className="h-12 bg-zinc-50 dark:bg-zinc-900/50 animate-pulse rounded-lg" />)
            ) : sorted.map(s => (
              <button key={s._id} onClick={() => toggleSelect(s._id!)}
                className={cn(
                  "w-full p-2.5 rounded-lg flex items-center gap-3 transition-all text-left group",
                  selectedIds.has(s._id!) ? "bg-primary/10 border border-primary/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border border-transparent"
                )}>
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                  selectedIds.has(s._id!) ? "bg-primary border-primary text-white" : "border-zinc-300 dark:border-zinc-700"
                )}>
                  {selectedIds.has(s._id!) && <CheckCircle2 size={10} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.fullName}</p>
                  <p className="text-[10px] text-zinc-400 truncate">Roll: {s.rollNumber} · GR: {s.grNumber} · Class: {s.admissionFor}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-8 xl:col-span-9 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 shrink-0">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Printer size={14} /> Preview (First 2)
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {toPrint.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                <Users size={40} className="mb-3 opacity-20" />
                <p className="text-sm">Select students to preview</p>
              </div>
            ) : (
              <div className="max-w-[580px] mx-auto space-y-6">
                {toPrint.slice(0, 2).map((s) => (
                  <div key={s._id} className="bg-white text-black border-2 border-black p-5 relative font-serif overflow-hidden">
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
                      <Image src="/logo.png" alt="Watermark" width={224} height={224} className="object-contain" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 border-b-2 border-red-800 pb-3 relative z-10">
                      <Image src="/logo.png" alt="Logo" width={56} height={56} />
                      <div className="text-center flex-1 px-3">
                        <h2 className="text-xl font-bold tracking-tight text-red-800" style={{ fontFamily: 'serif' }}>AL-GHAZALI HIGH SCHOOL</h2>
                        <p className="text-[8px] uppercase tracking-widest text-blue-900 font-bold mt-0.5">41/25-28, Area 36-B Landhi, Karachi 75160</p>
                        <p className="text-[8px] font-bold text-zinc-500">Phone: 0324-8266424</p>
                      </div>
                      <div className="w-14 h-14 border border-blue-900 flex flex-col items-center justify-center bg-white rounded-sm">
                        <div className="bg-blue-50 w-9 h-9 mb-0.5 rounded-sm flex items-center justify-center text-[7px] text-blue-400">QR</div>
                        <span className="text-[6px] font-black uppercase text-blue-900">GR: {s.grNumber}</span>
                      </div>
                    </div>

                    {/* Exam Title */}
                    <div className="bg-red-800 text-white py-1.5 text-center font-black text-xs mb-4 uppercase tracking-[0.15em] relative z-10">
                      {examName}
                    </div>

                    {/* Student Info */}
                    <div className="grid grid-cols-12 gap-y-3 text-xs px-1 relative z-10">
                      <div className="col-span-8 space-y-2.5">
                        {[
                          ['STUDENT NAME', s.fullName.toUpperCase()],
                          ['FATHER NAME', s.fatherName.toUpperCase()],
                          ['ROLL NO', s.rollNumber],
                          ['GR NO', s.grNumber],
                          ['CLASS', s.admissionFor],
                          ['PHONE', s.phoneNumber],
                        ].map(([label, val]) => (
                          <div key={label as string} className="flex gap-2">
                            <span className="font-bold w-28 shrink-0 text-[11px]">{label}:</span>
                            <span className="border-b border-dotted border-black flex-1 text-[11px]">{val || '---'}</span>
                          </div>
                        ))}
                      </div>
                      <div className="col-span-4 flex justify-end">
                        <div className="w-22 h-26 border-2 border-black flex flex-col items-center justify-center bg-zinc-50" style={{ width: 88, height: 104 }}>
                          <User size={28} className="text-zinc-200 mb-1" />
                          <span className="text-[7px] font-bold text-zinc-400 uppercase">Photo</span>
                        </div>
                      </div>
                    </div>

                    {/* Attendance & Fees */}
                    <div className="mt-6 pt-5 border-t-2 border-black flex items-start gap-6 px-1 relative z-10">
                      <div className="w-1/2">
                        <p className="font-bold text-[9px] mb-3 uppercase tracking-wider text-red-900">Attendance Status</p>
                        <table className="w-full border-collapse border border-black text-[8px]">
                          <thead>
                            <tr className="bg-zinc-100/50">
                              <th className="border border-black p-1 font-black">T.D</th>
                              <th className="border border-black p-1 font-black">T.P</th>
                              <th className="border border-black p-1 font-black">T.A</th>
                              <th className="border border-black p-1 font-black">T.L</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-black p-2"></td>
                              <td className="border border-black p-2"></td>
                              <td className="border border-black p-2"></td>
                              <td className="border border-black p-2"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="w-1/2 space-y-4 pt-0.5">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[9px] uppercase tracking-wider">Fees:</span>
                          <div className="flex gap-3">
                            <div className="flex items-center gap-1"><div className="w-3.5 h-3.5 border-2 border-black"></div><span className="text-[9px]">Clear</span></div>
                            <div className="flex items-center gap-1"><div className="w-3.5 h-3.5 border-2 border-black"></div><span className="text-[9px]">Not Clear</span></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[9px] uppercase tracking-wider shrink-0">Remaining:</span>
                          <div className="flex-1 border-b-2 border-black h-3"></div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 text-[7px] text-center italic border-t border-zinc-200 pt-1.5 opacity-40 relative z-10">
                      * System generated admit card · No signature required · {new Date().toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAdmitCards;

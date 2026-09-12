"use client";

import React, { useEffect, useMemo, useState } from "react";
import { client } from "@/sanity/lib/client";
import { getAllStudentsQuery } from "@/sanity/lib/queries";
import type { Student } from "@/types/student";
import { toast } from "sonner";
import { useSession } from '@/context/SessionContext';
import { Search, Printer, FileDown, Layers, User, Users, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import QRCode from "qrcode";

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
  const [examName, setExamName] = useState("Final Term Examination 2024-2025");
  const [cardsPerPage, setCardsPerPage] = useState<1 | 2 | 4>(2);
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrCache, setQrCache] = useState<Record<string, string>>({});

  // Current generation timestamp for preview and document
  const formattedTimestamp = useMemo(() => {
    const now = new Date();
    return now.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }, []);

  // Load Students Data
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
      const na = parseInt(a, 10); const nb = parseInt(b, 10);
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

  // Helper to build student portal direct auto-login URL (Dynamic Origin)
  const getStudentPortalUrl = (s: Student) => {
    const onlyDigits = (val?: string) => (val || '').replace(/\D+/g, '');
    // Priority: Student B-Form / CNIC -> Father CNIC -> Guardian CNIC
    const identity = onlyDigits(s.cnicOrBform) || onlyDigits(s.fatherCnic) || onlyDigits(s.guardianCnic) || '';
    const gr = (s.grNumber || '').trim();

    // Dynamically use current site origin (e.g. http://localhost:3000, local IP, or production)
    const baseUrl = (typeof window !== 'undefined' && window.location.origin)
      ? window.location.origin
      : 'https://alghazali.vercel.app';

    if (identity && gr) {
      return `${baseUrl}/student-portal?bform=${encodeURIComponent(identity)}&gr=${encodeURIComponent(gr)}&auto=1`;
    } else if (gr) {
      return `${baseUrl}/student-portal?gr=${encodeURIComponent(gr)}`;
    }
    return `${baseUrl}/student-portal`;
  };

  // Pre-generate QR codes for preview cards
  useEffect(() => {
    const generatePreviewQrs = async () => {
      const previewList = toPrint.slice(0, 2);
      const newCache: Record<string, string> = { ...qrCache };
      for (const s of previewList) {
        const key = s.grNumber || s.rollNumber || s._id || 'unknown';
        if (!newCache[key]) {
          try {
            const portalUrl = getStudentPortalUrl(s);
            const url = await QRCode.toDataURL(portalUrl, {
              margin: 1,
              width: 140,
              color: { dark: '#0f172a', light: '#ffffff' }
            });
            newCache[key] = url;
          } catch (e) {
            console.error("QR preview generation failed", e);
          }
        }
      }
      setQrCache(newCache);
    };
    if (toPrint.length > 0) {
      generatePreviewQrs();
    }
  }, [toPrint]);

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

  // PDF Download Handler
  const handleDownloadPDF = async () => {
    if (toPrint.length === 0) {
      toast.error("No students selected");
      return;
    }

    try {
      setIsDownloading(true);
      const { jsPDF } = await import("jspdf");

      const doc = new jsPDF({
        orientation: cardsPerPage === 4 ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = cardsPerPage === 4 ? 297 : 210;
      const pageHeight = cardsPerPage === 4 ? 210 : 297;
      const margin = 10;

      // Load school logo
      let logo: HTMLImageElement | null = null;
      try {
        logo = await loadImage('/logo.png');
      } catch (e) {
        console.warn("Could not load /logo.png", e);
      }

      // Pre-generate QR codes (links to student portal with auto-login)
      const studentQrMap: Record<string, string> = {};
      for (const s of toPrint) {
        try {
          const portalUrl = getStudentPortalUrl(s);
          const qrDataUrl = await QRCode.toDataURL(
            portalUrl,
            { margin: 1, width: 140, color: { dark: '#0f172a', light: '#ffffff' } }
          );
          studentQrMap[s._id!] = qrDataUrl;
        } catch {
          // ignore qr errors
        }
      }

      const timestamp = new Date().toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // RENDER CARDS
      for (let i = 0; i < toPrint.length; i++) {
        const s = toPrint[i];

        // Page management
        let isNewPage = false;
        if (cardsPerPage === 1) isNewPage = i > 0;
        else if (cardsPerPage === 2) isNewPage = i > 0 && i % 2 === 0;
        else if (cardsPerPage === 4) isNewPage = i > 0 && i % 4 === 0;

        if (isNewPage) {
          doc.addPage();
        }

        // Layout calculation
        let xOffset = margin;
        let yOffset = margin;
        let cardWidth: number;
        let cardHeight: number;

        if (cardsPerPage === 2) {
          // A4 Portrait: 210 x 297 mm
          // Exact midpoint is 148.5 mm.
          // Card height = 132 mm.
          // Card 1: Y = 9mm to 141mm (leaves 7.5mm gap to cut line at 148.5mm)
          // Scissor Cut Line: Y = 148.5mm
          // Card 2: Y = 156mm to 288mm (leaves 7.5mm gap from cut line, 9mm from bottom)
          cardWidth = pageWidth - (margin * 2); // 190 mm
          cardHeight = 132; // 132 mm

          const isSecondCard = i % 2 === 1;
          yOffset = isSecondCard ? 156 : 9;

          // Draw ONLY the clean dotted separation line in the exact middle of A4
          if (!isSecondCard) {
            const cutY = 148.5;

            // Set dotted pattern
            if (typeof (doc as any).setLineDashPattern === 'function') {
              (doc as any).setLineDashPattern([1.5, 1.8], 0);
            } else if (typeof (doc as any).setLineDash === 'function') {
              (doc as any).setLineDash([1.5, 1.8], 0);
            }

            doc.setDrawColor(180, 190, 205); // clean subtle slate dotted line
            doc.setLineWidth(0.35);
            doc.line(6, cutY, pageWidth - 6, cutY);

            // Reset line dash
            if (typeof (doc as any).setLineDashPattern === 'function') {
              (doc as any).setLineDashPattern([], 0);
            } else if (typeof (doc as any).setLineDash === 'function') {
              (doc as any).setLineDash([], 0);
            }
          }
        } else if (cardsPerPage === 4) {
          // A4 Landscape: 297 x 210 mm
          cardWidth = 136;
          cardHeight = 94;
          const pos = i % 4;
          const col = pos % 2;
          const row = Math.floor(pos / 2);
          const hGap = 5;
          const vGap = 6;
          const startX = (pageWidth - (cardWidth * 2 + hGap)) / 2;
          const startY = (pageHeight - (cardHeight * 2 + vGap)) / 2;
          xOffset = startX + (col * (cardWidth + hGap));
          yOffset = startY + (row * (cardHeight + vGap));
        } else {
          // 1/A4
          cardWidth = pageWidth - (margin * 2);
          cardHeight = 180;
          xOffset = margin;
          yOffset = (pageHeight - cardHeight) / 2;
        }

        // ==========================================
        // CARD RENDERING (PROFESSIONAL MODERN DESIGN)
        // ==========================================

        // 1. Outer Soft Card Border (Rounded & Subtle)
        doc.setDrawColor(203, 213, 225); // slate-300: clean, premium, no hard black borders
        doc.setLineWidth(0.35);
        doc.roundedRect(xOffset, yOffset, cardWidth, cardHeight, 3, 3, 'S');

        // Top Navy Accent Bar
        doc.setFillColor(30, 58, 138); // Royal Navy #1e3a8a
        doc.roundedRect(xOffset, yOffset, cardWidth, 3.2, 3, 3, 'F');
        doc.rect(xOffset, yOffset + 1.8, cardWidth, 1.4, 'F'); // flush bottom radius edge

        // Bottom Navy Accent Bar (Matching small bottom line at the very bottom)
        const botBarH = 2.2;
        const botBarY = yOffset + cardHeight - botBarH;
        doc.setFillColor(30, 58, 138); // Royal Navy #1e3a8a
        doc.roundedRect(xOffset, botBarY, cardWidth, botBarH, 2, 2, 'F');
        doc.rect(xOffset, botBarY, cardWidth, 1, 'F'); // flush top radius edge

        // 2. Subtle School Logo Watermark
        if (logo) {
          try {
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.035 }));
            const wmSize = cardsPerPage === 4 ? 45 : 62;
            doc.addImage(
              logo,
              'PNG',
              xOffset + (cardWidth / 2) - (wmSize / 2),
              yOffset + (cardHeight / 2) - (wmSize / 2),
              wmSize,
              wmSize
            );
            doc.restoreGraphicsState();
          } catch {
            // ignore watermark error
          }
        }

        // 3. Header Section (Logo, School Details, QR)
        // Properly sized with generous breathing room so it NEVER touches the exam ribbon!
        const headerTopY = yOffset + 5;
        const logoSize = cardsPerPage === 4 ? 13 : 15.5;

        // School Logo (Left)
        if (logo) {
          try {
            doc.addImage(logo, 'PNG', xOffset + 6, headerTopY + 0.5, logoSize, logoSize);
          } catch { }
        }

        // QR Code (Right)
        const qrSize = cardsPerPage === 4 ? 13 : 15.5;
        const qrDataUrl = studentQrMap[s._id!];
        if (qrDataUrl) {
          try {
            doc.addImage(qrDataUrl, 'PNG', xOffset + cardWidth - qrSize - 6, headerTopY + 0.5, qrSize, qrSize);
          } catch { }
        }

        // Center Title & Details
        const centerTitleX = xOffset + (cardWidth / 2);
        doc.setTextColor(30, 58, 138); // Deep Navy
        doc.setFont('times', 'bold');
        doc.setFontSize(cardsPerPage === 4 ? 13.5 : 16.5);
        doc.text("AL-GHAZALI HIGH SCHOOL", centerTitleX, headerTopY + 5, { align: 'center' });

        doc.setTextColor(71, 85, 105); // slate-600
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(cardsPerPage === 4 ? 6.2 : 7.2);
        doc.text("41/25-28, Area 36-B Landhi, Karachi 75160, Pakistan", centerTitleX, headerTopY + 9.2, { align: 'center' });
        doc.text(`Tel: 0324-8266424  |  Web: alghazali.vercel.app  |  Session: ${selectedSession || "2024-2025"}`, centerTitleX, headerTopY + 12.8, { align: 'center' });

        // 4. Exam Title Ribbon (Clean & Professional, with 4.5mm clear space from Logo and QR!)
        const ribbonY = headerTopY + 18.5; // Starts at headerTopY + 18.5mm, logo ends at headerTopY + 16mm -> full clear gap!
        const ribbonH = cardsPerPage === 4 ? 6 : 7;
        doc.setFillColor(153, 27, 27); // Maroon/Crimson
        doc.roundedRect(xOffset + 6, ribbonY, cardWidth - 12, ribbonH, 1.5, 1.5, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(cardsPerPage === 4 ? 8 : 9.5);
        const examTitleText = (examName.trim() ? examName.trim().toUpperCase() : "ANNUAL EXAMINATION") + "  •  ADMIT CARD";
        doc.text(examTitleText, centerTitleX, ribbonY + (ribbonH * 0.65), { align: 'center' });

        // 5. Student Details & Photo Box
        const detailsY = ribbonY + ribbonH + 3;
        const detailsH = cardsPerPage === 4 ? 37 : 47;

        // Background card for student info
        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.25);
        doc.roundedRect(xOffset + 6, detailsY, cardWidth - 12, detailsH, 2, 2, 'FD');

        // Photo Box (Right side of info card)
        const photoW = cardsPerPage === 4 ? 24 : 29;
        const photoH = cardsPerPage === 4 ? 30 : 36;
        const photoX = xOffset + cardWidth - 6 - photoW - 4;
        const photoY = detailsY + 3;

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.roundedRect(photoX, photoY, photoW, photoH, 1.5, 1.5, 'FD');

        let photoLoaded = false;
        if (s.photoUrl) {
          try {
            const photoImg = await loadImage(s.photoUrl);
            doc.addImage(photoImg, 'JPEG', photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
            photoLoaded = true;
          } catch {
            photoLoaded = false;
          }
        }

        if (!photoLoaded) {
          doc.setTextColor(148, 163, 184); // slate-400
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(cardsPerPage === 4 ? 6 : 7.2);
          doc.text("AFFIX PHOTO", photoX + (photoW / 2), photoY + (photoH / 2) - 1, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(cardsPerPage === 4 ? 5 : 5.8);
          doc.text("Passport Size", photoX + (photoW / 2), photoY + (photoH / 2) + 3.2, { align: 'center' });
        }

        // Student Info Fields (Left side)
        const fieldLeftX = xOffset + 10;
        const fieldValX = xOffset + (cardsPerPage === 4 ? 36 : 44);

        // Highlighted Roll Number & GR Number Pills
        const pillY = detailsY + 3;
        const pillH = cardsPerPage === 4 ? 5.5 : 7;
        const pillW = cardsPerPage === 4 ? 38 : 46;

        // Roll No Pill
        doc.setFillColor(238, 242, 255); // indigo-50
        doc.setDrawColor(199, 210, 254); // indigo-200
        doc.setLineWidth(0.2);
        doc.roundedRect(fieldLeftX, pillY, pillW, pillH, 1.2, 1.2, 'FD');

        doc.setTextColor(79, 70, 229); // indigo-600
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(cardsPerPage === 4 ? 6.2 : 7.2);
        doc.text("ROLL NO:", fieldLeftX + 2.5, pillY + (pillH * 0.65));

        doc.setTextColor(30, 27, 75); // indigo-950
        doc.setFontSize(cardsPerPage === 4 ? 7.5 : 9);
        doc.text(String(s.rollNumber || "---"), fieldLeftX + (cardsPerPage === 4 ? 18 : 22), pillY + (pillH * 0.65));

        // GR No Pill
        const grPillX = fieldLeftX + pillW + 4;
        doc.setFillColor(241, 245, 249); // slate-100
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.roundedRect(grPillX, pillY, pillW, pillH, 1.2, 1.2, 'FD');

        doc.setTextColor(71, 85, 105); // slate-600
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(cardsPerPage === 4 ? 6.2 : 7.2);
        doc.text("G.R NO:", grPillX + 2.5, pillY + (pillH * 0.65));

        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFontSize(cardsPerPage === 4 ? 7.5 : 9);
        doc.text(String(s.grNumber || "---"), grPillX + (cardsPerPage === 4 ? 17 : 20), pillY + (pillH * 0.65));

        // Other Detail Rows
        const drawInfoRow = (label: string, value: string, rowY: number, isBoldValue: boolean = false, valueColor = [15, 23, 42]) => {
          doc.setTextColor(100, 116, 139); // slate-500
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(cardsPerPage === 4 ? 6.2 : 7.5);
          doc.text(label.toUpperCase(), fieldLeftX, rowY);

          doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
          doc.setFont('helvetica', isBoldValue ? 'bold' : 'normal');
          doc.setFontSize(cardsPerPage === 4 ? 7 : 9);
          doc.text(value, fieldValX, rowY);
        };

        const rowStep = cardsPerPage === 4 ? 5.2 : 6.4;
        let currentFieldY = pillY + pillH + (cardsPerPage === 4 ? 4.5 : 5.8);

        drawInfoRow("Candidate Name", s.fullName.toUpperCase(), currentFieldY, true, [15, 23, 42]);
        currentFieldY += rowStep;
        drawInfoRow("Father's Name", s.fatherName.toUpperCase(), currentFieldY, false, [30, 41, 59]);
        currentFieldY += rowStep;
        drawInfoRow("Class / Grade", String(s.admissionFor || "---"), currentFieldY, true, [30, 58, 138]);
        currentFieldY += rowStep;
        drawInfoRow("Contact No", s.phoneNumber || "---", currentFieldY, false, [51, 65, 85]);
        currentFieldY += rowStep;
        drawInfoRow("Exam Center", "Main Campus - Landhi, Karachi", currentFieldY, false, [71, 85, 105]);

        // 6. Examination Instructions Box (Replaces Fees/Attendance)
        const rulesY = detailsY + detailsH + 2.5;
        const rulesH = cardsPerPage === 4 ? 22 : 25;

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.roundedRect(xOffset + 6, rulesY, cardWidth - 12, rulesH, 1.5, 1.5, 'FD');

        doc.setTextColor(153, 27, 27); // Crimson title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(cardsPerPage === 4 ? 5.8 : 7.2);
        doc.text("EXAMINATION RULES & INSTRUCTIONS FOR CANDIDATE:", xOffset + 9, rulesY + 3.8);

        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(cardsPerPage === 4 ? 5.2 : 6.5);

        const ruleGap = cardsPerPage === 4 ? 3.6 : 4.2;
        let ruleY = rulesY + 7.6;
        doc.text("1. Candidate must bring this Admit Card along with their School ID Card to each examination.", xOffset + 9, ruleY);
        ruleY += ruleGap;
        doc.text("2. Report to the designated examination room at least 15 minutes prior to the start time.", xOffset + 9, ruleY);
        ruleY += ruleGap;
        doc.text("3. Possession of mobile phones, smart devices, cheat materials, or borrowing stationery is strictly prohibited.", xOffset + 9, ruleY);
        ruleY += ruleGap;
        doc.text("4. Any candidate using unfair means will be subject to immediate disciplinary action and paper cancellation.", xOffset + 9, ruleY);

        // 7. System Generated Verification Footer (NO SIGNATURES as requested)
        const footY = rulesY + rulesH + 2;
        const footH = cardsPerPage === 4 ? 6.5 : 8;

        doc.setFillColor(241, 245, 249); // slate-100
        doc.roundedRect(xOffset + 6, footY, cardWidth - 12, footH, 1.2, 1.2, 'F');

        // Crisp Vector Checkmark Badge (never breaks or turns into an apostrophe)
        const checkCircleX = xOffset + 10.5;
        const checkCircleY = footY + 4;
        doc.setFillColor(22, 163, 74); // emerald-600
        doc.circle(checkCircleX, checkCircleY, 1.8, 'F');
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.4);
        doc.line(checkCircleX - 0.9, checkCircleY, checkCircleX - 0.2, checkCircleY + 0.8);
        doc.line(checkCircleX - 0.2, checkCircleY + 0.8, checkCircleX + 1.1, checkCircleY - 0.7);

        doc.setTextColor(30, 41, 59); // slate-800
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(cardsPerPage === 4 ? 5.5 : 6.8);
        doc.text("SYSTEM-GENERATED DOCUMENT  •  NO SIGNATURE REQUIRED", checkCircleX + 3.8, footY + (footH * 0.44));

        doc.setTextColor(100, 116, 139); // slate-500
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(cardsPerPage === 4 ? 4.8 : 5.8);
        doc.text(`Official verification active | Issued: ${timestamp} | Al-Ghazali High School Exam Cell`, checkCircleX + 3.8, footY + (footH * 0.82));
      }

      doc.save(`Admit_Cards_${klass}_${selectedSession || 'Session'}.pdf`);
      toast.success("PDF Downloaded successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>

      {/* Toolbar - Clean, Modern & Professional */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm mb-4 shrink-0">
        <div className="flex flex-col lg:flex-row items-end gap-4">

          {/* Search & Class Filter */}
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                placeholder="Search by name, roll no, gr no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <select
              value={klass}
              onChange={(e) => setKlass(e.target.value)}
              className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 min-w-[130px]"
            >
              {classes.map(c => <option key={c} value={c}>{c === 'All' ? 'All Classes' : `Class ${c}`}</option>)}
            </select>
          </div>

          {/* Exam Title */}
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Exam Title (Admit Card Banner)</label>
            <input
              type="text"
              placeholder="e.g. Final Term Examination 2024-2025"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* Cards per page toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 h-[38px]">
            <button
              onClick={() => setCardsPerPage(1)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-bold transition-all", cardsPerPage === 1 ? "bg-white dark:bg-zinc-800 shadow-sm text-primary" : "text-zinc-500")}
            >
              <Layers size={14} className="inline mr-1" />1/A4
            </button>
            <button
              onClick={() => setCardsPerPage(2)}
              title="2 Cards per A4 page with middle dotted line"
              className={cn("px-3 py-1.5 rounded-md text-xs font-bold transition-all", cardsPerPage === 2 ? "bg-white dark:bg-zinc-800 shadow-sm text-primary" : "text-zinc-500")}
            >
              <Layers size={14} className="inline mr-1" />2/A4
            </button>
            <button
              onClick={() => setCardsPerPage(4)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-bold transition-all", cardsPerPage === 4 ? "bg-white dark:bg-zinc-800 shadow-sm text-primary" : "text-zinc-500")}
            >
              <Layers size={14} className="inline mr-1" />4/A4
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading || toPrint.length === 0}
              className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 transition-all shadow-sm"
            >
              {isDownloading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FileDown size={16} />}
              Download PDF ({toPrint.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">

        {/* Student List Panel */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">Select Students</h3>
              <p className="text-[11px] text-zinc-400">
                {selectedIds.size > 0 ? `${selectedIds.size} of ${filtered.length} selected` : `All ${filtered.length} students`}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSelectAll} className="text-[11px] font-bold text-primary hover:underline uppercase">Select All</button>
              <button onClick={handleClearSelection} className="text-[11px] font-bold text-zinc-400 hover:underline uppercase">Clear</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {loading ? (
              [...Array(10)].map((_, i) => <div key={i} className="h-12 bg-zinc-50 dark:bg-zinc-900/50 animate-pulse rounded-lg" />)
            ) : sorted.length === 0 ? (
              <div className="p-6 text-center text-zinc-400 text-sm">No students found.</div>
            ) : sorted.map(s => (
              <button
                key={s._id}
                onClick={() => toggleSelect(s._id!)}
                className={cn(
                  "w-full p-2.5 rounded-lg flex items-center gap-3 transition-all text-left group",
                  selectedIds.has(s._id!) ? "bg-primary/10 border border-primary/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border border-transparent"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                  selectedIds.has(s._id!) ? "bg-primary border-primary text-white" : "border-zinc-300 dark:border-zinc-700"
                )}>
                  {selectedIds.has(s._id!) && <CheckCircle2 size={10} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.fullName}</p>
                  <p className="text-[10px] text-zinc-400 truncate">Roll: {s.rollNumber || '---'} · GR: {s.grNumber || '---'} · Class: {s.admissionFor}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-8 xl:col-span-9 bg-zinc-100/60 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Printer size={15} /> A4 Print Preview (2 Cards per Page)
            </h4>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
              <span>A4 Midpoint Dotted Separation</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {toPrint.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                <Users size={40} className="mb-3 opacity-20" />
                <p className="text-sm">Select students to preview admit cards</p>
              </div>
            ) : (
              <div className="max-w-[620px] mx-auto space-y-5">
                {toPrint.slice(0, 2).map((s, idx) => {
                  const key = s.grNumber || s.rollNumber || s._id || 'unknown';
                  const qrUrl = qrCache[key];

                  return (
                    <React.Fragment key={s._id}>
                      {/* Clean Dotted Separation Line between Card 1 and Card 2 */}
                      {idx === 1 && (
                        <div className="py-2">
                          <div className="w-full border-t border-dashed border-zinc-400 dark:border-zinc-600" />
                        </div>
                      )}

                      {/* Card Container - Soft, Modern & Professional */}
                      <div className="bg-white text-zinc-900 rounded-xl border border-zinc-300 shadow-sm relative overflow-hidden font-sans flex flex-col">

                        {/* Top Royal Navy Accent Bar */}
                        <div className="h-1.5 bg-blue-900 w-full" />

                        {/* Subtle Logo Watermark */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                          <Image src="/logo.png" alt="Watermark" width={220} height={220} className="object-contain" />
                        </div>

                        <div className="p-4 sm:p-5 relative z-10 flex-1 flex flex-col">

                          {/* Header: Logo, School Name, QR (Generous padding so it never touches the Exam Banner) */}
                          <div className="flex items-center justify-between gap-3 pb-3">
                            <Image src="/logo.png" alt="Logo" width={48} height={48} className="shrink-0 drop-shadow-xs" />

                            <div className="text-center flex-1 min-w-0">
                              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-blue-950 font-serif leading-tight">
                                AL-GHAZALI HIGH SCHOOL
                              </h2>
                              <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium mt-0.5">
                                41/25-28, Area 36-B Landhi, Karachi 75160, Pakistan
                              </p>
                              <p className="text-[9px] font-medium text-zinc-400">
                                Tel: 0324-8266424 · Web: alghazali.vercel.app · Session: {selectedSession || "2024-2025"}
                              </p>
                            </div>

                            <div className="shrink-0 flex flex-col items-center">
                              {qrUrl ? (
                                <Image src={qrUrl} alt="QR Code" width={48} height={48} className="rounded border border-zinc-200" />
                              ) : (
                                <div className="w-[48px] h-[48px] border border-dashed border-zinc-300 rounded flex items-center justify-center text-[8px] text-zinc-400">
                                  QR
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Exam Title Banner (With clear margin from header above) */}
                          <div className="mt-1 bg-red-800 text-white py-1 px-3 text-center rounded-md font-bold text-xs uppercase tracking-wider shadow-xs">
                            {examName || "ANNUAL EXAMINATION"}  •  ADMIT CARD
                          </div>

                          {/* Student Info & Photo Section */}
                          <div className="mt-3 bg-zinc-50/80 rounded-lg p-3 border border-zinc-200/80 grid grid-cols-12 gap-3">

                            {/* Details (Left Side) */}
                            <div className="col-span-8 space-y-2">

                              {/* Prominent Roll No & GR No Badges */}
                              <div className="flex items-center gap-2">
                                <div className="bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-indigo-700 uppercase">Roll No:</span>
                                  <span className="text-xs font-black text-indigo-950">{s.rollNumber || '---'}</span>
                                </div>
                                <div className="bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-zinc-600 uppercase">GR No:</span>
                                  <span className="text-xs font-black text-zinc-900">{s.grNumber || '---'}</span>
                                </div>
                              </div>

                              {/* Student Detail Rows */}
                              <div className="space-y-1 text-xs pt-1">
                                <div className="flex items-baseline">
                                  <span className="w-28 shrink-0 text-[10px] font-bold text-zinc-500 uppercase">Candidate Name:</span>
                                  <span className="font-bold text-zinc-900 text-xs truncate">{s.fullName.toUpperCase()}</span>
                                </div>
                                <div className="flex items-baseline">
                                  <span className="w-28 shrink-0 text-[10px] font-bold text-zinc-500 uppercase">Father&apos;s Name:</span>
                                  <span className="font-medium text-zinc-800 text-xs truncate">{s.fatherName.toUpperCase()}</span>
                                </div>
                                <div className="flex items-baseline">
                                  <span className="w-28 shrink-0 text-[10px] font-bold text-zinc-500 uppercase">Class / Grade:</span>
                                  <span className="font-bold text-blue-900 text-xs">{s.admissionFor || '---'}</span>
                                </div>
                                <div className="flex items-baseline">
                                  <span className="w-28 shrink-0 text-[10px] font-bold text-zinc-500 uppercase">Contact No:</span>
                                  <span className="font-medium text-zinc-700 text-xs">{s.phoneNumber || '---'}</span>
                                </div>
                                <div className="flex items-baseline">
                                  <span className="w-28 shrink-0 text-[10px] font-bold text-zinc-500 uppercase">Exam Center:</span>
                                  <span className="font-medium text-zinc-600 text-xs">Main Campus - Landhi, Karachi</span>
                                </div>
                              </div>
                            </div>

                            {/* Photo Box (Right Side) */}
                            <div className="col-span-4 flex justify-end items-center">
                              <div className="w-[84px] h-[102px] rounded-lg border border-zinc-300 bg-white flex flex-col items-center justify-center overflow-hidden shadow-2xs">
                                {s.photoUrl ? (
                                  <Image src={s.photoUrl} alt={s.fullName} width={84} height={102} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-2 text-center text-zinc-400">
                                    <User size={24} className="mb-1 text-zinc-300" />
                                    <span className="text-[7px] font-bold uppercase tracking-wider">Affix Photo</span>
                                    <span className="text-[6px] text-zinc-400">Passport Size</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Examination Instructions (Clean Executive Box) */}
                          <div className="mt-2.5 bg-white border border-zinc-200 rounded-lg p-2.5 text-[9px] text-zinc-600">
                            <p className="font-bold text-red-800 uppercase tracking-wide mb-1 text-[9px]">
                              Important Examination Rules & Instructions:
                            </p>
                            <ul className="space-y-0.5 text-zinc-600 list-disc pl-3 text-[8.5px] leading-tight">
                              <li>Candidate must bring this Admit Card along with their official School ID Card to every exam.</li>
                              <li>Report to the designated exam room at least 15 minutes before the exam commences.</li>
                              <li>Mobile phones, smart devices, unauthorized papers or notes are strictly prohibited in the exam hall.</li>
                              <li>Any student found using unfair means will be disqualified from the examination immediately.</li>
                            </ul>
                          </div>

                          {/* System-Generated Verification (NO SIGNATURES) */}
                          <div className="mt-2.5 bg-zinc-100 rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border border-zinc-200/60">
                            <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-zinc-800">
                              <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                              <span>SYSTEM-GENERATED DOCUMENT  •  NO SIGNATURE REQUIRED</span>
                            </div>
                            <div className="flex items-center gap-1 text-[8.5px] text-zinc-500 italic">
                              <Clock size={11} className="shrink-0" />
                              <span>Issued: {formattedTimestamp}</span>
                            </div>
                          </div>

                        </div>

                        {/* Bottom Royal Navy Accent Bar (Small line at the very bottom) */}
                        <div className="h-1 bg-blue-900 w-full mt-auto" />
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAdmitCards;

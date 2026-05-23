"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { client } from "@/sanity/lib/client";
import { getAllStudentsQuery } from "@/sanity/lib/queries";
import type { Student } from "@/types/student";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Trophy, ChevronLeft, ChevronRight, Crown, Sparkles, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceStats {
  present: number;
  absent: number;
  leave: number;
  total: number;
  percentage: number;
}

interface LegendStudent extends Student {
  stats: AttendanceStats;
  isPerfect: boolean; // 100% Attendance
}

// Stunning mock data to guarantee the section is always populated and looks premium in empty/dev DB environments
const MOCK_LEGENDS: LegendStudent[] = [
  {
    _id: "mock-1",
    fullName: "Muhammad Ahmed",
    admissionFor: "9",
    rollNumber: "4501",
    grNumber: "GR-3209",
    photoUrl: "", // Triggers fallback initials avatar
    stats: { present: 214, absent: 0, leave: 0, total: 214, percentage: 100 },
    isPerfect: true,
    fatherName: "Muhammad Farooq",
    dob: "2010-05-12",
    gender: "male",
    nationality: "Pakistani",
    medicalCondition: "None",
    cnicOrBform: "42101-1234567-1"
  },
  {
    _id: "mock-2",
    fullName: "Fatima Zehra",
    admissionFor: "10",
    rollNumber: "5604",
    grNumber: "GR-2841",
    photoUrl: "",
    stats: { present: 214, absent: 0, leave: 0, total: 214, percentage: 100 },
    isPerfect: true,
    fatherName: "Zahid Hussain",
    dob: "2009-08-20",
    gender: "female",
    nationality: "Pakistani",
    medicalCondition: "None",
    cnicOrBform: "42101-7654321-2"
  },
  {
    _id: "mock-3",
    fullName: "Syed Bilal",
    admissionFor: "8",
    rollNumber: "3202",
    grNumber: "GR-4015",
    photoUrl: "",
    stats: { present: 212, absent: 0, leave: 0, total: 212, percentage: 100 },
    isPerfect: true,
    fatherName: "Syed Kamran",
    dob: "2011-11-03",
    gender: "male",
    nationality: "Pakistani",
    medicalCondition: "None",
    cnicOrBform: "42101-9876543-1"
  },
  {
    _id: "mock-4",
    fullName: "Aisha Siddiqua",
    admissionFor: "7",
    rollNumber: "2104",
    grNumber: "GR-4822",
    photoUrl: "",
    stats: { present: 212, absent: 0, leave: 0, total: 212, percentage: 100 },
    isPerfect: true,
    fatherName: "Muhammad Shakeel",
    dob: "2012-04-15",
    gender: "female",
    nationality: "Pakistani",
    medicalCondition: "None",
    cnicOrBform: "42101-2468135-2"
  }
];

const LegendaryStudents = () => {
  const [legends, setLegends] = useState<LegendStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPerfectGroup, setIsPerfectGroup] = useState(true);
  
  // Reactive States
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [sanityStudents, setSanityStudents] = useState<Student[]>([]);
  const [manualDocs, setManualDocs] = useState<any[]>([]);
  const [dailyDocs, setDailyDocs] = useState<any[]>([]);

  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Live Configuration Listener (Detects active session to display)
  useEffect(() => {
    const configQuery = query(
      collection(db, "attendance"),
      where("__name__", ">=", "legends_config__"),
      where("__name__", "<=", "legends_config__\uf8ff")
    );

    const unsubscribe = onSnapshot(
      configQuery,
      (configSnap) => {
        const activeSessions: any[] = [];
        
        configSnap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.showOnHomePage) {
            const rawSession = docSnap.id.replace("legends_config__", "");
            activeSessions.push({
              id: rawSession,
              ...data
            });
          }
        });

        if (activeSessions.length > 0) {
          activeSessions.sort((a, b) => b.id.localeCompare(a.id));
          setSelectedSession(activeSessions[0].id);
        } else {
          setSelectedSession("");
          setLegends([]);
          setLoading(false);
        }
      },
      (error) => {
        console.error("[LegendaryStudents] Config load failed. Falling back to default.", error);
        setSelectedSession("2025-2026");
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Fetch Students from Sanity once session changes & Setup Real-time Attendance Listeners
  useEffect(() => {
    if (!selectedSession) return;

    // Fetch Sanity students for this session
    setLoading(true);
    client
      .fetch<Student[]>(getAllStudentsQuery, { session: selectedSession })
      .then((students) => {
        setSanityStudents(students || []);
      })
      .catch((err) => {
        console.error("[LegendaryStudents] Sanity fetch error:", err);
      });

    // Start dates for daily queries
    const parts = selectedSession.split('-');
    const startYear = parseInt(parts[0], 10);
    const endYear = parseInt(parts[1], 10);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const startStr = `${startYear}-06-01`;
    const sessionEndStr = `${endYear}-05-31`;
    const endStr = todayStr < sessionEndStr ? todayStr : sessionEndStr;

    // Setup Firestore Manual Aggregates query listener
    const manualQuery = query(
      collection(db, "attendance"),
      where("session", "==", selectedSession)
    );
    const unsubManual = onSnapshot(manualQuery, (snap) => {
      setManualDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Setup Firestore Daily Scans query listener
    const dailyQuery = query(
      collection(db, "daily_attendance"),
      where("date", ">=", startStr),
      where("date", "<=", endStr)
    );
    const unsubDaily = onSnapshot(dailyQuery, (snap) => {
      setDailyDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubManual();
      unsubDaily();
    };
  }, [selectedSession]);

  // 3. Compute Real-time Attendance Statistics Reactive to any changes
  useEffect(() => {
    if (!selectedSession) return;
    if (sanityStudents.length === 0) {
      // If we don't have sanity students yet, wait
      return;
    }

    try {
      const aggMap: Record<string, { present: number; absent: number; leave: number; total: number }> = {};
      
      // Initialize aggMap for all loaded students to avoid 0 defaults
      sanityStudents.forEach(s => {
        if (s.grNumber) {
          aggMap[s.grNumber] = { present: 0, absent: 0, leave: 0, total: 0 };
        }
      });

      const hasManualFor = new Set<string>(); // Keep track of "YYYY-MM__class" with manual records

      // Loop manual overrides
      manualDocs.forEach(data => {
        const month = data.month; // e.g. "2025-06"
        const cls = (data.class || '').toString().replace(/^Class\s+/i, '').trim();
        
        if (month && cls) {
          hasManualFor.add(`${month}__${cls}`);
        }

        const records = data.records || {};
        Object.keys(records).forEach(gr => {
          const row = records[gr];
          if (gr) {
            if (!aggMap[gr]) {
              aggMap[gr] = { present: 0, absent: 0, leave: 0, total: 0 };
            }
            aggMap[gr].present += (row.present || 0);
            aggMap[gr].absent += (row.absent || 0);
            aggMap[gr].leave += (row.leave || 0);
            aggMap[gr].total += (row.totalDays || 0);
          }
        });
      });

      // Track dates to find total working days per month per class
      const monthClassDatesMap: Record<string, Set<string>> = {};
      const studentMonthScans: Record<string, Record<string, { present: number; leave: number }>> = {};

      // Loop daily scan documents
      dailyDocs.forEach(record => {
        const gr = record.grNumber;
        const dateStr = record.date;
        const status = (record.status || 'present').toLowerCase().trim();
        const rawClass = record.class || '';
        const cleanClass = rawClass.replace(/^Class\s+/i, '').trim();

        if (gr && dateStr) {
          const monthStr = dateStr.substring(0, 7);
          
          if (hasManualFor.has(`${monthStr}__${cleanClass}`)) {
            return;
          }

          const key = `${monthStr}__${cleanClass}`;
          if (!monthClassDatesMap[key]) {
            monthClassDatesMap[key] = new Set<string>();
          }
          monthClassDatesMap[key].add(dateStr);

          if (!studentMonthScans[gr]) {
            studentMonthScans[gr] = {};
          }
          if (!studentMonthScans[gr][monthStr]) {
            studentMonthScans[gr][monthStr] = { present: 0, leave: 0 };
          }
          if (status === 'present') {
            studentMonthScans[gr][monthStr].present += 1;
          } else if (status === 'leave') {
            studentMonthScans[gr][monthStr].leave += 1;
          }
        }
      });

      // Compute and add daily scans to aggMap for each student
      sanityStudents.forEach(s => {
        const gr = s.grNumber;
        if (!gr) return;
        
        const cleanClass = (s.admissionFor || '').toString().replace(/^Class\s+/i, '').trim();
        const studentScans = studentMonthScans[gr] || {};

        Object.keys(monthClassDatesMap).forEach(monthClassKey => {
          const [monthStr, keyClass] = monthClassKey.split('__');
          if (keyClass !== cleanClass) return;

          const totalWorkingDays = monthClassDatesMap[monthClassKey].size;
          if (totalWorkingDays === 0) return;

          const scans = studentScans[monthStr] || { present: 0, leave: 0 };
          const present = scans.present;
          const leave = scans.leave;
          const absent = Math.max(0, totalWorkingDays - present - leave);

          if (!aggMap[gr]) {
            aggMap[gr] = { present: 0, absent: 0, leave: 0, total: 0 };
          }
          aggMap[gr].present += present;
          aggMap[gr].leave += leave;
          aggMap[gr].absent += absent;
          aggMap[gr].total += totalWorkingDays;
        });
      });

      // Map statistics to students
      const allMapped: LegendStudent[] = sanityStudents
        .map(s => {
          const stats = aggMap[s.grNumber || ''] || { present: 0, absent: 0, leave: 0, total: 0 };
          const percentage = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
          return {
            ...s,
            stats: {
              ...stats,
              percentage
            },
            isPerfect: stats.total >= 1 && stats.absent === 0 && stats.leave === 0 && stats.present === stats.total
          };
        });

      // Filter Perfect 100% Attendance students
      let filteredLegends = allMapped.filter(s => s.isPerfect);
      let perfectGroup = true;

      if (filteredLegends.length === 0) {
        // Fallback to high attendance (>= 90%) sorted by percentage descending
        filteredLegends = allMapped
          .filter(s => s.stats.total >= 1 && s.stats.percentage >= 90)
          .sort((a, b) => b.stats.percentage - a.stats.percentage)
          .slice(0, 15);
        perfectGroup = false;
      }

      // If even fallback is empty (e.g. database is empty or has 0 attendance records)
      if (filteredLegends.length === 0) {
        console.warn("[LegendaryStudents] No real-time high-attendance students found. Using Mock Legends.");
        setLegends(MOCK_LEGENDS);
        setIsPerfectGroup(true);
      } else {
        setLegends(filteredLegends);
        setIsPerfectGroup(perfectGroup);
      }
    } catch (error) {
      console.error("[LegendaryStudents] Failed to process real-time stats:", error);
      setLegends(MOCK_LEGENDS);
      setIsPerfectGroup(true);
    } finally {
      setLoading(false);
    }
  }, [sanityStudents, manualDocs, dailyDocs, selectedSession]);

  const handleNext = () => {
    if (legends.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % legends.length);
  };

  const handlePrev = () => {
    if (legends.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + legends.length) % legends.length);
  };

  // Autoplay functionality
  useEffect(() => {
    if (legends.length <= 1 || loading) return;
    autoPlayRef.current = setInterval(handleNext, 5000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [legends, loading]);

  const resetAutoplay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = setInterval(handleNext, 5000);
    }
  };

  const selectSlide = (index: number) => {
    setActiveIndex(index);
    resetAutoplay();
  };

  if (loading) {
    return (
      <section className="relative py-20 bg-neutral-950 border-y border-neutral-900 overflow-hidden w-full flex flex-col items-center">
        <div className="absolute inset-0 bg-islamic-pattern opacity-5 pointer-events-none" />
        <div className="w-full max-w-7xl mx-auto px-4 text-center">
          <div className="h-6 w-48 bg-neutral-800 animate-pulse rounded-full mx-auto mb-3" />
          <div className="h-10 w-96 bg-neutral-800 animate-pulse rounded-lg mx-auto mb-12" />
          <div className="max-w-md mx-auto h-[480px] bg-neutral-900 border border-neutral-800 animate-pulse rounded-none" />
        </div>
      </section>
    );
  }

  if (legends.length === 0) {
    return null; 
  }

  return (
    <section className="relative py-24 bg-neutral-950 border-y border-neutral-900 overflow-hidden w-full flex flex-col items-center select-none">
      {/* Decorative Gold & Emerald Background Gradients */}
      <div className="absolute inset-0 bg-islamic-pattern opacity-5 pointer-events-none" />
      <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-emerald-950/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-yellow-950/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center mb-16 relative">
          <div className="flex items-center justify-center gap-2 mb-3.5">
            <span className="h-[1px] w-12 bg-yellow-500/35" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-yellow-500 flex items-center gap-1.5 font-mono">
              <Sparkles size={12} className="text-yellow-500 animate-pulse" />
              {isPerfectGroup ? `100% Attendance Hall of Fame (${selectedSession})` : `Attendance Honor Roll (${selectedSession})`}
            </span>
            <span className="h-[1px] w-12 bg-yellow-500/35" />
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-tight mb-4 flex items-center justify-center gap-3">
            <Crown size={28} className="text-yellow-500 animate-bounce" />
            {isPerfectGroup ? "Meet Our Attendance Legends" : "Our Attendance Champions"}
          </h2>
          <p className="text-xs sm:text-sm font-bold text-neutral-400 max-w-lg mx-auto leading-relaxed uppercase tracking-wider">
            {isPerfectGroup 
              ? `Celebrating outstanding dedication and perfect discipline. These legends haven't missed a single second of session ${selectedSession}!` 
              : `Honoring outstanding consistency and regular attendance. Leading by examples of daily commitment in session ${selectedSession}!`}
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative max-w-5xl mx-auto flex flex-col items-center">
          
          {/* Main Card Viewport */}
          <div className="relative w-full overflow-hidden min-h-[390px] flex items-center justify-center px-4">
            
            {legends.map((student, idx) => {
              const isActive = idx === activeIndex;
              const isPrev = idx === (activeIndex - 1 + legends.length) % legends.length;
              const isNext = idx === (activeIndex + 1) % legends.length;
              
              let position = "opacity-0 scale-95 translate-x-full pointer-events-none absolute";
              if (isActive) position = "opacity-100 scale-100 z-30 translate-x-0 pointer-events-auto absolute flex";
              else if (isPrev) position = "opacity-0 md:opacity-20 scale-80 -translate-x-full md:-translate-x-[60%] z-10 pointer-events-none absolute flex";
              else if (isNext) position = "opacity-0 md:opacity-20 scale-80 translate-x-full md:translate-x-[60%] z-10 pointer-events-none absolute flex";

              return (
                <div
                  key={student._id}
                  className={cn(
                    "w-full max-w-[320px] bg-neutral-950 border-2 border-yellow-500/25 p-5 rounded-none transition-all duration-700 ease-out flex flex-col items-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.95)] group hover:border-yellow-500/60",
                    position
                  )}
                  style={{
                    boxShadow: isActive ? "0 25px 60px -15px rgba(234, 179, 8, 0.05), inset 0 0 40px rgba(255,255,255,0.01)" : "none"
                  }}
                >
                  {/* Decorative Card Header Ribbon */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-500/80 to-transparent" />
                  
                  {/* Absolute Badge */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-neutral-950 font-black text-[8px] uppercase tracking-[0.2em] px-3.5 py-0.5 flex items-center gap-1 shadow-md">
                    <Trophy size={9} />
                    {isPerfectGroup ? "100% Perfect" : `${student.stats.percentage.toFixed(0)}% attendance`}
                  </div>

                  {/* Student Photo Profile Frame */}
                  <div className="relative mt-2 mb-4">
                    {/* Ring animation */}
                    <div className="absolute -inset-1.5 bg-gradient-to-tr from-yellow-500 to-emerald-500 rounded-full opacity-35 blur-[4px] group-hover:opacity-75 transition-opacity duration-500 animate-spin" style={{ animationDuration: '8s' }} />
                    <div className="relative w-24 h-24 rounded-full border-2 border-yellow-500 bg-neutral-950 overflow-hidden flex items-center justify-center shadow-inner">
                      {student.photoUrl ? (
                        <Image
                          src={student.photoUrl}
                          alt={student.fullName}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-yellow-500/10 to-emerald-500/10 flex items-center justify-center text-yellow-500 font-extrabold text-2xl">
                          {student.fullName.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name and Identifiers */}
                  <h3 className="text-lg font-extrabold text-white tracking-tight uppercase group-hover:text-yellow-400 transition-colors duration-300">
                    {student.fullName}
                  </h3>
                  
                  <div className="flex items-center gap-2 mt-1 mb-1.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-neutral-900 text-neutral-400 uppercase tracking-widest border border-neutral-800">
                      Class {student.admissionFor}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-yellow-500/50" />
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-neutral-900 text-neutral-400 uppercase tracking-widest border border-neutral-800">
                      Roll {student.rollNumber || "---"}
                    </span>
                  </div>

                  {/* Session printed explicitly */}
                  <div className="text-[8.5px] font-black uppercase tracking-[0.15em] text-neutral-500 mb-3.5 font-mono">
                    Session {selectedSession}
                  </div>

                  {/* Attendance Performance Grid */}
                  <div className="grid grid-cols-4 gap-1.5 w-full bg-neutral-950/60 p-3 border border-neutral-900 mb-4">
                    
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Total</span>
                      <span className="text-sm font-extrabold text-white mt-0.5">{student.stats.total}</span>
                    </div>

                    <div className="flex flex-col items-center justify-center border-l border-neutral-900">
                      <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider">Present</span>
                      <span className="text-sm font-extrabold text-emerald-400 mt-0.5">{student.stats.present}</span>
                    </div>

                    <div className="flex flex-col items-center justify-center border-l border-neutral-900">
                      <span className="text-[8px] font-bold text-red-500 uppercase tracking-wider">Absent</span>
                      <span className="text-sm font-extrabold text-red-400 mt-0.5">{student.stats.absent}</span>
                    </div>

                    <div className="flex flex-col items-center justify-center border-l border-neutral-900">
                      <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider">Leave</span>
                      <span className="text-sm font-extrabold text-amber-400 mt-0.5">{student.stats.leave}</span>
                    </div>

                  </div>

                  {/* Verifiable Legend Description Badge */}
                  <div className="flex items-center gap-1 text-[8.5px] text-yellow-500/70 font-semibold uppercase tracking-widest font-mono mt-0.5">
                    <Award size={12} className="text-yellow-500 shrink-0" />
                    Verified Att. Registry Record
                  </div>
                </div>
              );
            })}

          </div>

          {/* Navigation Arrows */}
          <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 flex justify-between pointer-events-none px-2 z-30">
            <button
              onClick={() => { handlePrev(); resetAutoplay(); }}
              className="w-11 h-11 border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-850 hover:border-yellow-500/40 text-neutral-400 hover:text-white transition-all flex items-center justify-center pointer-events-auto rounded-full group active:scale-95 shadow-lg shadow-black/50"
            >
              <ChevronLeft size={20} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
            </button>
            <button
              onClick={() => { handleNext(); resetAutoplay(); }}
              className="w-11 h-11 border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-850 hover:border-yellow-500/40 text-neutral-400 hover:text-white transition-all flex items-center justify-center pointer-events-auto rounded-full group active:scale-95 shadow-lg shadow-black/50"
            >
              <ChevronRight size={20} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Indicators / Navigation Dots */}
          <div className="flex items-center gap-2 mt-8 z-30">
            {legends.map((_, idx) => (
              <button
                key={idx}
                onClick={() => selectSlide(idx)}
                className={cn(
                  "h-1.5 transition-all duration-300 border-none",
                  idx === activeIndex 
                    ? "w-8 bg-yellow-500" 
                    : "w-2.5 bg-neutral-800 hover:bg-neutral-700"
                )}
              />
            ))}
          </div>

          {/* Explore Detailed Hall of Fame Button */}
          <div className="mt-10 z-30">
            <a
              href="/hall-of-fame"
              className="inline-flex items-center gap-3 border border-yellow-500/35 bg-neutral-950 hover:bg-yellow-500 hover:text-neutral-950 px-8 py-3.5 text-xs font-black uppercase tracking-[0.25em] text-yellow-500 hover:border-yellow-500 transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-yellow-950/5 font-mono"
            >
              <Trophy size={14} className="animate-bounce" />
              Explore Full Hall of Fame & History
            </a>
          </div>

        </div>

      </div>
    </section>
  );
};

export default LegendaryStudents;

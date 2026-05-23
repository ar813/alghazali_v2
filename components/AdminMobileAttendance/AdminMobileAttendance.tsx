"use client";

import React, { useEffect, useState } from 'react';
import PremiumLoader from '@/components/ui/PremiumLoader';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Search } from 'lucide-react';
import { toast } from "sonner";
import { client } from '@/sanity/lib/client';
import { getAllStudentsQuery } from '@/sanity/lib/queries';
import type { Student } from '@/types/student';
import AttendanceStats from './subcomponents/AttendanceStats';
import AttendanceFilters from './subcomponents/AttendanceFilters';
import AttendanceTable from './subcomponents/AttendanceTable';
import AttendanceCardList from './subcomponents/AttendanceCardList';
import { useSession } from '@/context/SessionContext';

interface AttendanceRecord {
    id: string;
    date: string;
    studentName: string;
    class: string;
    rollNumber: string;
    grNumber: string;
    photoUrl: string | null;
    timestamp: number;
    status: 'present' | 'leave';
    reason?: string;
    // Manual details
    manualTotalDays?: number;
    manualPresent?: number;
    manualAbsent?: number;
    manualLeave?: number;
    hasManualRecord?: boolean;
}

const AdminMobileAttendance = ({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) => {
    const { selectedSession } = useSession();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'leave' | 'absent'>('all');

    // Dummy classes for filter - can be dynamic if needed
    const classOptions = ['All', 'KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'SSCI', 'SSCII'];

    const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'custom'>('daily');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');

        setSelectedDate(`${yyyy}-${mm}-${dd}`);
        setSelectedMonth(`${yyyy}-${mm}`);
        setDateRange({
            start: `${yyyy}-${mm}-01`,
            end: `${yyyy}-${mm}-${dd}`
        });
    }, []);

    const loadData = async () => {
        if ((viewMode === 'daily' && !selectedDate) ||
            (viewMode === 'monthly' && !selectedMonth) ||
            (viewMode === 'custom' && (!dateRange.start || !dateRange.end))) {
            return;
        }

        if (onLoadingChange) onLoadingChange(true);
        setLoading(true);

        try {
            // 1. Fetch Students from Sanity - Filter by Session and Class
            const classFilterStr = filterClass !== 'All' ? '&& admissionFor == $classFilter' : '';
            const studentsQuery = `*[_type == "student" && (session == $session || (!defined(session) && $session == "2025-2026")) ${classFilterStr}]{
                _id,
                fullName,
                rollNumber,
                grNumber,
                gender,
                "photoUrl": photo.asset->url,
                admissionFor
            }`;
            
            const fetchStudentsPromise = client.fetch<Student[]>(studentsQuery, { 
                session: selectedSession,
                classFilter: filterClass === 'All' ? '' : filterClass
            });

            // 2. Fetch Mobile Scans from Firestore
            let q;
            if (viewMode === 'daily') {
                q = query(collection(db, 'daily_attendance'), where("date", "==", selectedDate));
            } else if (viewMode === 'monthly') {
                const startStr = `${selectedMonth}-01`;
                const endStr = `${selectedMonth}-31`;
                q = query(collection(db, 'daily_attendance'), where("date", ">=", startStr), where("date", "<=", endStr));
            } else {
                q = query(collection(db, 'daily_attendance'), where("date", ">=", dateRange.start), where("date", "<=", dateRange.end));
            }
            const fetchMobilePromise = getDocs(q);

            // 3. Determine target months list for manual fetch
            const targetMonths: string[] = [];
            if (viewMode === 'daily' && selectedDate) {
                targetMonths.push(selectedDate.substring(0, 7));
            } else if (viewMode === 'monthly' && selectedMonth) {
                targetMonths.push(selectedMonth);
            } else if (viewMode === 'custom' && dateRange.start && dateRange.end) {
                const start = new Date(dateRange.start);
                const end = new Date(dateRange.end);
                const current = new Date(start.getFullYear(), start.getMonth(), 1);
                while (current <= end) {
                    const mStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
                    if (!targetMonths.includes(mStr)) targetMonths.push(mStr);
                    current.setMonth(current.getMonth() + 1);
                }
            }

            // 4. Fetch Manual monthly overrides from Firestore
            let fetchManualPromise = Promise.resolve() as Promise<any>;
            if (targetMonths.length > 0) {
                // If filterClass is 'All', we query for the month list. If specific class, we query by month and class.
                let manualQuery = query(
                    collection(db, 'attendance'),
                    where("session", "==", selectedSession),
                    where("month", "in", targetMonths)
                );
                if (filterClass !== 'All') {
                    manualQuery = query(manualQuery, where("class", "in", [filterClass, `Class ${filterClass}`]));
                }
                fetchManualPromise = getDocs(manualQuery);
            }

            // Concurrent execution
            const [classStudents, mobileSnap, manualSnap] = await Promise.all([
                fetchStudentsPromise,
                fetchMobilePromise,
                fetchManualPromise
            ]);

            setAllStudents(classStudents);

            // Parse Mobile records with strict defaults
            const rawMobileData: AttendanceRecord[] = [];
            const attendedDates = new Set<string>();

            mobileSnap.docs.forEach((doc) => {
                const docData = doc.data();
                const status = (docData.status || 'present').toLowerCase().trim();
                const recordClass = docData.class || '';
                
                // Class filter matching logic
                const matchesClass = filterClass === 'All' || recordClass === filterClass || recordClass === `Class ${filterClass}`;
                
                if (matchesClass) {
                    if (docData.date) attendedDates.add(docData.date);
                    rawMobileData.push({
                        id: doc.id,
                        ...docData,
                        status: status,
                        studentName: docData.studentName || 'Unknown Student',
                        class: docData.class || '-',
                        rollNumber: docData.rollNumber || '-',
                        grNumber: docData.grNumber || '-',
                        timestamp: docData.timestamp || 0
                    } as AttendanceRecord);
                }
            });

            // Parse Manual monthly aggregates per GR
            const manualAggMap: Record<string, { present: number; absent: number; leave: number; totalDays: number }> = {};
            if (manualSnap && !manualSnap.empty) {
                manualSnap.docs.forEach((docSnap: any) => {
                    const docData = docSnap.data();
                    const records = docData.records || {};
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
                });
            }

            // Calculate 'Absent' records for students in class who did not scan
            const activeDays = Array.from(attendedDates);
            const attendanceMap = new Set(rawMobileData.map(r => `${r.grNumber}-${r.date}`));
            const generatedAbsents: AttendanceRecord[] = [];

            if (activeDays.length > 0 && classStudents.length > 0) {
                activeDays.forEach(day => {
                    classStudents.forEach(student => {
                        const key = `${student.grNumber || 'none'}-${day}`;
                        if (!attendanceMap.has(key)) {
                            generatedAbsents.push({
                                id: `absent-${student.grNumber || student._id}-${day}`,
                                date: day,
                                studentName: student.fullName,
                                class: student.admissionFor,
                                rollNumber: student.rollNumber,
                                grNumber: student.grNumber || 'N/A',
                                photoUrl: student.photoUrl || null,
                                timestamp: 0,
                                status: 'leave', // dummy default
                                reason: 'Absent',
                                isAbsent: true
                            } as any);
                        }
                    });
                });
            }

            // Combine mobile logs, absents, and inject manual stats
            const combinedData = [...rawMobileData, ...generatedAbsents].map(record => {
                const gr = record.grNumber;
                const man = manualAggMap[gr];
                if (man) {
                    return {
                        ...record,
                        hasManualRecord: true,
                        manualTotalDays: man.totalDays,
                        manualPresent: man.present,
                        manualAbsent: man.absent,
                        manualLeave: man.leave
                    };
                }
                return record;
            });

            combinedData.sort((a, b) => {
                if (a.date !== b.date) return b.date.localeCompare(a.date);
                return a.studentName.localeCompare(b.studentName);
            });

            setRecords(combinedData);
        } catch (error) {
            console.error("❌ Error loading optimized attendance records:", error);
            toast.error("Failed to load attendance records.");
        } finally {
            setLoading(false);
            if (onLoadingChange) onLoadingChange(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedDate, selectedMonth, dateRange, viewMode, filterClass, selectedSession]);

    const formatTime = (epoch: number) => {
        if (!epoch) return '-';
        return new Date(epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Calculate absent students and apply filters
    const filteredRecords = records.filter(r => {
        const term = search.toLowerCase();
        const matchesSearch =
            (r.studentName?.toLowerCase().includes(term) || '') ||
            (r.rollNumber?.toLowerCase().includes(term) || '') ||
            (r.grNumber?.toLowerCase().includes(term) || '');

        const matchesClass = filterClass === 'All' || r.class === filterClass || r.class === `Class ${filterClass}`;

        let matchesStatus = true;
        if (statusFilter === 'present') matchesStatus = r.status === 'present' && !(r as any).isAbsent;
        if (statusFilter === 'leave') matchesStatus = r.status === 'leave' && !(r as any).isAbsent;
        if (statusFilter === 'absent') matchesStatus = (r as any).isAbsent;

        return matchesSearch && matchesClass && matchesStatus;
    });

    const handleExport = async () => {
        if (filteredRecords.length === 0 && allStudents.length === 0) {
            toast.error("No data available to export.");
            return;
        }

        const toastId = toast.loading("Generating Enterprise Register Report...");

        try {
            const ExcelJS = (await import('exceljs')).default || await import('exceljs');
            const { saveAs } = (await import('file-saver')).default || await import('file-saver');
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Al-Ghazali Admin';
            workbook.created = new Date();

            // Function to generate all dates in a month
            const getDaysInMonth = (year: number, month: number) => {
                const date = new Date(year, month - 1, 1);
                const days: string[] = [];
                while (date.getMonth() === month - 1) {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    days.push(`${y}-${m}-${d}`);
                    date.setDate(date.getDate() + 1);
                }
                return days;
            };

            // Register Style Logic
            if (viewMode === 'monthly' || viewMode === 'custom') {
                let targetMonths: string[] = [];

                if (viewMode === 'monthly' && selectedMonth) {
                    targetMonths = [selectedMonth];
                } else if (viewMode === 'custom' && dateRange.start && dateRange.end) {
                    // Logic to find all months between start and end
                    const start = new Date(dateRange.start);
                    const end = new Date(dateRange.end);
                    const current = new Date(start.getFullYear(), start.getMonth(), 1);
                    while (current <= end) {
                        const mStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
                        if (!targetMonths.includes(mStr)) targetMonths.push(mStr);
                        current.setMonth(current.getMonth() + 1);
                    }
                }

                if (targetMonths.length === 0) {
                    toast.error("Please select a valid date range.", { id: toastId });
                    return;
                }

                for (const monthKey of targetMonths) {
                    const [yearStr, monthStr] = monthKey.split('-');
                    const fullMonthDates = getDaysInMonth(parseInt(yearStr), parseInt(monthStr));

                    const sheetName = new Date(parseInt(yearStr), parseInt(monthStr) - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
                    const worksheet = workbook.addWorksheet(sheetName);

                    // --- HEADERS ---
                    const topHeaders = ['SR', 'GR No', 'Roll No', 'Student Name'];
                    const dayHeaders = fullMonthDates.map(d => parseInt(d.split('-')[2])); // 1, 2, 3...
                    const summaryHeaders = ['Total P', 'Total A', 'Total L', '%'];
                    const allHeaders = [...topHeaders, ...dayHeaders, ...summaryHeaders];

                    const headerRow = worksheet.addRow(allHeaders);

                    // Style Header
                    headerRow.eachCell((cell, _colNumber) => {
                        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
                        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });
                    headerRow.height = 30;

                    // Column Widths
                    worksheet.getColumn(1).width = 5;  // SR
                    worksheet.getColumn(2).width = 10; // GR
                    worksheet.getColumn(3).width = 8;  // Roll
                    worksheet.getColumn(4).width = 25; // Name
                    // Day columns
                    for (let i = 5; i <= 4 + dayHeaders.length; i++) {
                        worksheet.getColumn(i).width = 4.5;
                    }
                    // Summary columns
                    const sumStart = 5 + dayHeaders.length;
                    for (let i = sumStart; i < sumStart + 4; i++) {
                        worksheet.getColumn(i).width = 9;
                    }

                    // Freeze Panes (First 4 columns and Top 1 row)
                    worksheet.views = [
                        { state: 'frozen', xSplit: 4, ySplit: 1 }
                    ];

                    // --- DATA ROWS ---
                    // Filter students for this class
                    const classStudents = allStudents
                        .filter(s => filterClass === 'All' || s.admissionFor === filterClass || s.admissionFor === `Class ${filterClass}`)
                        .sort((a, b) => {
                            const rollA = a.rollNumber?.toString() || '';
                            const rollB = b.rollNumber?.toString() || '';
                            return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
                        });

                    classStudents.forEach((student, idx) => {
                        const rowData: any[] = [
                            idx + 1,
                            student.grNumber || '-',
                            student.rollNumber || '-',
                            student.fullName
                        ];

                        let pCount = 0;
                        let aCount = 0;
                        let lCount = 0;
                        // Count active days (excluding fully empty columns if needed, but for register we count all school days)
                        // For now we assume Sunday is holiday (automatically marked 'H' or empty but not counted in denominator?)
                        // Let's stick to total days in month for standard reg or active days. 
                        // User wants "poore month k days", so denominator is total days usually, or total working days.
                        let totalWorkingDays = 0;

                        fullMonthDates.forEach(date => {
                            const dayOfWeek = new Date(date).getDay();
                            const isFriday = dayOfWeek === 5; // Friday is holiday

                            if (isFriday) {
                                rowData.push(''); // Empty for Friday
                                // Optionally mark 'F' or gray out
                                return;
                            }
                            totalWorkingDays++;

                            const record = records.find(r => r.grNumber === student.grNumber && r.date === date);

                            if (!record) {
                                // Logic: If no record exists for a working day
                                // Option A: Mark as Absent? 
                                // Option B: Leave empty?
                                // "Generated absents" in useEffect handles this, but only if *someone* took attendance that day.
                                // If NOBODY took attendance (holiday), it's empty.

                                // Let's check if ANYONE has attendance for this date.
                                const anyAttendance = records.some(r => r.date === date);
                                if (anyAttendance) {
                                    // If others have attendance, but this student doesn't -> Absent
                                    rowData.push('A');
                                    aCount++;
                                } else {
                                    // No dataset for this day -> Holiday or no school
                                    rowData.push('-');
                                    // Don't increment working days? Revert above
                                    totalWorkingDays--;
                                }
                            } else if ((record as any).isAbsent) {
                                rowData.push('A');
                                aCount++;
                            } else if (record.status === 'present') {
                                rowData.push('P');
                                pCount++;
                            } else {
                                rowData.push('L');
                                lCount++;
                            }
                        });


                        const percentage = totalWorkingDays > 0
                            ? ((pCount / totalWorkingDays) * 100).toFixed(0) + '%'
                            : '0%';

                        rowData.push(pCount, aCount, lCount, percentage);

                        const row = worksheet.addRow(rowData);

                        // Row Styling
                        row.eachCell((cell, colNumber) => {
                            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
                            cell.font = { size: 9 };
                            cell.border = {
                                top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                                left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                                bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                                right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                            };

                            // Student Name Align Left
                            if (colNumber === 4) {
                                cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                                cell.font = { bold: true, size: 9 };
                            }

                            // Conditional Formatting
                            const val = cell.value?.toString();
                            if (colNumber > 4 && colNumber <= 4 + fullMonthDates.length) {
                                // Date columns
                                const dateIdx = colNumber - 5;
                                const currentDate = fullMonthDates[dateIdx];
                                const isFri = new Date(currentDate).getDay() === 5;

                                if (isFri) {
                                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; // Gray for Friday
                                }

                                if (val === 'P') {
                                    cell.font = { color: { argb: 'FF059669' }, bold: true }; // Green
                                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } };
                                }
                                if (val === 'A') {
                                    cell.font = { color: { argb: 'FFDC2626' }, bold: true }; // Red
                                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF2F2' } };
                                }
                                if (val === 'L') {
                                    cell.font = { color: { argb: 'FFD97706' }, bold: true }; // Orange
                                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBEB' } };
                                }
                            }
                        });
                    });

                    // FOOTER TOTALS
                    const footerRow = worksheet.addRow([]);
                    footerRow.getCell(4).value = 'DAILY ATTENDANCE';
                    footerRow.getCell(4).font = { bold: true, size: 9 };
                    footerRow.getCell(4).alignment = { horizontal: 'right' };

                    fullMonthDates.forEach((date, i) => {
                        const colIdx = 5 + i;
                        const isFri = new Date(date).getDay() === 5;
                        if (!isFri) {
                            // Calculate column sum P
                            // ExcelJS doesn't support easy formulas for dynamic ranges in JS cleanly without refs, manual calc is safer here
                            // Or leave empty for cleaner look.
                            // Let's put P count
                            const colValues = worksheet.getColumn(colIdx).values.slice(2) as any[]; // skip header + 1 empty
                            const pToday = colValues.filter(v => v === 'P').length;
                            if (pToday > 0) {
                                footerRow.getCell(colIdx).value = pToday;
                                footerRow.getCell(colIdx).font = { bold: true, size: 8, color: { argb: 'FF6B7280' } };
                                footerRow.getCell(colIdx).alignment = { horizontal: 'center' };
                            }
                        }
                    });
                }

            } else {
                // DAILY EXPORT (Legacy/Standard)
                const worksheet = workbook.addWorksheet('Daily Report');
                // ... (Keep existing Standard Daily Export Logic if preferred, or refactor too)
                // For brevity, using the previous standard logic here but ensuring it works:
                worksheet.columns = [
                    { header: 'Date', key: 'date', width: 15 },
                    { header: 'Student Name', key: 'name', width: 25 },
                    { header: 'Class', key: 'class', width: 10 },
                    { header: 'Roll No', key: 'roll', width: 10 },
                    { header: 'Status', key: 'status', width: 12 },
                    { header: 'Time', key: 'time', width: 12 },
                    { header: 'Reason', key: 'reason', width: 25 },
                ];
                // basic styling...
                const headerRow = worksheet.getRow(1);
                headerRow.font = { bold: true };
                filteredRecords.forEach(r => {
                    worksheet.addRow({
                        date: r.date,
                        name: r.studentName,
                        class: r.class,
                        roll: r.rollNumber,
                        status: (r as any).isAbsent ? 'Absent' : r.status,
                        time: r.timestamp ? formatTime(r.timestamp) : '-',
                        reason: r.reason || '-'
                    });
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            let fileName = `Attendance_`;
            if (viewMode === 'monthly') fileName += `${selectedMonth}_`;
            else if (viewMode === 'custom') fileName += `${dateRange.start}_to_${dateRange.end}_`;
            else fileName += `${selectedDate}_`;

            fileName += `${filterClass === 'All' ? 'Whole_School' : `Class_${filterClass.replace(/\s+/g, '_')}`}.xlsx`;
            saveAs(blob, fileName);
            toast.success("Enterprise Register Generated!", { id: toastId });

        } catch (error) {
            console.error("Export Error:", error);
            toast.error("Failed to generate report.", { id: toastId });
        }
    };

    const presentCount = records.filter(r => r.status === 'present' && !(r as any).isAbsent).length;
    const leaveCount = records.filter(r => r.status === 'leave' && !(r as any).isAbsent).length;
    const absentCount = records.filter(r => (r as any).isAbsent).length;

    return (
        <div className="space-y-6">
            <AttendanceStats
                allStudentsCount={allStudents.length}
                presentCount={presentCount}
                leaveCount={leaveCount}
                absentCount={absentCount}
            />

            <AttendanceFilters
                viewMode={viewMode}
                setViewMode={setViewMode}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                dateRange={dateRange}
                setDateRange={setDateRange}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                search={search}
                setSearch={setSearch}
                filterClass={filterClass}
                setFilterClass={setFilterClass}
                classOptions={classOptions}
                handleExport={handleExport}
                loading={loading}
                presentCount={presentCount}
                leaveCount={leaveCount}
                absentCount={absentCount}
                filteredCount={filteredRecords.length}
            />

            {loading ? (
                /* Premium Squared Skeleton Table & Card loader */
                <div className="space-y-4">
                    {/* Desktop Skeleton */}
                    <div className="hidden md:block bg-white dark:bg-neutral-950 rounded-none border border-neutral-100 dark:border-neutral-900 shadow-sm overflow-hidden animate-pulse">
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 flex justify-between">
                            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-none" />
                            <div className="h-4 w-12 bg-neutral-200 dark:bg-neutral-800 rounded-none" />
                            <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-none" />
                            <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-none" />
                            <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-none" />
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
                            {Array.from({ length: 6 }).map((_, sIdx) => (
                                <div key={sIdx} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-800 rounded-none shrink-0" />
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-none" />
                                            <div className="h-3 w-16 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-none" />
                                        </div>
                                    </div>
                                    <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-none" />
                                    <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-none" />
                                    <div className="h-4 w-12 bg-neutral-200 dark:bg-neutral-800 rounded-none" />
                                    <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-none" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mobile Card Skeleton */}
                    <div className="grid grid-cols-1 gap-2 md:hidden">
                        {Array.from({ length: 4 }).map((_, sIdx) => (
                            <div key={sIdx} className="bg-white dark:bg-neutral-950 p-4 border border-neutral-100 dark:border-neutral-900 shadow-sm flex items-center gap-3 animate-pulse">
                                <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-800 rounded-none shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-800" />
                                    <div className="h-3 w-20 bg-neutral-200/60 dark:bg-neutral-800/60" />
                                </div>
                                <div className="h-5 w-16 bg-neutral-200 dark:bg-neutral-800" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : filteredRecords.length === 0 ? (
                <div className="bg-white dark:bg-neutral-950 rounded-none border border-neutral-150 dark:border-neutral-900 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800 flex items-center justify-center mx-auto mb-4">
                        <Search size={28} className="text-neutral-300 dark:text-neutral-700" />
                    </div>
                    <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider mb-2">No Records Found</h3>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                        We couldn't find any attendance logs matching your current filters.
                    </p>
                </div>
            ) : (
                <>
                    <AttendanceTable records={filteredRecords} formatTime={formatTime} />
                    <AttendanceCardList records={filteredRecords} formatTime={formatTime} />
                </>
            )}
        </div>
    );
};

export default AdminMobileAttendance;

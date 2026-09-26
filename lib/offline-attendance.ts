"use client";

import { doc, setDoc, getDoc, type Firestore } from 'firebase/firestore';

export interface CachedStudent {
    _id?: string;
    fullName: string;
    rollNumber: string | number;
    grNumber: string | number;
    admissionFor?: string;
    gender?: string;
    photoUrl?: string | null;
    session?: string;
}

export interface QueuedAttendanceRecord {
    id: string; // unique scan id
    grNumber: string;
    rollNumber: string;
    studentName: string;
    class: string;
    date: string; // YYYY-MM-DD
    timestamp: number;
    status: 'present' | 'late' | 'leave';
    photoUrl?: string | null;
    session?: string;
    scannedAt: string; // HH:mm:ss
    isOfflineRecord: boolean;
}

const STUDENTS_CACHE_KEY = 'aghs_offline_students_cache';
const OFFLINE_QUEUE_KEY = 'aghs_offline_attendance_queue';
const ATTENDANCE_HISTORY_LOCAL_KEY = 'aghs_local_scanned_today';

// --- Student Cache Operations ---
export const cacheStudentsLocally = (students: CachedStudent[]) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify(students));
    } catch (e) {
        console.error('Failed to cache students to localStorage:', e);
    }
};

export const getCachedStudents = (): CachedStudent[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STUDENTS_CACHE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed to read cached students:', e);
        return [];
    }
};

export const findStudentInCache = (rawIdentifier: string): CachedStudent | null => {
    const students = getCachedStudents();
    if (!students || students.length === 0) return null;

    const trimmed = rawIdentifier.trim();
    // Try clean numbers e.g. "GR-1042" -> "1042"
    const cleanedNumber = trimmed.replace(/\D/g, '');

    // 1. Direct grNumber match
    let match = students.find(s => String(s.grNumber).trim() === trimmed || (cleanedNumber && String(s.grNumber).trim() === cleanedNumber));
    if (match) return match;

    // 2. Roll number match
    match = students.find(s => String(s.rollNumber).trim() === trimmed || (cleanedNumber && String(s.rollNumber).trim() === cleanedNumber));
    if (match) return match;

    // 3. _id match
    match = students.find(s => s._id === trimmed);
    if (match) return match;

    // 4. URL or query param parser (e.g. portalUrl?gr=1042 or /student?gr=1042)
    if (trimmed.includes('gr=') || trimmed.includes('grNumber=')) {
        try {
            const url = new URL(trimmed.startsWith('http') ? trimmed : `https://example.com/${trimmed}`);
            const gr = url.searchParams.get('gr') || url.searchParams.get('grNumber');
            if (gr) {
                return students.find(s => String(s.grNumber).trim() === gr.trim()) || null;
            }
        } catch {
            // fallback
        }
    }

    return null;
};

// --- Offline Queue Operations ---
export const getOfflineQueue = (): QueuedAttendanceRecord[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed to read offline queue:', e);
        return [];
    }
};

export const queueOfflineAttendance = (record: QueuedAttendanceRecord) => {
    if (typeof window === 'undefined') return;
    try {
        const current = getOfflineQueue();
        // Prevent duplicate queue for same student on same date
        const existingIdx = current.findIndex(r => r.grNumber === record.grNumber && r.date === record.date);
        if (existingIdx >= 0) {
            current[existingIdx] = record;
        } else {
            current.unshift(record);
        }
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(current));
    } catch (e) {
        console.error('Failed to queue offline attendance:', e);
    }
};

export const removeOfflineRecord = (id: string) => {
    if (typeof window === 'undefined') return;
    try {
        const current = getOfflineQueue();
        const updated = current.filter(r => r.id !== id);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to remove item from offline queue:', e);
    }
};

export const clearOfflineQueue = () => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
    } catch (e) {
        console.error('Failed to clear offline queue:', e);
    }
};

// --- Local Today Scanned List for quick UI ---
export const getTodayLocalScans = (todayDate: string): QueuedAttendanceRecord[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(`${ATTENDANCE_HISTORY_LOCAL_KEY}_${todayDate}`);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
};

export const saveTodayLocalScan = (record: QueuedAttendanceRecord) => {
    if (typeof window === 'undefined') return;
    try {
        const current = getTodayLocalScans(record.date);
        const exists = current.some(r => r.grNumber === record.grNumber);
        if (!exists) {
            current.unshift(record);
            localStorage.setItem(`${ATTENDANCE_HISTORY_LOCAL_KEY}_${record.date}`, JSON.stringify(current.slice(0, 300)));
        }
    } catch (e) {
        console.error('Failed to save local scan:', e);
    }
};

// --- Sync Function ---
export const syncOfflineAttendanceData = async (
    db: Firestore
): Promise<{ success: boolean; syncedCount: number; failedCount: number }> => {
    if (typeof window === 'undefined' || !navigator.onLine) {
        return { success: false, syncedCount: 0, failedCount: 0 };
    }

    const queue = getOfflineQueue();
    if (queue.length === 0) {
        return { success: true, syncedCount: 0, failedCount: 0 };
    }

    let syncedCount = 0;
    const remainingQueue: QueuedAttendanceRecord[] = [];

    for (const record of queue) {
        try {
            // 1. History Path: doc(db, 'attendance', String(record.grNumber), 'history', record.date)
            const studentRef = doc(db, 'attendance', String(record.grNumber), 'history', record.date);
            await setDoc(studentRef, {
                status: record.status || 'present',
                timestamp: record.timestamp,
                studentName: record.studentName,
                class: record.class,
                grNumber: record.grNumber,
                rollNumber: record.rollNumber,
                syncedFromOffline: true
            }, { merge: true });

            // 2. Daily List Path: doc(db, 'daily_attendance', `${record.date}_${record.grNumber}`)
            const dailyRef = doc(db, 'daily_attendance', `${record.date}_${record.grNumber}`);
            await setDoc(dailyRef, {
                date: record.date,
                grNumber: record.grNumber,
                studentName: record.studentName,
                class: record.class,
                rollNumber: record.rollNumber,
                status: record.status || 'present',
                timestamp: record.timestamp,
                photoUrl: record.photoUrl || null,
                session: record.session || null,
                syncedFromOffline: true
            }, { merge: true });

            // 3. Class Session Entry
            if (record.class && record.class !== '-') {
                const classRef = doc(db, 'class_sessions', `${record.class}_${record.date}`);
                await setDoc(classRef, {
                    className: record.class,
                    date: record.date,
                    timestamp: record.timestamp
                }, { merge: true });
            }

            syncedCount++;
        } catch (err) {
            console.error('Failed to sync record for GR:', record.grNumber, err);
            remainingQueue.push(record);
        }
    }

    // Update offline queue with only remaining items that failed
    try {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
    } catch (e) {
        console.error('Failed to update offline queue after sync:', e);
    }

    return {
        success: remainingQueue.length === 0,
        syncedCount,
        failedCount: remainingQueue.length
    };
};

// --- Client-side Audio Feedback (Zero-network Web Audio API) ---
export const playScannerSound = (type: 'success' | 'warning' | 'error' | 'offline') => {
    if (typeof window === 'undefined') return;
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        if (type === 'success') {
            // Bright cheerful double beep
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08); // D6
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.22);
        } else if (type === 'offline') {
            // Warm pleasant chime
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.28);
        } else if (type === 'warning') {
            // Low double alert (e.g. already marked)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
        } else {
            // Error buzz
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch {
        // AudioContext not allowed or unsupported
    }
};

export const triggerHaptic = (pattern: number | number[] = 100) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch {
            // ignore
        }
    }
};

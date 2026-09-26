"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    QrCode, 
    Camera, 
    CameraOff, 
    RefreshCw, 
    Wifi, 
    WifiOff, 
    CheckCircle2, 
    AlertTriangle, 
    Clock, 
    Users, 
    Search, 
    Sparkles, 
    Flashlight, 
    SwitchCamera, 
    UserCheck, 
    CloudUpload, 
    ArrowLeft,
    Check,
    Volume2,
    VolumeX
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { client } from '@/sanity/lib/client';
import { useAuth } from '@/hooks/use-auth';
import { 
    cacheStudentsLocally, 
    getCachedStudents, 
    findStudentInCache, 
    queueOfflineAttendance, 
    getOfflineQueue, 
    syncOfflineAttendanceData, 
    getTodayLocalScans, 
    saveTodayLocalScan,
    playScannerSound, 
    triggerHaptic,
    type CachedStudent,
    type QueuedAttendanceRecord
} from '@/lib/offline-attendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function QRAttendancePage() {
    const { user, isSuperAdmin } = useAuth();

    // System state
    const [isOnline, setIsOnline] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    // Camera & Scanner State
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
    const [torchOn, setTorchOn] = useState(false);
    const [hasTorch, setHasTorch] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Scan cooldown & active student popup
    const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
    const [isCooldown, setIsCooldown] = useState(false);
    const [recentScan, setRecentScan] = useState<QueuedAttendanceRecord | null>(null);

    // Manual Entry
    const [manualInput, setManualInput] = useState('');
    const [manualStatus, setManualStatus] = useState<'present' | 'late'>('present');

    // Scanned Today records
    const [scannedToday, setScannedToday] = useState<QueuedAttendanceRecord[]>([]);
    const [searchFilter, setSearchFilter] = useState('');
    const [classFilter, setClassFilter] = useState('All');

    // Date
    const todayStr = new Date().toISOString().split('T')[0];

    // Load initial data & cache
    useEffect(() => {
        setIsOnline(navigator.onLine);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Load local scanned records for today
        const localScans = getTodayLocalScans(todayStr);
        setScannedToday(localScans);
        setPendingCount(getOfflineQueue().length);

        // Fetch & cache latest students list from Sanity if online
        fetchAndCacheStudents();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            stopCamera();
        };
    }, [todayStr]);

    // Fetch and cache students
    const fetchAndCacheStudents = async () => {
        if (!navigator.onLine) return;
        try {
            const query = `*[_type == "student"]{
                _id,
                fullName,
                rollNumber,
                grNumber,
                admissionFor,
                gender,
                session,
                "photoUrl": photo.asset->url
            }`;
            const students: CachedStudent[] = await client.fetch(query);
            if (students && students.length > 0) {
                cacheStudentsLocally(students);
                console.log(`[Cache] Cached ${students.length} students for offline attendance.`);
            }
        } catch (err) {
            console.warn('Could not update student cache from Sanity:', err);
        }
    };

    // Camera control
    const startCamera = async () => {
        setCameraError(null);
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: cameraFacing,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setIsCameraActive(true);
            }

            // Check torch capability
            const track = stream.getVideoTracks()[0];
            const capabilities: any = track.getCapabilities?.();
            if (capabilities && 'torch' in capabilities) {
                setHasTorch(true);
            } else {
                setHasTorch(false);
            }
        } catch (err: any) {
            console.error('Camera access error:', err);
            setCameraError(err.message || 'Camera permission denied or camera not found.');
            setIsCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
        setTorchOn(false);
    };

    const toggleTorch = async () => {
        if (!streamRef.current) return;
        const track = streamRef.current.getVideoTracks()[0];
        try {
            const newTorch = !torchOn;
            await (track as any).applyConstraints({
                advanced: [{ torch: newTorch }]
            });
            setTorchOn(newTorch);
        } catch (err) {
            console.warn('Torch not supported or failed:', err);
        }
    };

    const toggleCameraFacing = () => {
        setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
    };

    // Re-start camera when facing mode changes
    useEffect(() => {
        if (isCameraActive) {
            startCamera();
        }
    }, [cameraFacing]);

    // Barcode detection loop
    useEffect(() => {
        let animationFrameId: number;
        let barcodeDetector: any = null;

        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
            try {
                barcodeDetector = new (window as any).BarcodeDetector({
                    formats: ['qr_code', 'code_128', 'code_39', 'ean_13']
                });
            } catch (e) {
                console.warn('BarcodeDetector instantiation failed:', e);
            }
        }

        const scanFrame = async () => {
            if (!isCameraActive || !videoRef.current || isCooldown) {
                animationFrameId = requestAnimationFrame(scanFrame);
                return;
            }

            const video = videoRef.current;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                try {
                    if (barcodeDetector) {
                        const barcodes = await barcodeDetector.detect(video);
                        if (barcodes.length > 0) {
                            const rawValue = barcodes[0].rawValue;
                            if (rawValue && rawValue !== lastScannedCode) {
                                handleCodeScanned(rawValue);
                            }
                        }
                    } else if (canvasRef.current) {
                        // Fallback canvas check for barcode
                        const canvas = canvasRef.current;
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        }
                    }
                } catch (e) {
                    // Frame scan skip
                }
            }
            animationFrameId = requestAnimationFrame(scanFrame);
        };

        if (isCameraActive) {
            animationFrameId = requestAnimationFrame(scanFrame);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isCameraActive, isCooldown, lastScannedCode]);

    // Handle Scanned Code (Online + Offline)
    const handleCodeScanned = async (rawValue: string) => {
        setIsCooldown(true);
        setLastScannedCode(rawValue);

        // Cooldown timer (2.5 seconds before same or next code)
        setTimeout(() => {
            setIsCooldown(false);
            setLastScannedCode(null);
        }, 2500);

        // Find student in local cache first
        const student = findStudentInCache(rawValue);

        if (!student) {
            if (soundEnabled) playScannerSound('warning');
            triggerHaptic([50, 50]);
            toast.error(`QR Code Scanned ("${rawValue}"), but no matching student found. Please cache students or enter manually.`);
            return;
        }

        const grNumber = String(student.grNumber);
        const rollNumber = String(student.rollNumber || '-');
        const now = new Date();
        const scannedAtTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Check if already scanned today
        const alreadyScanned = scannedToday.some(r => String(r.grNumber) === grNumber);
        if (alreadyScanned) {
            if (soundEnabled) playScannerSound('warning');
            triggerHaptic([50, 50, 50]);
            toast.info(`${student.fullName} (GR #${grNumber}) is already marked today!`);
            return;
        }

        const record: QueuedAttendanceRecord = {
            id: `${todayStr}_${grNumber}_${Date.now()}`,
            grNumber,
            rollNumber,
            studentName: student.fullName,
            class: student.admissionFor || '-',
            date: todayStr,
            timestamp: Date.now(),
            status: 'present',
            photoUrl: student.photoUrl,
            session: student.session || '2025-2026',
            scannedAt: scannedAtTime,
            isOfflineRecord: !navigator.onLine
        };

        // Update local state immediately for instant UX feedback
        saveTodayLocalScan(record);
        setScannedToday(prev => [record, ...prev]);
        setRecentScan(record);

        // Check Online vs Offline
        if (!navigator.onLine) {
            // Offline path: Save to offline queue
            queueOfflineAttendance(record);
            setPendingCount(getOfflineQueue().length);
            if (soundEnabled) playScannerSound('offline');
            triggerHaptic(120);
            toast.warning(`[Offline] Attendance saved locally: ${student.fullName} (GR #${grNumber})`);
        } else {
            // Online path: Write to Firebase directly
            try {
                if (soundEnabled) playScannerSound('success');
                triggerHaptic(100);

                // 1. History Path
                const studentRef = doc(db, 'attendance', grNumber, 'history', todayStr);
                await setDoc(studentRef, {
                    status: 'present',
                    timestamp: record.timestamp,
                    studentName: student.fullName,
                    class: record.class,
                    grNumber: grNumber,
                    rollNumber: rollNumber
                }, { merge: true });

                // 2. Daily Attendance Path
                const dailyRef = doc(db, 'daily_attendance', `${todayStr}_${grNumber}`);
                await setDoc(dailyRef, {
                    date: todayStr,
                    grNumber: grNumber,
                    studentName: student.fullName,
                    class: record.class,
                    rollNumber: rollNumber,
                    status: 'present',
                    timestamp: record.timestamp,
                    photoUrl: student.photoUrl || null,
                    session: record.session || null
                }, { merge: true });

                // 3. Class Session Entry
                if (student.admissionFor) {
                    const classRef = doc(db, 'class_sessions', `${student.admissionFor}_${todayStr}`);
                    await setDoc(classRef, {
                        className: student.admissionFor,
                        date: todayStr,
                        timestamp: record.timestamp
                    }, { merge: true });
                }

                toast.success(`Present Marked: ${student.fullName} (${record.class})`);
            } catch (err) {
                console.error('Error writing online attendance, falling back to offline queue:', err);
                queueOfflineAttendance(record);
                setPendingCount(getOfflineQueue().length);
                toast.warning(`Saved to offline queue (Cloud sync pending): ${student.fullName}`);
            }
        }
    };

    // Manual Entry Submit
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualInput.trim()) return;
        handleCodeScanned(manualInput.trim());
        setManualInput('');
    };

    // Sync button handler
    const handleManualSync = async () => {
        if (!navigator.onLine) {
            toast.error("Cannot sync: Device is offline. Connect to internet first.");
            return;
        }
        setIsSyncing(true);
        try {
            const res = await syncOfflineAttendanceData(db);
            setPendingCount(getOfflineQueue().length);
            if (res.syncedCount > 0) {
                toast.success(`Successfully synced ${res.syncedCount} offline record(s)!`);
            } else {
                toast.info("All records are already up to date.");
            }
        } catch (err) {
            toast.error("Failed to sync some records. Will retry automatically.");
        } finally {
            setIsSyncing(false);
        }
    };

    // Filter scanned list
    const filteredRecords = scannedToday.filter(r => {
        const matchesClass = classFilter === 'All' || r.class === classFilter || r.class === `Class ${classFilter}`;
        const matchesSearch = !searchFilter || 
            r.studentName.toLowerCase().includes(searchFilter.toLowerCase()) ||
            r.grNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
            r.rollNumber.toLowerCase().includes(searchFilter.toLowerCase());
        return matchesClass && matchesSearch;
    });

    const uniqueClasses = ['All', ...Array.from(new Set(scannedToday.map(r => r.class).filter(c => c && c !== '-')))];

    return (
        <div className="min-h-screen bg-neutral-950 text-white selection:bg-pink-600/30">
            {/* Hidden canvas for video analysis */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-6 py-3.5">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/admin" 
                            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                                    <QrCode className="w-5 h-5 text-pink-500" />
                                    QR Scanner Attendance
                                </h1>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-pink-500/10 text-pink-400 border border-pink-500/20">
                                    PWA Ready
                                </span>
                            </div>
                            <p className="text-xs text-neutral-400 hidden sm:block">
                                Scan student cards to mark real-time attendance with offline auto-sync
                            </p>
                        </div>
                    </div>

                    {/* Status Indicators & Controls */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Online/Offline Badge */}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                            isOnline 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                            {isOnline ? (
                                <>
                                    <Wifi size={14} className="text-emerald-400" />
                                    <span className="hidden sm:inline">Online</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff size={14} className="text-amber-400" />
                                    <span>Offline Mode</span>
                                </>
                            )}
                        </div>

                        {/* Sound Toggle */}
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`p-2 rounded-xl border transition-colors ${
                                soundEnabled 
                                    ? 'bg-neutral-800 border-neutral-700 text-neutral-200' 
                                    : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                            }`}
                            title={soundEnabled ? "Mute beep sound" : "Enable beep sound"}
                        >
                            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </button>

                        {/* Sync Button */}
                        <Button
                            size="sm"
                            onClick={handleManualSync}
                            disabled={isSyncing || pendingCount === 0 || !isOnline}
                            className={`h-8 sm:h-9 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 ${
                                pendingCount > 0 
                                    ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/20' 
                                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                            }`}
                        >
                            <CloudUpload size={14} className={isSyncing ? 'animate-spin' : ''} />
                            <span>{isSyncing ? 'Syncing...' : `Sync (${pendingCount})`}</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content Layout */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
                        <div className="flex items-center justify-between text-neutral-400 mb-1">
                            <span className="text-xs font-medium uppercase tracking-wider">Today Scanned</span>
                            <UserCheck size={16} className="text-emerald-500" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-white">
                            {scannedToday.length}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
                        <div className="flex items-center justify-between text-neutral-400 mb-1">
                            <span className="text-xs font-medium uppercase tracking-wider">Present</span>
                            <CheckCircle2 size={16} className="text-blue-500" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-blue-400">
                            {scannedToday.filter(r => r.status === 'present').length}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
                        <div className="flex items-center justify-between text-neutral-400 mb-1">
                            <span className="text-xs font-medium uppercase tracking-wider">Offline Queued</span>
                            <Clock size={16} className="text-amber-500" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">
                            {pendingCount}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
                        <div className="flex items-center justify-between text-neutral-400 mb-1">
                            <span className="text-xs font-medium uppercase tracking-wider">Local DB</span>
                            <RefreshCw size={16} className="text-pink-500" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl sm:text-3xl font-extrabold text-pink-400">
                                {getCachedStudents().length}
                            </div>
                            <button
                                onClick={fetchAndCacheStudents}
                                className="text-[11px] text-neutral-400 hover:text-white underline"
                                title="Update local cache of students"
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>

                {/* Two-Column Grid: Scanner Left, Real-time Feed Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: Camera Scanner & Manual Input */}
                    <div className="lg:col-span-6 flex flex-col gap-4">
                        {/* Camera Box */}
                        <div className="relative rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 aspect-[4/3] sm:aspect-[16/11] flex flex-col items-center justify-center shadow-2xl">
                            {isCameraActive ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />

                                    {/* Scanner Overlay UI */}
                                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                                        {/* Target Box with Glowing Corners */}
                                        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl border-2 border-pink-500/40">
                                            {/* Corners */}
                                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-pink-500 rounded-tl-lg" />
                                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-pink-500 rounded-tr-lg" />
                                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-pink-500 rounded-bl-lg" />
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-pink-500 rounded-br-lg" />

                                            {/* Animated Scan Line */}
                                            <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent shadow-[0_0_12px_#ec4899] animate-[scanner_2.2s_ease-in-out_infinite]" />
                                        </div>

                                        <p className="mt-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-neutral-300 text-xs font-medium">
                                            Align student card QR code inside frame
                                        </p>
                                    </div>

                                    {/* Camera Action Overlay Controls */}
                                    <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                                        {hasTorch && (
                                            <button
                                                onClick={toggleTorch}
                                                className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${
                                                    torchOn ? 'bg-amber-500 text-black' : 'bg-black/60 text-white hover:bg-black/80'
                                                }`}
                                                title="Toggle Flashlight"
                                            >
                                                <Flashlight size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={toggleCameraFacing}
                                            className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
                                            title="Switch Camera"
                                        >
                                            <SwitchCamera size={18} />
                                        </button>
                                        <button
                                            onClick={stopCamera}
                                            className="p-2.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-md transition-colors"
                                            title="Stop Camera"
                                        >
                                            <CameraOff size={18} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 text-center flex flex-col items-center">
                                    <div className="w-16 h-16 rounded-2xl bg-neutral-800 text-pink-500 flex items-center justify-center mb-4 border border-neutral-700">
                                        <Camera size={32} />
                                    </div>
                                    <h3 className="text-base font-bold text-white mb-1">
                                        Camera is Inactive
                                    </h3>
                                    <p className="text-xs text-neutral-400 max-w-xs mb-5">
                                        Click below to start high-speed scanner. Works completely offline!
                                    </p>
                                    {cameraError && (
                                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs max-w-sm">
                                            {cameraError}
                                        </div>
                                    )}
                                    <Button
                                        onClick={startCamera}
                                        className="bg-pink-600 hover:bg-pink-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-pink-600/20"
                                    >
                                        Start QR Scanner
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Recent Scan Pop-card */}
                        {recentScan && (
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-900 to-neutral-800/90 border border-pink-500/30 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="w-12 h-12 rounded-xl bg-neutral-800 overflow-hidden shrink-0 border border-neutral-700 flex items-center justify-center">
                                    {recentScan.photoUrl ? (
                                        <Image
                                            src={recentScan.photoUrl}
                                            alt={recentScan.studentName}
                                            width={48}
                                            height={48}
                                            className="w-full h-full object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        <Users className="w-6 h-6 text-neutral-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-pink-400 uppercase tracking-wide">
                                            Latest Scan
                                        </span>
                                        <span className="text-[10px] text-neutral-400">
                                            {recentScan.scannedAt}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white truncate">
                                        {recentScan.studentName}
                                    </h4>
                                    <p className="text-xs text-neutral-400">
                                        GR: {recentScan.grNumber} • Roll: {recentScan.rollNumber} • Class: {recentScan.class}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                        Present
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Manual Roll/GR Entry Card */}
                        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-amber-400" />
                                Manual Student Entry / Barcode Scanner
                            </h3>
                            <form onSubmit={handleManualSubmit} className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="Type GR Number or Roll No..."
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    className="bg-neutral-950 border-neutral-700 text-white placeholder:text-neutral-500 h-10 text-sm rounded-xl focus:border-pink-500"
                                />
                                <Button
                                    type="submit"
                                    className="bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs h-10 px-4 rounded-xl border border-neutral-700"
                                >
                                    Mark
                                </Button>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Real-time Attendance Feed */}
                    <div className="lg:col-span-6 flex flex-col gap-4">
                        <div className="p-5 rounded-3xl bg-neutral-900/60 border border-neutral-800 flex-1 flex flex-col min-h-[500px]">
                            {/* Feed Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
                                <div>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Clock size={16} className="text-pink-400" />
                                        Today's Attendance Register
                                    </h3>
                                    <span className="text-xs text-neutral-400">
                                        Date: {todayStr} • {filteredRecords.length} records
                                    </span>
                                </div>

                                {/* Class filter */}
                                <div className="flex items-center gap-2">
                                    <select
                                        value={classFilter}
                                        onChange={(e) => setClassFilter(e.target.value)}
                                        className="bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs rounded-xl px-3 py-1.5 outline-none font-medium"
                                    >
                                        {uniqueClasses.map(c => (
                                            <option key={c} value={c}>{c === 'All' ? 'All Classes' : c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Search Filter */}
                            <div className="pt-3 pb-2">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                    <input
                                        type="text"
                                        placeholder="Search by student name, GR or Roll No..."
                                        value={searchFilter}
                                        onChange={(e) => setSearchFilter(e.target.value)}
                                        className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-200 placeholder:text-neutral-500 outline-none focus:border-neutral-700"
                                    />
                                </div>
                            </div>

                            {/* Records List */}
                            <div className="flex-1 overflow-y-auto max-h-[480px] custom-scrollbar space-y-2 pt-2">
                                {filteredRecords.length === 0 ? (
                                    <div className="py-16 text-center text-neutral-500 text-xs">
                                        <Users className="w-10 h-10 mx-auto mb-2 text-neutral-600 stroke-[1.5]" />
                                        No attendance scanned yet today.
                                    </div>
                                ) : (
                                    filteredRecords.map((r, i) => (
                                        <div 
                                            key={r.id || i}
                                            className="p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700 flex items-center justify-between gap-3 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                                                    {r.photoUrl ? (
                                                        <Image
                                                            src={r.photoUrl}
                                                            alt={r.studentName}
                                                            width={36}
                                                            height={36}
                                                            className="w-full h-full object-cover"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <span className="text-xs font-bold text-neutral-400">
                                                            {r.studentName.slice(0, 2).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-xs font-bold text-white truncate">
                                                        {r.studentName}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                                                        <span>GR: <strong className="text-neutral-300">{r.grNumber}</strong></span>
                                                        <span>•</span>
                                                        <span>Roll: {r.rollNumber}</span>
                                                        <span>•</span>
                                                        <span className="text-pink-400 font-medium">{r.class}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[10px] text-neutral-400 font-mono">
                                                    {r.scannedAt}
                                                </span>
                                                {r.isOfflineRecord && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                        Offline
                                                    </span>
                                                )}
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                    Present
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Custom Scanner Keyframe Animation */}
            <style jsx>{`
                @keyframes scanner {
                    0% { top: 4px; opacity: 0.8; }
                    50% { top: calc(100% - 6px); opacity: 1; }
                    100% { top: 4px; opacity: 0.8; }
                }
            `}</style>
        </div>
    );
}

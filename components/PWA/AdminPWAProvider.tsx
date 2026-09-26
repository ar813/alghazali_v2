"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { syncOfflineAttendanceData, getOfflineQueue } from '@/lib/offline-attendance';
import { Wifi, WifiOff, Download, RefreshCw, CheckCircle2 } from 'lucide-react';

interface PWAContextType {
    isOnline: boolean;
    isInstallable: boolean;
    installApp: () => Promise<void>;
    pendingSyncCount: number;
    syncNow: () => Promise<void>;
    isSyncing: boolean;
}

const PWAContext = createContext<PWAContextType>({
    isOnline: true,
    isInstallable: false,
    installApp: async () => {},
    pendingSyncCount: 0,
    syncNow: async () => {},
    isSyncing: false,
});

export const useAdminPWA = () => useContext(PWAContext);

export default function AdminPWAProvider({ children }: { children: React.ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

    // Refresh pending count
    const updatePendingCount = useCallback(() => {
        const queue = getOfflineQueue();
        setPendingSyncCount(queue.length);
    }, []);

    // Perform sync
    const syncNow = useCallback(async () => {
        if (!navigator.onLine || isSyncing) return;
        setIsSyncing(true);
        try {
            const res = await syncOfflineAttendanceData(db);
            updatePendingCount();
            if (res.syncedCount > 0) {
                toast.success(`Synced ${res.syncedCount} offline attendance record(s) to cloud!`, {
                    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                });
            }
        } catch (err) {
            console.error('Auto sync failed:', err);
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, updatePendingCount]);

    // Setup Service Worker & Offline Listeners
    useEffect(() => {
        if (typeof window === 'undefined') return;

        setIsOnline(navigator.onLine);
        updatePendingCount();

        // 1. Register Service Worker scoped to /admin
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/admin-sw.js', { scope: '/admin' })
                .then((registration) => {
                    console.log('[PWA] Admin Service Worker registered with scope:', registration.scope);
                })
                .catch((err) => {
                    console.warn('[PWA] Service Worker registration failed:', err);
                });
        }

        // 2. Online / Offline listeners
        const handleOnline = () => {
            setIsOnline(true);
            setShowBanner(true);
            toast.success("Internet restored! Syncing offline records...", {
                icon: <Wifi className="w-4 h-4 text-emerald-500" />
            });
            syncNow();
            setTimeout(() => setShowBanner(false), 5000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowBanner(true);
            toast.warning("Offline Mode Active. You can continue scanning attendance offline!", {
                icon: <WifiOff className="w-4 h-4 text-amber-500" />,
                duration: 6000
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // 3. PWA BeforeInstallPrompt listener
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Interval to check pending sync count
        const countInterval = setInterval(updatePendingCount, 4000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            clearInterval(countInterval);
        };
    }, [syncNow, updatePendingCount]);

    const installApp = async () => {
        if (!installPrompt) {
            toast.info("To install: Tap browser menu (⋮) -> 'Install App' or 'Add to Home screen'");
            return;
        }
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstallable(false);
            setInstallPrompt(null);
            toast.success("Admin App installed successfully!");
        }
    };

    return (
        <PWAContext.Provider
            value={{
                isOnline,
                isInstallable,
                installApp,
                pendingSyncCount,
                syncNow,
                isSyncing
            }}
        >
            {children}

            {/* Offline / Online Floating Notification Pill */}
            {(!isOnline || pendingSyncCount > 0) && (
                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-neutral-900/95 dark:bg-neutral-800/95 text-white border border-neutral-700 shadow-2xl backdrop-blur-md text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
                    {!isOnline ? (
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                            </span>
                            <span className="text-amber-300 font-semibold">Offline Mode</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            <span className="text-emerald-400">Online</span>
                        </div>
                    )}

                    {pendingSyncCount > 0 && (
                        <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-700">
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                {pendingSyncCount} pending
                            </span>
                            {isOnline && (
                                <button
                                    onClick={syncNow}
                                    disabled={isSyncing}
                                    className="p-1 hover:bg-neutral-700 rounded transition-colors text-neutral-300 hover:text-white"
                                    title="Sync Now"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                                </button>
                            )}
                        </div>
                    )}

                    {isInstallable && (
                        <button
                            onClick={installApp}
                            className="ml-1 pl-2 border-l border-neutral-700 flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                        >
                            <Download className="w-3 h-3" />
                            Install App
                        </button>
                    )}
                </div>
            )}
        </PWAContext.Provider>
    );
}

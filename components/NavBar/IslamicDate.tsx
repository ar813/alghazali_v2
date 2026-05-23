"use client";
import React, { useState, useEffect } from 'react';
import LordIcon from '@/components/ui/LordIcon';

interface HijriDate {
    day: string;
    month: {
        en: string;
        ar: string;
    };
    year: string;
}

interface IslamicDateProps {
    className?: string;
    variant?: 'nav' | 'sidebar';
}

export default function IslamicDate({ className = "", variant = 'nav' }: IslamicDateProps) {
    const [hijri, setHijri] = useState<HijriDate | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDate = async () => {
            try {
                // 1. Get current time in Pakistan
                const now = new Date();
                const pkTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Karachi" });
                const pkDate = new Date(pkTimeStr);

                const dd = String(pkDate.getDate()).padStart(2, '0');
                const mm = String(pkDate.getMonth() + 1).padStart(2, '0');
                const yyyy = pkDate.getFullYear();

                // 2. Fetch or retrieve today's Maghrib time in Karachi
                const timingsCacheKey = `pk_timings_${dd}_${mm}_${yyyy}`;
                let maghribTimeStr = localStorage.getItem(timingsCacheKey) || "";

                if (!maghribTimeStr) {
                    const res = await fetch(`https://api.aladhan.com/v1/timingsByCity/${dd}-${mm}-${yyyy}?city=Karachi&country=Pakistan&method=1`);
                    const json = await res.json();
                    if (json.status === "OK" && json.data.timings.Maghrib) {
                        maghribTimeStr = json.data.timings.Maghrib;
                        localStorage.setItem(timingsCacheKey, maghribTimeStr);
                    } else {
                        maghribTimeStr = "18:30"; // Safe fallback
                    }
                }

                // 3. Check if current time is after Maghrib
                const [mHour, mMin] = maghribTimeStr.split(':').map(Number);
                const currentHour = pkDate.getHours();
                const currentMin = pkDate.getMinutes();
                const isAfterMaghrib = currentHour > mHour || (currentHour === mHour && currentMin >= mMin);

                // 4. Calculate target Gregorian date for Hijri conversion
                // Islamic day starts at Maghrib. 
                // Before Maghrib: Use current day's daytime Hijri date (offset 0)
                // After Maghrib: Use next day's daytime Hijri date (offset +1)
                const moonSightingOffset = 0; // Adjust this if Pakistan is behind Saudi Arabia
                const targetDate = new Date(pkDate);
                if (isAfterMaghrib) {
                    targetDate.setDate(targetDate.getDate() + 1 + moonSightingOffset);
                } else {
                    targetDate.setDate(targetDate.getDate() + moonSightingOffset);
                }

                const tDd = String(targetDate.getDate()).padStart(2, '0');
                const tMm = String(targetDate.getMonth() + 1).padStart(2, '0');
                const tYyyy = targetDate.getFullYear();

                // 5. Fetch or retrieve Hijri date for the target Gregorian date
                const hijriCacheKey = `hijri_data_${tDd}_${tMm}_${tYyyy}`;
                const cachedHijri = localStorage.getItem(hijriCacheKey);

                if (cachedHijri) {
                    setHijri(JSON.parse(cachedHijri));
                    setLoading(false);
                    return;
                }

                const hRes = await fetch(`https://api.aladhan.com/v1/gToH?date=${tDd}-${tMm}-${tYyyy}`);
                const hJson = await hRes.json();

                if (hJson.status === "OK" && hJson.data.hijri) {
                    const data: HijriDate = {
                        day: parseInt(hJson.data.hijri.day, 10).toString(),
                        month: {
                            en: hJson.data.hijri.month.en,
                            ar: hJson.data.hijri.month.ar
                        },
                        year: hJson.data.hijri.year
                    };
                    setHijri(data);
                    localStorage.setItem(hijriCacheKey, JSON.stringify(data));
                }
            } catch (error) {
                console.error('Islamic date error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDate();
    }, []);

    if (loading || !hijri) {
        return (
            <div className={`flex items-center gap-2 px-3 py-1 ${className}`}>
                <div className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
                <div className="h-2 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            </div>
        );
    }

    if (variant === 'sidebar') {
        return (
            <div className={`flex flex-col gap-1 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 ${className}`}>
                <div className="flex items-center gap-2 mb-1">
                    <LordIcon
                        src="https://cdn.lordicon.com/shqbeite.json"
                        trigger="loop"
                        size={20}
                        colors="primary:#f59e0b,secondary:#f59e0b"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Islamic Calendar</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-500 font-serif">
                        {hijri.month.ar}
                    </span>
                    <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                        {hijri.day} {hijri.month.en} {hijri.year} AH
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={`group flex items-center gap-3 px-4 py-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 transition-all duration-300 ${className}`}>
            <LordIcon
                src="https://cdn.lordicon.com/shqbeite.json"
                trigger="hover"
                size={18}
                colors="primary:#f59e0b,secondary:#f59e0b"
            />
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-tight whitespace-nowrap">
                <span className="text-amber-600 dark:text-amber-500 font-bold font-serif text-[13px]">
                    {hijri.month.ar}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400 font-bold">
                    {hijri.day} {hijri.month.en} {hijri.year} AH
                </span>
            </div>
        </div>
    );
}

"use client"
import { Megaphone, ChevronRight, ArrowRight, BookOpen } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { TypewriterLoop } from '@/components/ui/typewriter-loop'
import Image from 'next/image'
import Link from 'next/link'
import VerseBox from './VerseBox'

const HeroSection = () => {
    const [mounted, setMounted] = useState(false)
    const [headlineNotices, setHeadlineNotices] = useState<any[]>([])
    const [openHeadline, setOpenHeadline] = useState(false)
    const [activeNoticeIdx, setActiveNoticeIdx] = useState(0)

    const names = [
        "Al Ghazali High School",
        "Mahad Usman Bin Affan",
        "Al Razi Educational Society"
    ]

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/notices?headline=true&limit=5', { cache: 'no-store' })
                const json = await res.json()
                if (json?.data && Array.isArray(json.data)) {
                    setHeadlineNotices(json.data)
                }
            } catch { }
        })()
    }, [])

    if (!mounted) return null;

    return (
        <>
            <section
                id="home"
                className="relative w-full min-h-screen flex flex-col justify-center items-center overflow-hidden bg-white"
            >
                {/* Background Image from Stitch */}
                <div className="absolute inset-0 z-0 opacity-25">
                    <Image
                        src="/hero_bg.png"
                        alt="Modern Islamic Architectural Space"
                        fill
                        className="object-cover object-center"
                        priority
                    />
                </div>

                {/* Islamic Geometric Background Pattern */}
                <div className="absolute inset-0 bg-islamic-pattern opacity-10 pointer-events-none" />

                {/* Radial Emerald Glow — Center */}
                <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at center, rgba(5,150,105,0.06) 0%, rgba(5,150,105,0.02) 40%, transparent 70%)',
                    }}
                />

                {/* Corner Accent Lines */}
                <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none">
                    <div className="absolute top-8 left-8 w-12 h-[1px] bg-[#065f46] opacity-30" />
                    <div className="absolute top-8 left-8 w-[1px] h-12 bg-[#065f46] opacity-30" />
                </div>
                <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none">
                    <div className="absolute top-8 right-8 w-12 h-[1px] bg-[#065f46] opacity-30" />
                    <div className="absolute top-8 right-8 w-[1px] h-12 bg-[#065f46] opacity-30" />
                </div>

                {/* Main Content */}
                <div className="relative z-10 w-full max-w-5xl mx-auto text-center flex flex-col items-center justify-center px-4 pt-32 pb-44 space-y-8">

                    {/* Est. Badge */}
                    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 border border-[#e5e7eb] dark:border-neutral-800 bg-[#f9fafb] dark:bg-neutral-900/50 text-[#6b7280] dark:text-neutral-400 animate-fade-in-up">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#065f46] opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#065f46]" />
                        </span>
                        <span className="label-mono">Est. 1994 · Landhi, Karachi</span>
                    </div>

                    {/* Dynamic Verse/Hadith Box */}
                    <VerseBox />

                    {/* Typewriter Headline */}
                    <div className="min-h-[56px] sm:min-h-[72px] flex items-center justify-center w-full px-2">
                        <TypewriterLoop
                            texts={names}
                            className="text-2xl sm:text-3xl md:text-5xl font-bold text-[#065f46] tracking-tight"
                            cursorClassName="h-7 sm:h-10 md:h-14 bg-[#065f46]"
                            typingSpeed={2}
                            deletingSpeed={1.5}
                            pauseDuration={2500}
                        />
                    </div>

                    {/* Tagline */}
                    <p className="text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed text-[#6b7280] dark:text-neutral-400">
                        A world-class modern education grounded in{' '}
                        <span className="text-[#111827] dark:text-white font-semibold">Islamic values</span>
                        {' '}and dedicated to{' '}
                        <span className="text-[#111827] dark:text-white font-semibold">academic excellence</span>.
                    </p>

                    {/* CTA Buttons — Sharp Stitch Style */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center items-center pt-2">
                        <Link
                            href="/student-portal"
                            className="group flex items-center gap-3 px-8 py-4 font-bold text-sm uppercase tracking-widest bg-[#111] text-white border border-[#111] transition-all duration-200 hover:bg-[#065f46] hover:border-[#065f46] active:scale-95 w-[260px] sm:w-auto justify-center"
                        >
                            Student Portal
                            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>

                        <Link
                            href="/schedule"
                            className="group flex items-center gap-3 px-8 py-4 font-bold text-sm uppercase tracking-widest bg-transparent text-[#374151] dark:text-neutral-350 border-2 border-[#065f46]/60 transition-all duration-200 hover:border-[#065f46] hover:text-[#065f46] active:scale-95 w-[260px] sm:w-auto justify-center"
                        >
                            View Schedule
                        </Link>
                    </div>

                    {/* Notice Pill */}
                    {headlineNotices.length > 0 && (
                        <div className="animate-fade-in w-full max-w-lg mx-auto pt-8 pb-4">
                            <div className="relative border border-[#e5e7eb] dark:border-neutral-800 bg-[#f9fafb] dark:bg-neutral-900/50 flex items-center overflow-hidden">
                                {/* Icon */}
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#065f46]/10 dark:bg-emerald-500/10 text-[#065f46] dark:text-emerald-400 border-r border-[#e5e7eb] dark:border-neutral-800">
                                    <Megaphone size={14} />
                                </div>

                                {/* Content — clickable */}
                                <button
                                    onClick={() => setOpenHeadline(true)}
                                    className="flex-1 overflow-hidden py-2.5 px-3 text-left min-w-0"
                                >
                                    <p className="text-xs font-bold text-[#065f46] dark:text-emerald-400 truncate">
                                        {headlineNotices[activeNoticeIdx]?.title}
                                    </p>
                                    <p className="text-[11px] text-[#6b7280] dark:text-neutral-400 truncate mt-0.5 italic">
                                        {headlineNotices[activeNoticeIdx]?.content}
                                    </p>
                                </button>

                                {/* Counter */}
                                <span className="text-[10px] font-bold text-neutral-400 shrink-0 px-2">
                                    {activeNoticeIdx + 1}/{headlineNotices.length}
                                </span>

                                {/* Prev / Next */}
                                <div className="flex shrink-0 border-l border-[#e5e7eb] dark:border-neutral-800">
                                    <button
                                        onClick={() => setActiveNoticeIdx(i => (i - 1 + headlineNotices.length) % headlineNotices.length)}
                                        className="flex h-10 w-9 items-center justify-center text-neutral-400 hover:text-[#065f46] hover:bg-[#065f46]/5 transition-colors border-r border-[#e5e7eb] dark:border-neutral-800"
                                        aria-label="Previous"
                                    >
                                        <ChevronRight size={14} className="rotate-180" />
                                    </button>
                                    <button
                                        onClick={() => setActiveNoticeIdx(i => (i + 1) % headlineNotices.length)}
                                        className="flex h-10 w-9 items-center justify-center text-neutral-400 hover:text-[#065f46] hover:bg-[#065f46]/5 transition-colors"
                                        aria-label="Next"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Scroll Indicator */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
                    <span className="label-mono text-[#9ca3af]">scroll</span>
                    <div className="w-[1px] h-8 bg-gradient-to-b from-[#065f46] to-transparent" />
                </div>
            </section>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }
            `}</style>

            {/* Modal Overlay */}
            {openHeadline && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setOpenHeadline(false)}
                    />
                    <div
                        className="relative w-full max-w-[95%] sm:max-w-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 max-h-[85vh] flex flex-col bg-white dark:bg-neutral-900 border border-[#e5e7eb] dark:border-neutral-800"
                    >
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-[#065f46]" />
                        <button
                            onClick={() => setOpenHeadline(false)}
                            className="absolute top-4 right-4 p-2 border border-[#e5e7eb] dark:border-neutral-800 hover:border-[#065f46] dark:hover:border-emerald-500 transition-colors z-20 text-neutral-500 hover:text-[#065f46] dark:text-neutral-400 dark:hover:text-emerald-400"
                            aria-label="Close"
                        >
                            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="current-color">
                                <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.50005L3.21846 10.9685C2.99391 11.193 2.99391 11.5571 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31322L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.5571 12.0062 11.193 11.7816 10.9685L8.31322 7.50005L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                            </svg>
                        </button>
                        <div className="p-6 sm:p-10 flex flex-col items-center overflow-y-auto custom-scrollbar">
                            <div className="shrink-0 mx-auto w-14 h-14 flex items-center justify-center mb-6 text-[#065f46] dark:text-emerald-450 border border-[#e5e7eb] dark:border-neutral-800 bg-[#f9fafb] dark:bg-neutral-900/50">
                                <Megaphone size={22} />
                            </div>
                            <p className="label-mono mb-2 text-[#065f46] dark:text-emerald-400 uppercase tracking-[0.2em] text-[10px]">Campus Updates</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-white mb-8 tracking-tight">
                                Important Announcements
                            </h3>

                            <div className="w-full space-y-6 text-left">
                                {headlineNotices.map((notice, idx) => (
                                    <div key={idx} className="relative pl-6 border-l-2 border-[#065f46]/20 dark:border-emerald-500/20 hover:border-[#065f46] dark:hover:border-emerald-500 transition-colors duration-300">
                                        <h4 className="font-bold text-[#111827] dark:text-white text-base mb-1">{notice.title}</h4>
                                        <p className="text-[#6b7280] dark:text-neutral-400 text-sm leading-relaxed">{notice.content}</p>
                                        {notice.date && (
                                            <p className="text-[10px] font-medium text-[#9ca3af] dark:text-neutral-500 mt-2 uppercase tracking-wider">{notice.date}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setOpenHeadline(false)}
                                className="mt-10 w-full py-4 bg-[#111] dark:bg-neutral-800 text-white dark:text-neutral-200 font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#065f46] dark:hover:bg-emerald-600 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-black/5"
                            >
                                Close Notices
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default HeroSection
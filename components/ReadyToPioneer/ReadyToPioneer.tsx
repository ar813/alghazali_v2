"use client"
import React from 'react'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { SectionReveal } from '@/components/ScrollEffects/SectionReveal'

const ReadyToPioneer = () => {
    return (
        <SectionReveal>
            <section className="relative py-24 px-4 bg-[#f8fafc] overflow-hidden border-y border-[#e5e7eb]">
                {/* Decorative Pattern (Subtle) */}
                <div className="absolute inset-0 bg-grid-small-black/5 pointer-events-none" />
                
                <div className="max-w-4xl mx-auto text-center flex flex-col items-center space-y-10 relative z-10">
                    <h2 className="text-4xl md:text-6xl font-bold text-[#0f172a] tracking-tight leading-[1.1]">
                        Ready to pioneer <br className="hidden md:block" /> the future?
                    </h2>
                    
                    <Link
                        href="/admission"
                        className="group relative flex items-center justify-center px-10 py-5 bg-[#064e3b] text-white font-bold text-sm uppercase tracking-[0.2em] transition-all duration-300 hover:bg-[#003527] active:scale-95 shadow-[0_20px_40px_-12px_rgba(6,78,59,0.3)]"
                    >
                        Start Admissions Process
                        <ArrowRight size={18} className="ml-3 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                </div>

                {/* Bottom Accent Bar (As seen in screenshot) */}
                <div className="absolute bottom-0 left-0 w-full h-8 bg-[#064e3b]" />
            </section>
        </SectionReveal>
    )
}

export default ReadyToPioneer

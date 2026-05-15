"use client"
import React from 'react'
import Image from 'next/image'
import { SectionReveal } from '@/components/ScrollEffects/SectionReveal'

const OurCampus = () => {
    return (
        <SectionReveal>
            <section className="py-24 px-4 sm:px-8 md:px-16 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-16 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 border border-emerald-100 bg-emerald-50/50 text-emerald-700 text-xs font-bold uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 bg-emerald-600" />
                            Our Environment
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
                            A Home for Excellence: <span className="text-emerald-600">Our Campus</span>
                        </h2>
                        <p className="text-slate-500 max-w-2xl text-lg leading-relaxed">
                            State-of-the-art facilities designed to inspire curiosity, facilitate holistic learning, 
                            and provide a serene academic atmosphere.
                        </p>
                    </div>

                    {/* Campus Image Container */}
                    <div className="relative group">
                        {/* Decorative Frames */}
                        <div className="absolute -top-4 -left-4 w-24 h-24 border-t-2 border-l-2 border-emerald-600/20 pointer-events-none" />
                        <div className="absolute -bottom-4 -right-4 w-24 h-24 border-b-2 border-r-2 border-emerald-600/20 pointer-events-none" />
                        
                        {/* Main Image */}
                        <div className="relative h-[500px] md:h-[700px] w-full overflow-hidden border-[12px] border-white shadow-[0_48px_80px_-16px_rgba(0,0,0,0.12)] transition-transform duration-700 group-hover:scale-[1.005]">
                            <Image
                                src="/campus_redesigned.png"
                                alt="Al Ghazali High School Campus Redesigned"
                                fill
                                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                                priority
                            />
                            
                            {/* Overlay Details */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8 md:p-10">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-white tracking-tight">Main Campus Building</h3>
                                    <p className="text-slate-200 text-sm max-w-lg">
                                        Al-Ghazali High School (Ma&apos;had Usman Bin Affan) — Our primary academic facility 
                                        where tradition meets excellence.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Stitch Accent Line */}
                        <div className="absolute top-1/2 -right-4 w-8 h-[2px] bg-emerald-600 hidden lg:block" />
                        <div className="absolute top-1/2 -left-4 w-8 h-[2px] bg-emerald-600 hidden lg:block" />
                    </div>

                    {/* Facility Quick Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
                        {[
                            { label: 'Academic Area', value: '45,000 sq ft' },
                            { label: 'Smart Labs', value: '08' },
                            { label: 'Resource Library', value: '25k+ Volumes' },
                            { label: 'Sports Complex', value: 'Olympic Grade' },
                        ].map((stat, i) => (
                            <div key={i} className="p-6 bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{stat.label}</p>
                                <p className="text-lg font-bold text-slate-900">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </SectionReveal>
    )
}

export default OurCampus

"use client"
import React from 'react'
import { Download, Check, Sparkles, GraduationCap, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { SectionReveal } from '@/components/ScrollEffects/SectionReveal'
import { generateFeePDF } from '@/lib/pdf-generator'

const TuitionFees = () => {
    const mainFees = [
        {
            title: "Primary School",
            price: "900",
            period: "/month",
            grades: "Grades 1-5",
            popular: false
        },
        {
            title: "Middle School",
            price: "1,200",
            period: "/month",
            grades: "Grades 6-8",
            popular: true
        },
        {
            title: "High School",
            price: "1,300",
            period: "/month",
            grades: "Grades 9-10 (SSC)",
            popular: false
        }
    ]

    const additionalFees = [
        { label: "New Student Admission", price: "Rs. 4,000" },
        { label: "Old Student Admission", price: "Rs. 2,500" },
        { label: "Annual Security Fee", price: "Rs. 500" },
    ]

    return (
        <section id="tuition" className="py-24 bg-[#fcfdff] relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-grid-small-black/5 pointer-events-none" />
            
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold text-[#0f172a] tracking-tight">
                        Tuition & Financial Aid
                    </h2>
                    <p className="text-[#64748b] text-lg max-w-2xl mx-auto leading-relaxed">
                        Investment in Future Leaders. We are committed to making our world-class education accessible to all qualified students.
                    </p>
                </div>

                {/* Main Fee Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {mainFees.map((fee, idx) => (
                        <SectionReveal key={idx} delay={idx * 0.1}>
                            <div className={`relative p-8 border transition-all duration-300 h-full flex flex-col items-center text-center bg-white ${
                                fee.popular 
                                ? 'border-[#064e3b] shadow-[0_20px_50px_rgba(6,78,59,0.12)] scale-105 z-20' 
                                : 'border-[#e2e8f0] shadow-sm hover:border-[#cbd5e1]'
                            }`}>
                                {fee.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#064e3b] text-white px-4 py-1 text-[10px] font-bold uppercase tracking-widest">
                                        Popular
                                    </div>
                                )}
                                
                                <h3 className="text-xl font-bold text-[#0f172a] mb-4">{fee.title}</h3>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-3xl font-bold text-[#0f172a]">Rs. {fee.price}</span>
                                    <span className="text-[#64748b] text-sm">{fee.period}</span>
                                </div>
                                <p className="text-[#94a3b8] text-sm font-medium">{fee.grades}</p>
                            </div>
                        </SectionReveal>
                    ))}
                </div>

                {/* Bottom Row: Additional Fees & Scholarship */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* Additional Fees */}
                    <SectionReveal>
                        <div className="p-8 bg-[#f8fafc] border border-[#e2e8f0] h-full">
                            <div className="flex items-center gap-3 mb-8">
                                <Sparkles className="text-[#064e3b]" size={20} />
                                <h3 className="text-xl font-bold text-[#0f172a]">Additional Fees</h3>
                            </div>
                            <div className="space-y-6">
                                {additionalFees.map((fee, idx) => (
                                    <div key={idx} className="flex justify-between items-center pb-4 border-bottom border-[#e2e8f0] last:border-0 last:pb-0">
                                        <span className="text-[#64748b] font-medium">{fee.label}</span>
                                        <span className="text-[#0f172a] font-bold">{fee.price}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </SectionReveal>

                    {/* Scholarship Programs */}
                    <SectionReveal delay={0.2}>
                        <div className="p-8 bg-[#064e3b] text-white h-full relative overflow-hidden group">
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="w-12 h-12 bg-white/10 flex items-center justify-center mb-8">
                                    <GraduationCap size={24} />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">Scholarship Programs</h3>
                                <p className="text-emerald-50/80 leading-relaxed mb-8">
                                    We believe financial constraints should not be a barrier to exceptional education. We offer comprehensive merit-based and need-based financial aid packages to qualifying families.
                                </p>
                                <a href="/admission" className="mt-auto inline-flex items-center gap-2 font-bold text-sm text-white hover:text-emerald-200 transition-colors group/link">
                                    Apply for Financial Aid <ArrowRight size={16} className="transition-transform group-hover/link:translate-x-1" />
                                </a>
                            </div>
                            {/* Decorative pattern */}
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <GraduationCap size={120} />
                            </div>
                        </div>
                    </SectionReveal>
                </div>

                {/* Download Button */}
                <div className="flex justify-center">
                    <button 
                        onClick={() => generateFeePDF({})}
                        className="flex items-center gap-3 px-8 py-4 border border-[#e2e8f0] text-[#064e3b] font-bold text-sm uppercase tracking-widest hover:bg-[#f8fafc] transition-all active:scale-95"
                    >
                        <Download size={18} />
                        Download Detailed Fee Structure
                    </button>
                </div>
            </div>
        </section>
    )
}

export default TuitionFees

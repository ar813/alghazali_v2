"use client"
import React, { useEffect, useState } from 'react'
import { Download, Check, Sparkles, GraduationCap, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { SectionReveal } from '@/components/ScrollEffects/SectionReveal'
import { generateFeePDF } from '@/lib/pdf-generator'
import { client } from '@/sanity/lib/client'
import { getAllAcademicClassesQuery } from '@/sanity/lib/queries'

const TuitionFees = () => {
    const [classes, setClasses] = useState<any[]>([])

    useEffect(() => {
        client.fetch(getAllAcademicClassesQuery).then(setClasses).catch(console.error)
    }, [])

    const uniqueAdmissionFees = Array.from(new Set(classes.map(c => c.admissionFeeNew).filter(Boolean)))
    const uniqueAnnualFees = Array.from(new Set(classes.map(c => c.annualFee).filter(Boolean)))

    let additionalFees = [
        { label: "New Student Admission", price: "Rs. 4,000" },
        { label: "Old Student Admission", price: "Rs. 2,500" },
        { label: "Annual Security Fee", price: "Rs. 500" },
    ]

    if (classes.length > 0) {
        additionalFees = []
        if (uniqueAdmissionFees.length > 0) {
            additionalFees.push({ label: "Admission Fee (New Students)", price: `Rs. ${Math.min(...uniqueAdmissionFees as number[]).toLocaleString()}` })
        }
        const uniqueOldFees = Array.from(new Set(classes.map(c => c.admissionFeeOld).filter(Boolean)))
        if (uniqueOldFees.length > 0) {
            additionalFees.push({ label: "Admission Fee (Old Students)", price: `Rs. ${Math.min(...uniqueOldFees as number[]).toLocaleString()}` })
        }
        if (uniqueAnnualFees.length > 0) {
            additionalFees.push({ label: "Annual Charges (Starts from)", price: `Rs. ${Math.min(...uniqueAnnualFees as number[]).toLocaleString()}` })
        }
    }

    // Group classes by group name for section headers
    const grouped = classes.reduce((acc: Record<string, any[]>, cls) => {
        const g = cls.group || 'General';
        if (!acc[g]) acc[g] = [];
        acc[g].push(cls);
        return acc;
    }, {});

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

                {/* Class-wise Fee Cards grouped by section */}
                {classes.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        {[1,2,3].map(i => <div key={i} className="h-48 bg-neutral-100 rounded animate-pulse" />)}
                    </div>
                ) : (
                    <div className="space-y-10 mb-12">
                        {Object.entries(grouped).map(([groupName, groupClasses]) => (
                            <div key={groupName}>
                                <h3 className="text-xs font-black uppercase tracking-widest text-[#065f46] mb-5 flex items-center gap-3">
                                    <span>{groupName}</span>
                                    <span className="flex-1 h-px bg-[#065f46]/10" />
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {(groupClasses as any[]).map((cls, idx) => (
                                        <SectionReveal key={cls._id || idx} delay={idx * 0.05}>
                                            <div className={`relative p-6 border transition-all duration-300 h-full flex flex-col bg-white ${
                                                cls.isPopular
                                                    ? 'border-[#064e3b] shadow-[0_8px_30px_rgba(6,78,59,0.12)]'
                                                    : 'border-[#e2e8f0] hover:border-[#064e3b]/30 hover:shadow-md'
                                            }`}>
                                                {cls.isPopular && (
                                                    <div className="absolute -top-3 left-4 bg-[#064e3b] text-white px-3 py-0.5 text-[9px] font-black uppercase tracking-widest">
                                                        Popular
                                                    </div>
                                                )}
                                                <h4 className="text-sm font-black text-[#0f172a] uppercase tracking-tight mb-3">{cls.name}</h4>
                                                <div className="flex items-baseline gap-1 mb-4">
                                                    <span className="text-2xl font-black text-[#065f46]">Rs. {(cls.monthlyFee || 0).toLocaleString()}</span>
                                                    <span className="text-xs text-[#64748b]">/mo</span>
                                                </div>
                                                <div className="mt-auto space-y-2 pt-3 border-t border-neutral-100 text-xs">
                                                    <div className="flex justify-between text-neutral-500">
                                                        <span>New Admission</span>
                                                        <span className="font-semibold text-neutral-700">Rs. {(cls.admissionFeeNew || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-neutral-500">
                                                        <span>Old Admission</span>
                                                        <span className="font-semibold text-neutral-700">Rs. {(cls.admissionFeeOld || 0).toLocaleString()}</span>
                                                    </div>
                                                    {cls.annualFee > 0 && (
                                                        <div className="flex justify-between text-neutral-500">
                                                            <span>Annual</span>
                                                            <span className="font-semibold text-neutral-700">Rs. {(cls.annualFee).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </SectionReveal>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

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

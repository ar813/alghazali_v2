import { ChevronRight, Download, ArrowRight } from 'lucide-react'
import React from 'react'

const FEE_STRUCTURE_2025: { className: string; amount: number }[] = [
    { className: 'Admission (New Students)', amount: 4000 },
    { className: 'Admission (Old Students)', amount: 2500 },
    { className: 'Class 1', amount: 900 },
    { className: 'Class 2', amount: 900 },
    { className: 'Class 3', amount: 1000 },
    { className: 'Class 4', amount: 1000 },
    { className: 'Class 5', amount: 1100 },
    { className: 'Class 6', amount: 1200 },
    { className: 'SSCI', amount: 1300 },
    { className: 'SSCII', amount: 1300 },
]

const requirements = [
    { title: 'Age Requirements', desc: 'Class 1: 5–6 years, Class 6: 10–11 years' },
    { title: 'Documents Required', desc: 'Birth certificate, B-Form, Father CNIC, previous school records' },
    { title: 'Admission Test', desc: 'Written test and interview for classes 1–10' },
]

const AdmissionDetail = () => {
    return (
        <section id="admissions" className="relative py-20 sm:py-24 overflow-hidden bg-[#f9fafb]" style={{ borderTop: '1px solid #e5e7eb' }}>
            <div className="absolute inset-0 bg-islamic-pattern pointer-events-none" />
            <div className="absolute inset-0 bg-grid-enterprise pointer-events-none" />
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                <div className="mb-12 sm:mb-16">
                    <p className="label-mono mb-4 text-[#059669]">{"// Admissions 2025"}</p>
                    <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-5 text-[#111827]" style={{ letterSpacing: '-0.03em' }}>
                        Admissions <span className="text-[#059669]">Open</span>
                    </h2>
                    <p className="text-base sm:text-lg max-w-2xl leading-relaxed text-[#6b7280]">Join our community and give your child the best foundation for future success.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0" style={{ border: '1px solid #e5e7eb' }}>
                    <div className="p-8 sm:p-10 bg-white" style={{ borderRight: '1px solid #e5e7eb' }}>
                        <h3 className="text-xl font-bold mb-8 tracking-tight text-[#111827]">Admission Requirements</h3>
                        <div className="space-y-0">
                            {requirements.map((req, i) => (
                                <div key={i} className="group flex items-start gap-4 py-5 transition-colors" style={{ borderBottom: i < requirements.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                    <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5 text-[#059669]"><ChevronRight size={16} /></div>
                                    <div>
                                        <h4 className="font-bold text-sm mb-1 text-[#111827]">{req.title}</h4>
                                        <p className="text-sm leading-relaxed text-[#6b7280]">{req.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <a href="/assets/Student_Information_Form.pdf" target="_blank" rel="noopener noreferrer"
                            className="group mt-10 flex items-center gap-3 px-6 py-4 font-bold text-sm uppercase tracking-widest bg-[#111] text-white border border-[#111] transition-all duration-200 hover:bg-[#059669] hover:border-[#059669] active:scale-[0.99] w-full justify-center">
                            <Download size={15} />Download Admission Form<ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                        </a>
                    </div>
                    <div className="relative overflow-hidden bg-white">
                        <div className="absolute inset-0 bg-islamic-pattern pointer-events-none opacity-60" />
                        <div className="relative z-10 p-8 sm:p-10">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-[3px] h-6 bg-[#059669]" />
                                <h3 className="text-xl font-bold tracking-tight text-[#111827]">Fee Structure 2025</h3>
                            </div>
                            <div className="space-y-0">
                                {FEE_STRUCTURE_2025.map((row, idx) => (
                                    <div key={idx} className="group flex justify-between items-center py-3 px-2 transition-colors hover:bg-[#f9fafb]" style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <span className="text-sm text-[#6b7280]">{row.className}</span>
                                        <span className="text-sm font-bold text-[#111827] group-hover:text-[#059669] transition-colors" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                                            Rs. {row.amount.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 px-4 py-3 flex justify-between items-center" style={{ background: 'rgba(5,150,105,0.04)', border: '1px solid rgba(5,150,105,0.12)' }}>
                                <span className="label-mono text-[#9ca3af]">Monthly Fee Range</span>
                                <span className="text-sm font-bold text-[#059669]" style={{ fontFamily: 'var(--font-geist-mono)' }}>Rs. 900 – 1,300</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AdmissionDetail
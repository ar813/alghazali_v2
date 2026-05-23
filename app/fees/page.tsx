import React from 'react';
import Navbar from '@/components/NavBar/NavBar';
import Footer from '@/components/Footer/Footer';
import { client } from '@/sanity/lib/client';

export const revalidate = 60;

interface FeeStructure {
  _id: string;
  classGroup: string;
  classesIncluded?: string;
  admissionFee: number;
  monthlyTuition: number;
  annualCharges?: number;
}

export default async function FeesPage() {
    // Fetch fee structures from Sanity
    const fees: FeeStructure[] = await client.fetch(
        `*[_type == "feeStructure"] | order(order asc) {
            _id,
            classGroup,
            classesIncluded,
            admissionFee,
            monthlyTuition,
            annualCharges
        }`
    );

    return (
        <main className="min-h-screen bg-[#f9fafb]">
            <Navbar />
            
            {/* Hero Section */}
            <section className="relative pt-32 pb-16 overflow-hidden bg-white" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <div className="absolute inset-0 bg-islamic-pattern pointer-events-none opacity-50" />
                <div className="absolute inset-0 bg-grid-enterprise pointer-events-none" />
                
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="max-w-3xl">
                        <p className="label-mono mb-4 text-[#065f46]">{"// Fee Structure"}</p>
                        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 text-[#111827] uppercase">
                            Transparent <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#065f46] to-emerald-600">Pricing</span>
                        </h1>
                        <p className="text-lg sm:text-xl text-[#6b7280] leading-relaxed">
                            Quality education should be accessible. Here is our detailed fee structure for the current academic session.
                        </p>
                    </div>
                </div>
            </section>

            {/* Fees Content */}
            <section className="py-16 sm:py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    {fees.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-[#e5e7eb] rounded-xl">
                            <p className="text-neutral-500">Fee structure is currently being updated. Please check back later or contact the admission office.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {fees.map((fee) => (
                                <div key={fee._id} className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden hover:border-[#065f46] hover:shadow-xl transition-all group relative flex flex-col">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                    
                                    <div className="p-8 border-b border-[#e5e7eb] bg-[#f9fafb] group-hover:bg-emerald-50/50 transition-colors relative z-10">
                                        <h3 className="text-2xl font-black text-[#111827] uppercase tracking-tight mb-2">{fee.classGroup}</h3>
                                        <p className="text-sm text-[#6b7280] font-medium min-h-[40px]">{fee.classesIncluded || 'All Classes in this group'}</p>
                                    </div>
                                    
                                    <div className="p-8 space-y-6 flex-1 relative z-10">
                                        <div>
                                            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Monthly Tuition</p>
                                            <p className="text-4xl font-black text-[#065f46]">Rs. {fee.monthlyTuition.toLocaleString()}</p>
                                        </div>
                                        
                                        <div className="space-y-4 pt-6 border-t border-neutral-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-neutral-600">Admission Fee</span>
                                                <span className="text-sm font-bold text-neutral-900">Rs. {fee.admissionFee.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-neutral-600">Annual Charges</span>
                                                <span className="text-sm font-bold text-neutral-900">
                                                    {fee.annualCharges ? `Rs. ${fee.annualCharges.toLocaleString()}` : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 bg-neutral-50 border-t border-[#e5e7eb] relative z-10">
                                        <p className="text-xs text-center text-neutral-500 font-medium">* Admission fee is one-time only at the time of enrollment.</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
            
            <Footer />
        </main>
    );
}

"use client";

import React, { useState, useEffect } from 'react';
import { GraduationCap, User, Users, FileText, ChevronRight, ChevronLeft, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { client } from '@/sanity/lib/client';
import { getAllClassesQuery } from '@/sanity/lib/queries';
import Navbar from '@/components/NavBar/NavBar';
import Footer from '@/components/Footer/Footer';
import { cn } from '@/lib/utils';

const steps = [
    { id: 1, label: 'Student Info', icon: <User size={18} /> },
    { id: 2, label: 'Parent Info', icon: <Users size={18} /> },
    { id: 3, label: 'Academic', icon: <FileText size={18} /> },
    { id: 4, label: 'Review', icon: <CheckCircle2 size={18} /> },
];

export default function AdmissionsPage() {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        // Student
        studentName: '',
        dateOfBirth: '',
        gender: '',
        applyingForClass: '',
        // Parent
        fatherName: '',
        motherName: '',
        phone: '',
        email: '',
        address: '',
        // Academic
        previousSchool: '',
        previousClass: '',
        reasonForLeaving: '',
        additionalNotes: '',
    });

    useEffect(() => {
        client.fetch(getAllClassesQuery).then((data: any[]) => {
            const set = new Set<string>();
            for (const s of data) {
                if (s.admissionFor) set.add(s.admissionFor);
            }
            setAvailableClasses(Array.from(set).sort());
        }).catch(console.error);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const nextStep = () => setStep((s) => Math.min(s + 1, 4));
    const prevStep = () => setStep((s) => Math.max(s - 1, 1));

    const isStep1Valid = formData.studentName && formData.dateOfBirth && formData.gender && formData.applyingForClass;
    const isStep2Valid = formData.fatherName && formData.phone;
    const canSubmit = isStep1Valid && isStep2Valid;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'admission_applications'), {
                ...formData,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            setIsSubmitted(true);
            toast.success("Application submitted successfully!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to submit. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = "w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] outline-none transition-all rounded-lg text-sm";
    const labelClass = "text-xs font-bold text-neutral-500 uppercase tracking-wide";

    return (
        <main className="min-h-screen bg-[#f9fafb]">
            <Navbar />

            {/* Hero */}
            <section className="relative pt-32 pb-16 overflow-hidden bg-white" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <div className="absolute inset-0 bg-islamic-pattern pointer-events-none opacity-50" />
                <div className="absolute inset-0 bg-grid-enterprise pointer-events-none" />
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="max-w-3xl">
                        <p className="label-mono mb-4 text-[#065f46]">{"// Admissions"}</p>
                        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 text-[#111827] uppercase">
                            Apply For <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#065f46] to-emerald-600">Admission</span>
                        </h1>
                        <p className="text-lg sm:text-xl text-[#6b7280] leading-relaxed">
                            Begin your child&apos;s journey at Al Ghazali High School. Fill out the form below and our admissions team will contact you.
                        </p>
                    </div>
                </div>
            </section>

            {/* Form Section */}
            <section className="py-16 sm:py-24">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">

                    {isSubmitted ? (
                        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-10 sm:p-16 text-center shadow-xl">
                            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <GraduationCap className="w-10 h-10 text-[#065f46]" />
                            </div>
                            <h2 className="text-3xl font-black text-[#111827] mb-4 uppercase">Application Submitted!</h2>
                            <p className="text-[#6b7280] max-w-md mx-auto mb-8">
                                Thank you for applying to Al Ghazali High School. Our admissions team will review your application and contact you within 3-5 business days.
                            </p>
                            <button
                                onClick={() => {
                                    setIsSubmitted(false);
                                    setStep(1);
                                    setFormData({
                                        studentName: '', dateOfBirth: '', gender: '', applyingForClass: '',
                                        fatherName: '', motherName: '', phone: '', email: '', address: '',
                                        previousSchool: '', previousClass: '', reasonForLeaving: '', additionalNotes: ''
                                    });
                                }}
                                className="px-8 py-3 bg-[#065f46] text-white font-bold uppercase tracking-wider text-sm hover:bg-emerald-800 transition-colors rounded-lg"
                            >
                                Submit Another Application
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden">
                            {/* Stepper */}
                            <div className="border-b border-neutral-100 p-4 sm:p-6">
                                <div className="flex items-center justify-between">
                                    {steps.map((s, i) => (
                                        <React.Fragment key={s.id}>
                                            <button
                                                onClick={() => { if (s.id < step) setStep(s.id); }}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all",
                                                    step === s.id ? "bg-[#065f46] text-white shadow-lg shadow-emerald-900/20" :
                                                        step > s.id ? "bg-emerald-50 text-[#065f46] cursor-pointer hover:bg-emerald-100" :
                                                            "text-neutral-400 cursor-default"
                                                )}
                                            >
                                                {s.icon}
                                                <span className="hidden sm:inline">{s.label}</span>
                                            </button>
                                            {i < steps.length - 1 && (
                                                <div className={cn("flex-1 h-0.5 mx-2", step > s.id ? "bg-[#065f46]" : "bg-neutral-200")} />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {/* Step Content */}
                            <div className="p-6 sm:p-10 space-y-6">

                                {/* Step 1: Student Info */}
                                {step === 1 && (
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-black text-[#111827] uppercase">Student Information</h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2 sm:col-span-2">
                                                <label className={labelClass}>Full Name of Student *</label>
                                                <input type="text" name="studentName" required value={formData.studentName} onChange={handleChange} className={inputClass} placeholder="Ahmed Khan" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>Date of Birth *</label>
                                                <input type="date" name="dateOfBirth" required value={formData.dateOfBirth} onChange={handleChange} className={inputClass} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>Gender *</label>
                                                <select name="gender" required value={formData.gender} onChange={handleChange} className={cn(inputClass, "appearance-none cursor-pointer")}>
                                                    <option value="" disabled>Select gender</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <label className={labelClass}>Applying for Class *</label>
                                                <select name="applyingForClass" required value={formData.applyingForClass} onChange={handleChange} className={cn(inputClass, "appearance-none cursor-pointer")}>
                                                    <option value="" disabled>Select a class</option>
                                                    {availableClasses.map(cls => (
                                                        <option key={cls} value={cls}>Class {cls}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Parent Info */}
                                {step === 2 && (
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-black text-[#111827] uppercase">Parent / Guardian Information</h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className={labelClass}>Father&apos;s Name *</label>
                                                <input type="text" name="fatherName" required value={formData.fatherName} onChange={handleChange} className={inputClass} placeholder="Mohammad Khan" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>Mother&apos;s Name</label>
                                                <input type="text" name="motherName" value={formData.motherName} onChange={handleChange} className={inputClass} placeholder="Ayesha Khan" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>Contact Number *</label>
                                                <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className={inputClass} placeholder="+92 3XX XXXXXXX" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>Email Address</label>
                                                <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} placeholder="parent@email.com" />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <label className={labelClass}>Residential Address</label>
                                                <input type="text" name="address" value={formData.address} onChange={handleChange} className={inputClass} placeholder="House #, Street, Area, City" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Academic */}
                                {step === 3 && (
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-black text-[#111827] uppercase">Academic Background</h2>
                                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 text-sm text-amber-800">
                                            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                                            <p>This section is optional. Skip if this is the student&apos;s first school enrollment.</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className={labelClass}>Previous School Name</label>
                                                <input type="text" name="previousSchool" value={formData.previousSchool} onChange={handleChange} className={inputClass} placeholder="Previous School Name" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>Last Class Attended</label>
                                                <input type="text" name="previousClass" value={formData.previousClass} onChange={handleChange} className={inputClass} placeholder="e.g. Class 4" />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <label className={labelClass}>Reason for Leaving</label>
                                                <input type="text" name="reasonForLeaving" value={formData.reasonForLeaving} onChange={handleChange} className={inputClass} placeholder="e.g. Relocation" />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <label className={labelClass}>Additional Notes</label>
                                                <textarea name="additionalNotes" rows={3} value={formData.additionalNotes} onChange={handleChange} className={cn(inputClass, "resize-y")} placeholder="Any special requirements or information..." />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Review */}
                                {step === 4 && (
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-black text-[#111827] uppercase">Review Application</h2>
                                        <p className="text-sm text-neutral-500">Please review all the details below before submitting.</p>

                                        <div className="space-y-4">
                                            <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                                                <h3 className="text-xs font-black text-[#065f46] uppercase tracking-widest">Student Details</h3>
                                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                                    <span className="text-neutral-500 font-medium">Name</span><span className="font-semibold text-neutral-900">{formData.studentName || '—'}</span>
                                                    <span className="text-neutral-500 font-medium">Date of Birth</span><span className="font-semibold text-neutral-900">{formData.dateOfBirth || '—'}</span>
                                                    <span className="text-neutral-500 font-medium">Gender</span><span className="font-semibold text-neutral-900 capitalize">{formData.gender || '—'}</span>
                                                    <span className="text-neutral-500 font-medium">Applying For</span><span className="font-semibold text-neutral-900">Class {formData.applyingForClass || '—'}</span>
                                                </div>
                                            </div>

                                            <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                                                <h3 className="text-xs font-black text-[#065f46] uppercase tracking-widest">Parent / Guardian</h3>
                                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                                    <span className="text-neutral-500 font-medium">Father</span><span className="font-semibold text-neutral-900">{formData.fatherName || '—'}</span>
                                                    <span className="text-neutral-500 font-medium">Mother</span><span className="font-semibold text-neutral-900">{formData.motherName || '—'}</span>
                                                    <span className="text-neutral-500 font-medium">Phone</span><span className="font-semibold text-neutral-900">{formData.phone || '—'}</span>
                                                    <span className="text-neutral-500 font-medium">Email</span><span className="font-semibold text-neutral-900">{formData.email || '—'}</span>
                                                    <span className="text-neutral-500 font-medium col-span-2 mt-1">Address</span>
                                                    <span className="font-semibold text-neutral-900 col-span-2">{formData.address || '—'}</span>
                                                </div>
                                            </div>

                                            {(formData.previousSchool || formData.additionalNotes) && (
                                                <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                                                    <h3 className="text-xs font-black text-[#065f46] uppercase tracking-widest">Academic Background</h3>
                                                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                                                        {formData.previousSchool && <><span className="text-neutral-500 font-medium">Previous School</span><span className="font-semibold text-neutral-900">{formData.previousSchool}</span></>}
                                                        {formData.previousClass && <><span className="text-neutral-500 font-medium">Last Class</span><span className="font-semibold text-neutral-900">{formData.previousClass}</span></>}
                                                        {formData.reasonForLeaving && <><span className="text-neutral-500 font-medium">Reason</span><span className="font-semibold text-neutral-900">{formData.reasonForLeaving}</span></>}
                                                    </div>
                                                    {formData.additionalNotes && <p className="text-sm text-neutral-700 border-t border-neutral-200 pt-3 mt-2">{formData.additionalNotes}</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Navigation */}
                            <div className="p-6 sm:p-10 border-t border-neutral-100 flex items-center justify-between">
                                {step > 1 ? (
                                    <button onClick={prevStep} className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors uppercase tracking-wider">
                                        <ChevronLeft size={16} /> Back
                                    </button>
                                ) : <div />}

                                {step < 4 ? (
                                    <button
                                        onClick={nextStep}
                                        disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                                        className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-[#065f46] hover:bg-emerald-800 rounded-lg transition-colors uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !canSubmit}
                                        className="flex items-center gap-2 px-8 py-3 text-sm font-bold text-white bg-[#065f46] hover:bg-emerald-800 rounded-lg transition-colors uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : <><GraduationCap size={16} /> Submit Application</>}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </section>

            <Footer />
        </main>
    );
}

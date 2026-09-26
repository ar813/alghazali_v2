"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { User, BookOpen, Phone, MapPin, Calendar, Hash, Mail, Shield, GraduationCap, X, Copy, Check } from 'lucide-react';
import type { Student } from '@/types/student';

interface StudentDetailModalProps {
    student: Student | null;
    onClose: () => void;
}

const DetailItem = ({ label, value, icon: Icon, copyable }: { label: string; value?: any; icon?: any; copyable?: boolean }) => {
    const [copied, setCopied] = useState(false);
    const displayValue = value === undefined || value === null || value === '' ? '—' : String(value);

    const handleCopy = () => {
        if (displayValue === '—') return;
        navigator.clipboard.writeText(displayValue);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col p-4 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-none transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800/50 group">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                    {Icon && <Icon size={12} />}
                    {label}
                </span>
                {copyable && displayValue !== '—' && (
                    <button onClick={handleCopy} className="text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors">
                        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                )}
            </div>
            <span className={`text-[13px] font-semibold ${displayValue === '—' ? 'text-neutral-300 italic' : 'text-neutral-900 dark:text-neutral-100'}`}>
                {displayValue}
            </span>
        </div>
    );
};

const SectionHeader = ({ title, icon: Icon, color }: { title: string; icon: any; color: string }) => (
    <div className="flex items-center gap-3 mb-6 mt-10 first:mt-0">
        <div className={`p-2 rounded-none ${color} bg-opacity-10 dark:bg-opacity-20`}>
            <Icon size={18} className={color.replace('bg-', 'text-')} />
        </div>
        <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-widest">{title}</h3>
        <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
    </div>
);

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose }) => {
    if (!student) return null;

    return (
        <div 
        className="w-full bg-white dark:bg-neutral-950 overflow-y-auto overscroll-contain custom-scrollbar font-sans selection:bg-neutral-100 dark:selection:bg-neutral-800"
        style={{ height: '100dvh', WebkitOverflowScrolling: 'touch' }}
    >
            {/* 1. Header - No longer fixed */}
            <header className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-none border border-neutral-200 dark:border-neutral-800">
                        <User size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight leading-none mb-1">
                            Student Profile
                        </h1>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">General Registry</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-none transition-all text-neutral-400"
                >
                    <X size={20} />
                </button>
            </header>

            {/* 2. Banner - Part of scroll stream with high-end campus imagery */}
            <div className="h-36 sm:h-48 bg-neutral-900 relative overflow-hidden">
                {/* Blurred Campus Image Background */}
                <Image
                    src="/campus.png"
                    alt="Al Ghazali Campus"
                    fill
                    className="object-cover object-center scale-[1.03] filter blur-[0.5px] brightness-[0.75] contrast-[1.05]"
                    unoptimized
                />

                {/* Branding Gradient Overlay (Islamic Emerald Theme) */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#064e3b]/85 via-[#022c22]/70 to-[#022c22]/30 mix-blend-multiply" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(5,150,105,0.15),transparent_50%)]" />

                {/* Subtle Islamic Geometric Pattern Overlay */}
                <div className="absolute inset-0 bg-islamic-pattern pointer-events-none opacity-[0.04]" />

                {/* Premium Accent Lines (Stitch Theme) */}
                <div className="absolute top-4 left-4 w-4 h-[1px] bg-white/20" />
                <div className="absolute top-4 left-4 h-4 w-[1px] bg-white/20" />
                <div className="absolute top-4 right-4 w-4 h-[1px] bg-white/20" />
                <div className="absolute top-4 right-4 h-4 w-[1px] bg-white/20" />

                {/* Bottom Fade to transition smoothly to white/dark background */}
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white dark:from-neutral-950 via-white/40 dark:via-neutral-950/40 to-transparent" />
            </div>

            {/* 3. Main Content Container */}
            <div className="max-w-4xl mx-auto px-6 sm:px-10 pb-20 -mt-16 sm:-mt-20 relative z-10">
                {/* Identity Header */}
                <div className="flex flex-col items-center sm:items-end sm:flex-row gap-6 mb-12">
                    <div className="relative group">
                        <div className="absolute -inset-1.5 bg-white dark:bg-neutral-950 rounded.5rem] shadow-xl" />
                        <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded bg-neutral-100 dark:bg-neutral-900 border-4 border-white dark:border-neutral-950 overflow-hidden shadow-sm">
                            {student.photoUrl ? (
                                <Image src={student.photoUrl} alt={student.fullName} fill className="object-cover" unoptimized />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-neutral-300 dark:text-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                                    {student.fullName?.charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center sm:text-left flex-1 pb-2">
                        <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-3">
                            {student.fullName}
                        </h2>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                            <div className="px-4 py-1.5 rounded-none bg-neutral-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest shadow-sm">
                                Class {student.admissionFor}
                            </div>
                            <div className="px-4 py-1.5 rounded-none bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase tracking-widest border border-neutral-200 dark:border-neutral-800 shadow-sm">
                                Roll: {student.rollNumber || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Grid Sectioned */}
                <div className="space-y-2">
                    <SectionHeader title="Identification Data" icon={Shield} color="bg-blue-600" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DetailItem label="Father Name" value={student.fatherName} icon={User} />
                        <DetailItem label="Gender" value={student.gender} icon={User} />
                        <DetailItem label="Date of Birth" value={student.dob} icon={Calendar} />
                        <DetailItem label="CNIC / B-Form" value={student.cnicOrBform} icon={Hash} copyable />
                        <DetailItem label="Father CNIC" value={(student as any).fatherCnic} icon={Hash} copyable />
                        <DetailItem label="Nationality" value={student.nationality?.toLowerCase() === 'pakistani' ? 'Pakistani' : student.nationality} icon={MapPin} />
                        <DetailItem label="Medical Data" value={student.medicalCondition} icon={Shield} />
                    </div>

                    <SectionHeader title="Academic Records" icon={GraduationCap} color="bg-indigo-600" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DetailItem label="GR Number" value={student.grNumber} icon={Hash} copyable />
                        <DetailItem label="Former Education" value={student.formerEducation} icon={BookOpen} />
                        <DetailItem label="Previous Institute" value={student.previousInstitute} icon={MapPin} />
                        <DetailItem label="Last Exam %" value={student.lastExamPercentage} icon={GraduationCap} />
                    </div>

                    <SectionHeader title="Contact Information" icon={Phone} color="bg-emerald-600" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DetailItem label="Primary Phone" value={student.phoneNumber} icon={Phone} copyable />
                        <DetailItem label="WhatsApp" value={student.whatsappNumber} icon={Phone} copyable />
                        <DetailItem label="Email" value={student.email} icon={Mail} copyable />
                        <div className="sm:col-span-2 lg:col-span-3">
                            <DetailItem label="Personal Address" value={student.address} icon={MapPin} />
                        </div>
                    </div>

                    <SectionHeader title="Guardian Details" icon={Shield} color="bg-amber-600" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DetailItem label="Guardian Name" value={student.guardianName} icon={User} />
                        <DetailItem label="Relationship" value={student.guardianRelation} icon={User} />
                        <DetailItem label="Contact No" value={student.guardianContact} icon={Phone} copyable />
                        <DetailItem label="Guardian CNIC" value={student.guardianCnic} icon={Hash} copyable />
                    </div>
                </div>

                {/* 4. Footer - Now part of scroller flow */}
                <div className="mt-16 pt-8 border-t border-neutral-100 dark:border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden">
                    <div className="text-center sm:text-left">
                        <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Status Verification</p>
                        <p className="text-[12px] font-bold text-emerald-600 dark:text-emerald-500 flex items-center justify-center sm:justify-start gap-1.5 uppercase">
                            <div className="w-1.5 h-1.5 rounded bg-emerald-500 animate-pulse" />
                            Verified Record Entry
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-none text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-sm active:scale-95"
                    >
                        Close Record
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentDetailModal;

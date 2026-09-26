"use client";
import React, { useState, useEffect } from 'react';
import { User, BookOpen, Phone, FileText, Camera, Check, ChevronRight, Hash, Mail, MapPin, X, Calendar } from 'lucide-react';
import Image from 'next/image';
import ImageCropper from '@/components/ImageCropper/ImageCropper';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";

// --- Simplified Sub-components ---

const FieldLabel = ({ children, icon: Icon }: { children: React.ReactNode, icon?: any }) => (
    <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5 px-0.5">
        {Icon && <Icon size={12} />}
        {children}
    </label>
);

const TextInput = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: any }) => (
    <div className="relative">
        <input
            {...props}
            className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-none focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-[13px] font-medium text-neutral-900 dark:text-white transition-all"
        />
    </div>
);

const SelectInput = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { icon?: any }) => (
    <div className="relative">
        <select
            {...props}
            className="w-full px-4 py-2.5 pr-10 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-none focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-[13px] font-medium text-neutral-900 dark:text-white appearance-none cursor-pointer transition-all"
        >
            {children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            <ChevronRight size={14} className="rotate-90" />
        </div>
    </div>
);

// --- Main component ---

interface StudentFormContentProps {
    onSave: (data: any, photoFile: File | null) => Promise<void>;
    onCancel: () => void;
    initialData?: any;
    loading?: boolean;
}

const TABS_CONFIG = [
    { label: 'Identity', icon: User },
    { label: 'Academic', icon: BookOpen },
    { label: 'Contact', icon: Phone },
    { label: 'Guardian', icon: FileText },
];

const StudentFormContent: React.FC<StudentFormContentProps> = ({ onSave, onCancel, initialData, loading }) => {
    const [formData, setFormData] = useState<any>({});
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [cropSource, setCropSource] = useState<string | null>(null);
    const [activeTabIndex, setActiveTabIndex] = useState(0);

    const formatCNIC = (value: string) => {
        const v = value.replace(/\D/g, '');
        if (v.length <= 5) return v;
        if (v.length <= 12) return `${v.slice(0, 5)}-${v.slice(5)}`;
        return `${v.slice(0, 5)}-${v.slice(5, 12)}-${v.slice(12, 13)}`;
    };

    const formatPhone = (value: string) => {
        const v = value.replace(/\D/g, '');
        if (v.length <= 4) return v;
        return `${v.slice(0, 4)}-${v.slice(4, 11)}`;
    };

    useEffect(() => {
        if (initialData) {
            const displayDob = initialData.dob ? initialData.dob.split('-').reverse().join('-') : '';
            setFormData({ ...initialData, dob: displayDob });
            setPhotoPreview(initialData.photoUrl || null);
        } else {
            const savedDraft = localStorage.getItem('studentFormDraft');
            if (savedDraft) {
                try {
                    setFormData(JSON.parse(savedDraft));
                } catch (e) {
                    console.error("Draft parse error", e);
                }
            } else {
                setFormData({
                    fullName: '', fatherName: '', fatherCnic: '', dob: '', rollNumber: '',
                    grNumber: '', gender: 'male', admissionFor: '1', nationality: 'Pakistani',
                    medicalCondition: 'no', cnicOrBform: '', email: '', phoneNumber: '',
                    whatsappNumber: '', address: '', formerEducation: '', previousInstitute: '',
                    lastExamPercentage: '', guardianName: '', guardianContact: '',
                    guardianCnic: '', guardianRelation: '',
                });
            }
            setPhotoPreview(null);
        }
    }, [initialData]);

    useEffect(() => {
        if (!initialData && Object.keys(formData).length > 0) {
            localStorage.setItem('studentFormDraft', JSON.stringify(formData));
        }
    }, [formData, initialData]);

    const handleSave = async () => {
        if (!formData.fullName || !formData.fatherName || !formData.grNumber) {
            toast.warning("Missing Required Fields", {
                description: "Please provide Full Name, Father Name, and GR Number."
            });
            return;
        }
        
        const payload = { ...formData };
        if (payload.dob && payload.dob.includes('-')) {
            const parts = payload.dob.split('-');
            if (parts.length === 3 && parts[2].length === 4) {
               payload.dob = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        
        await onSave(payload, photoFile);
        if (!initialData) localStorage.removeItem('studentFormDraft');
    };

    const handleDiscard = () => {
        if (!initialData) localStorage.removeItem('studentFormDraft');
        onCancel();
    };

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const formatDob = (value: string) => {
        const v = value.replace(/\D/g, '');
        if (v.length <= 2) return v;
        if (v.length <= 4) return `${v.slice(0, 2)}-${v.slice(2)}`;
        return `${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4, 8)}`;
    };

    const calculateAge = (dobString: string) => {
        if (!dobString || dobString.length < 10) return null;
        const parts = dobString.split('-');
        let day, month, year;
        if (parts[2]?.length === 4) {
            day = parts[0]; month = parts[1]; year = parts[2];
        } else if (parts[0]?.length === 4) {
            year = parts[0]; month = parts[1]; day = parts[2];
        } else return null;

        if (!day || !month || !year || year.length < 4) return null;
        
        const dobDate = new Date(Number(year), Number(month) - 1, Number(day));
        if (isNaN(dobDate.getTime())) return null;

        const today = new Date();
        let ageYears = today.getFullYear() - dobDate.getFullYear();
        let ageMonths = today.getMonth() - dobDate.getMonth();
        let ageDays = today.getDate() - dobDate.getDate();

        if (ageDays < 0) {
            ageMonths -= 1;
            const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            ageDays += lastMonth.getDate();
        }
        
        if (ageMonths < 0) {
            ageYears -= 1;
            ageMonths += 12;
        }

        return { years: ageYears, months: ageMonths, days: ageDays };
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setCropSource(String(reader.result));
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        const file = new File([croppedBlob], "profile_photo.jpg", { type: "image/jpeg" });
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(croppedBlob));
        setShowCropper(false);
    };

    return (
        <div 
            className="flex flex-col w-full bg-white dark:bg-neutral-950 overflow-hidden font-sans selection:bg-neutral-100 dark:selection:bg-neutral-800"
            style={{ height: '100dvh' }}
        >
            {/* Simple Header */}
            <header className="flex-shrink-0 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-none bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-black">
                        <User size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-neutral-900 dark:text-white leading-none">
                            {initialData ? 'Edit Student' : 'New Admission'}
                        </h2>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleDiscard} className="px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-none">Discard</button>
                    {activeTabIndex < TABS_CONFIG.length - 1 ? (
                        <button
                            onClick={() => setActiveTabIndex(prev => prev + 1)}
                            className="px-4 py-1.5 rounded-none bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold flex items-center gap-2 shadow-sm hover:opacity-80 transition-opacity"
                        >
                            <span>Next Step</span>
                            <ChevronRight size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-4 py-1.5 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2 shadow-sm transition-colors"
                        >
                            {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded animate-spin" /> : <Check size={14} />}
                            <span>Save & Complete</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Compact Navigation */}
            <nav className="flex-shrink-0 w-full border-b border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 z-20 overflow-x-auto no-scrollbar">
                <div className="flex px-4 sm:px-8 py-2 gap-1 items-center justify-start min-w-max">
                    {TABS_CONFIG.map((tab, idx) => {
                        const isActive = activeTabIndex === idx;
                        return (
                            <button
                                key={idx}
                                onClick={() => setActiveTabIndex(idx)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-none text-[12px] font-bold transition-all whitespace-nowrap
                                    ${isActive ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white' : 'text-neutral-400 hover:text-neutral-600'}
                                `.trim()}
                            >
                                <tab.icon size={14} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Content Area */}
            <main 
                className="bg-white dark:bg-neutral-950 custom-scrollbar overscroll-contain"
                style={{ flex: '1 1 0', overflowY: 'auto', minHeight: 0 }}
            >
                <div className="max-w-3xl mx-auto p-5 sm:p-10 pb-20">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTabIndex}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                        >
                            {/* SECTION: Identity */}
                            {activeTabIndex === 0 && (
                                <div className="space-y-8">
                                    <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 border-b border-neutral-50 dark:border-neutral-900 pb-8">
                                        <div
                                            className="relative cursor-pointer w-24 h-24 rounded-none border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 overflow-hidden flex items-center justify-center shrink-0"
                                            onClick={() => {
                                                if (photoPreview) {
                                                    setCropSource(photoPreview)
                                                    setShowCropper(true)
                                                } else {
                                                    document.getElementById('photo-upload-input')?.click()
                                                }
                                            }}
                                        >
                                            {photoPreview ? (
                                                <Image src={photoPreview} alt="Preview" fill className="object-cover" unoptimized />
                                            ) : (
                                                <div className="flex flex-col items-center gap-1 text-neutral-400">
                                                    <Camera size={24} />
                                                    <span className="text-[10px] font-bold uppercase">Image</span>
                                                </div>
                                            )}
                                            <input id="photo-upload-input" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                        </div>
                                        <div className="flex-1 space-y-4 w-full">
                                            <div className="space-y-2"><FieldLabel icon={User}>Full Name</FieldLabel><TextInput value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)} placeholder="e.g. Arsalan Rafay" /></div>
                                            <div className="space-y-2"><FieldLabel icon={User}>Father's Name</FieldLabel><TextInput value={formData.fatherName} onChange={(e) => handleChange('fatherName', e.target.value)} placeholder="e.g. Rafay Ahmed" /></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 mt-6">
                                        <div className="space-y-2"><FieldLabel icon={Hash}>Father's CNIC</FieldLabel><TextInput value={formData.fatherCnic} onChange={(e) => handleChange('fatherCnic', formatCNIC(e.target.value))} placeholder="42101-XXXXXXX-X" /></div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <FieldLabel icon={BookOpen}>Date of Birth</FieldLabel>
                                                {(() => {
                                                    const age = calculateAge(formData.dob);
                                                    if (age) {
                                                        return (
                                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                                {age.years} Yrs, {age.months} Mos, {age.days} Days
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <div className="relative flex items-center">
                                                <TextInput 
                                                    value={formData.dob} 
                                                    onChange={(e) => handleChange('dob', formatDob(e.target.value))} 
                                                    placeholder="DD-MM-YYYY" 
                                                />
                                                <div className="absolute right-0 top-0 h-full w-10 overflow-hidden flex items-center justify-center cursor-pointer text-neutral-400 hover:text-neutral-600">
                                                    <Calendar size={16} />
                                                    <input 
                                                        type="date" 
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                        onChange={(e) => {
                                                            const d = e.target.value;
                                                            if (d) {
                                                                const [y, m, day] = d.split('-');
                                                                handleChange('dob', `${day}-${m}-${y}`);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2"><FieldLabel icon={Hash}>CNIC / B-Form</FieldLabel><TextInput value={formData.cnicOrBform} onChange={(e) => handleChange('cnicOrBform', formatCNIC(e.target.value))} placeholder="42101-XXXXXXX-X" /></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2"><FieldLabel>Gender</FieldLabel><SelectInput value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)}><option value="male">Male</option><option value="female">Female</option></SelectInput></div>
                                            <div className="space-y-2"><FieldLabel>Medical</FieldLabel><SelectInput value={formData.medicalCondition} onChange={(e) => handleChange('medicalCondition', e.target.value)}><option value="no">None</option><option value="yes">Specific</option></SelectInput></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECTION: Academic */}
                            {activeTabIndex === 1 && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2"><FieldLabel icon={BookOpen}>Admission Class</FieldLabel><SelectInput value={formData.admissionFor} onChange={(e) => handleChange('admissionFor', e.target.value)}>{['KG', '1', '2', '3', '4', '5', '6', '7', '8', 'SSCI', 'SSCII'].map(c => (<option key={c} value={c}>Class {c}</option>))}</SelectInput></div>
                                        <div className="space-y-2"><FieldLabel icon={Hash}>Roll No.</FieldLabel><TextInput value={formData.rollNumber} onChange={(e) => handleChange('rollNumber', e.target.value)} placeholder="024" /></div>
                                        <div className="space-y-2"><FieldLabel icon={Hash}>G.R. No.</FieldLabel><TextInput value={formData.grNumber} onChange={(e) => handleChange('grNumber', e.target.value)} placeholder="10245" /></div>
                                    </div>
                                    <div className="pt-8 border-t border-neutral-50 dark:border-neutral-900 space-y-6">
                                        <h4 className="text-[12px] font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Prior Education</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2"><FieldLabel icon={BookOpen}>Previous Institute</FieldLabel><TextInput value={formData.previousInstitute} onChange={(e) => handleChange('previousInstitute', e.target.value)} placeholder="Institute Name" /></div>
                                            <div className="space-y-2"><FieldLabel icon={Hash}>Last Percentage</FieldLabel><TextInput value={formData.lastExamPercentage} onChange={(e) => handleChange('lastExamPercentage', e.target.value)} placeholder="e.g. 85%" /></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECTION: Contact */}
                            {activeTabIndex === 2 && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2"><FieldLabel icon={Mail}>Email</FieldLabel><TextInput type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="email@example.com" /></div>
                                        <div className="space-y-2"><FieldLabel icon={Phone}>Mobile</FieldLabel><TextInput value={formData.phoneNumber} onChange={(e) => handleChange('phoneNumber', formatPhone(e.target.value))} placeholder="03XX-XXXXXXX" /></div>
                                        <div className="space-y-2"><FieldLabel icon={Phone}>WhatsApp</FieldLabel><TextInput value={formData.whatsappNumber} onChange={(e) => handleChange('whatsappNumber', formatPhone(e.target.value))} placeholder="03XX-XXXXXXX" /></div>
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <FieldLabel icon={MapPin}>Residential Address</FieldLabel>
                                        <textarea
                                            rows={4}
                                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-none focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-[13px] font-medium text-neutral-900 dark:text-white transition-all resize-none"
                                            value={formData.address} onChange={(e) => handleChange('address', e.target.value)}
                                            placeholder="Enter complete address..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* SECTION: Guardian */}
                            {activeTabIndex === 3 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                    <div className="space-y-2"><FieldLabel icon={User}>Guardian Name</FieldLabel><TextInput value={formData.guardianName} onChange={(e) => handleChange('guardianName', e.target.value)} placeholder="Official Name" /></div>
                                    <div className="space-y-2"><FieldLabel icon={Phone}>Contact No.</FieldLabel><TextInput value={formData.guardianContact} onChange={(e) => handleChange('guardianContact', formatPhone(e.target.value))} placeholder="03XX-XXXXXXX" /></div>
                                    <div className="space-y-2"><FieldLabel icon={Hash}>CNIC</FieldLabel><TextInput value={formData.guardianCnic} onChange={(e) => handleChange('guardianCnic', formatCNIC(e.target.value))} placeholder="42101-XXXXXXX-X" /></div>
                                    <div className="space-y-2"><FieldLabel icon={User}>Relation</FieldLabel><SelectInput value={formData.guardianRelation} onChange={(e) => handleChange('guardianRelation', e.target.value)}><option value="">Select Relation</option>{['Father', 'Mother', 'Brother', 'Sister', 'Uncle', 'Other'].map(r => (<option key={r} value={r.toLowerCase()}>{r}</option>))}</SelectInput></div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Simple Footer */}
            <footer className="flex-shrink-0 px-4 sm:px-8 py-3 bg-neutral-50 dark:bg-neutral-900/40 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between z-30">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded bg-emerald-500" />
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">System Ready</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[11px] text-neutral-900 dark:text-white font-bold opacity-80">AL-GHAZALI</span>
                </div>
            </footer>

            {/* Premium Cropper Overlay */}
            <AnimatePresence>
                {showCropper && cropSource && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
                    >
                        {/* Glassmorphic Backdrop */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

                        {/* Cropper Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white dark:bg-neutral-900 rounded-none w-full max-w-lg overflow-hidden shadow-2xl relative z-10"
                        >
                            <ImageCropper src={cropSource} onCropped={handleCropComplete} onCancel={() => setShowCropper(false)} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default StudentFormContent;

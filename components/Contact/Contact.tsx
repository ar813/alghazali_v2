"use client"
import React, { useEffect, useState } from 'react'
import { ArrowRight, Mail, MapPin, Phone, Loader2, Building2, CheckCircle2 } from 'lucide-react'
import { toast } from "sonner"
import { SectionReveal } from '@/components/ScrollEffects/SectionReveal'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

const Contact = () => {
    const [settings, setSettings] = useState<any>(null)
    useEffect(() => {
        fetch('/api/important', { cache: 'no-store' })
            .then(r => r.json())
            .then(j => { if (j?.ok) setSettings(j.data || null) })
            .catch(() => { })
    }, [])

    const [formData, setFormData] = useState({ fullName: '', email: '', message: '' })
    const [isLoading, setIsLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            await addDoc(collection(db, 'contact_inquiries'), {
                name: formData.fullName,
                email: formData.email,
                message: formData.message,
                subject: 'General Inquiry',
                phone: '',
                status: 'unread',
                createdAt: serverTimestamp()
            })
            setSubmitted(true)
            toast.success('Message Sent!', { description: 'Thank you! We will get back to you shortly.' })
            setFormData({ fullName: '', email: '', message: '' })
        } catch {
            toast.error('Submission Failed', { description: 'Sorry, there was an error. Please try again.' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <section id="contact" className="bg-white py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20">
                    
                    {/* Left Column: Contact Form */}
                    <SectionReveal>
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-[#0f172a] tracking-tight mb-3 uppercase label-mono">
                                    Contact Us
                                </h2>
                                <p className="text-[#64748b] text-sm leading-relaxed max-w-md">
                                    We&apos;d love to hear from you. Please fill out the form below and our admissions team will get back to you shortly.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-[#0f172a] mb-2 uppercase tracking-wider">
                                        Full Name
                                    </label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        placeholder="John Doe"
                                        className="w-full px-4 py-4 bg-white border border-[#e2e8f0] rounded-sm text-[#0f172a] placeholder-[#94a3b8] focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b] outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#0f172a] mb-2 uppercase tracking-wider">
                                        Email Address
                                    </label>
                                    <input 
                                        type="email" 
                                        required 
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="john@example.com"
                                        className="w-full px-4 py-4 bg-white border border-[#e2e8f0] rounded-sm text-[#0f172a] placeholder-[#94a3b8] focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b] outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#0f172a] mb-2 uppercase tracking-wider">
                                        Message
                                    </label>
                                    <textarea 
                                        rows={4}
                                        required 
                                        value={formData.message}
                                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                                        placeholder="How can we help you?"
                                        className="w-full px-4 py-4 bg-white border border-[#e2e8f0] rounded-sm text-[#0f172a] placeholder-[#94a3b8] focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b] outline-none transition-all resize-none"
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isLoading || submitted}
                                    className="px-10 py-4 bg-[#064e3b] text-white font-bold text-sm uppercase tracking-widest transition-all hover:bg-[#003527] disabled:opacity-50 active:scale-95 shadow-lg flex items-center justify-center gap-3"
                                >
                                    {isLoading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                                    ) : submitted ? (
                                        <><CheckCircle2 className="w-4 h-4" /> Message Sent!</>
                                    ) : (
                                        <>Send Message</>
                                    )}
                                </button>                            </form>
                        </div>
                    </SectionReveal>

                    {/* Right Column: Find Us */}
                    <SectionReveal delay={0.2}>
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-[#0f172a] tracking-tight mb-6 uppercase label-mono">
                                    Find Us
                                </h2>
                                
                                {/* Map Container */}
                                <div className="w-full aspect-[16/9] bg-[#f1f5f9] border border-[#e2e8f0] rounded-sm overflow-hidden relative group">
                                    <iframe 
                                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3620.5681714330703!2d67.17068637515153!3d24.844437177939817!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3eb33b0a3a3afaf9%3A0x9514f3d506d9b3ce!2sAl%20ghazali%20high%20school!5e0!3m2!1sen!2s!4v1752337256913!5m2!1sen!2s"
                                        width="100%" 
                                        height="100%" 
                                        style={{ border: 0 }} 
                                        allowFullScreen 
                                        loading="lazy" 
                                        referrerPolicy="no-referrer-when-downgrade"
                                        className="grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                    />
                                    <div className="absolute inset-0 pointer-events-none border-[12px] border-white/10" />
                                </div>
                            </div>

                            {/* Contact Details */}
                            <div className="space-y-8">
                                <div className="flex items-start gap-6">
                                    <div className="w-12 h-12 flex items-center justify-center bg-[#f0f4ff] text-[#064e3b] rounded-sm shrink-0">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-[#0f172a]">Campus Address</h4>
                                        <p className="text-[#64748b] leading-relaxed">
                                            {settings?.schoolAddress || 'Area 36-B, Double Road, Landhi Town, Karachi'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-6">
                                    <div className="w-12 h-12 flex items-center justify-center bg-[#f0f4ff] text-[#064e3b] rounded-sm shrink-0">
                                        <Phone size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-[#0f172a]">Phone</h4>
                                        <p className="text-[#64748b] leading-relaxed">
                                            {settings?.phoneNumber || '+92 321 9230035'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-6">
                                    <div className="w-12 h-12 flex items-center justify-center bg-[#f0f4ff] text-[#064e3b] rounded-sm shrink-0">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-[#0f172a]">Email</h4>
                                        <p className="text-[#64748b] leading-relaxed">
                                            {settings?.email || 'alghazali75160@gmail.com'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SectionReveal>

                </div>
            </div>
        </section>
    )
}

export default Contact
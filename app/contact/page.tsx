"use client";

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import Navbar from '@/components/NavBar/NavBar';
import Footer from '@/components/Footer/Footer';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await addDoc(collection(db, 'contact_inquiries'), {
                ...formData,
                status: 'unread',
                createdAt: serverTimestamp()
            });
            setIsSubmitted(true);
            toast.success("Your message has been sent successfully!");
        } catch (error) {
            console.error("Error submitting contact form: ", error);
            toast.error("Failed to send message. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#f9fafb]">
            <Navbar />
            
            {/* Hero Section */}
            <section className="relative pt-32 pb-16 overflow-hidden bg-white" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <div className="absolute inset-0 bg-islamic-pattern pointer-events-none opacity-50" />
                <div className="absolute inset-0 bg-grid-enterprise pointer-events-none" />
                
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="max-w-3xl">
                        <p className="label-mono mb-4 text-[#065f46]">{"// Help & Support"}</p>
                        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 text-[#111827] uppercase">
                            Get In <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#065f46] to-emerald-600">Touch</span>
                        </h1>
                        <p className="text-lg sm:text-xl text-[#6b7280] leading-relaxed">
                            Have questions about admissions, fees, or our curriculum? Our support team is here to help you.
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Content */}
            <section className="py-16 sm:py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-8">
                    
                    {/* Contact Info */}
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-[#111827] mb-6">Contact Information</h2>
                            <p className="text-[#6b7280] mb-8">
                                Feel free to reach out to us through any of the following channels. We usually respond within 24 hours.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-5 bg-white border border-[#e5e7eb] rounded-xl hover:border-[#065f46] hover:shadow-lg transition-all">
                                <div className="p-3 bg-emerald-50 rounded-lg text-[#065f46] shrink-0">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#111827] mb-1">Our Campus</h3>
                                    <p className="text-sm text-[#6b7280]">123 Education Street, Block 4,<br />Gulshan-e-Iqbal, Karachi, Pakistan</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-5 bg-white border border-[#e5e7eb] rounded-xl hover:border-[#065f46] hover:shadow-lg transition-all">
                                <div className="p-3 bg-emerald-50 rounded-lg text-[#065f46] shrink-0">
                                    <Phone size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#111827] mb-1">Phone Number</h3>
                                    <p className="text-sm text-[#6b7280]">+92 21 3456 7890<br />+92 300 1234567</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-5 bg-white border border-[#e5e7eb] rounded-xl hover:border-[#065f46] hover:shadow-lg transition-all">
                                <div className="p-3 bg-emerald-50 rounded-lg text-[#065f46] shrink-0">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#111827] mb-1">Email Address</h3>
                                    <p className="text-sm text-[#6b7280]">info@alghazalihighschool.edu.pk<br />admissions@alghazalihighschool.edu.pk</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-5 bg-white border border-[#e5e7eb] rounded-xl hover:border-[#065f46] hover:shadow-lg transition-all">
                                <div className="p-3 bg-emerald-50 rounded-lg text-[#065f46] shrink-0">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#111827] mb-1">Office Hours</h3>
                                    <p className="text-sm text-[#6b7280]">Monday - Friday: 8:00 AM - 2:00 PM<br />Saturday: 9:00 AM - 1:00 PM</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-3">
                        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 sm:p-10 shadow-xl shadow-black/[0.02]">
                            {isSubmitted ? (
                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                                        <CheckCircle2 className="w-10 h-10 text-[#065f46]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[#111827] mb-3">Message Received!</h3>
                                    <p className="text-[#6b7280] max-w-sm mb-8">
                                        Thank you for reaching out to us. Our admissions team will get back to you shortly.
                                    </p>
                                    <button 
                                        onClick={() => {
                                            setIsSubmitted(false);
                                            setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
                                        }}
                                        className="px-6 py-3 bg-[#065f46] text-white font-bold uppercase tracking-wider text-sm hover:bg-emerald-800 transition-colors rounded-lg"
                                    >
                                        Send Another Message
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-8">
                                        <h2 className="text-2xl font-bold text-[#111827] mb-2">Send us a Message</h2>
                                        <p className="text-[#6b7280]">Fill out the form below and we will get back to you as soon as possible.</p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Full Name</label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    required
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] outline-none transition-all rounded-lg"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Phone Number</label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    required
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] outline-none transition-all rounded-lg"
                                                    placeholder="+92 3XX XXXXXXX"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Email Address</label>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] outline-none transition-all rounded-lg"
                                                placeholder="john@example.com"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Subject / Inquiry Type</label>
                                            <select
                                                name="subject"
                                                required
                                                value={formData.subject}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] outline-none transition-all rounded-lg appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled>Select a subject...</option>
                                                <option value="Admission Inquiry">Admission Inquiry</option>
                                                <option value="Fee Details">Fee Details</option>
                                                <option value="Curriculum & Subjects">Curriculum & Subjects</option>
                                                <option value="General Question">General Question</option>
                                                <option value="Complaint">Complaint / Feedback</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Your Message</label>
                                            <textarea
                                                name="message"
                                                required
                                                rows={5}
                                                value={formData.message}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] outline-none transition-all rounded-lg resize-y"
                                                placeholder="How can we help you?"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full py-4 bg-[#065f46] text-white font-bold uppercase tracking-wider text-sm hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 rounded-lg disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? (
                                                <><Loader2 size={18} className="animate-spin" /> Sending Message...</>
                                            ) : (
                                                <><Send size={18} /> Submit Inquiry</>
                                            )}
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>

                </div>
            </section>
            
            <Footer />
        </main>
    );
}

"use client"
import React from 'react'
import { Smartphone, Apple, PlayCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { SectionReveal } from '@/components/ScrollEffects/SectionReveal'

const AppDownload = () => {
    return (
        <SectionReveal>
            <section className="relative py-20 px-6 md:py-28 md:px-12 bg-[#064e3b] text-white overflow-hidden">
                {/* Decorative Pattern (Subtle) */}
                <div className="absolute inset-0 bg-grid-small-white/5 pointer-events-none" />
                
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                    
                    {/* Content Left */}
                    <div className="max-w-2xl text-center md:text-left space-y-6">
                        <motion.h2 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-3xl md:text-5xl font-bold tracking-tight"
                        >
                            Stay connected on the go.
                        </motion.h2>
                        
                        <motion.p 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-lg md:text-xl text-emerald-100/80 leading-relaxed max-w-xl"
                        >
                            Download the Al Ghazali community app for instant access to grades, 
                            announcements, event schedules, and direct communication with faculty.
                        </motion.p>
                        
                        {/* Download Buttons */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="flex flex-wrap justify-center md:justify-start gap-4 pt-4"
                        >
                            <a 
                                href="#" 
                                className="flex items-center gap-3 px-6 py-3 bg-white text-[#064e3b] rounded-none font-bold transition-all hover:bg-emerald-50 active:scale-95 border border-white/20 shadow-lg"
                            >
                                <Apple size={24} />
                                <div className="text-left leading-none">
                                    <span className="text-[10px] uppercase block opacity-70">Download on the</span>
                                    <span className="text-lg">App Store</span>
                                </div>
                            </a>
                            <a 
                                href="#" 
                                className="flex items-center gap-3 px-6 py-3 bg-white text-[#064e3b] rounded-none font-bold transition-all hover:bg-emerald-50 active:scale-95 border border-white/20 shadow-lg"
                            >
                                <div className="text-[#064e3b]">
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L14.39,12.7L14.39,11.3L16.81,8.88L20.94,11.21C21.61,11.59 21.61,12.41 20.94,12.79L16.81,15.12M4.66,22.4L13.69,13.4L15.4,15.1L4.66,21.21C4.4,21.36 4.13,21.36 3.87,21.24L4.66,22.4M15.4,8.9L13.69,10.6L4.66,1.6L3.87,2.76C4.13,2.64 4.4,2.64 4.66,2.79L15.4,8.9Z" />
                                    </svg>
                                </div>
                                <div className="text-left leading-none">
                                    <span className="text-[10px] uppercase block opacity-70">Get it on</span>
                                    <span className="text-lg">Google Play</span>
                                </div>
                            </a>
                        </motion.div>
                    </div>

                    {/* Phone Graphic Right */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative"
                    >
                        {/* Floating Animation Wrapper */}
                        <motion.div 
                            animate={{ y: [0, -15, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="relative"
                        >
                            <div className="relative w-40 h-80 md:w-48 md:h-96 border-[4px] border-white/20 rounded-[2.5rem] md:rounded-[3rem] p-3 md:p-4 flex flex-col items-center justify-center opacity-40 md:opacity-60 bg-white/5 backdrop-blur-sm">
                                {/* Inner Screen */}
                                <div className="w-full h-full border border-white/10 rounded-[2rem] md:rounded-[2.5rem] relative flex flex-col items-center pt-6 md:pt-8">
                                    {/* Speaker/Camera Hole */}
                                    <div className="w-10 md:w-12 h-1 md:h-1.5 bg-white/20 rounded-full mb-6 md:mb-8" />
                                    <div className="w-1.5 md:w-2 h-1.5 md:h-2 bg-white/20 rounded-full mb-2" />
                                    
                                    {/* Mock UI lines */}
                                    <div className="w-3/4 h-1 bg-white/10 rounded-full mb-4" />
                                    <div className="w-1/2 h-1 bg-white/10 rounded-full mb-4" />
                                    <div className="w-2/3 h-1 bg-white/10 rounded-full" />
                                    
                                    {/* Mock App Icon */}
                                    <div className="absolute bottom-10 w-10 h-10 border border-white/20 rounded-xl flex items-center justify-center">
                                        <div className="w-6 h-6 bg-white/10 rounded-md" />
                                    </div>
                                </div>
                                
                                {/* Side Buttons */}
                                <div className="absolute top-20 -right-1 w-1 h-10 md:h-12 bg-white/20 rounded-l-md" />
                            </div>
                        </motion.div>
                        
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-[100px] -z-10" />
                    </motion.div>

                </div>

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

                {/* Bottom Accent Bar (As seen in screenshot) */}
                <div className="absolute bottom-0 left-0 w-full h-8 bg-[#1e293b]" />
            </section>
        </SectionReveal>
    )
}

export default AppDownload

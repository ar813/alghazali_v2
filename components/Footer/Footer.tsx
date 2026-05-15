import { ArrowRight, Download, Facebook, Instagram, Mail, MapPin, Phone, Smartphone, Twitter } from 'lucide-react'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

const Footer = () => {
    const appUrl = process.env.NEXT_PUBLIC_MOBILE_APP_URL || '#'
    
    const quickLinks = [
        { label: 'About Us', href: '#about' },
        { label: 'Academic Programs', href: '#academics' },
        { label: 'Faculty', href: '#faculty' },
        { label: 'Admissions', href: '#admissions' },
        { label: 'Events', href: '#events' },
        { label: 'Contact Us', href: '#contact' },
    ]
    
    const programs = [
        { label: 'Science Stream', href: '#' },
        { label: 'Computer Science', href: '#' },
        { label: 'Mathematics', href: '#' },
        { label: 'Islamic Studies', href: '#' },
        { label: 'English Literature', href: '#' },
    ]

    return (
        <footer className="relative overflow-hidden bg-white border-t border-neutral-100">
            {/* Background Texture & Grids */}
            <div className="absolute inset-0 bg-islamic-pattern pointer-events-none opacity-[0.02]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(5,150,105,0.03),transparent_40%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(5,150,105,0.02),transparent_40%)] pointer-events-none" />
            
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 py-24 border-x border-neutral-100">
                    
                    {/* Column 1: Brand & Social */}
                    <div className="p-10 lg:p-12 border-b lg:border-b-0 border-neutral-100 flex flex-col">
                        <div className="flex items-center gap-4 mb-10 group cursor-pointer">
                            <div className="w-14 h-14 flex items-center justify-center bg-[#f9fafb] border border-neutral-100 relative overflow-hidden transition-all duration-500 group-hover:border-[#059669]/30">
                                {/* Stitch Corner Accents */}
                                <div className="absolute top-0 left-0 w-3 h-[1px] bg-[#059669]" />
                                <div className="absolute top-0 left-0 h-3 w-[1px] bg-[#059669]" />
                                <div className="absolute bottom-0 right-0 w-3 h-[1px] bg-[#059669] opacity-0 group-hover:opacity-100 transition-all duration-500" />
                                <div className="absolute bottom-0 right-0 h-3 w-[1px] bg-[#059669] opacity-0 group-hover:opacity-100 transition-all duration-500" />
                                
                                <Image 
                                    src="/logo.png" 
                                    alt="Al Ghazali High School" 
                                    width={36} 
                                    height={36} 
                                    className="object-contain transition-transform duration-700 group-hover:scale-110" 
                                />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 uppercase leading-none mb-1">Al Ghazali</h3>
                                <p className="label-mono text-[9px] text-[#059669] font-bold tracking-widest uppercase">School of Excellence</p>
                            </div>
                        </div>
                        
                        <p className="text-[13px] leading-relaxed text-neutral-500 font-medium mb-10 max-w-xs">
                            Nurturing hearts and minds since 1994. Combining sacred traditions with modern academic excellence in the heart of Landhi, Karachi.
                        </p>

                        <div className="mt-auto pt-6 border-t border-neutral-50">
                            <p className="label-mono text-[8px] mb-5 text-neutral-400 font-bold uppercase tracking-[0.25em]">Follow Our Journey</p>
                            <div className="flex gap-2.5">
                                {[
                                    { icon: <Facebook size={16} />, href: 'https://www.facebook.com/p/Al-Ghazali-High-School-36B-Landhi-Karachi-100071529611065/' },
                                    { icon: <Twitter size={16} />, href: '#' },
                                    { icon: <Instagram size={16} />, href: '#' },
                                    { icon: <Smartphone size={16} />, href: appUrl }
                                ].map((s, i) => (
                                    <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                                        className="w-10 h-10 flex items-center justify-center border border-neutral-100 text-neutral-400 transition-all duration-500 hover:border-[#059669] hover:bg-[#059669] hover:text-white group relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[#059669] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                        <span className="relative z-10">{s.icon}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div className="p-10 lg:p-12 border-b lg:border-b-0 border-l-0 lg:border-l border-neutral-100">
                        <p className="label-mono mb-10 text-[#059669] flex items-center gap-3 font-bold uppercase tracking-widest text-[11px]">
                            <span className="w-1.5 h-1.5 bg-[#059669] rotate-45" />
                            Explore
                        </p>
                        <ul className="space-y-4">
                            {quickLinks.map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="text-[13px] font-semibold text-neutral-500 hover:text-[#059669] transition-all duration-300 flex items-center gap-4 group">
                                        <span className="w-0 h-[1.5px] bg-[#059669] group-hover:w-4 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Academics */}
                    <div className="p-10 lg:p-12 border-b md:border-b-0 border-l-0 lg:border-l border-neutral-100">
                        <p className="label-mono mb-10 text-[#059669] flex items-center gap-3 font-bold uppercase tracking-widest text-[11px]">
                            <span className="w-1.5 h-1.5 bg-[#059669] rotate-45" />
                            Academics
                        </p>
                        <ul className="space-y-4">
                            {programs.map((p, i) => (
                                <li key={i}>
                                    <Link href={p.href} className="text-[13px] font-semibold text-neutral-500 hover:text-[#059669] transition-all duration-300 flex items-center gap-4 group">
                                        <span className="w-0 h-[1.5px] bg-[#059669] group-hover:w-4 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                                        {p.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Contact & Portal */}
                    <div className="p-10 lg:p-12 border-l-0 lg:border-l border-neutral-100 bg-[#f9fafb]/30">
                        <p className="label-mono mb-10 text-[#059669] flex items-center gap-3 font-bold uppercase tracking-widest text-[11px]">
                            <span className="w-1.5 h-1.5 bg-[#059669] rotate-45" />
                            Connect
                        </p>
                        <div className="space-y-8">
                            <div className="flex items-start gap-4 group cursor-default">
                                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-neutral-100 group-hover:border-[#059669]/30 transition-all duration-500 bg-white">
                                    <MapPin size={16} className="text-[#059669]" />
                                </div>
                                <div>
                                    <p className="text-[9px] label-mono text-neutral-400 mb-1 font-bold uppercase tracking-widest">Campus Location</p>
                                    <p className="text-xs font-bold text-neutral-900 leading-relaxed">
                                        Area 36-B, Double Road, Landhi Town, Karachi
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-4 group cursor-default">
                                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-neutral-100 group-hover:border-[#059669]/30 transition-all duration-500 bg-white">
                                    <Phone size={16} className="text-[#059669]" />
                                </div>
                                <div>
                                    <p className="text-[9px] label-mono text-neutral-400 mb-1 font-bold uppercase tracking-widest">Admission Desk</p>
                                    <p className="text-[14px] font-bold text-neutral-900">+92 321 9230035</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-10 space-y-3">
                            <Link href="/student-portal" className="group relative flex items-center justify-center gap-3 px-6 py-4 bg-neutral-900 text-white font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-500 hover:bg-[#059669] active:scale-[0.98] overflow-hidden">
                                <span className="relative z-10">Portal Login</span>
                                <ArrowRight size={14} className="relative z-10 transition-transform duration-500 group-hover:translate-x-1.5" />
                                
                                {/* Stitch Corner Details for Button */}
                                <div className="absolute top-0 left-0 w-3 h-[1px] bg-[#059669]" />
                                <div className="absolute top-0 left-0 h-3 w-[1px] bg-[#059669]" />
                                <div className="absolute bottom-0 right-0 w-3 h-[1px] bg-white/20" />
                                <div className="absolute bottom-0 right-0 h-3 w-[1px] bg-white/20" />
                            </Link>
                            
                            <a href={appUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-center gap-3 px-6 py-3.5 border-2 border-neutral-900 text-neutral-900 font-bold text-[10px] uppercase tracking-[0.15em] transition-all duration-500 hover:bg-neutral-900 hover:text-white active:scale-[0.98]">
                                <Download size={14} className="transition-transform duration-500 group-hover:-translate-y-0.5" />
                                Download App
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="py-12 px-10 border-x border-b border-neutral-100 bg-[#f9fafb]/80 backdrop-blur-md flex flex-col lg:grid lg:grid-cols-3 items-center gap-10">
                    <div className="flex flex-col md:flex-row items-center gap-5 md:gap-10 order-2 lg:order-1">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.25em]">
                            © 2025 Al Ghazali High School
                        </p>
                    </div>
                    
                    <div className="flex items-center justify-center gap-8 order-1 lg:order-2">
                        <Link href="#" className="text-[10px] font-black text-neutral-400 hover:text-[#059669] transition-all duration-300 uppercase tracking-[0.25em] relative group">
                            Privacy
                            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#059669] group-hover:w-full transition-all duration-300" />
                        </Link>
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-200" />
                        <Link href="#" className="text-[10px] font-black text-neutral-400 hover:text-[#059669] transition-all duration-300 uppercase tracking-[0.25em] relative group">
                            Terms
                            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#059669] group-hover:w-full transition-all duration-300" />
                        </Link>
                    </div>
                    
                    <div className="flex items-center justify-end gap-3 order-3">
                        <div className="flex items-center gap-2 px-4 py-2 border border-neutral-100 bg-white shadow-sm group cursor-default">
                            <div className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
                            <span className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">System Online</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Final Decorative Border */}
            <div className="h-2.5 w-full bg-neutral-900 relative">
                <div className="absolute inset-0 bg-[#059669] origin-left scale-x-0 animate-[shimmer-bar_4s_ease-in-out_infinite]" />
                <style jsx>{`
                    @keyframes shimmer-bar {
                        0% { scale: 0 1; transform-origin: left; }
                        50% { scale: 1 1; transform-origin: left; }
                        50.1% { scale: 1 1; transform-origin: right; }
                        100% { scale: 0 1; transform-origin: right; }
                    }
                `}</style>
            </div>
        </footer>
    )
}

export default Footer
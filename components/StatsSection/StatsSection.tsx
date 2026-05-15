"use client"
import React, { useEffect, useRef, useState } from 'react'

type Stat = { value: string; label: string; suffix?: string }

const stats: Stat[] = [
    { value: "30", suffix: "+", label: "Years of Excellence" },
    { value: "1000", suffix: "+", label: "Active Students" },
    { value: "95", suffix: "%", label: "Success Rate" },
    { value: "100", suffix: "+", label: "Qualified Teachers" },
]

const StatsSection = () => {
    const [visible, setVisible] = useState(false)
    const ref = useRef<HTMLElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisible(true) },
            { threshold: 0.2 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return (
        <section
            ref={ref}
            className="relative overflow-hidden bg-[#f9fafb]"
            style={{ borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}
        >
            <div className="absolute inset-0 bg-islamic-pattern opacity-100 pointer-events-none" />
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center gap-6 py-10 sm:py-12">
                    <div className="flex-1 h-[1px] bg-[#e5e7eb]" />
                    <span className="label-mono text-[#9ca3af] whitespace-nowrap">Our Numbers</span>
                    <div className="flex-1 h-[1px] bg-[#e5e7eb]" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 pb-12">
                    {stats.map((stat, i) => (
                        <div
                            key={i}
                            className="flex flex-col items-center justify-center px-4 py-8 relative group"
                            style={{ borderRight: i < stats.length - 1 ? '1px solid #e5e7eb' : 'none' }}
                        >
                            <div
                                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] transition-all duration-300 group-hover:w-16"
                                style={{ background: '#059669', opacity: visible ? 1 : 0 }}
                            />
                            <div
                                className={`text-4xl sm:text-5xl font-bold tracking-tighter transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                                style={{ color: '#059669', transitionDelay: `${i * 100}ms`, fontFamily: 'var(--font-geist-sans)' }}
                            >
                                {stat.value}
                                <span className="text-2xl sm:text-3xl" style={{ color: '#10b981' }}>{stat.suffix}</span>
                            </div>
                            <p
                                className={`label-mono mt-3 text-center text-[#9ca3af] transition-all duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
                                style={{ transitionDelay: `${i * 100 + 200}ms` }}
                            >{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default StatsSection
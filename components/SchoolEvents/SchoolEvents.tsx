"use client"
import { Calendar, ArrowRight } from 'lucide-react'
import React, { useEffect, useState } from 'react'

type EventItem = { _id: string; title: string; content: string; eventDate?: string; eventType?: string }

const SchoolEvents = () => {
    const [events, setEvents] = useState<EventItem[]>([])
    const [loading, setLoading] = useState(false)

    const load = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/notices?events=1&limit=8', { cache: 'no-store' })
            const json = await res.json()
            if (json?.ok) setEvents(json.data as EventItem[])
        } catch { } finally { setLoading(false) }
    }
    useEffect(() => { load() }, [])

    const formatBadgeDate = (iso?: string) => {
        if (!iso) return '—'
        try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: '2-digit' }) } catch { return '—' }
    }

    return (
        <section id="events" className="relative py-20 sm:py-24 overflow-hidden bg-white" style={{ borderTop: '1px solid #e5e7eb' }}>
            <div className="absolute inset-0 bg-grid-enterprise pointer-events-none" />
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12 sm:mb-16">
                    <div>
                        <p className="label-mono mb-4 text-[#059669]">{"// Events"}</p>
                        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3 text-[#111827]" style={{ letterSpacing: '-0.03em' }}>
                            Upcoming <span className="text-[#059669]">Events</span>
                        </h2>
                        <p className="text-base leading-relaxed text-[#6b7280]">Stay updated with our latest activities.</p>
                    </div>
                    <button onClick={load} className="group flex items-center gap-2 px-5 py-2.5 font-semibold text-xs uppercase tracking-widest border border-[#d1d5db] text-[#6b7280] hover:border-[#059669] hover:text-[#059669] transition-all duration-200 self-start sm:self-end shrink-0">
                        <Calendar size={14} /><span>Full Calendar</span><ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </button>
                </div>
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0" style={{ border: '1px solid #e5e7eb' }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="p-6 animate-pulse" style={{ borderRight: i < 3 ? '1px solid #e5e7eb' : 'none' }}>
                                <div className="h-4 w-16 bg-[#e5e7eb] mb-4" /><div className="h-5 w-3/4 bg-[#f3f4f6] mb-2" /><div className="h-3 w-1/2 bg-[#f3f4f6]" />
                            </div>
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-[#e5e7eb] text-[#9ca3af]">
                        <Calendar size={32} className="mb-3 opacity-30" /><p className="label-mono">No upcoming events</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0" style={{ border: '1px solid #e5e7eb' }}>
                        {events.map((event, index) => (
                            <div key={event._id} className="group relative p-6 transition-all duration-300 hover:bg-[#f9fafb] cursor-default"
                                style={{ borderRight: (index % 4) < 3 ? '1px solid #e5e7eb' : 'none', borderBottom: index < events.length - 4 ? '1px solid #e5e7eb' : 'none' }}>
                                <div className="absolute top-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 bg-[#059669]" />
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-5 label-mono text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.15)', color: '#059669' }}>
                                    <Calendar size={10} />{formatBadgeDate(event.eventDate)}
                                </div>
                                <h3 className="font-bold text-sm mb-2 tracking-tight text-[#111827] group-hover:text-[#059669] transition-colors duration-200 uppercase label-mono leading-snug">{event.title}</h3>
                                <p className="label-mono text-[10px] text-[#9ca3af] uppercase tracking-widest">{event.eventType || 'General'}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}

export default SchoolEvents
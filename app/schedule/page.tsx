import React from 'react';
import Navbar from '@/components/NavBar/NavBar';
import Footer from '@/components/Footer/Footer';
import { client } from '@/sanity/lib/client';
import { CalendarDays, Star, GraduationCap, PartyPopper, BookOpen, Clock } from 'lucide-react';

export const revalidate = 60;

interface SchoolEvent {
    _id: string;
    title: string;
    content: string;
    eventDate: string;
    eventType?: string;
}

const eventTypeConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    holiday: { label: 'Holiday', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
    exam: { label: 'Examination', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    activity: { label: 'Activity', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    ceremony: { label: 'Ceremony', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
    ptm: { label: 'PTM', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
};

const getEventIcon = (type?: string) => {
    switch (type) {
        case 'holiday': return <Star size={18} />;
        case 'exam': return <BookOpen size={18} />;
        case 'activity': return <PartyPopper size={18} />;
        case 'ceremony': return <GraduationCap size={18} />;
        default: return <CalendarDays size={18} />;
    }
};

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default async function SchedulePage() {
    const events: SchoolEvent[] = await client.fetch(
        `*[_type == "notice" && isEvent == true && defined(eventDate)] | order(eventDate asc) {
            _id,
            title,
            content,
            eventDate,
            eventType
        }`
    );

    // Group events by month
    const groupedByMonth: Record<string, SchoolEvent[]> = {};
    for (const event of events) {
        const date = new Date(event.eventDate);
        const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
        if (!groupedByMonth[key]) groupedByMonth[key] = [];
        groupedByMonth[key].push(event);
    }

    const sortedMonthKeys = Object.keys(groupedByMonth).sort();

    return (
        <main className="min-h-screen bg-[#f9fafb]">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 pb-16 overflow-hidden bg-white" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <div className="absolute inset-0 bg-islamic-pattern pointer-events-none opacity-50" />
                <div className="absolute inset-0 bg-grid-enterprise pointer-events-none" />

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="max-w-3xl">
                        <p className="label-mono mb-4 text-[#065f46]">{"// School Calendar"}</p>
                        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 text-[#111827] uppercase">
                            Events & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#065f46] to-emerald-600">Calendar</span>
                        </h1>
                        <p className="text-lg sm:text-xl text-[#6b7280] leading-relaxed">
                            Stay up-to-date with all school events, examination schedules, holidays, and important dates throughout the academic year.
                        </p>
                    </div>
                </div>
            </section>

            {/* Calendar Content */}
            <section className="py-16 sm:py-24">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    {events.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-[#e5e7eb] rounded-xl">
                            <CalendarDays className="mx-auto mb-4 text-neutral-300" size={48} />
                            <p className="text-neutral-500 font-medium">No events have been scheduled yet.</p>
                            <p className="text-sm text-neutral-400 mt-1">Check back later for upcoming school events and holidays.</p>
                        </div>
                    ) : (
                        <div className="space-y-16">
                            {sortedMonthKeys.map((monthKey) => {
                                const eventsInMonth = groupedByMonth[monthKey];
                                const sampleDate = new Date(eventsInMonth[0].eventDate);
                                const monthName = months[sampleDate.getMonth()];
                                const year = sampleDate.getFullYear();

                                return (
                                    <div key={monthKey}>
                                        {/* Month Header */}
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="p-3 bg-[#065f46] text-white rounded-xl">
                                                <CalendarDays size={24} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl sm:text-3xl font-black text-[#111827] uppercase tracking-tight">{monthName}</h2>
                                                <p className="text-sm text-neutral-500 font-medium">{year} &mdash; {eventsInMonth.length} Event{eventsInMonth.length > 1 ? 's' : ''}</p>
                                            </div>
                                            <div className="flex-1 h-px bg-neutral-200 ml-4" />
                                        </div>

                                        {/* Events List */}
                                        <div className="space-y-4">
                                            {eventsInMonth.map((event) => {
                                                const date = new Date(event.eventDate);
                                                const config = eventTypeConfig[event.eventType || ''] || { label: 'General', color: 'text-neutral-700', bg: 'bg-neutral-50', border: 'border-neutral-200' };

                                                return (
                                                    <div
                                                        key={event._id}
                                                        className={`group flex flex-col sm:flex-row gap-4 sm:gap-6 p-5 sm:p-6 bg-white border ${config.border} rounded-xl hover:shadow-lg hover:border-[#065f46] transition-all`}
                                                    >
                                                        {/* Date Badge */}
                                                        <div className="flex sm:flex-col items-center sm:items-center justify-start gap-3 sm:gap-1 sm:min-w-[72px] shrink-0">
                                                            <span className="text-3xl sm:text-4xl font-black text-[#065f46] leading-none">{String(date.getDate()).padStart(2, '0')}</span>
                                                            <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{months[date.getMonth()].slice(0, 3)}</span>
                                                        </div>

                                                        {/* Divider */}
                                                        <div className="hidden sm:block w-px bg-neutral-200 self-stretch" />

                                                        {/* Event Details */}
                                                        <div className="flex-1">
                                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${config.color} ${config.bg} border ${config.border}`}>
                                                                    {getEventIcon(event.eventType)}
                                                                    {config.label}
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 font-medium">
                                                                    <Clock size={10} />
                                                                    {date.toLocaleDateString('en-PK', { weekday: 'long' })}
                                                                </span>
                                                            </div>
                                                            <h3 className="text-lg font-bold text-[#111827] mb-1 group-hover:text-[#065f46] transition-colors">{event.title}</h3>
                                                            <p className="text-sm text-[#6b7280] leading-relaxed line-clamp-2">{event.content}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            <Footer />
        </main>
    );
}

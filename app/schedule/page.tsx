import React from 'react';
import Navbar from '@/components/NavBar/NavBar';
import Footer from '@/components/Footer/Footer';
import { client } from '@/sanity/lib/client';
import { Calendar, Clock } from 'lucide-react';

export const revalidate = 60;

interface Period { subject: string; time: string; }
interface ScheduleDay { day: string; periods: Period[]; }
interface ScheduleDoc { _id: string; className: string; days: ScheduleDay[]; }

const subjectColors: Record<string, string> = {
    'English': 'bg-blue-50 text-blue-700 border-blue-100',
    'English Grammar': 'bg-blue-50 text-blue-700 border-blue-100',
    'Urdu': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Math': 'bg-violet-50 text-violet-700 border-violet-100',
    'Science': 'bg-cyan-50 text-cyan-700 border-cyan-100',
    'Computer': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    'Islamiat': 'bg-amber-50 text-amber-700 border-amber-100',
    'Nazra': 'bg-amber-50 text-amber-700 border-amber-100',
    'Nardban': 'bg-orange-50 text-orange-700 border-orange-100',
    'Break Time': 'bg-neutral-100 text-neutral-500 border-neutral-200',
    'default': 'bg-neutral-50 text-neutral-700 border-neutral-100',
};

const getColor = (subject: string) => subjectColors[subject] || subjectColors['default'];

export default async function SchedulePage() {
    // Fetch from the same API the admin uses — no session filter needed,
    // it returns all schedules (documents without session field are included)
    let schedules: ScheduleDoc[] = [];
    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/schedule`,
            { cache: 'no-store' }
        );
        const json = await res.json();
        if (json.ok) schedules = json.data || [];
    } catch {
        // fallback: direct Sanity query (no session filter)
        schedules = await client.fetch(
            `*[_type == "schedule"] | order(className asc) {
                _id, className,
                days[] { day, periods[] { subject, time } }
            }`
        );
    }

    return (
        <main className="min-h-screen bg-[#f9fafb]">
            <Navbar />

            {/* Hero */}
            <section className="relative pt-32 pb-16 overflow-hidden bg-white" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <div className="absolute inset-0 bg-islamic-pattern pointer-events-none opacity-50" />
                <div className="absolute inset-0 bg-grid-enterprise pointer-events-none" />
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="max-w-3xl">
                        <p className="label-mono mb-4 text-[#065f46]">{"// Class Timetable"}</p>
                        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 text-[#111827] uppercase">
                            Class <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#065f46] to-emerald-600">Schedule</span>
                        </h1>
                        <p className="text-lg text-[#6b7280] leading-relaxed">
                            Weekly timetable for all classes — published by the administration.
                        </p>
                    </div>
                </div>
            </section>

            {/* Schedule Grid */}
            <section className="py-16 sm:py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    {schedules.length === 0 ? (
                        <div className="text-center py-24 bg-white border border-[#e5e7eb] rounded-2xl">
                            <Calendar className="mx-auto mb-4 text-neutral-300" size={48} />
                            <p className="text-neutral-600 font-semibold text-lg">Schedule not published yet</p>
                            <p className="text-sm text-neutral-400 mt-2">The timetable will appear here once set by the administration.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {schedules.map((sch) => (
                                <div key={sch._id} className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                    {/* Class Header */}
                                    <div className="flex items-center gap-3 px-6 py-4 border-b border-[#e5e7eb] bg-[#f9fafb]">
                                        <div className="w-10 h-10 rounded-xl bg-[#065f46]/10 flex items-center justify-center">
                                            <Calendar size={18} className="text-[#065f46]" />
                                        </div>
                                        <div>
                                            <h2 className="font-black text-[#111827] text-base uppercase tracking-tight">Class {sch.className}</h2>
                                            <p className="text-xs text-neutral-500 font-medium">{sch.days?.length || 0} days scheduled</p>
                                        </div>
                                    </div>

                                    {/* Days */}
                                    <div className="divide-y divide-neutral-50">
                                        {sch.days?.map((day) => (
                                            <div key={day.day} className="px-6 py-4">
                                                <p className="text-xs font-black uppercase tracking-widest text-[#065f46] mb-3">{day.day}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {day.periods?.map((p, i) => (
                                                        <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${getColor(p.subject)}`}>
                                                            {p.subject}
                                                            {p.time && (
                                                                <span className="flex items-center gap-0.5 opacity-60 font-normal ml-1">
                                                                    <Clock size={9} />
                                                                    {p.time}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <Footer />
        </main>
    );
}

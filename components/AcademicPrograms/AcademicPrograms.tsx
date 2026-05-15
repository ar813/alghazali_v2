import React from 'react'
import { Microscope, Monitor, Ruler, BookOpen, PenTool, Globe, ArrowRight } from 'lucide-react'

const programs = [
    {
        title: "Science Stream",
        subjects: ["Physics", "Chemistry", "Biology", "Mathematics"],
        description: "Comprehensive science education with modern lab facilities and hands-on experiments.",
        icon: <Microscope className="w-6 h-6" />,
        accent: "#059669",
    },
    {
        title: "Computer Science",
        subjects: ["Programming", "Web Development", "Database", "AI Basics"],
        description: "Cutting-edge computer education preparing students for the digital future.",
        icon: <Monitor className="w-6 h-6" />,
        accent: "#0284c7",
    },
    {
        title: "Mathematics",
        subjects: ["Algebra", "Geometry", "Calculus", "Statistics"],
        description: "Strong mathematical foundation with practical applications and problem-solving.",
        icon: <Ruler className="w-6 h-6" />,
        accent: "#b8860b",
    },
    {
        title: "Islamic Studies",
        subjects: ["Quran", "Hadith", "Fiqh", "Islamic History"],
        description: "Deep understanding of Islamic teachings and values for moral development.",
        icon: <BookOpen className="w-6 h-6" />,
        accent: "#059669",
    },
    {
        title: "English Literature",
        subjects: ["Grammar", "Literature", "Creative Writing", "Public Speaking"],
        description: "Excellent command of English language and literature for global communication.",
        icon: <PenTool className="w-6 h-6" />,
        accent: "#b8860b",
    },
    {
        title: "Social Studies",
        subjects: ["History", "Geography", "Civics", "Economics"],
        description: "Understanding of society, culture, and global affairs for informed citizenship.",
        icon: <Globe className="w-6 h-6" />,
        accent: "#0284c7",
    },
]

const AcademicPrograms = () => {
    return (
        <section
            id="academics"
            className="relative py-20 sm:py-24 overflow-hidden bg-white"
            style={{ borderTop: '1px solid #e5e7eb' }}
        >
            <div className="absolute inset-0 bg-grid-enterprise pointer-events-none" />
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                <div className="mb-12 sm:mb-16">
                    <p className="label-mono mb-4 text-[#059669]">{"// Curriculum"}</p>
                    <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-5 text-[#111827]" style={{ letterSpacing: '-0.03em' }}>
                        Academic <span className="text-[#059669]">Programs</span>
                    </h2>
                    <p className="text-base sm:text-lg max-w-2xl leading-relaxed text-[#6b7280]">
                        Explore our comprehensive curriculum designed to foster intellectual curiosity and spiritual depth.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0" style={{ border: '1px solid #e5e7eb' }}>
                    {programs.map((program, index) => (
                        <div
                            key={index}
                            className="group relative p-7 transition-all duration-300 hover:bg-[#f9fafb] cursor-default"
                            style={{
                                borderRight: (index % 3) < 2 ? '1px solid #e5e7eb' : 'none',
                                borderBottom: index < 3 ? '1px solid #e5e7eb' : 'none',
                            }}
                        >
                            <div className="absolute top-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500" style={{ background: program.accent }} />
                            <div className="mb-6 transition-transform duration-300 group-hover:scale-110" style={{ color: program.accent }}>{program.icon}</div>
                            <h3 className="text-lg font-bold mb-2 tracking-tight text-[#111827] uppercase label-mono">{program.title}</h3>
                            <p className="text-sm leading-relaxed mb-6 text-[#6b7280]">{program.description}</p>
                            <div className="flex flex-wrap gap-1.5 mb-6">
                                {program.subjects.map((subject, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#6b7280] bg-[#f9fafb] label-mono"
                                        style={{ border: '1px solid #e5e7eb' }}
                                    >{subject}</span>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1 label-mono" style={{ color: program.accent }}>
                                <span>Learn More</span>
                                <ArrowRight size={12} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default AcademicPrograms
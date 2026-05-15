import React from 'react'

const faculty = [
    { name: "Molana Noor ul Bashar", qualification: "Shaik ul Hadees", role: "Religious Head", initial: "N" },
    { name: "Dr. Zakariya Rasheed", qualification: "Principal", role: "Principal of the School", initial: "Z" },
    { name: "Molana Shabbir Sahab", qualification: "Director of Administration", role: "Admin Director", initial: "S" },
]

const Faculty = () => {
    return (
        <section
            id="faculty"
            className="relative py-20 sm:py-24 overflow-hidden bg-[#f9fafb]"
            style={{ borderTop: '1px solid #e5e7eb' }}
        >
            <div className="absolute inset-0 bg-islamic-pattern pointer-events-none" />
            <div className="absolute inset-0 bg-grid-enterprise pointer-events-none" />
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                <div className="mb-12 sm:mb-16">
                    <p className="label-mono mb-4 text-[#059669]">{"// Faculty"}</p>
                    <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-5 text-[#111827]" style={{ letterSpacing: '-0.03em' }}>
                        Our Distinguished <span className="text-[#059669]">Faculty</span>
                    </h2>
                    <p className="text-base sm:text-lg max-w-2xl leading-relaxed text-[#6b7280]">
                        Learn from world-class educators dedicated to academic excellence and spiritual growth.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-0" style={{ border: '1px solid #e5e7eb' }}>
                    {faculty.map((member, index) => (
                        <div
                            key={index}
                            className="group relative p-8 sm:p-10 bg-white transition-all duration-200 hover:bg-[#f3f4f6] cursor-default"
                            style={{ borderRight: index < faculty.length - 1 ? '1px solid #e5e7eb' : 'none' }}
                        >
                            <div className="absolute top-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 bg-[#059669]" />
                            <div
                                className="w-16 h-16 mb-6 flex items-center justify-center text-2xl font-bold text-[#059669] group-hover:shadow-md transition-shadow"
                                style={{ background: '#f0fdf4', border: '1px solid #d1fae5', fontFamily: 'var(--font-geist-sans)' }}
                            >{member.initial}</div>
                            <h3 className="text-lg font-bold mb-1 tracking-tight text-[#111827]">{member.name}</h3>
                            <p className="text-sm font-medium mb-1 text-[#059669]">{member.qualification}</p>
                            <p className="label-mono text-[#9ca3af]">{member.role}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Faculty
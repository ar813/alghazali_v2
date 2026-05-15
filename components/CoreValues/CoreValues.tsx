import React from 'react'

const values = [
    {
        arabic: "إِيمَان",
        name: "Iman",
        subtitle: "Faith",
        description: "Faith as the bedrock of our identity, informing our purpose and guiding our actions in every aspect of life.",
        icon: "✦",
    },
    {
        arabic: "إِحْسَان",
        name: "Ihsan",
        subtitle: "Excellence",
        description: "The pursuit of excellence in all endeavors — from spiritual worship to academic scholarship and community service.",
        icon: "◆",
    },
    {
        arabic: "ابتكار",
        name: "Innovation",
        subtitle: "Progress",
        description: "Embracing modern knowledge and technology to solve contemporary challenges while honoring our rich heritage.",
        icon: "◈",
    },
    {
        arabic: "أمانة",
        name: "Integrity",
        subtitle: "Trust",
        description: "Upholding the highest ethical standards in all our interactions — with students, parents, and the wider community.",
        icon: "◉",
    },
]

const CoreValues = () => {
    return (
        <section
            id="values"
            className="relative py-20 sm:py-24 overflow-hidden bg-[#f9fafb]"
            style={{ borderTop: '1px solid #e5e7eb' }}
        >
            <div className="absolute inset-0 bg-islamic-pattern pointer-events-none opacity-100" />
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                <div className="mb-12 sm:mb-16">
                    <p className="label-mono mb-4 text-[#059669]">{"// Foundational Principles"}</p>
                    <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-5 text-[#111827]" style={{ letterSpacing: '-0.03em' }}>
                        Our Core <span className="text-[#059669]">Values</span>
                    </h2>
                    <p className="text-base sm:text-lg max-w-2xl leading-relaxed text-[#6b7280]">
                        The foundational principles that guide every aspect of life and learning at Al Ghazali High School.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0" style={{ border: '1px solid #e5e7eb' }}>
                    {values.map((v, i) => (
                        <div
                            key={i}
                            className="group relative p-8 bg-white transition-all duration-200 hover:bg-[#f3f4f6] cursor-default"
                            style={{
                                borderRight: i < values.length - 1 ? '1px solid #e5e7eb' : 'none',
                                borderBottom: '1px solid #e5e7eb',
                            }}
                        >
                            <div className="absolute top-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 bg-[#059669]" />
                            <div
                                className="text-3xl font-bold mb-4 leading-none transition-all duration-200 group-hover:text-[#059669]"
                                style={{ color: '#d1d5db', fontFamily: 'Georgia, serif', direction: 'rtl' }}
                            >{v.arabic}</div>
                            <div className="text-[#059669] text-lg mb-4 transition-transform duration-200 group-hover:scale-125 inline-block">{v.icon}</div>
                            <h3 className="text-xl font-bold tracking-tight mb-1 text-[#111827]">{v.name}</h3>
                            <p className="label-mono text-[#9ca3af] mb-4">{v.subtitle}</p>
                            <p className="text-sm leading-relaxed text-[#6b7280]">{v.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default CoreValues

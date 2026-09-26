import Link from 'next/link'
import { Target, Eye, Heart, FileText, CreditCard, Calendar, Headphones, ArrowRight } from 'lucide-react'

const About = () => {
    const pillars = [
        {
            icon: <Target className="w-8 h-8 text-[#065f46]" />,
            title: "Our Mission",
            description: "To provide quality education that nurtures intellectual growth, character development, and Islamic values, preparing students for success in this world and the hereafter.",
        },
        {
            icon: <Eye className="w-8 h-8 text-[#065f46]" />,
            title: "Our Vision",
            description: "To be the leading educational institution in Pakistan, recognized for academic excellence, moral integrity, and producing future leaders who contribute positively to society.",
        },
        {
            icon: <Heart className="w-8 h-8 text-[#065f46]" />,
            title: "Our Values",
            description: "Integrity, Excellence, Innovation, Compassion, and Responsibility guide everything we do, ensuring our students develop strong character alongside academic success.",
        },
    ]

    const resources = [
        {
            title: "Admissions 2024",
            label: "Guide & Form",
            action: "Download PDF",
            icon: <FileText className="w-5 h-5" />,
            href: "/admissions"
        },
        {
            title: "Fee Structure",
            label: "Current Session",
            action: "View Details",
            icon: <CreditCard className="w-5 h-5" />,
            href: "/fees"
        },
        {
            title: "School Calendar",
            label: "Events & Holidays",
            action: "Open Calendar",
            icon: <Calendar className="w-5 h-5" />,
            href: "/schedule"
        },
        {
            title: "Help & Support",
            label: "Online Inquiry",
            action: "Contact Us",
            icon: <Headphones className="w-5 h-5" />,
            href: "/contact"
        },
    ]

    return (
        <section
            id="about"
            className="relative py-20 sm:py-24 overflow-hidden bg-white"
            style={{ borderTop: '1px solid #e5e7eb' }}
        >
            <div className="absolute inset-0 bg-islamic-pattern pointer-events-none" />
            <div className="absolute inset-0 bg-grid-enterprise pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                <div className="mb-14 sm:mb-16">
                    <p className="label-mono mb-4 text-[#065f46]">{"// About Us"}</p>
                    <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-5 text-[#111827]" style={{ letterSpacing: '-0.03em' }}>
                        About Al Ghazali<br />
                        <span className="text-[#065f46]">High School</span>
                    </h2>
                    <p className="text-base sm:text-lg max-w-2xl leading-relaxed text-[#6b7280]">
                        Established in 1993, Al Ghazali High School has been a beacon of educational excellence
                        in Karachi, combining modern pedagogy with Islamic values.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mb-1" style={{ border: '1px solid #e5e7eb' }}>
                    {pillars.map((p, i) => (
                        <div
                            key={i}
                            className="group relative p-8 transition-all duration-300 hover:bg-[#f9fafb] cursor-default"
                            style={{ borderRight: i < pillars.length - 1 ? '1px solid #e5e7eb' : 'none' }}
                        >
                            <div className="absolute top-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 bg-[#065f46]" />
                            <div className="mb-6 transform transition-transform duration-300 group-hover:scale-110">{p.icon}</div>
                            <h3 className="text-lg font-bold mb-3 tracking-tight text-[#111827] uppercase label-mono">{p.title}</h3>
                            <p className="text-sm leading-relaxed text-[#6b7280]">{p.description}</p>
                        </div>
                    ))}
                </div>

                {/* Useful Resource Center instead of Legacy */}
                <div className="mt-12 relative overflow-hidden bg-[#f9fafb]" style={{ border: '1px solid #e5e7eb' }}>
                    <div className="absolute inset-0 bg-islamic-pattern pointer-events-none" />
                    <div className="relative z-10 p-8 sm:p-12">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
                            <div>
                                <p className="label-mono mb-2 text-[#065f46]">{"// Resources"}</p>
                                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]" style={{ letterSpacing: '-0.02em' }}>
                                    Digital Resource Center
                                </h3>
                            </div>
                            <p className="label-mono text-[#9ca3af]">Fast Access Hub</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            {resources.map((res, i) => (
                                <Link
                                    key={i}
                                    href={res.href}
                                    className="group relative bg-white p-7 border border-[#e5e7eb] transition-all duration-700 [transition-timing-function:cubic-bezier(0.19,1,0.22,1)] hover:border-[#065f46] hover:shadow-[0_20px_40px_-15px_rgba(5,150,105,0.12)] hover:-translate-y-2 active:scale-[0.98] overflow-hidden"
                                >
                                    {/* Premium Hover Background Sweep */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="p-3 bg-emerald-50 text-[#065f46] transition-all duration-700 [transition-timing-function:cubic-bezier(0.19,1,0.22,1)] group-hover:bg-[#065f46] group-hover:text-white group-hover:rotate-[8deg] group-hover:scale-110">
                                                {res.icon}
                                            </div>
                                            <ArrowRight size={16} className="text-[#d1d5db] group-hover:text-[#065f46] transition-all duration-700 transform group-hover:translate-x-1" />
                                        </div>
                                        <h4 className="text-lg font-bold text-[#111827] mb-1.5 group-hover:text-[#065f46] transition-colors duration-500 tracking-tight">{res.title}</h4>
                                        <p className="text-xs text-[#6b7280] mb-5 font-medium">{res.label}</p>
                                        <div className="flex items-center gap-2 overflow-hidden h-4">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#065f46] translate-y-6 group-hover:translate-y-0 transition-all duration-700 [transition-timing-function:cubic-bezier(0.19,1,0.22,1)]">
                                                {res.action}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default About
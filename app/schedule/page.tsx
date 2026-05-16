"use client"

import React, { useEffect, useState, useMemo } from "react"
import { client } from "@/sanity/lib/client"
import { getAllSchedulesQuery } from "@/sanity/lib/queries"
import { GraduationCap, Clock, Calendar, ChevronRight, Search, Coffee, Zap } from "lucide-react"
import NavBar from "@/components/NavBar/NavBar"
import Footer from "@/components/Footer/Footer"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

type Period = { subject: string; time: string }
type Day = { day: string; periods: Period[] }
type ScheduleDoc = { className: string; days: Day[] }

async function fetchSchedules(): Promise<ScheduleDoc[]> {
  return await client.fetch(getAllSchedulesQuery)
}

const SchedulePage = () => {
  const [schedules, setSchedules] = useState<ScheduleDoc[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeClass, setActiveClass] = useState<string | null>(null)

  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchSchedules()
      .then((res) => {
        if (!mounted) return
        const sorted = (res || []).sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }))
        setSchedules(sorted)
        if (sorted.length > 0) setActiveClass(sorted[0].className)
        setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message || "Failed to load schedules")
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const currentSchedule = useMemo(() => {
    return schedules?.find(s => s.className === activeClass)
  }, [schedules, activeClass])

  const isBreak = (subject: string) => {
    const s = subject.toLowerCase()
    return s.includes("break") || s.includes("lunch") || s.includes("recess") || s.includes("waqfa")
  }

  return (
    <div className="bg-[#fcfcfc] min-h-screen font-outfit selection:bg-neutral-200 selection:text-black">
      <NavBar />

      <main className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-2 text-neutral-400 text-xs mb-3">
              <span className="hover:text-black cursor-pointer transition-colors">Home</span>
              <ChevronRight size={12} />
              <span className="text-neutral-900 font-medium">Academic Schedule</span>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 mb-3">
                  Class Timetable
                </h1>
                <p className="text-neutral-500 max-w-lg text-base leading-relaxed font-normal">
                  Real-time academic schedules for the 2025-26 session.
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={12} />
                  Session 2025-26
                </div>
              </div>
            </div>
          </motion.div>

          {/* Class Selector Tabs */}
          {!loading && schedules && schedules.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap gap-2 mb-10 border-b border-neutral-100 pb-6"
            >
              {schedules.map((s) => (
                <button
                  key={s.className}
                  onClick={() => setActiveClass(s.className)}
                  className={cn(
                    "px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border",
                    activeClass === s.className
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                      : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400 hover:text-neutral-800"
                  )}
                >
                  {s.className !== "SSCI" && s.className !== "SSCII" ? "Class " : ""}
                  {s.className}
                </button>
              ))}
            </motion.div>
          )}

          {/* Content Area */}
          <div className="relative min-h-[400px]">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-48 bg-neutral-50 animate-pulse rounded-2xl border border-neutral-100" />
                  ))}
                </motion.div>
              ) : error ? (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-neutral-50 border border-neutral-100 text-neutral-600 p-10 rounded-3xl text-center"
                >
                  <p className="font-semibold mb-1 text-sm">Error Loading Schedule</p>
                  <p className="text-xs opacity-70">{error}</p>
                </motion.div>
              ) : currentSchedule ? (
                <motion.div 
                  key={activeClass}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="grid grid-cols-1 gap-10"
                >
                  {currentSchedule.days.map((day, dIdx) => (
                    <div key={dIdx}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight",
                          day.day === today 
                            ? "bg-neutral-900 text-white shadow-sm" 
                            : "bg-neutral-100 text-neutral-600"
                        )}>
                          {day.day}
                          {day.day === today && <span className="ml-2 text-[8px] opacity-70 uppercase tracking-tighter">Today</span>}
                        </div>
                        <div className="flex-1 h-[1px] bg-neutral-100" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {day.periods.map((period, pIdx) => {
                          const isBreakPeriod = isBreak(period.subject)
                          
                          return (
                            <motion.div
                              whileHover={{ y: -2 }}
                              key={pIdx}
                              className={cn(
                                "p-5 rounded-2xl transition-all duration-300 border relative",
                                isBreakPeriod 
                                  ? "bg-amber-50/50 border-amber-200/40" 
                                  : "bg-white border-neutral-100 hover:border-neutral-300"
                              )}
                            >
                              <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-3">
                                  <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-wider",
                                    isBreakPeriod ? "text-amber-600" : "text-neutral-400"
                                  )}>
                                    Period {pIdx + 1}
                                  </span>
                                  {isBreakPeriod && <Coffee size={12} className="text-amber-500" />}
                                </div>

                                <h3 className={cn(
                                  "text-base font-semibold mb-3 tracking-tight",
                                  isBreakPeriod ? "text-amber-900" : "text-neutral-900"
                                )}>
                                  {period.subject}
                                </h3>

                                <div className={cn(
                                  "mt-auto flex items-center gap-2 px-2.5 py-1 rounded-lg w-fit",
                                  isBreakPeriod ? "bg-amber-100/50 text-amber-700" : "bg-neutral-50 text-neutral-500"
                                )}>
                                  <Clock size={12} className={isBreakPeriod ? "text-amber-500" : "text-neutral-400"} />
                                  <span className="text-[11px] font-medium tracking-tight">{period.time}</span>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-neutral-50 border border-dashed border-neutral-200 rounded-3xl"
                >
                  <Search className="mx-auto text-neutral-300 mb-4" size={40} strokeWidth={1} />
                  <p className="text-neutral-400 font-medium text-sm">No schedule for this class.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default SchedulePage

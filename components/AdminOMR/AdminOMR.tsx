'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileDigit, Users, Search, FileDown, CheckSquare, Loader2, 
  ArrowLeft, ChevronDown, User, BookOpen, X
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useSession } from '@/context/SessionContext'
import { client } from '@/sanity/lib/client'
import { getAllStudentsQuery } from '@/sanity/lib/queries'

type TargetType = 'blank' | 'class' | 'single'

type StudentType = {
  _id: string
  fullName: string
  grNumber?: string
  rollNumber?: string
  admissionFor?: string
  fatherName?: string
  gender?: string
}

export default function AdminOMR() {
  const { sessions, isSessionLocked } = useSession()
  
  const [mounted, setMounted] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Session & Target State
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [targetType, setTargetType] = useState<TargetType>('class')
  const [className, setClassName] = useState('')
  const [classOptions, setClassOptions] = useState<string[]>([])
  
  // Students
  const [allStudents, setAllStudents] = useState<StudentType[]>([])
  const [studentId, setStudentId] = useState('')
  const [studentFilter, setStudentFilter] = useState('')

  // OMR Config
  const [questionCount, setQuestionCount] = useState<number>(50)
  const [optionsCount, setOptionsCount] = useState<4 | 5>(4)
  const [examName, setExamName] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [examDate, setExamDate] = useState('')

  // Unlocked sessions only
  const unlockedSessions = sessions.filter(s => !isSessionLocked(s))

  useEffect(() => {
    setMounted(true)
    if (unlockedSessions.length > 0) {
      setSelectedSession(unlockedSessions[0])
    }
  }, [sessions])

  useEffect(() => {
    if (!selectedSession) return
    setLoadingStudents(true)
    setAllStudents([])
    setStudentId('')
    setClassName('')

    const fetchData = async () => {
      try {
        const data: StudentType[] = await client.fetch(getAllStudentsQuery, { session: selectedSession, gender: null })
        setAllStudents(data)
        // Extract unique classes
        const classes = [...new Set(data.map(s => s.admissionFor).filter(Boolean) as string[])].sort()
        setClassOptions(classes)
      } catch (err) {
        console.error(err)
        toast.error('Failed to load student data.')
      } finally {
        setLoadingStudents(false)
      }
    }
    fetchData()
  }, [selectedSession])

  const filteredStudents = allStudents
    .filter(s => {
      const q = studentFilter.trim().toLowerCase()
      if (!q) return true
      return (
        (s.rollNumber || '').toLowerCase().includes(q) ||
        (s.grNumber || '').toLowerCase().includes(q) ||
        (s.fullName || '').toLowerCase().includes(q)
      )
    })
    .slice(0, 100)

  const handleGenerate = async () => {
    const count = Math.min(50, Math.max(1, questionCount))
    if (!selectedSession) { toast.error('Please select a session.'); return }

    let targetStudents: StudentType[] = []

    if (targetType === 'blank') {
      targetStudents = [{ _id: 'blank', fullName: '', grNumber: '', rollNumber: '', admissionFor: '', fatherName: '' }]
    } else if (targetType === 'class') {
      if (!className) { toast.error('Please select a class.'); return }
      targetStudents = allStudents.filter(s => s.admissionFor === className)
        .sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || '', undefined, { numeric: true }))
      if (targetStudents.length === 0) { toast.error('No students found in selected class.'); return }
    } else if (targetType === 'single') {
      if (!studentId) { toast.error('Please select a student.'); return }
      const s = allStudents.find(s => s._id === studentId)
      if (!s) { toast.error('Student not found.'); return }
      targetStudents = [s]
    }

    setExporting(true)
    toast.loading(`Generating OMR sheets for ${targetStudents.length} student(s)...`, { id: 'omr-gen' })

    try {
      const { generateOMRPdf } = await import('./generateOMRPdf')
      await generateOMRPdf(targetStudents, count, optionsCount, targetType !== 'blank', selectedSession, examName, subjectName, examDate)
    } catch (e) {
      console.error(e)
      toast.error('Failed to generate PDF. See console for details.', { id: 'omr-gen' })
    } finally {
      setExporting(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">

        {/* ─── Header ─── */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 -ml-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
                <FileDigit size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">OMR Sheet Generator</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Generate professional optical mark recognition sheets for exams.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ─── Left Panel: Session + Target ─── */}
          <div className="lg:col-span-5 space-y-4">

            {/* Session Selector */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={15} className="text-blue-500" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Session</h2>
              </div>
              <div className="relative">
                <select
                  value={selectedSession}
                  onChange={e => setSelectedSession(e.target.value)}
                  className="w-full appearance-none bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 pr-10 text-sm font-semibold focus:ring-2 focus:ring-pink-500 outline-none"
                >
                  <option value="">Select Session</option>
                  {unlockedSessions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>
              {unlockedSessions.length === 0 && (
                <p className="text-xs text-amber-500 mt-2 font-medium">No unlocked sessions available. Unlock a session from the Admin Dashboard.</p>
              )}
            </motion.div>

            {/* Target Selector */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-5"
            >
              <div className="flex items-center gap-2">
                <Users size={15} className="text-blue-500" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Target</h2>
              </div>

              {/* Target type tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                {(['blank', 'class', 'single'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTargetType(t)}
                    className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${targetType === t
                      ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                  >
                    {t === 'blank' ? 'Blank' : t === 'class' ? 'By Class' : 'Single'}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {targetType === 'blank' && (
                  <motion.div key="blank" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center">
                    <p className="text-sm text-neutral-500">A universal blank OMR template will be generated without any student-specific data.</p>
                  </motion.div>
                )}

                {targetType === 'class' && (
                  <motion.div key="class" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Class</label>
                      <div className="relative">
                        <select
                          value={className}
                          onChange={e => setClassName(e.target.value)}
                          disabled={loadingStudents}
                          className="w-full appearance-none bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 pr-10 text-sm font-semibold focus:ring-2 focus:ring-pink-500 outline-none disabled:opacity-50"
                        >
                          <option value="">Select Class</option>
                          {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                      </div>
                    </div>
                    {className && (
                      <p className="text-xs text-neutral-500 font-medium">
                        {loadingStudents ? 'Counting...' : `${allStudents.filter(s => s.admissionFor === className).length} students will receive individual OMR sheets in one PDF.`}
                      </p>
                    )}
                  </motion.div>
                )}

                {targetType === 'single' && (
                  <motion.div key="single" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Search Student</label>
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          value={studentFilter}
                          onChange={e => setStudentFilter(e.target.value)}
                          placeholder="Search by name, roll, or GR..."
                          className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-pink-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <select
                        value={studentId}
                        onChange={e => setStudentId(e.target.value)}
                        disabled={loadingStudents}
                        className="w-full appearance-none bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 pr-10 text-sm font-semibold focus:ring-2 focus:ring-pink-500 outline-none disabled:opacity-50"
                      >
                        <option value="">{loadingStudents ? 'Loading...' : 'Select Student'}</option>
                        {filteredStudents.map(s => (
                          <option key={s._id} value={s._id}>
                            {s.fullName} — Roll {s.rollNumber || '—'} (GR: {s.grNumber || '—'})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* ─── Right Panel: OMR Config + Generate ─── */}
          <div className="lg:col-span-7 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-2">
                <CheckSquare size={15} className="text-pink-500" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">OMR Configuration</h2>
              </div>

              {/* Exam & Subject Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Exam Name</label>
                  <input
                    value={examName}
                    onChange={e => setExamName(e.target.value)}
                    placeholder="e.g. Mid Term"
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Subject</label>
                  <input
                    value={subjectName}
                    onChange={e => setSubjectName(e.target.value)}
                    placeholder="e.g. Mathematics"
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Exam Date</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={e => setExamDate(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
              </div>

              {/* Question Count Slider + Input */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Number of Questions</label>
                  <span className="text-2xl font-black text-pink-600 dark:text-pink-400 tabular-nums">{questionCount}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={questionCount}
                  onChange={e => setQuestionCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer accent-pink-600"
                />
                <div className="flex justify-between text-xs text-neutral-400 font-medium mt-1">
                  <span>5</span>
                  <span>25</span>
                  <span>50</span>
                </div>
              </div>

              {/* Options per Question */}
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Options Per Question</label>
                <div className="grid grid-cols-2 gap-3">
                  {([4, 5] as const).map(n => (
                    <button
                      key={n}
                      onClick={() => setOptionsCount(n)}
                      className={`relative flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all font-bold text-sm ${optionsCount === n
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-500 hover:border-pink-300'}`}
                    >
                      <span className="text-xl mb-1">{n === 4 ? '🔵🔵🔵🔵' : '🔵🔵🔵🔵🔵'}</span>
                      <span>{n} Options</span>
                      <span className="text-xs font-normal mt-0.5 opacity-70">
                        {n === 4 ? 'A  B  C  D' : 'A  B  C  D  E'}
                      </span>
                      {optionsCount === n && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-pink-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sheet Preview Summary */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Sheet Preview</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Questions:</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{questionCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Options/Q:</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{optionsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Layout:</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{questionCount > 25 ? '2 Columns' : '1 Column'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Target:</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 capitalize">{targetType}</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-neutral-500">Student Info:</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{targetType === 'blank' ? 'Not included' : 'Name, Roll, GR, Class + QR'}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Generate Button */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onClick={handleGenerate}
              disabled={exporting || loadingStudents || !selectedSession}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white py-4 rounded-2xl font-bold text-base transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting
                ? <><Loader2 size={20} className="animate-spin" /> Generating PDF...</>
                : <><FileDown size={20} /> Generate & Download OMR PDF</>
              }
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}

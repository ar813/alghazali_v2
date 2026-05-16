"use client"

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { toast } from "sonner";
import { client } from '@/sanity/lib/client'
import { getAllStudentsQuery } from '@/sanity/lib/queries'
import type { Student } from '@/types/student'
import { RotateCw, ChevronLeft, Save, Trash2, Search } from 'lucide-react'
import { useSession } from '@/context/SessionContext'
import { useAuth } from '@/hooks/use-auth'

const classes = ['KG', '1', '2', '3', '4', '5', '6', '7', '8', 'SSCI', 'SSCII']

type Entry = {
  studentId: string
  studentName: string
  fatherName: string
  rollNumber: string
  grNumber: string
  className: string
  marks: (number | null)[]
  percentage: number
  grade: string
  remarks: string
}

const AdminResult = ({ 
  onLoadingChange,
  genderFilter
}: { 
  onLoadingChange?: (loading: boolean) => void,
  genderFilter?: "male" | "female"
}) => {
  const { selectedSession } = useSession()
  const { user } = useAuth()
  
  const [className, setClassName] = useState('')
  const [examTitle, setExamTitle] = useState('')
  const [subjectsCount, setSubjectsCount] = useState<number>(0)
  const [subjects, setSubjects] = useState<string[]>([])
  const [step, setStep] = useState<'setup' | 'table'>('setup')

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [availableClasses, setAvailableClasses] = useState<string[]>([])
  const [existingResults, setExistingResults] = useState<any[]>([])
  const [maxMarksPerSubject, setMaxMarksPerSubject] = useState<number>(100)
  const [minPassPercentage, setMinPassPercentage] = useState<number>(40)
  const [examTitles, setExamTitles] = useState<string[]>([])

  // Marks state: studentId -> number[]
  const [marksMap, setMarksMap] = useState<Record<string, (number | null)[]>>({})

  // Load classes available in Sanity (unique admissionFor values, session-aware)
  useEffect(() => {
    const loadClasses = async () => {
      if (!selectedSession) return
      try {
        const list = await client.fetch(
          "*[_type == 'student' && defined(admissionFor) && session == $session].admissionFor",
          { session: selectedSession }
        )
        const unique = Array.from(new Set((Array.isArray(list) ? list : []).map((v: any) => String(v))))
        // Sort using existing order fallback
        const order = (c: string) => {
          const idx = classes.indexOf(c)
          if (idx >= 0) return idx
          const n = parseInt(c, 10)
          return isNaN(n) ? 999 : n
        }
        unique.sort((a, b) => order(a) - order(b))
        setAvailableClasses(unique)
      } catch { }
    }
    loadClasses()
  }, [selectedSession])

  // Load students when class and step is table
  useEffect(() => {
    const load = async () => {
      if (step !== 'table' || !className || !selectedSession) return
      setLoading(true); onLoadingChange?.(true)
      try {
        // Fetch students for the class and session, and gender if filtered
        let query = `*[_type == "student" && admissionFor == $className && session == $session`
        if (genderFilter) query += ` && gender == $gender`
        query += `] | order(rollNumber asc)`
        
        const data: Student[] = await client.fetch(query, { 
          className, 
          session: selectedSession,
          gender: genderFilter 
        })
        
        const filtered = Array.isArray(data) ? data : []
        setStudents(filtered)
        
        // init marks map if empty
        const init: Record<string, (number | null)[]> = {}
        for (const s of filtered) { 
          init[s._id || s.grNumber] = Array.from({ length: subjects.length }, () => null) 
        }
        setMarksMap(prev => Object.keys(prev).length ? prev : init)
      } catch (err) {
        console.error("Failed to load students:", err)
      } finally { setLoading(false); onLoadingChange?.(false) }
    }
    load()
  }, [step, className, subjects.length, onLoadingChange, selectedSession, genderFilter])

  // Load existing saved results for given class and examTitle (when in table step)
  useEffect(() => {
    const loadExisting = async () => {
      if (step !== 'table' || !className || !examTitle.trim() || !selectedSession) { 
        setExistingResults([]); return 
      }
      try {
        const url = new URL('/api/exam-results', window.location.origin)
        url.searchParams.set('className', className)
        url.searchParams.set('examTitle', examTitle.trim())
        url.searchParams.set('session', selectedSession)
        if (genderFilter) url.searchParams.set('gender', genderFilter)
        
        const res = await fetch(url.toString())
        const j = await res.json()
        if (j?.ok && j.data?.students) {
          setExistingResults(j.data.students)
          // Hydrate marksMap if results exist
          const newMarks: Record<string, (number | null)[]> = {}
          j.data.students.forEach((sr: any) => {
            const sid = sr.student?._id || sr.grNumber
            if (sid) newMarks[sid] = sr.marks
          })
          if (Object.keys(newMarks).length > 0) {
            setMarksMap(prev => ({ ...prev, ...newMarks }))
          }
        } else {
          setExistingResults([])
        }
      } catch { setExistingResults([]) }
    }
    loadExisting()
  }, [step, className, examTitle, selectedSession, genderFilter])

  // Load all exam titles for the session (optionally filter by selected class)
  useEffect(() => {
    const loadTitles = async () => {
      if (!selectedSession) return
      try {
        const url = new URL('/api/exam-results', window.location.origin)
        url.searchParams.set('list', 'titles')
        if (className) url.searchParams.set('className', className)
        url.searchParams.set('session', selectedSession)
        
        const res = await fetch(url.toString())
        const j = await res.json()
        if (j?.ok) setExamTitles(j.titles || [])
      } catch { setExamTitles([]) }
    }
    loadTitles()
  }, [className, selectedSession])

  const canContinue = useMemo(() => {
    if (!className) return false
    if (!examTitle.trim()) return false
    if (!subjectsCount || subjectsCount < 1) return false
    if (subjects.length !== subjectsCount) return false
    if (subjects.some(s => !s.trim())) return false
    if (!maxMarksPerSubject || maxMarksPerSubject <= 0) return false
    if (minPassPercentage < 0 || minPassPercentage > 100) return false
    return true
  }, [className, examTitle, subjectsCount, subjects, maxMarksPerSubject, minPassPercentage])

  const handleSubjectsCount = (n: number) => {
    setSubjectsCount(n)
    setSubjects(prev => {
      const arr = [...prev]
      if (n > arr.length) {
        return [...arr, ...Array.from({ length: n - arr.length }, () => '')]
      } else {
        return arr.slice(0, n)
      }
    })
    // reset marks when count changes
    setMarksMap({})
  }

  const onChangeSubject = (idx: number, value: string) => {
    setSubjects(prev => prev.map((s, i) => i === idx ? value : s))
  }

  const entries: Entry[] = useMemo(() => {
    const gradeOf = (pct: number) => pct >= 85 ? 'A+' : pct >= 75 ? 'A' : pct >= 65 ? 'B' : pct >= 50 ? 'C' : pct >= minPassPercentage ? 'D' : 'F'
    const remarksOf = (pct: number) => pct >= minPassPercentage ? 'Pass' : 'Fail'

    const perMax = Math.max(1, Number(maxMarksPerSubject) || 100)
    const totalMax = subjects.length * perMax
    return students.map(s => {
      const id = s._id || s.grNumber
      const rowMarks = (marksMap[id] || Array.from({ length: subjects.length }, () => null))
      const obtained = rowMarks.reduce((acc: number, b: number | null) => acc + (b == null ? 0 : (Number(b) || 0)), 0)
      const pct = totalMax > 0 ? Math.round((obtained / totalMax) * 100) : 0
      return {
        studentId: s._id || '',
        studentName: s.fullName,
        fatherName: s.fatherName,
        rollNumber: s.rollNumber,
        grNumber: s.grNumber,
        className: s.admissionFor,
        marks: rowMarks,
        percentage: pct,
        grade: gradeOf(pct),
        remarks: remarksOf(pct),
      }
    })
  }, [students, marksMap, subjects.length, maxMarksPerSubject, minPassPercentage])

  const setMark = (studentKey: string, subjIndex: number, value: string) => {
    const perMax = Math.max(1, Number(maxMarksPerSubject) || 100)
    const n = value === '' ? null : Math.max(0, Math.min(perMax, Number(value) || 0))
    setMarksMap(prev => ({
      ...prev,
      [studentKey]: (prev[studentKey]
        ? prev[studentKey].map((v, i) => i === subjIndex ? (n as any) : v)
        : Array.from({ length: subjects.length }, (_, i) => i === subjIndex ? (n as any) : null))
    }))
  }

  const handleSave = async (studentToSave?: Entry) => {
    if (!subjects.length || !selectedSession) return
    setSaving(true)
    try {
      const token = await user?.getIdToken()
      // If studentToSave is provided, we save just that one, else save all non-empty ones
      const targetEntries = studentToSave ? [studentToSave] : entries.filter(e => e.marks.some(m => m !== null))
      
      if (targetEntries.length === 0) {
        toast.error("No marks entered to save")
        return
      }

      for (const entry of targetEntries) {
        const payload = {
          studentId: entry.studentId,
          className,
          examTitle: examTitle.trim(),
          maxMarksPerSubject,
          minPassPercentage,
          minMarksPerSubject: 0, // Default or add field if needed
          subjects,
          marks: entry.marks.map(m => m === null ? 0 : Number(m)),
          studentName: entry.studentName,
          fatherName: entry.fatherName,
          rollNumber: entry.rollNumber,
          grNumber: entry.grNumber,
          session: selectedSession
        }

        const res = await fetch('/api/exam-results', { 
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }, 
          body: JSON.stringify(payload) 
        })
        const j = await res.json()
        if (!res.ok || !j?.ok) throw new Error(j?.error || `Failed to save for ${entry.studentName}`)
      }

      toast.success(targetEntries.length > 1 ? 'All results saved' : 'Result saved')
      
      // Refresh existing results
      const url = new URL('/api/exam-results', window.location.origin)
      url.searchParams.set('className', className)
      url.searchParams.set('examTitle', examTitle.trim())
      url.searchParams.set('session', selectedSession)
      const fresh = await fetch(url.toString()).then(r => r.json())
      if (fresh?.ok && fresh.data?.students) setExistingResults(fresh.data.students)

    } catch (e: any) {
      toast.error(`Save failed: ${e?.message || e}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {step === 'setup' && (
        <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Class</label>
              <select value={className} onChange={e => setClassName(e.target.value)} className="w-full border rounded px-3 py-2">
                <option value="">Select Class</option>
                {(availableClasses.length ? availableClasses : classes).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Exam Title</label>
              <input value={examTitle} onChange={e => setExamTitle(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="e.g. Mid Term 2025" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">How many subjects?</label>
              <input type="number" min={1} max={15} value={subjectsCount || ''} onChange={e => handleSubjectsCount(Number(e.target.value))} className="w-full border rounded px-3 py-2" placeholder="e.g. 6" />
            </div>
            <div className="flex items-end">
              <button disabled={!canContinue} onClick={() => setStep('table')} className={`px-4 py-2 rounded ${canContinue ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>Continue</button>
            </div>
          </div>
          {subjectsCount > 0 && (
            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              {Array.from({ length: subjectsCount }).map((_, i) => (
                <div key={i}>
                  <label className="block text-xs text-gray-600 mb-1">Subject {i + 1}</label>
                  <input value={subjects[i] || ''} onChange={e => onChangeSubject(i, e.target.value)} className="w-full border rounded px-3 py-2" placeholder={`Subject ${i + 1} name`} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'table' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-50/50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Exam Mode</span>
                <span className="text-xs font-medium text-neutral-500">{selectedSession}</span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900">{examTitle}</h3>
              <p className="text-sm text-neutral-500">Class {className} • {subjects.length} Subjects</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setStep('setup')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-white border border-neutral-200 rounded-lg transition-colors shadow-sm">
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={() => { setMarksMap({}); toast.info("Marks cleared locally") }} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-white border border-neutral-200 rounded-lg transition-colors shadow-sm">
                <RotateCw size={16} /> Clear
              </button>
              <button 
                onClick={() => handleSave()} 
                disabled={saving || students.length === 0} 
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 rounded-lg transition-all shadow-sm shadow-neutral-200"
              >
                {saving ? <RotateCw size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>
          {loading ? (
            <div className="text-sm text-gray-500">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-sm text-gray-500">No students found for selected class.</div>
          ) : (
            <table className="min-w-[900px] text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-2">S#</th>
                  <th className="p-2">Student Name</th>
                  <th className="p-2">Father Name</th>
                  <th className="p-2">Roll No</th>
                  <th className="p-2">GR Number</th>
                  {subjects.map((s, i) => <th key={i} className="p-2">{s || `Subject ${i + 1}`}</th>)}
                  <th className="p-2">Percentage</th>
                  <th className="p-2">Grade</th>
                  <th className="p-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const sid = s._id || s.grNumber
                  const row = entries[idx]
                  const rowMarks = marksMap[sid] || Array.from({ length: subjects.length }, () => 0)
                  return (
                    <tr key={sid} className="border-b">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">{s.fullName}</td>
                      <td className="p-2">{s.fatherName}</td>
                      <td className="p-2">{s.rollNumber}</td>
                      <td className="p-2">{s.grNumber}</td>
                      {subjects.map((_, i) => (
                        <td key={i} className="p-1">
                          <input
                            type="number"
                            min={0}
                            max={maxMarksPerSubject}
                            value={rowMarks[i] == null ? '' : rowMarks[i]}
                            onChange={e => setMark(sid, i, e.target.value)}
                            className="w-20 border rounded px-2 py-1"
                          />
                        </td>
                      ))}
                      <td className="p-2">{row?.percentage ?? 0}%</td>
                      <td className="p-2">{row?.grade ?? '-'}</td>
                      <td className="p-2">{row?.remarks ?? '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <div className="p-4 border-t border-neutral-100 bg-neutral-50/30">
            <button
              onClick={async () => {
                if (!examTitle.trim() || !className || !selectedSession) return toast.error('Selection incomplete')
                if (!confirm(`Delete all results for "${examTitle}" in class "${className}" for session "${selectedSession}"?`)) return
                try {
                  const token = await user?.getIdToken()
                  const res = await fetch(`/api/exam-results?className=${encodeURIComponent(className)}&examTitle=${encodeURIComponent(examTitle)}&session=${encodeURIComponent(selectedSession)}`, { 
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                  })
                  const j = await res.json()
                  if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`)
                  setExistingResults([])
                  toast.success('Results deleted successfully')
                } catch (e: any) {
                  toast.error(`Delete failed: ${e?.message || e}`)
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition-colors"
            >
              <Trash2 size={14} /> Delete Entire Exam Set
            </button>
          </div>
          {/* Existing saved results for this Exam Title */}
          {!!existingResults.length && (
            <div className="mt-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Saved Results for "{examTitle}"</div>
              <div className="overflow-auto">
                <table className="min-w-[900px] text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="p-2">Student</th>
                      <th className="p-2">GR</th>
                      <th className="p-2">Roll</th>
                      {(existingResults[0]?.subjects || subjects).map((s: string, i: number) => <th key={i} className="p-2">{s || `S${i + 1}`}</th>)}
                      <th className="p-2">%</th>
                      <th className="p-2">Grade</th>
                      <th className="p-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingResults.map((r, idx) => (
                      <tr key={r._id || idx} className="border-b">
                        <td className="p-2">{r.studentName}</td>
                        <td className="p-2">{r.grNumber}</td>
                        <td className="p-2">{r.rollNumber}</td>
                        {(r.subjects || subjects).map((_: string, i: number) => (
                          <td key={i} className="p-2">{Number(r.marks?.[i] ?? 0)}</td>
                        ))}
                        <td className="p-2">{r.percentage}%</td>
                        <td className="p-2">{r.grade}</td>
                        <td className="p-2">{r.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Show result subsection (in setup step) */}
      {step === 'setup' && (
        <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">Show result</div>
          {examTitles.length === 0 ? (
            <div className="text-sm text-gray-500">No saved exam titles found.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {examTitles.map(title => (
                <button
                  key={title}
                  onClick={async () => {
                    if (!className || !selectedSession) { toast.error('Please select a Class first'); return }
                    try {
                      const url = new URL('/api/exam-results', window.location.origin)
                      url.searchParams.set('className', className)
                      url.searchParams.set('examTitle', title)
                      url.searchParams.set('session', selectedSession)
                      
                      const res = await fetch(url.toString())
                      const j = await res.json()
                      if (j?.ok && j.data) {
                        const cfg = j.data
                        const subs: string[] = Array.isArray(cfg?.subjects) ? cfg.subjects : []
                        if (subs.length > 0) {
                          setSubjects(subs)
                          setSubjectsCount(subs.length)
                        }
                        if (cfg?.maxMarksPerSubject) setMaxMarksPerSubject(Number(cfg.maxMarksPerSubject))
                        if (cfg?.minPassPercentage != null) setMinPassPercentage(Number(cfg.minPassPercentage))
                        setExamTitle(title)
                        setStep('table')
                      } else {
                        setExamTitle(title)
                        setStep('table')
                      }
                    } catch {
                      setExamTitle(title)
                      setStep('table')
                    }
                  }}
                  className="px-3 py-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-sm font-medium text-neutral-700 transition-colors"
                >
                  {title}
                </button>
              ))}
            </div>
          )}
          {/* Delete All button here too for convenience when a title is selected */}
          <div className="mt-3">
            <button
              onClick={async () => {
                if (!className || !examTitle.trim()) { toast.error('Select Class and Exam Title'); return }
                if (!confirm(`Delete all results for "${examTitle}" in class "${className}"?`)) return
                try {
                  const res = await fetch(`/api/results?className=${encodeURIComponent(className)}&examTitle=${encodeURIComponent(examTitle)}`, { method: 'DELETE' })
                  const j = await res.json().catch(() => ({}))
                  if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`)
                  setExistingResults([])
                  toast.success('Deleted')
                } catch (e: any) {
                  toast.error(`Delete failed: ${e?.message || e}`)
                }
              }}
              className="px-3 py-2 border border-red-300 text-red-700 rounded"
            >Delete All (This Exam)</button>
          </div>
          {/* Danger Zone: Delete ALL results in schema */}
          <div className="mt-6 border-t border-neutral-100 pt-4">
            <div className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2">Danger Zone</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  if (!confirm('Delete ALL Results for this session? This cannot be undone.')) return
                  try {
                    const token = await user?.getIdToken()
                    const res = await fetch(`/api/exam-results?all=true&session=${encodeURIComponent(selectedSession || '')}`, { 
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${token}` }
                    })
                    const j = await res.json()
                    if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`)
                    setExistingResults([])
                    setExamTitles([])
                    toast.success('All results for session deleted')
                  } catch (e: any) { toast.error(`Delete failed: ${e?.message || e}`) }
                }}
                className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition-colors"
              >Delete ALL Session Results</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminResult

import { Upload, Users, PieChart, BarChart2, Loader2, X, Search, FileDown, Image as ImageIcon, Database, Receipt, FolderArchive, LayoutGrid, Eye, Filter, User } from 'lucide-react'
import NextImage from 'next/image'
import StudentDetailModal from '../AdminStudents/StudentDetailModal'
import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from "sonner";
import { client } from '@/sanity/lib/client'
import { getAllStudentsQuery } from '@/sanity/lib/queries'
import { useSession } from '@/context/SessionContext'

type StudentType = {
  _id: string
  fullName: string
  gender?: string
  admissionFor?: string
  grNumber?: string
  rollNumber?: string
  photoUrl?: string
}

const AdminReports = ({ genderFilter, onLoadingChange }: { genderFilter?: string; onLoadingChange?: (loading: boolean) => void }) => {
  const { selectedSession } = useSession()
  const [students, setStudents] = useState<StudentType[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  // Modal to show lists for insights
  const [insightModal, setInsightModal] = useState<{ open: boolean; title: string; items: any[] }>({ open: false, title: '', items: [] })

  // VIP UI states
  const [insightSearch, setInsightSearch] = useState('')
  const [clickedStudent, setClickedStudent] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  type ExportTabType = 'data' | 'fees' | 'forms' | 'pictures'
  const [activeExportTab, setActiveExportTab] = useState<ExportTabType>('data')

  type TargetType = 'all' | 'class' | 'student'
  const [targetType, setTargetType] = useState<TargetType>('all')
  const [className, setClassName] = useState<string>('')
  const [studentId, setStudentId] = useState<string>('')
  const [studentQuickFilter, setStudentQuickFilter] = useState('')

  // Fee Export target state
  const [feeExporting, setFeeExporting] = useState(false)
  const [feeTargetType, setFeeTargetType] = useState<TargetType>('all')
  const [feeClassName, setFeeClassName] = useState<string>('')
  const [feeStudentId, setFeeStudentId] = useState<string>('')
  const [feeStudentQuickFilter, setFeeStudentQuickFilter] = useState('')

  // Student Form (PDF Zip) target state
  const [zipPreparing, setZipPreparing] = useState(false)
  const [formTargetType, setFormTargetType] = useState<TargetType>('all')
  const [formClassName, setFormClassName] = useState<string>('')
  const [formStudentId, setFormStudentId] = useState<string>('')
  const [formStudentQuickFilter, setFormStudentQuickFilter] = useState('')

  // Student Pictures target state
  const [picDownloading, setPicDownloading] = useState(false)
  const [picTargetType, setPicTargetType] = useState<TargetType>('all')
  const [picClassName, setPicClassName] = useState<string>('')
  const [picStudentId, setPicStudentId] = useState<string>('')
  const [picStudentQuickFilter, setPicStudentQuickFilter] = useState('')

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedSession) return
      setLoading(true)
      onLoadingChange?.(true)
      const data: StudentType[] = await client.fetch(getAllStudentsQuery, {
        session: selectedSession,
        gender: genderFilter || null
      })
      setStudents(data)
      setLoading(false)
      onLoadingChange?.(false)
    }
    fetchStudents()
  }, [onLoadingChange, selectedSession, genderFilter])

  const handleDownloadFormsZip = async () => {
    try {
      setZipPreparing(true)
      const toastId = toast.loading('Preparing forms ZIP...')

      let list: any[] = []
      if (formTargetType === 'all') list = students as any[]
      else if (formTargetType === 'class') list = (students as any[]).filter(s => (s.admissionFor || '') === formClassName)
      else if (formTargetType === 'student') list = (students as any[]).filter(s => s._id === formStudentId)

      if (list.length === 0) {
        toast.dismiss(toastId)
        toast.error('Koi student nahi mila.')
        setZipPreparing(false)
        return
      }

      const jsPDFMod: any = await import('jspdf')
      const { default: JSZip } = await import('jszip') as any
      const fileSaver = await import('file-saver')
      const saveAs = (fileSaver as any).default?.saveAs || (fileSaver as any).saveAs
      const zip = new JSZip()

      const fetchImageDataUrl = async (url: string): Promise<string | null> => {
        try {
          const res = await fetch(url, { cache: 'no-store' })
          if (!res.ok) return null
          const blob = await res.blob()
          const reader = new FileReader()
          return await new Promise((resolve) => {
            reader.onloadend = () => resolve(String(reader.result || ''))
            reader.readAsDataURL(blob)
          })
        } catch { return null }
      }

      const buildQrData = (s: any) => {
        const fields: Array<[string, any]> = [
          ['Name', s.fullName],
          ['Father Name', s.fatherName],
          ['GR No', s.grNumber],
          ['Roll No', s.rollNumber],
          ['Class', s.admissionFor],
          ['Phone', s.phoneNumber || s.whatsappNumber]
        ]
        return fields.map(([k, v]) => `${k}: ${v ?? ''}`).join('\n')
      }

      const getQrUrl = (s: any, size: number) => {
        const data = buildQrData(s)
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
      }

      const tintImageAlpha = async (dataUrl: string, alpha: number, drawW: number, drawH: number) => {
        return new Promise<string>((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              const cw = Math.max(1, Math.floor(drawW))
              const ch = Math.max(1, Math.floor(drawH))
              canvas.width = cw; canvas.height = ch
              const ctx = canvas.getContext('2d')
              if (!ctx) { resolve(dataUrl); return }
              ctx.clearRect(0, 0, cw, ch)
              ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
              const iw = img.naturalWidth || img.width
              const ih = img.naturalHeight || img.height
              const scale = Math.max(cw / iw, ch / ih)
              const dw = iw * scale
              const dh = ih * scale
              const dx = (cw - dw) / 2
              const dy = (ch - dh) / 2
              ctx.drawImage(img, dx, dy, dw, dh)
              resolve(canvas.toDataURL('image/png'))
            } catch {
              resolve(dataUrl)
            }
          }
          img.onerror = () => resolve(dataUrl)
          img.src = dataUrl
        })
      }

      let logoDataUrl = await fetchImageDataUrl('/logo.png')
      if (!logoDataUrl) logoDataUrl = await fetchImageDataUrl('/assets/logo.png')

      const classFolders: Record<string, any> = {}

      for (let i = 0; i < list.length; i++) {
        const s = list[i]
        
        if (i > 0 && i % 5 === 0) {
          toast.loading(`Generating PDFs: ${i}/${list.length}...`, { id: toastId })
        }

        const doc = new jsPDFMod.jsPDF({ unit: 'pt', format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 50
        const contentWidth = pageWidth - margin * 2
        const colGap = 20
        const colWidth = (contentWidth - colGap) / 2
        let y = margin + 10
        const lineH = 16
        const sectionGap = 25

        doc.setFillColor(83, 36, 42)
        doc.rect(margin, y - 5, contentWidth, 45, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(26)
        doc.text('Al Ghazali High School', pageWidth / 2, y + 20, { align: 'center' })
        doc.setFontSize(12)
        doc.text('Student Information Form', pageWidth / 2, y + 35, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        y += 60
        y += lineH * 2

        try {
          if (logoDataUrl) {
            const wmW = contentWidth * 0.6
            const wmH = (pageHeight - margin * 2) * 0.6
            const tint = await tintImageAlpha(logoDataUrl, 0.12, wmW, wmH)
            const wmX = margin + (contentWidth - wmW) / 2
            const wmY = margin + ((pageHeight - margin * 2) - wmH) / 2
              ; (doc as any).addImage(tint, 'PNG', wmX, wmY, wmW, wmH)
          }
        } catch { }

        let photoAdded = false
        let photoX = margin, photoY = y - 10, photoW = 67, photoH = 67
        try {
          const possibleUrl = (s as any).photoUrl || (s as any).imageUrl || (s as any).pictureUrl || (s as any).avatarUrl
          if (typeof possibleUrl === 'string' && /^https?:\/\//i.test(possibleUrl)) {
            const dataUrl = await fetchImageDataUrl(possibleUrl)
            if (dataUrl) {
              const imgW = 67, imgH = 67, imgX = margin, imgY = y - 10
              photoX = imgX; photoY = imgY; photoW = imgW; photoH = imgH
              doc.setDrawColor(83, 36, 42)
              doc.setLineWidth(2)
              doc.rect(imgX - 2, imgY - 2, imgW + 4, imgH + 4, 'S')
              const fmt = /\.png($|\?)/i.test(possibleUrl) ? 'PNG' : 'JPEG'
              try {
                (doc as any).addImage(dataUrl, fmt, imgX, imgY, imgW, imgH)
                photoAdded = true
              } catch { }
            }
          }
        } catch { }

        try {
          const qSize = 70
          const qUrl = getQrUrl(s, qSize)
          const qDataUrl = await fetchImageDataUrl(qUrl)
          if (qDataUrl) {
            const qx = pageWidth - margin - qSize
            const qy = photoY
              ; (doc as any).addImage(qDataUrl, 'PNG', qx, qy, qSize, qSize)
          }
        } catch { }

        const section = (title: string) => {
          doc.setFillColor(255, 202, 124)
          doc.setDrawColor(83, 36, 42)
          doc.setLineWidth(1)
          doc.rect(margin, y - 8, contentWidth, 28, 'FD')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(14)
          doc.setTextColor(83, 36, 42)
          doc.text(title, margin + 12, y + 8)
          doc.setTextColor(0, 0, 0)
          y += 35
        }

        const kvSingle = (label: string, value: any, startX: number, maxRightX: number) => {
          const x = startX
          const labelWidth = 80
          const adjustedWidth = Math.max(60, maxRightX - x)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.setTextColor(70, 70, 70)
          doc.text(label + ':', x, y)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(11)
          doc.setTextColor(0, 0, 0)
          const text = (value ?? '—').toString()
          const maxWidth = Math.max(40, adjustedWidth - labelWidth - 2)
          const wrapped = doc.splitTextToSize(text, maxWidth)
          doc.text(wrapped, x + labelWidth, y)
          const extra = Math.max(0, wrapped.length - 1) * 12
          y += 16 + extra
        }

        const kv = (label: string, value: any, col: 0 | 1) => {
          const x = margin + (col === 0 ? 0 : (colWidth + colGap))
          const withinPhotoBand = photoAdded && col === 1 && y <= (photoY + photoH)
          const rightLimitX = withinPhotoBand ? (photoX - 10) : (margin + contentWidth)
          const adjustedColWidth = Math.min(colWidth, Math.max(50, rightLimitX - x))
          const labelWidth = 110
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.setTextColor(70, 70, 70)
          doc.text(label + ':', x, y)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          doc.setTextColor(0, 0, 0)
          const text = (value ?? '—').toString()
          const maxWidth = Math.max(40, adjustedColWidth - labelWidth - 5)
          if (text.length > 25) {
            const wrappedText = doc.splitTextToSize(text, maxWidth)
            doc.text(wrappedText, x + labelWidth, y)
            if (wrappedText.length > 1) return Math.max(1, wrappedText.length - 1) * 12
          } else {
            doc.text(text, x + labelWidth, y, { maxWidth: maxWidth })
          }
          return 0
        }

        const renderPairs = (pairs: Array<[string, any]>) => {
          for (let i = 0; i < pairs.length; i += 2) {
            const h1 = kv(pairs[i][0], pairs[i][1], 0)
            let h2 = 0; if (pairs[i + 1]) h2 = kv(pairs[i + 1][0], pairs[i + 1][1], 1)
            y += 18 + Math.max(h1, h2)
          }
        }

        const summaryStartX = photoAdded ? (photoX + photoW + 18) : margin
        const summaryRightX = margin + contentWidth
        kvSingle('Full Name', (s as any).fullName, summaryStartX, summaryRightX)
        kvSingle('Roll Number', (s as any).rollNumber, summaryStartX, summaryRightX)
        kvSingle('Class', (s as any).admissionFor, summaryStartX, summaryRightX)
        kvSingle('GR Number', (s as any).grNumber, summaryStartX, summaryRightX)

        if (photoAdded) y = Math.max(y, photoY + photoH) + 20; else y += 10

        section('Personal Information')
        renderPairs([
          ["Father's Name", (s as any).fatherName],
          ['Father CNIC', (s as any).fatherCnic],
          ['Date of Birth', (s as any).dob ? new Date((s as any).dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''],
          ['Gender', (s as any).gender],
          ['Nationality', (s as any).nationality],
          ['Medical Condition', (s as any).medicalCondition],
        ])
        y += sectionGap

        section('Academic Information')
        renderPairs([
          ['Class', (s as any).admissionFor],
          ['Former Education', (s as any).formerEducation],
          ['Previous Institute', (s as any).previousInstitute],
          ['Last Exam %', (s as any).lastExamPercentage],
        ])
        y += sectionGap

        section('Contact Information')
        renderPairs([
          ['Email', (s as any).email],
          ['Phone', (s as any).phoneNumber],
          ['WhatsApp', (s as any).whatsappNumber],
          ['CNIC/B-Form', (s as any).cnicOrBform],
          ['Address', (s as any).address],
        ])
        y += sectionGap

        section('Guardian Information')
        renderPairs([
          ['Guardian Name', (s as any).guardianName],
          ['Guardian Contact', (s as any).guardianContact],
          ['Guardian CNIC', (s as any).guardianCnic],
          ['Guardian Relation', (s as any).guardianRelation],
        ])
        y += sectionGap

        const footerY = pageHeight - 20
        const now = new Date()
        const createdDate = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Karachi' })
        const createdTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' })
        const footerText = `Generated by IT Department - Al Ghazali High School | Created on ${createdDate} at ${createdTime} PKT`
        const sigY = Math.min(y + 60, footerY - 100)
        doc.setFillColor(255, 255, 255); doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5); doc.rect(margin, sigY - 15, contentWidth, 60, 'FD')

        const sigLineWidth = 140, sigGap = (contentWidth - sigLineWidth * 3) / 2
        const sigX1 = margin + 20, sigX2 = margin + sigLineWidth + sigGap, sigX3 = margin + (sigLineWidth + sigGap) * 2 - 20
        const actualSigY = sigY + 20
        doc.setDrawColor(0, 0, 0); doc.setLineWidth(1)
        doc.line(sigX1, actualSigY, sigX1 + sigLineWidth, actualSigY); doc.line(sigX2, actualSigY, sigX2 + sigLineWidth, actualSigY); doc.line(sigX3, actualSigY, sigX3 + sigLineWidth, actualSigY)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(0, 0, 0)
        const labelY = actualSigY + 15
        doc.text('Student Signature', sigX1 + sigLineWidth / 2, labelY, { align: 'center' })
        doc.text('Parent/Guardian Signature', sigX2 + sigLineWidth / 2, labelY, { align: 'center' })
        doc.text('Principal Signature', sigX3 + sigLineWidth / 2, labelY, { align: 'center' })
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(120, 120, 120)
        doc.text(footerText, pageWidth / 2, footerY, { align: 'center' })
        doc.setTextColor(0, 0, 0)

        const buffer = doc.output('arraybuffer')
        const className = (s.admissionFor || 'Unassigned').toUpperCase()
        if (!classFolders[className]) classFolders[className] = zip.folder(className)
        const safeName = ((s as any).fullName || 'student').toString().replace(/[^a-z0-9_\-]+/gi, '_').toUpperCase()
        classFolders[className].file(`${safeName}_FORM.pdf`, buffer)
      }

      zip.file("EXPORT_INFO.txt", `Al Ghazali High School - Bulk Form Export\nTotal Students: ${list.length}\nDate: ${new Date().toLocaleString()}`);

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const suffix = formTargetType === 'all' ? 'all' : formTargetType === 'class' ? `class_${formClassName}` : 'single'
      const zipName = `STUDENT_FORMS_${suffix}_${new Date().toISOString().split('T')[0]}.zip`
      saveAs(zipBlob, zipName)
      toast.success('Forms ZIP downloaded successfully!', { id: toastId })
    } catch (_e: any) {
      toast.dismiss(); toast.error(_e?.message || 'ZIP prepare karte hue error aaya')
    } finally {
      setZipPreparing(false)
    }
  }

  const handleDownloadPicturesZip = async () => {
    try {
      setPicDownloading(true)
      const toastId = toast.loading('Gathering student pictures...')

      let list: any[] = []
      if (picTargetType === 'all') list = students as any[]
      else if (picTargetType === 'class') list = (students as any[]).filter(s => (s.admissionFor || '') === picClassName)
      else if (picTargetType === 'student') list = (students as any[]).filter(s => s._id === picStudentId)

      const studentsWithPhotos = list.filter(s => !!(s.photoUrl || s.imageUrl))

      if (studentsWithPhotos.length === 0) {
        toast.dismiss(toastId)
        toast.error('Koi student images nahi milien.')
        setPicDownloading(false)
        return
      }

      const { default: JSZip } = await import('jszip') as any
      const fileSaver = await import('file-saver')
      const saveAs = (fileSaver as any).default?.saveAs || (fileSaver as any).saveAs
      const zip = new JSZip()

      const classFolders: Record<string, any> = {}

      const fetchImageAsBlob = async (url: string) => {
        try {
          const urlObj = new URL(url)
          urlObj.searchParams.set('fm', 'png')
          urlObj.searchParams.set('q', '80')
          const res = await fetch(urlObj.toString(), { cache: 'no-store' })
          if (!res.ok) return null
          return await res.blob()
        } catch { return null }
      }

      for (let i = 0; i < studentsWithPhotos.length; i++) {
        const s = studentsWithPhotos[i]
        
        if (i > 0 && i % 10 === 0) {
          toast.loading(`Zipping photos: ${i}/${studentsWithPhotos.length}...`, { id: toastId })
        }

        const url = s.photoUrl || s.imageUrl
        if (!url) continue
        const blob = await fetchImageAsBlob(url)
        if (blob) {
          const className = (s.admissionFor || 'Unassigned').toUpperCase()
          if (!classFolders[className]) classFolders[className] = zip.folder(className)
          
          const safeName = (s.fullName || 'student').toString().replace(/[^a-z0-9_\-]+/gi, '_').toUpperCase()
          const fileName = `${safeName}_${s.grNumber || s.rollNumber || s._id}.png`
          classFolders[className].file(fileName, blob)
        }
      }

      zip.file("PHOTO_INDEX.txt", `Al Ghazali High School\nPhoto Export: ${new Date().toLocaleString()}\nTotal: ${studentsWithPhotos.length}`);

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const suffix = picTargetType === 'all' ? 'all' : picTargetType === 'class' ? `class_${picClassName}` : 'single'
      const zipName = `STUDENT_PHOTOS_${suffix}_${new Date().toISOString().split('T')[0]}.zip`

      saveAs(zipBlob, zipName)
      toast.success('Pictures ZIP downloaded successfully!', { id: toastId })
    } catch (err: any) {
      toast.dismiss(); toast.error(err.message)
    } finally {
      setPicDownloading(false)
    }
  }

  const totals = useMemo(() => {
    const total = students.length
    const male = students.filter(s => s.gender === 'male').length
    const female = students.filter(s => s.gender === 'female').length
    return { total, male, female }
  }, [students])

  const classWise = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of students) {
      const key = s.admissionFor || '—'
      map.set(key, (map.get(key) || 0) + 1)
    }
    // sort by class label natural-ish
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [students])

  const classOptions = useMemo(() => {
    return Array.from(new Set(students.map(s => s.admissionFor).filter(Boolean))).sort() as string[]
  }, [students])

  // Extra insights and data quality metrics
  const insights = useMemo(() => {
    const total = students.length
    const uniqClasses = new Set<string>()
    let withEmail = 0, withWhatsapp = 0, withPhone = 0
    let medicalYes = 0
    let missingBForm = 0
    let missingGuardian = 0
    let missingGR = 0
    let withPhoto = 0
    let male = 0, female = 0
    const nationalityMap = new Map<string, number>()
    const classMap = new Map<string, number>()
    const ageBuckets = { '<5': 0, '5-7': 0, '8-10': 0, '11-13': 0, '14+': 0 } as Record<string, number>

    const ageFromDob = (dob: any) => {
      try {
        if (!dob) return null
        const d = new Date(dob)
        if (isNaN(d.getTime())) return null
        const diff = Date.now() - d.getTime()
        const years = diff / (365.25 * 24 * 60 * 60 * 1000)
        return Math.floor(years)
      } catch { return null }
    }

    for (const s of students as any[]) {
      const cls = (s.admissionFor || '—').toString()
      uniqClasses.add(cls)
      classMap.set(cls, (classMap.get(cls) || 0) + 1)

      const nat = (s.nationality || '—').toString().toLowerCase()
      nationalityMap.set(nat, (nationalityMap.get(nat) || 0) + 1)

      if (s.email) withEmail++
      if (s.whatsappNumber) withWhatsapp++
      if (s.phoneNumber) withPhone++
      if ((s.medicalCondition || '').toString().toLowerCase() === 'yes') medicalYes++
      if (!s.cnicOrBform) missingBForm++
      if (!s.guardianName || !s.guardianContact) missingGuardian++
      if (!s.grNumber) missingGR++
      if (s.photoUrl || s.imageUrl) withPhoto++
      if ((s.gender || '').toString().toLowerCase() === 'male') male++
      if ((s.gender || '').toString().toLowerCase() === 'female') female++

      const age = ageFromDob(s.dob)
      if (age == null) {/* ignore */ }
      else if (age < 5) ageBuckets['<5']++
      else if (age <= 7) ageBuckets['5-7']++
      else if (age <= 10) ageBuckets['8-10']++
      else if (age <= 13) ageBuckets['11-13']++
      else ageBuckets['14+']++
    }

    const topClasses = Array.from(classMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const topNationalities = Array.from(nationalityMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)

    return {
      total,
      uniqClassCount: uniqClasses.size,
      withEmail, withWhatsapp, withPhone,
      medicalYes,
      missingBForm,
      missingGuardian,
      missingGR,
      withPhoto,
      male, female,
      ageBuckets,
      topClasses,
      topNationalities,
    }
  }, [students])

  const loadExcel = async () => {
    try {
      const ExcelJS = await import('exceljs')
      return (ExcelJS as any).default || ExcelJS
    } catch (_e) {
      console.error('ExcelJS library could not be loaded:', _e);
      throw new Error('ExcelJS library could not be loaded. Please make sure it is installed.')
    }
  }

  // Build list for a selected insight key
  const getInsightItems = (key: string): any[] => {
    const list = students as any[]
    switch (key) {
      case 'Unique Classes': {
        const m = new Map<string, number>()
        for (const s of list) { const c = (s.admissionFor || '—').toString(); m.set(c, (m.get(c) || 0) + 1) }
        return Array.from(m.entries()).map(([cls, cnt]) => ({ _id: cls, fullName: `Class ${cls}`, count: cnt }))
      }
      case 'With Email':
        return list.filter(s => !!s.email)
      case 'With WhatsApp':
        return list.filter(s => !!s.whatsappNumber)
      case 'With Phone':
        return list.filter(s => !!s.phoneNumber)
      case 'Photos Available':
        return list.filter(s => !!(s.photoUrl || s.imageUrl))
      case 'Medical Record':
        return list.filter(s => String(s.medicalCondition || '').toLowerCase() === 'yes')
      case 'Missing B-Form':
        return list.filter(s => !s.cnicOrBform)
      case 'Missing Guardian':
        return list.filter(s => !s.guardianName || !s.guardianContact)
      case 'Missing GR':
        return list.filter(s => !s.grNumber)
      case 'Male':
        return list.filter(s => String(s.gender || '').toLowerCase() === 'male')
      case 'Female':
        return list.filter(s => String(s.gender || '').toLowerCase() === 'female')
      case 'Age <5': {
        const f = (s: any) => { const a = (s.dob ? Math.floor((Date.now() - new Date(s.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null); return a != null && a < 5 }
        return list.filter(f)
      }
      case 'Age 5-7': {
        const f = (s: any) => { const a = (s.dob ? Math.floor((Date.now() - new Date(s.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null); return a != null && a >= 5 && a <= 7 }
        return list.filter(f)
      }
      case 'Age 8-10': {
        const f = (s: any) => { const a = (s.dob ? Math.floor((Date.now() - new Date(s.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null); return a != null && a >= 8 && a <= 10 }
        return list.filter(f)
      }
      case 'Age 11-13': {
        const f = (s: any) => { const a = (s.dob ? Math.floor((Date.now() - new Date(s.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null); return a != null && a >= 11 && a <= 13 }
        return list.filter(f)
      }
      case 'Age 14+': {
        const f = (s: any) => { const a = (s.dob ? Math.floor((Date.now() - new Date(s.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null); return a != null && a >= 14 }
        return list.filter(f)
      }
      default:
        return []
    }
  }

  const handleExportExcel = async () => {
    try {
      setExporting(true)
      const toastId = toast.loading('Preparing data export...')

      // Filter students based on target
      let selected: any[] = []
      if (targetType === 'all') selected = students as any[]
      else if (targetType === 'class') selected = (students as any[]).filter(s => (s.admissionFor || '') === className)
      else if (targetType === 'student') selected = (students as any[]).filter(s => s._id === studentId)

      if (selected.length === 0) {
        toast.dismiss(toastId)
        toast.error('Koi data nahi mila export ke liye.')
        setExporting(false)
        return
      }

      const ExcelJS: any = await loadExcel()
      const fileSaver = await import('file-saver')
      const saveAs = (fileSaver as any).default?.saveAs || (fileSaver as any).saveAs

      const wb = new ExcelJS.Workbook()
      wb.creator = 'Al Ghazali IT Dept'
      wb.lastModifiedBy = 'Admin Portal'
      wb.created = new Date()
      
      const ws = wb.addWorksheet('Student Records')

      // Define columns with specific styling
      ws.columns = [
        { header: 'Picture', key: 'picture', width: 15 },
        { header: 'Full Name', key: 'fullName', width: 30 },
        { header: "Father's Name", key: 'fatherName', width: 30 },
        { header: 'Father CNIC', key: 'fatherCnic', width: 20 },
        { header: 'DOB', key: 'dob', width: 15 },
        { header: 'Roll No', key: 'rollNumber', width: 12 },
        { header: 'GR Number', key: 'grNumber', width: 15 },
        { header: 'Gender', key: 'gender', width: 12 },
        { header: 'Class', key: 'admissionFor', width: 15 },
        { header: 'Nationality', key: 'nationality', width: 18 },
        { header: 'Medical', key: 'medicalCondition', width: 12 },
        { header: 'CNIC/B-Form', key: 'cnicOrBform', width: 20 },
        { header: 'Email', key: 'email', width: 35 },
        { header: 'Phone', key: 'phoneNumber', width: 18 },
        { header: 'WhatsApp', key: 'whatsappNumber', width: 18 },
        { header: 'Address', key: 'address', width: 45 },
        { header: 'Former Edu', key: 'formerEducation', width: 15 },
        { header: 'Prev Institute', key: 'previousInstitute', width: 25 },
        { header: 'Last %', key: 'lastExamPercentage', width: 12 },
        { header: 'Guardian Name', key: 'guardianName', width: 25 },
        { header: 'Guardian Contact', key: 'guardianContact', width: 20 },
        { header: 'Guardian CNIC', key: 'guardianCnic', width: 20 },
        { header: 'Relation', key: 'guardianRelation', width: 15 },
      ]

      // Style headers
      const headerRow = ws.getRow(1)
      headerRow.height = 35
      headerRow.eachCell((cell: any) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF171717' } // Neutral-900
        }
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' },
          size: 11,
          name: 'Calibri'
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })

      // Helper to fetch image blob
      const fetchImageBlob = async (url: string) => {
        try {
          const res = await fetch(url + '?w=200&h=200&fit=crop', { cache: 'no-store' }); 
          if (!res.ok) return null;
          return await res.arrayBuffer();
        } catch {
          return null;
        }
      }

      toast.loading(`Processing ${selected.length} students...`, { id: toastId })

      for (let i = 0; i < selected.length; i++) {
        const student = selected[i];
        
        // Periodic update for large lists
        if (i > 0 && i % 10 === 0) {
          toast.loading(`Exporting: ${i}/${selected.length} students...`, { id: toastId })
        }

        const row = ws.addRow({
          picture: '', 
          fullName: (student.fullName || '').toUpperCase(),
          fatherName: (student.fatherName || '').toUpperCase(),
          fatherCnic: student.fatherCnic || '—',
          dob: student.dob ? new Date(student.dob).toLocaleDateString('en-GB') : '—',
          rollNumber: student.rollNumber || '—',
          grNumber: student.grNumber || '—',
          gender: (student.gender || '—').toUpperCase(),
          admissionFor: (student.admissionFor || '—').toUpperCase(),
          nationality: student.nationality || 'PAKISTANI',
          medicalCondition: student.medicalCondition || 'NO',
          cnicOrBform: student.cnicOrBform || '—',
          email: student.email || '—',
          phoneNumber: student.phoneNumber || '—',
          whatsappNumber: student.whatsappNumber || '—',
          address: student.address || '—',
          formerEducation: student.formerEducation || '—',
          previousInstitute: student.previousInstitute || '—',
          lastExamPercentage: student.lastExamPercentage || '—',
          guardianName: student.guardianName || '—',
          guardianContact: student.guardianContact || '—',
          guardianCnic: student.guardianCnic || '—',
          guardianRelation: student.guardianRelation || '—'
        })

        // Style the data row
        row.height = 65; // Tall enough for pictures
        row.eachCell((cell: any) => {
          cell.alignment = { vertical: 'middle', horizontal: cell.col === 2 || cell.col === 3 || cell.col === 16 ? 'left' : 'center' }
          cell.font = { size: 10, name: 'Calibri' }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD4D4D4' } },
            left: { style: 'thin', color: { argb: 'FFD4D4D4' } },
            bottom: { style: 'thin', color: { argb: 'FFD4D4D4' } },
            right: { style: 'thin', color: { argb: 'FFD4D4D4' } }
          }
        })

        // Embed Image
        const url = student.photoUrl || student.imageUrl;
        if (url) {
          const buffer = await fetchImageBlob(url);
          if (buffer) {
            const ext = url.toLowerCase().includes('png') ? 'png' : 'jpeg';
            const imageId = wb.addImage({
              buffer: buffer,
              extension: ext,
            });

            ws.addImage(imageId, {
              tl: { col: 0, row: i + 1 },
              ext: { width: 60, height: 60 },
              editAs: 'oneCell'
            });
          }
        }
      }

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      const suffix = targetType === 'all' ? 'all' : targetType === 'class' ? `class_${className}` : 'single'
      const fileName = `STUDENT_MASTER_DATA_${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`

      toast.success('Excel export completed!', { id: toastId })

      if (saveAs && typeof saveAs === 'function') saveAs(blob, fileName)
      else {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url; link.download = fileName; link.click();
        window.URL.revokeObjectURL(url)
      }
    } catch (_e: any) {
      toast.dismiss()
      toast.error(_e?.message || 'Excel export mein error aaya')
    } finally {
      setExporting(false)
    }
  }

  const handleExportFeesExcel = async () => {
    try {
      setFeeExporting(true)
      const toastId = toast.loading('Preparing Fee Records...')

      let selected: any[] = []
      if (feeTargetType === 'all') selected = students as any[]
      else if (feeTargetType === 'class') selected = (students as any[]).filter(s => (s.admissionFor || '') === feeClassName)
      else if (feeTargetType === 'student') selected = (students as any[]).filter(s => s._id === feeStudentId)

      if (selected.length === 0) {
        toast.dismiss(toastId)
        toast.error('Koi data nahi mila.')
        setFeeExporting(false)
        return
      }

      const ExcelJS: any = await loadExcel()
      const fileSaver = await import('file-saver')
      const saveAs = (fileSaver as any).default?.saveAs || (fileSaver as any).saveAs

      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Fee Status')

      ws.columns = [
        { header: 'Full Name', key: 'fullName', width: 30 },
        { header: 'GR Number', key: 'grNumber', width: 15 },
        { header: 'Roll No', key: 'rollNumber', width: 12 },
        { header: 'Class', key: 'admissionFor', width: 15 },
        { header: 'Monthly Fee', key: 'monthly', width: 15 },
        { header: 'Balance', key: 'balance', width: 15 },
        { header: 'Last Paid Date', key: 'lastPaid', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
      ]

      // Header styling
      const hr = ws.getRow(1)
      hr.height = 30
      hr.eachCell((c: any) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } } // Blue-500
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        c.alignment = { vertical: 'middle', horizontal: 'center' }
      })

      selected.forEach(s => {
        ws.addRow({
          fullName: (s.fullName || '').toUpperCase(),
          grNumber: s.grNumber || '—',
          rollNumber: s.rollNumber || '—',
          admissionFor: (s.admissionFor || '—').toUpperCase(),
          monthly: '0.00', // Template values
          balance: '0.00',
          lastPaid: '—',
          status: 'UP TO DATE'
        })
      })

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fileName = `FEE_RECORDS_${new Date().toISOString().split('T')[0]}.xlsx`

      toast.success('Fee records ready!', { id: toastId })
      saveAs(blob, fileName)
    } catch (err: any) {
      toast.dismiss(); toast.error(err.message)
    } finally {
      setFeeExporting(false)
    }
  }

  return (
    <div className="pb-20 space-y-6">
      {/* Premium Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Reports & Analytics</h2>
          <p className="text-sm text-neutral-500 font-medium mt-1">Comprehensive overview of school data and insights.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-100 dark:border-neutral-900 shadow-sm gap-4">
            <Loader2 className="animate-spin text-neutral-400" size={32} />
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Generating Statistics...</p>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm p-5 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between hover:shadow-md transition-all">
              <div>
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Total Students</p>
                <p className="text-3xl font-black text-neutral-900 dark:text-white">{totals.total.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                <Users size={24} strokeWidth={2.5} />
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm p-5 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between hover:shadow-md transition-all">
              <div>
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Male Students</p>
                <p className="text-3xl font-black text-neutral-900 dark:text-white">{totals.male.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                <PieChart size={24} strokeWidth={2.5} />
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm p-5 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between hover:shadow-md transition-all">
              <div>
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Female Students</p>
                <p className="text-3xl font-black text-neutral-900 dark:text-white">{totals.female.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-pink-50 dark:bg-pink-900/20 text-pink-600 rounded-xl">
                <PieChart size={24} strokeWidth={2.5} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Data Insights Grid */}
      <div className="bg-white dark:bg-neutral-950 rounded-2xl shadow-sm p-6 border border-neutral-200 dark:border-neutral-800 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
            <LayoutGrid size={18} strokeWidth={2.5} />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Quick Insights</h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 opacity-50 animate-pulse">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-24 bg-neutral-100 dark:bg-neutral-900 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Unique Classes', value: insights.uniqClassCount },
              { label: 'With Email', value: insights.withEmail },
              { label: 'With WhatsApp', value: insights.withWhatsapp },
              { label: 'With Phone', value: insights.withPhone },
              { label: 'Medical Record', value: insights.medicalYes },
              { label: 'Photos Available', value: insights.withPhoto },
              { label: 'Missing B-Form', value: insights.missingBForm, alert: insights.missingBForm > 0 },
              { label: 'Missing Guardian', value: insights.missingGuardian, alert: insights.missingGuardian > 0 },
              { label: 'Missing GR', value: insights.missingGR, alert: insights.missingGR > 0 },
              { label: 'Age <5', value: insights.ageBuckets['<5'] },
              { label: 'Age 5-7', value: insights.ageBuckets['5-7'] },
              { label: 'Age 8-10', value: insights.ageBuckets['8-10'] },
              { label: 'Age 11-13', value: insights.ageBuckets['11-13'] },
              { label: 'Age 14+', value: insights.ageBuckets['14+'] },
            ].map((metric) => (
              <button
                key={metric.label}
                onClick={() => {
                  const items = getInsightItems(metric.label)
                  setInsightSearch('') // Reset search on open
                  setInsightModal({ open: true, title: metric.label, items })
                }}
                className={`p-4 border rounded-xl text-left transition-all group ${metric.alert ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/10 dark:border-amber-900/50 dark:hover:bg-amber-900/30' : 'bg-neutral-50 border-neutral-200 hover:bg-white hover:border-neutral-300 dark:bg-neutral-900 dark:border-neutral-800 dark:hover:bg-neutral-800'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${metric.alert ? 'text-amber-700 dark:text-amber-500' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {metric.label}
                </div>
                <div className={`text-xl font-black ${metric.alert ? 'text-amber-900 dark:text-amber-400' : 'text-neutral-900 dark:text-white'}`}>
                  {metric.value}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Hub - Takes up 2 columns on large screens */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <FileDown size={18} className="text-neutral-400" /> Export Hub
            </h3>
            <p className="text-xs text-neutral-500 mt-1">Download specific records, forms, and fees directly.</p>
          </div>

          <div className="p-4 sm:p-6 flex-1 flex flex-col">
            {/* Tabs */}
            <div className="flex overflow-x-auto gap-2 pb-4 mb-4 border-b border-neutral-100 dark:border-neutral-800 hide-scrollbar">
              {[
                { id: 'data', icon: Database, label: 'Student Data' },
                { id: 'fees', icon: Receipt, label: 'Fee Records' },
                { id: 'forms', icon: FolderArchive, label: 'Student Forms' },
                { id: 'pictures', icon: ImageIcon, label: 'Pictures (ZIP)' },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeExportTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveExportTab(tab.id as ExportTabType)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${isActive ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800'}`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Tab Contents - Data */}
            {activeExportTab === 'data' && (
              <div className="space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Target</label>
                    <select value={targetType} onChange={e => setTargetType(e.target.value as TargetType)} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                      <option value="all">Whole School</option>
                      <option value="class">Specific Class</option>
                      <option value="student">Single Student</option>
                    </select>
                  </div>
                  {targetType === 'class' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Class</label>
                      <select value={className} onChange={e => setClassName(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Select Class</option>
                        {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                  {targetType === 'student' && (
                    <div className="sm:col-span-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Search & Select Student</label>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          value={studentQuickFilter}
                          onChange={e => setStudentQuickFilter(e.target.value)}
                          placeholder="Filter by Roll or GR"
                          className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <select value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Select Student</option>
                        {(students as any[])
                          .filter(s => {
                            const q = studentQuickFilter.trim().toLowerCase()
                            if (!q) return true
                            return String((s as any).rollNumber || '').toLowerCase().includes(q) || String((s as any).grNumber || '').toLowerCase().includes(q)
                          })
                          .slice()
                          .sort((a, b) => parseInt((a as any).rollNumber || '0') - parseInt((b as any).rollNumber || '0'))
                          .map(s => (
                            <option key={s._id} value={s._id}>
                              {(s as any).fullName} — {(s as any).grNumber} — Roll {(s as any).rollNumber}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="pt-4 mt-auto">
                  <button onClick={handleExportExcel} disabled={exporting || (targetType === 'class' && !className) || (targetType === 'student' && !studentId)} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50 transition-all shadow-sm">
                    {exporting ? <Loader2 className="animate-spin" size={16} /> : <FileDown size={16} />}
                    <span>{exporting ? 'Exporting Data...' : 'Export Excel Data'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab Contents - Fees */}
            {activeExportTab === 'fees' && (
              <div className="space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Target</label>
                    <select value={feeTargetType} onChange={e => setFeeTargetType(e.target.value as TargetType)} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="all">Whole School</option>
                      <option value="class">Specific Class</option>
                      <option value="student">Single Student</option>
                    </select>
                  </div>
                  {feeTargetType === 'class' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Class</label>
                      <select value={feeClassName} onChange={e => setFeeClassName(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Select Class</option>
                        {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                  {feeTargetType === 'student' && (
                    <div className="sm:col-span-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Search & Select Student</label>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          value={feeStudentQuickFilter}
                          onChange={e => setFeeStudentQuickFilter(e.target.value)}
                          placeholder="Filter by Roll or GR"
                          className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <select value={feeStudentId} onChange={e => setFeeStudentId(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Select Student</option>
                        {(students as any[])
                          .filter(s => {
                            const q = feeStudentQuickFilter.trim().toLowerCase()
                            if (!q) return true
                            return String((s as any).rollNumber || '').toLowerCase().includes(q) || String((s as any).grNumber || '').toLowerCase().includes(q)
                          })
                          .slice()
                          .sort((a, b) => parseInt((a as any).rollNumber || '0') - parseInt((b as any).rollNumber || '0'))
                          .map(s => (
                            <option key={s._id} value={s._id}>
                              {(s as any).fullName} — {(s as any).grNumber} — Roll {(s as any).rollNumber}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="pt-4 mt-auto">
                  <button onClick={handleExportFeesExcel} disabled={feeExporting || (feeTargetType === 'class' && !feeClassName) || (feeTargetType === 'student' && !feeStudentId)} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50 transition-all shadow-sm">
                    {feeExporting ? <Loader2 className="animate-spin" size={16} /> : <FileDown size={16} />}
                    <span>{feeExporting ? 'Preparing Fees...' : 'Export Fee Records'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab Contents - Forms */}
            {activeExportTab === 'forms' && (
              <div className="space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Target</label>
                    <select value={formTargetType} onChange={e => setFormTargetType(e.target.value as TargetType)} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="all">Whole School</option>
                      <option value="class">Specific Class</option>
                      <option value="student">Single Student</option>
                    </select>
                  </div>
                  {formTargetType === 'class' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Class</label>
                      <select value={formClassName} onChange={e => setFormClassName(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Select Class</option>
                        {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                  {formTargetType === 'student' && (
                    <div className="sm:col-span-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Search & Select Student</label>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          value={formStudentQuickFilter}
                          onChange={e => setFormStudentQuickFilter(e.target.value)}
                          placeholder="Filter by Roll or GR"
                          className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <select value={formStudentId} onChange={e => setFormStudentId(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Select Student</option>
                        {(students as any[])
                          .filter(s => {
                            const q = formStudentQuickFilter.trim().toLowerCase()
                            if (!q) return true
                            return String((s as any).rollNumber || '').toLowerCase().includes(q) || String((s as any).grNumber || '').toLowerCase().includes(q)
                          })
                          .slice()
                          .sort((a, b) => parseInt((a as any).rollNumber || '0') - parseInt((b as any).rollNumber || '0'))
                          .map(s => (
                            <option key={s._id} value={s._id}>
                              {(s as any).fullName} — {(s as any).grNumber} — Roll {(s as any).rollNumber}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="pt-4 mt-auto">
                  <button onClick={handleDownloadFormsZip} disabled={zipPreparing || (formTargetType === 'class' && !formClassName) || (formTargetType === 'student' && !formStudentId)} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50 transition-all shadow-sm">
                    {zipPreparing ? <Loader2 className="animate-spin" size={16} /> : <FolderArchive size={16} />}
                    <span>{zipPreparing ? 'Packaging PDFs...' : 'Download Student Forms (ZIP)'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab Contents - Pictures */}
            {activeExportTab === 'pictures' && (
              <div className="space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Target</label>
                    <select value={picTargetType} onChange={e => setPicTargetType(e.target.value as TargetType)} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="all">Whole School</option>
                      <option value="class">Specific Class</option>
                      <option value="student">Single Student</option>
                    </select>
                  </div>
                  {picTargetType === 'class' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Class</label>
                      <select value={picClassName} onChange={e => setPicClassName(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Select Class</option>
                        {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                  {picTargetType === 'student' && (
                    <div className="sm:col-span-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Search & Select Student</label>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          value={picStudentQuickFilter}
                          onChange={e => setPicStudentQuickFilter(e.target.value)}
                          placeholder="Filter by Roll or GR"
                          className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <select value={picStudentId} onChange={e => setPicStudentId(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Select Student</option>
                        {(students as any[])
                          .filter(s => {
                            const q = picStudentQuickFilter.trim().toLowerCase()
                            if (!q) return true
                            return String((s as any).rollNumber || '').toLowerCase().includes(q) || String((s as any).grNumber || '').toLowerCase().includes(q)
                          })
                          .slice()
                          .sort((a, b) => parseInt((a as any).rollNumber || '0') - parseInt((b as any).rollNumber || '0'))
                          .map(s => (
                            <option key={s._id} value={s._id}>
                              {(s as any).fullName} — {(s as any).grNumber} — Roll {(s as any).rollNumber}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="pt-4 mt-auto">
                  <button onClick={handleDownloadPicturesZip} disabled={picDownloading || (picTargetType === 'class' && !picClassName) || (picTargetType === 'student' && !picStudentId)} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50 transition-all shadow-sm">
                    {picDownloading ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                    <span>{picDownloading ? 'Processing Images...' : 'Download Pictures (ZIP)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Class-wise Distribution Visualizer */}
        <div className="bg-white dark:bg-neutral-950 rounded-2xl shadow-sm p-6 border border-neutral-200 dark:border-neutral-800">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart2 size={18} className="text-blue-500" /> Class Distribution
          </h3>
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between py-1">
                    <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    <div className="h-3 w-8 bg-neutral-200 dark:bg-neutral-800 rounded" />
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-900 rounded-full mt-1" />
                </div>
              ))}
            </div>
          ) : classWise.length === 0 ? (
            <div className="text-sm text-neutral-500">No data available</div>
          ) : (
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
              {classWise.map(([cls, count]) => {
                const percentage = totals.total > 0 ? (count / totals.total) * 100 : 0;
                return (
                  <div key={cls} className="group">
                    <div className="flex items-center justify-between py-1 text-sm">
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">Class {cls}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400 text-xs">{percentage.toFixed(1)}%</span>
                        <span className="font-black text-neutral-900 dark:text-white">{count}</span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all group-hover:bg-blue-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Premium Insight List Modal / Data Table */}
      {mounted && insightModal.open && createPortal(
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label="Insight Details">
          <div className="bg-white dark:bg-neutral-950 rounded-2xl w-full max-w-5xl h-full sm:h-auto max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
                  <LayoutGrid size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">{insightModal.title}</h3>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{insightModal.items.length} records found</p>
                </div>
              </div>
              <button
                onClick={() => setInsightModal({ open: false, title: '', items: [] })}
                className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Table Toolbar */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search this list..."
                  value={insightSearch}
                  onChange={(e) => setInsightSearch(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                />
              </div>
              <button
                onClick={async () => {
                  // Generic local export for just this table
                  const toastId = toast.loading('Preparing table export...');
                  try {
                    const ExcelJS: any = await loadExcel();
                    const wb = new ExcelJS.Workbook();
                    const ws = wb.addWorksheet('Insight Data');

                    // Minimal columns
                    ws.columns = [
                      { header: 'Full Name', key: 'fullName', width: 25 },
                      { header: 'GR Number', key: 'grNumber', width: 15 },
                      { header: 'Roll No', key: 'rollNumber', width: 12 },
                      { header: 'Class', key: 'admissionFor', width: 15 },
                      { header: 'Phone', key: 'phoneNumber', width: 18 },
                    ];

                    // Style header
                    const hr = ws.getRow(1);
                    hr.eachCell((c: any) => {
                      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF171717' } };
                      c.alignment = { horizontal: 'center' };
                    });
                    
                    insightModal.items.forEach((s: any) => {
                      const r = ws.addRow({
                        fullName: (s.fullName || '').toUpperCase(),
                        grNumber: s.grNumber || '—',
                        rollNumber: s.rollNumber || '—',
                        admissionFor: (s.admissionFor || '—').toUpperCase(),
                        phoneNumber: s.phoneNumber || '—'
                      });
                      r.eachCell((c: any) => {
                         c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                      });
                    });

                    const buffer = await wb.xlsx.writeBuffer();
                    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const fileSaver = await import('file-saver');
                    const saveAs = (fileSaver as any).default?.saveAs || (fileSaver as any).saveAs;

                    const safeTitle = insightModal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const fileName = `insight_${safeTitle}_${new Date().toISOString().split('T')[0]}.xlsx`;

                    if (saveAs && typeof saveAs === 'function') saveAs(blob, fileName);
                    else {
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url; link.download = fileName; link.click();
                      window.URL.revokeObjectURL(url);
                    }
                    toast.success('List exported successfully!', { id: toastId });
                  } catch (err) {
                    toast.error('Export failed', { id: toastId });
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all shadow-sm"
              >
                <FileDown size={16} /> Export This List
              </button>
            </div>

            {/* Premium Data Table */}
            <div className="flex-1 overflow-auto bg-white dark:bg-neutral-950 custom-scrollbar">
              {insightModal.title === 'Unique Classes' ? (
                // Unique Classes Render (No full profiles)
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {insightModal.items.length === 0 ? <div className="p-8 text-center text-sm font-bold text-neutral-400">No data available</div> :
                    insightModal.items
                      .filter((it: any) => it.fullName.toLowerCase().includes(insightSearch.toLowerCase()))
                      .map((it: any) => (
                        <div key={it._id} className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                          <div className="font-bold text-neutral-900 dark:text-white">{it.fullName}</div>
                          <div className="px-3 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/20 rounded-full text-xs font-black">{it.count} Students</div>
                        </div>
                      ))}
                </div>
              ) : (
                // Standard Student Data Table
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-neutral-50 dark:bg-neutral-900 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 font-black text-neutral-500 uppercase tracking-widest text-[10px]">Student Name</th>
                      <th className="px-6 py-4 font-black text-neutral-500 uppercase tracking-widest text-[10px]">GR No</th>
                      <th className="px-6 py-4 font-black text-neutral-500 uppercase tracking-widest text-[10px]">Roll No</th>
                      <th className="px-6 py-4 font-black text-neutral-500 uppercase tracking-widest text-[10px]">Class</th>
                      <th className="px-6 py-4 font-black text-neutral-500 uppercase tracking-widest text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {insightModal.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Filter size={32} className="text-neutral-300" />
                            <span className="text-sm font-bold text-neutral-400">No students match this insight</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      insightModal.items
                        .filter((s: any) => {
                          const searchStr = `${s.fullName} ${s.grNumber} ${s.rollNumber} ${s.admissionFor}`.toLowerCase();
                          return searchStr.includes(insightSearch.toLowerCase());
                        })
                        .map((s: any) => (
                          <tr
                            key={s._id}
                            onClick={() => setClickedStudent(s)}
                            className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shrink-0">
                                  {s.photoUrl || s.imageUrl ? (
                                    <NextImage
                                      src={(s.photoUrl || s.imageUrl) + "?w=64&h=64&fit=crop"}
                                      alt={s.fullName}
                                      width={32}
                                      height={32}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User size={14} className="text-neutral-400" />
                                  )}
                                </div>
                                <span className="font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors">{s.fullName || '—'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-neutral-600 dark:text-neutral-400">{s.grNumber || '—'}</td>
                            <td className="px-6 py-4 font-semibold text-neutral-600 dark:text-neutral-400">{s.rollNumber || '—'}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-md text-[10px] font-black uppercase tracking-widest">
                                {s.admissionFor || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Profile Detail Modal Layer */}
      {mounted && clickedStudent && createPortal(
        <div className="fixed inset-0 z-[10000]">
          <StudentDetailModal
            student={clickedStudent}
            onClose={() => setClickedStudent(null)}
          />
        </div>,
        document.body
      )}

    </div>
  )
}

export default AdminReports
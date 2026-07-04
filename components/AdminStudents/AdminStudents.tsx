"use client"

import React, { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { RotateCw, Upload, Download, Search, Plus, ChevronRight, Lock, GraduationCap, ArrowUpDown, Check, ChevronDown, Settings, AlertCircle, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
// import { motion } from 'framer-motion'

import { client } from "@/sanity/lib/client";
import { getPaginatedStudentsQuery, getStudentsCountQuery, getAllClassesQuery, getStudentStatsQuery } from "@/sanity/lib/queries";
import type { Student } from '@/types/student';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { toast } from "sonner";

// New Components
import HeaderStats from './HeaderStats';
import StudentTable from './StudentTable';
import StudentGrid from './StudentGrid';
import StudentFormContent from './StudentFormContent';
import StudentDetailModal from './StudentDetailModal';
import SecurityConfirmationModal from './SecurityConfirmationModal';
import OTPVerificationModal from '@/components/Security/OTPVerificationModal';
import AccessDeniedDialog from '@/components/Auth/AccessDeniedDialog';
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Portal
} from "@chakra-ui/react"
import { useSession } from '@/context/SessionContext';


const AdminStudents = ({ onLoadingChange, genderFilter }: { onLoadingChange?: (loading: boolean) => void; genderFilter?: "male" | "female" }) => {
  const { isSuperAdmin } = useAuth();

  // Search/Filter state
  const [search, setSearch] = useState("")
  const [klass, setKlass] = useState<string>('All')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showFilter, setShowFilter] = useState(false)
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [clickedStudent, setClickedStudent] = useState<Student | null>(null); // For Details View
  const [showAddModal, setShowAddModal] = useState(false)
  const router = useRouter()
  const [editingStudent, setEditingStudent] = useState<Student | null>(null) // For Edit Modal

  // Loading States
  const [createLoading, setCreateLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Bulk Actions State
  const [, setImportLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const handleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleSelectAll = (ids: string[]) => {
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      } else {
        const next = new Set(prev);
        ids.forEach(id => next.add(id));
        return next;
      }
    });
  };

  const handleBulkDelete = async () => {
    if (!isSuperAdmin) { setShowAccessDenied(true); return; }
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Bulk delete failed');
      toast.success(`${json.deletedCount} student${json.deletedCount !== 1 ? 's' : ''} deleted`);
      if (json.blocked?.length > 0) toast.warning(`${json.blocked.length} could not be deleted (referenced)`);
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
      await refreshStudents();
    } catch (err: any) {
      toast.error(err.message || 'Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [showDeleteByClassConfirm, setShowDeleteByClassConfirm] = useState(false)
  const [deleteClassSelected, setDeleteClassSelected] = useState('1')
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Access Control Dialog State
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  // OTP Verification State
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpAction, setOtpAction] = useState<{ type: 'deleteAll' | 'deleteClass' | 'deleteSingle', label: string } | null>(null);

  const { user } = useAuth();


  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [sortKey, setSortKey] = useState<'fullName' | 'grNumber' | 'rollNumber' | 'admissionFor'>('admissionFor');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [stats, setStats] = useState({ total: 0, boys: 0, girls: 0, kg: 0 });
  const [fetchedClasses, setFetchedClasses] = useState<string[]>([]);

  // Load class options
  useEffect(() => {
    client.fetch(getAllClassesQuery).then((data: any[]) => {
      const set = new Set<string>()
      for (const s of data) {
        if (s.admissionFor) set.add(s.admissionFor)
      }
      setFetchedClasses(Array.from(set).sort())
    })
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, klass, pageSize, sortKey, sortDir])

  // Normalize Student Helper
  // Define this BEFORE usage in useEffect
  const normalizeStudent = (s: any): Student => {
    const str = (v: any) => {
      if (v === undefined || v === null) return ''
      if (typeof v === 'object') {
        return (v as any).text || (v as any).hyperlink || JSON.stringify(v)
      }
      return String(v)
    }
    return {
      _id: s._id,
      fullName: str(s.fullName),
      fatherName: str(s.fatherName),
      fatherCnic: str(s.fatherCnic),
      dob: str(s.dob),
      rollNumber: str(s.rollNumber),
      grNumber: str(s.grNumber),
      gender: str(s.gender),
      admissionFor: str(s.admissionFor),
      nationality: str(s.nationality),
      medicalCondition: str(s.medicalCondition),
      cnicOrBform: str(s.cnicOrBform),
      email: str(s.email),
      phoneNumber: str(s.phoneNumber),
      whatsappNumber: str(s.whatsappNumber),
      address: str(s.address),
      formerEducation: str(s.formerEducation),
      previousInstitute: str(s.previousInstitute),
      lastExamPercentage: str(s.lastExamPercentage),
      guardianName: str(s.guardianName),
      guardianContact: str(s.guardianContact),
      guardianCnic: str(s.guardianCnic),
      guardianRelation: str(s.guardianRelation),
      photoUrl: str(s.photoUrl),
    }
  }

  // useSession hook
  const { selectedSession } = useSession();

  useEffect(() => {
    // Wait for session to be ready
    if (!selectedSession) return;

    const fetchStudents = async () => {
      setLoading(true);
      onLoadingChange?.(true)
      try {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const params = { classFilter: klass, search: search, start, end, session: selectedSession, gender: genderFilter || null, sortKey, sortDir };

        const [data, count, statsData] = await Promise.all([
          client.fetch(getPaginatedStudentsQuery, params, { cache: 'no-store' }),
          client.fetch(getStudentsCountQuery, params, { cache: 'no-store' }),
          client.fetch(getStudentStatsQuery, params, { cache: 'no-store' })
        ]);

        setStudents(data.map(normalizeStudent));
        setTotalCount(count);
        setStats(statsData);
      } catch (_err) {
        console.error(_err)
      } finally {
        setLoading(false);
        onLoadingChange?.(false)
      }
    };

    // Debounce search slightly to avoid spamming API
    const timer = setTimeout(() => {
      fetchStudents();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLoadingChange, currentPage, pageSize, klass, search, selectedSession, genderFilter, sortKey, sortDir]); // Added sortKey & sortDir

  const refreshStudents = async () => {
    if (!selectedSession) return;
    setLoading(true)
    onLoadingChange?.(true)
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const params = { classFilter: klass, search: search, start, end, session: selectedSession, gender: genderFilter || null, sortKey, sortDir };

    const [data, count, statsData] = await Promise.all([
      client.fetch(getPaginatedStudentsQuery, params, { cache: 'no-store' }),
      client.fetch(getStudentsCountQuery, params, { cache: 'no-store' }),
      client.fetch(getStudentStatsQuery, params, { cache: 'no-store' })
    ]);
    setStudents(data.map(normalizeStudent))
    setTotalCount(count)
    setStats(statsData)
    setLoading(false)
    onLoadingChange?.(false)
  }

  const handleSort = (key: any) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }



  const uploadPhotoAndGetRef = async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch('/api/upload', { method: 'POST', body: form, headers: { 'Authorization': `Bearer ${token}` } })
    const json = await res.json()
    if (!json.ok) throw new Error(json.error || 'Upload failed')
    return { _type: 'image', asset: { _type: 'reference', _ref: json.assetId } }
  }

  // Handle Create (Called from StudentFormModal)
  const handleCreateStudent = async (data: any, photoFile: File | null) => {
    if (!isSuperAdmin) {
      setShowAccessDenied(true);
      return;
    }
    setCreateLoading(true)
    try {
      const body: any = { ...data, session: selectedSession } // Inject Session
      if (photoFile) {
        const imageRef = await uploadPhotoAndGetRef(photoFile)
        body.photo = imageRef
      }
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/students', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Create failed')

      setShowAddModal(false)
      toast.success('Student created successfully!')
      await refreshStudents()
    } catch (err) {
      console.error('Failed to create student', err)
      toast.error('Failed to create student')
    } finally {
      setCreateLoading(false)
    }
  }

  // Handle Update (Called from StudentFormModal)
  const handleUpdateStudent = async (data: any, photoFile: File | null) => {
    if (!editingStudent) return
    if (!isSuperAdmin) {
      setShowAccessDenied(true);
      return;
    }
    setEditLoading(true)
    try {
      const body: any = { ...data }
      if (photoFile) {
        const imageRef = await uploadPhotoAndGetRef(photoFile)
        body.photo = imageRef
      }

      // Clean up fields not in schema
      if ('photoUrl' in body) delete body.photoUrl
      if ('_id' in body) delete body._id
      if ('_updatedAt' in body) delete body._updatedAt
      if ('_createdAt' in body) delete body._createdAt
      if ('_type' in body) delete body._type
      if ('_rev' in body) delete body._rev

      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/students', {
        method: 'PATCH',
        body: JSON.stringify({ id: editingStudent._id, patch: body }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Update failed')

      setEditingStudent(null) // Close modal
      toast.success('Student updated successfully!')
      await refreshStudents()
    } catch (_error: any) {
      console.error('Failed to update student', _error)

      toast.error('Failed to update student')
    } finally {
      setEditLoading(false)
    }
  }
  const handleDeleteStudent = async (id: string) => {
    if (!isSuperAdmin) {
      setShowAccessDenied(true);
      return;
    }

    setDeleteLoadingId(id)
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/students', { 
        method: 'DELETE', 
        body: JSON.stringify({ id }), 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        } 
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        if (res.status === 409 && (json?.referencing || json?.blocked)) {
          const refs = (json.referencing || []).map((r: any) => `${r._type}:${r._id}`).join(', ')
          toast.error(`Cannot delete. Referenced by: ${refs || 'other documents'}`)
          return
        }
        throw new Error(json.error || 'Delete failed')
      }
      await refreshStudents()
      toast.success('Student deleted')
    } catch (err) {
      console.error('Failed to delete student', err)
      toast.error('Failed to delete student')
    } finally {
      setDeleteLoadingId(null)
      setConfirmDeleteId(null)
    }
  }

  // Handle Delete All
  const handleDeleteAll = async () => {
    if (!isSuperAdmin) {
      setShowDeleteAllConfirm(false); // Close confirmation if open
      setShowAccessDenied(true);
      return;
    }

    // Require OTP for "Wipe Directory"
    if (!showOTPModal && !otpAction) {
      setOtpAction({ type: 'deleteAll', label: 'Wipe Entire Student Directory' });
      setShowDeleteAllConfirm(false);
      setShowOTPModal(true);
      return;
    }

    setBulkActionLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/students?action=deleteAll&session=${encodeURIComponent(selectedSession || '')}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      const json = await res.json()

      if (!res.ok || !json.ok) throw new Error(json.error || 'Delete all failed')

      await refreshStudents()
      toast.success('All students deleted successfully')
      setShowDeleteAllConfirm(false)
      setShowOTPModal(false)
      setOtpAction(null)
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete all students')
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Handle Delete By Class
  const handleDeleteClass = async () => {
    if (!isSuperAdmin) {
      setShowDeleteByClassConfirm(false);
      setShowAccessDenied(true);
      return;
    }

    // Require OTP for "Clear Class Data"
    if (!showOTPModal && !otpAction) {
      setOtpAction({ type: 'deleteClass', label: `Delete All Students in Class ${deleteClassSelected}` });
      setShowDeleteByClassConfirm(false);
      setShowOTPModal(true);
      return;
    }

    setBulkActionLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/students?class=${deleteClassSelected}&session=${encodeURIComponent(selectedSession || '')}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': `Bearer ${token}` } 
      })
      const json = await res.json()

      if (!res.ok || !json.ok) throw new Error(json.error || 'Delete class failed')

      await refreshStudents()
      toast.success(`Class ${deleteClassSelected} students deleted`)
      setShowDeleteByClassConfirm(false)
      setShowOTPModal(false)
      setOtpAction(null)
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete class')
    } finally {
      setBulkActionLoading(false)
    }
  }


  // --- Excel Logic ---
  const loadExcel = async () => {
    try {
      const ExcelJS = await import('exceljs')

      return ExcelJS.default || ExcelJS
    } catch {
      throw new Error('ExcelJS library could not be loaded.')
    }
  }

  const handleExportExcel = async () => {
    try {
      if (students.length === 0) {
        toast.error('No students to export')
        return
      }
      const toastId = toast.loading('Exporting data with images...')
      const ExcelJS: any = await loadExcel()
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Students')

      // Setup columns
      ws.columns = [
        { header: 'Picture', key: 'picture', width: 12 },
        { header: 'Full Name', key: 'fullName', width: 25 },
        { header: "Father's Name", key: 'fatherName', width: 25 },
        { header: "Father CNIC", key: 'fatherCnic', width: 18 },
        { header: 'DOB', key: 'dob', width: 15 },
        { header: 'Roll No', key: 'rollNumber', width: 12 },
        { header: 'GR Number', key: 'grNumber', width: 15 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Class', key: 'admissionFor', width: 10 },
        { header: 'Nationality', key: 'nationality', width: 15 },
        { header: 'Medical', key: 'medicalCondition', width: 10 },
        { header: 'CNIC/B-Form', key: 'cnicOrBform', width: 18 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Phone', key: 'phoneNumber', width: 15 },
        { header: 'WhatsApp', key: 'whatsappNumber', width: 15 },
        { header: 'Address', key: 'address', width: 30 },
        { header: 'Former Edu', key: 'formerEducation', width: 12 },
        { header: 'Prev Institute', key: 'previousInstitute', width: 20 },
        { header: 'Last %', key: 'lastExamPercentage', width: 10 },
        { header: 'Guardian Name', key: 'guardianName', width: 20 },
        { header: 'Guardian Contact', key: 'guardianContact', width: 18 },
        { header: 'Guardian CNIC', key: 'guardianCnic', width: 18 },
        { header: 'Relation', key: 'guardianRelation', width: 12 },
        { header: 'Picture URL', key: 'photoUrl', width: 50 },
      ]

      const fetchImageBlob = async (url: string) => {
        try {
          const res = await fetch(url + '?w=200&h=200&fit=crop', { cache: 'no-store' });
          if (!res.ok) return null;
          return await res.arrayBuffer();
        } catch { return null; }
      }

      // Add rows
      for (let i = 0; i < students.length; i++) {
        if (i > 0 && i % 5 === 0) {
          const pct = Math.floor(((i + 1) / students.length) * 100);
          toast.loading(`Exporting data with images: ${pct}%...`, { id: toastId })
        }
        const student = students[i];
        const row = ws.addRow({
          picture: '',
          fullName: student.fullName,
          fatherName: student.fatherName,
          fatherCnic: (student as any).fatherCnic,
          dob: student.dob,
          rollNumber: student.rollNumber,
          grNumber: student.grNumber,
          gender: student.gender,
          admissionFor: student.admissionFor,
          nationality: student.nationality,
          medicalCondition: student.medicalCondition,
          cnicOrBform: student.cnicOrBform,
          email: student.email,
          phoneNumber: student.phoneNumber,
          whatsappNumber: student.whatsappNumber,
          address: student.address,
          formerEducation: student.formerEducation,
          previousInstitute: student.previousInstitute,
          lastExamPercentage: student.lastExamPercentage,
          guardianName: student.guardianName,
          guardianContact: student.guardianContact,
          guardianCnic: student.guardianCnic,
          guardianRelation: student.guardianRelation,
          photoUrl: student.photoUrl || ''
        })

        row.height = 60;
        const url = student.photoUrl;
        if (url) {
          const buffer = await fetchImageBlob(url);
          if (buffer) {
            const ext = url.toLowerCase().includes('png') ? 'png' : 'jpeg';
            const imageId = wb.addImage({ buffer, extension: ext });
            ws.addImage(imageId, {
              tl: { col: 0, row: i + 1 },
              br: { col: 1, row: i + 2 },
              editAs: 'oneCell'
            });
          }
        }
      }

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fileSaver = await import('file-saver')
      const saveAs = (fileSaver as any).default?.saveAs || (fileSaver as any).saveAs

      toast.dismiss(toastId)
      toast.success('Excel exported successfully!')

      if (saveAs && typeof saveAs === 'function') saveAs(blob, `students_export_${new Date().toISOString().split('T')[0]}.xlsx`)
      else {
        const link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.download = `students_export_${new Date().toISOString().split('T')[0]}.xlsx`
        link.click()
      }
    } catch {
      toast.dismiss()
      toast.error('Export failed')
    }
  }

  const fileInputRefId = 'students-import-input'
  const handleImportExcelClick = () => { document.getElementById(fileInputRefId)?.click() }
  const handleImportExcelFile = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!isSuperAdmin) {
      setShowAccessDenied(true);
      e.target.value = ''; // Reset input
      return;
    }
    const file = e.target.files?.[0]
    if (!file) return

    const toastId = toast.loading('Reading Excel file...');

    try {
      setImportLoading(true)
      const ExcelJS: any = await loadExcel()
      const wb = new ExcelJS.Workbook()
      const buf = await file.arrayBuffer()
      await wb.xlsx.load(buf)
      const ws = wb.worksheets[0]
      const rows: any[] = ws.getSheetValues() as any[]

      // Map images to rows (tl.row is 0-indexed)
      const imageMap: Record<number, any> = {};
      ws.getImages().forEach((img: any) => {
        const rowNum = Math.floor(img.range.tl.row) + 1; // Convert 0-indexed row to 1-indexed
        imageMap[rowNum] = wb.getImage(img.imageId);
      });

      const toCreate: any[] = []
      for (let i = 2; i < rows.length; i++) {
        const r: any = rows[i]
        if (!r) continue

        // Detect if first column is "Picture" placeholder or data
        // If Col 1 is empty or very short, and Col 2 has the name, we shift.
        // For our export: Col 1 = Picture, Col 2 = Full Name
        // In getSheetValues, r[1] is Col A, r[2] is Col B.
        const isNewFormat = r[1] === '' || r[1] === undefined || (typeof r[1] === 'string' && r[1].length < 2);
        const offset = isNewFormat ? 1 : 0;

        if (!r[1 + offset]) continue; // Skip if identity (name) is missing

        const s = (idx: number) => {
          const val = r[idx + offset];
          if (val === undefined || val === null) return '';
          if (typeof val === 'object') return val.text || JSON.stringify(val);
          return String(val || '');
        }

        toCreate.push({
          rowNumber: i,
          data: {
            fullName: s(1),
            fatherName: s(2),
            fatherCnic: s(3),
            dob: s(4),
            rollNumber: s(5),
            grNumber: s(6),
            gender: s(7) || 'male',
            admissionFor: s(8) || '1',
            nationality: s(9) || 'pakistani',
            medicalCondition: s(10) || 'no',
            cnicOrBform: s(11),
            email: s(12),
            phoneNumber: s(13),
            whatsappNumber: s(14),
            address: s(15),
            formerEducation: s(16),
            previousInstitute: s(17),
            lastExamPercentage: s(18),
            guardianName: s(19),
            guardianContact: s(20),
            guardianCnic: s(21),
            guardianRelation: s(22),
            session: selectedSession // Ensure session is injected
          }
        })
      }

      if (toCreate.length === 0) {
        toast.dismiss(toastId);
        toast.error('No valid student data found in Excel.');
        return;
      }

      let successCount = 0
      const token = await auth.currentUser?.getIdToken();

      for (let idx = 0; idx < toCreate.length; idx++) {
        const item = toCreate[idx];
        const pct = Math.floor(((idx + 1) / toCreate.length) * 100);
        toast.loading(`Importing student ${idx + 1} of ${toCreate.length} (${pct}%)...`, { id: toastId });

        try {
          const doc = item.data;

          // Check for image in this row
          const imgData = imageMap[item.rowNumber];
          if (imgData) {
            try {
              const blob = new Blob([imgData.buffer], { type: `image/${imgData.extension}` });
              const fileObj = new File([blob], `photo.${imgData.extension}`, { type: `image/${imgData.extension}` });
              const photoRef = await uploadPhotoAndGetRef(fileObj);
              doc.photo = photoRef;
            } catch (imgErr) {
              console.warn(`Failed to upload image for row ${item.rowNumber}`, imgErr);
            }
          }

          const res = await fetch('/api/students', {
            method: 'POST',
            body: JSON.stringify(doc),
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
          })
          const resJson = await res.json();
          if (resJson.ok) successCount++
        } catch (err) {
          console.error(`Error importing student at row ${item.rowNumber}`, err);
        }
      }

      toast.dismiss(toastId);
      await refreshStudents()
      toast.success(`Successfully imported ${successCount} of ${toCreate.length} students.`)
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(`Import failed: ${err.message || 'Unknown error'}`)
    } finally {
      setImportLoading(false)
      const input = document.getElementById(fileInputRefId) as HTMLInputElement;
      if (input) input.value = '';
    }
  }


  // No client-side filtering needed anymore, 'students' contains the page
  const filteredStudents = students;


  return (
    <div className="pb-20">

      <AccessDeniedDialog open={showAccessDenied} onOpenChange={setShowAccessDenied} />

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl shadow-2xl shadow-black/30 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-bold">
            {selectedIds.size} selected
          </span>
          <div className="w-px h-4 bg-white/20 dark:bg-neutral-900/20" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs font-semibold text-white/60 dark:text-neutral-900/60 hover:text-white dark:hover:text-neutral-900 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => setBulkDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
          >
            <Trash2 size={13} />
            Delete {selectedIds.size}
          </button>
        </div>
      )}

      {/* Bulk Delete Confirm Dialog */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !bulkDeleting && setBulkDeleteConfirm(false)} />
          <div className="relative w-full sm:max-w-sm bg-[#141414] border border-white/10 rounded-3xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="h-1 bg-gradient-to-r from-rose-600 to-red-500" />
            <div className="p-7 text-center space-y-4">
              <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 size={24} className="text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete {selectedIds.size} Students?</h3>
                <p className="text-sm text-neutral-400 mt-1 leading-relaxed">
                  This will permanently delete <span className="text-white font-semibold">{selectedIds.size} selected student{selectedIds.size !== 1 ? 's' : ''}</span>. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setBulkDeleteConfirm(false)} disabled={bulkDeleting} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-sm font-semibold transition-all">
                  Cancel
                </button>
                <button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20">
                  {bulkDeleting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting…</> : `Delete ${selectedIds.size}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <HeaderStats stats={stats} />

      <div className="bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900 p-3 rounded-none shadow-sm mb-6 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between transition-all sticky top-2 z-30">

        {/* Left Section: Search & Essential Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0 w-full lg:w-auto">
          <div className="relative group/search flex-1 min-w-0 w-full lg:max-w-[280px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <Search size={16} />
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-none focus:outline-none focus:border-blue-500 transition-all text-[13px] font-bold text-neutral-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative group/select flex-1 sm:w-36">
              <select
                value={klass}
                onChange={(e) => setKlass(e.target.value)}
                className="w-full px-4 py-2 pr-8 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-none focus:outline-none focus:border-blue-500 text-[12px] font-bold text-neutral-600 dark:text-neutral-400 appearance-none cursor-pointer transition-all uppercase tracking-wider"
              >
                <option value="All">All Classes</option>
                {fetchedClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>

            <Menu>
              <MenuButton className="p-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-none hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-neutral-500 hover:text-blue-600 flex items-center justify-center shadow-sm shrink-0" title="Sort Options">
                <ArrowUpDown size={16} />
              </MenuButton>
              <Portal>
                <MenuList className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-xl rounded-none p-2 z-[100]">
                  {[
                    { key: 'fullName', label: 'Full Name' },
                    { key: 'grNumber', label: 'GR Number' },
                    { key: 'rollNumber', label: 'Roll Number' },
                    { key: 'admissionFor', label: 'Class' },
                  ].map((option) => (
                    <MenuItem
                      key={option.key}
                      onClick={() => setSortKey(option.key as any)}
                      className="rounded-none px-4 py-2 text-[12px] font-bold text-neutral-600 dark:text-neutral-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-all flex items-center justify-between"
                    >
                      {option.label}
                      {sortKey === option.key && <Check size={12} className="text-blue-600" />}
                    </MenuItem>
                  ))}
                  <div className="my-1 h-px bg-neutral-50 dark:border-neutral-800" />
                  <div className="flex p-1 bg-neutral-50 dark:bg-neutral-800/50 rounded-none">
                    <button onClick={(e) => { e.stopPropagation(); setSortDir('asc'); }} className={`flex-1 py-1 text-[10px] font-black rounded-none ${sortDir === 'asc' ? 'bg-white dark:bg-neutral-700 text-blue-600 shadow-sm' : 'text-neutral-400'}`}>ASC</button>
                    <button onClick={(e) => { e.stopPropagation(); setSortDir('desc'); }} className={`flex-1 py-1 text-[10px] font-black rounded-none ${sortDir === 'desc' ? 'bg-white dark:bg-neutral-700 text-blue-600 shadow-sm' : 'text-neutral-400'}`}>DESC</button>
                  </div>
                </MenuList>
              </Portal>
            </Menu>
          </div>
        </div>

        {/* Right Section: Toolbox & Primary Actions */}
        <div className="flex flex-row flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-2 w-full lg:w-auto">

          <div className="flex items-center gap-1 bg-neutral-50 dark:bg-neutral-900/50 p-1 rounded-none border border-neutral-100 dark:border-neutral-800 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1">
              <button
                onClick={refreshStudents}
                className={`p-2 rounded-none hover:bg-white dark:hover:bg-neutral-800 text-neutral-400 hover:text-blue-600 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                title="Refresh"
              >
                <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>

              <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />

              <Menu>
                <MenuButton className="p-2 rounded-none hover:bg-white dark:hover:bg-neutral-800 text-neutral-500 hover:text-blue-600 transition-all" title="Toolbox">
                  <Settings size={18} />
                </MenuButton>
                <Portal>
                  <MenuList className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-xl rounded-none p-2 z-[100]">
                    <MenuItem onClick={handleExportExcel} className="rounded-none px-4 py-2 text-[12px] font-bold text-neutral-600 dark:text-neutral-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-all flex items-center gap-3">
                      <Download size={14} /> Export to Excel
                    </MenuItem>
                    <MenuItem onClick={handleImportExcelClick} className="rounded-none px-4 py-2 text-[12px] font-bold text-neutral-600 dark:text-neutral-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-all flex items-center gap-3">
                      <Upload size={14} /> Import from Excel
                    </MenuItem>
                    <div className="my-1 h-px bg-neutral-50 dark:border-neutral-800" />
                    <MenuItem
                      onClick={() => { if (!isSuperAdmin) { setShowAccessDenied(true); return; } setDeleteClassSelected('1'); setShowDeleteByClassConfirm(true) }}
                      className="rounded-none px-4 py-2 text-[12px] font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-3"
                    >
                      <AlertCircle size={14} /> Clear Class Data
                    </MenuItem>
                  </MenuList>
                </Portal>
              </Menu>
            </div>
            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider mr-2 sm:hidden">Student Controls</span>
            <input id={fileInputRefId} type="file" accept=".xlsx" className="hidden" onChange={handleImportExcelFile} />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                if (!isSuperAdmin) { setShowAccessDenied(true); return; }
                router.push('/admin/students/promote')
              }}
              className="px-3 md:px-4 py-2 rounded-none bg-white dark:bg-neutral-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-neutral-900 dark:text-white flex items-center justify-center gap-2 transition-all border border-neutral-200 dark:border-neutral-800 text-[11px] font-black uppercase tracking-wider group whitespace-nowrap flex-1 sm:flex-none"
            >
              <GraduationCap size={16} className="text-blue-600" />
              <span className="inline sm:inline">Promote</span>
              {!isSuperAdmin && <Lock size={10} className="opacity-50" />}
            </button>

            <button
              onClick={() => {
                if (!isSuperAdmin) { setShowAccessDenied(true); return; }
                setShowAddModal(true)
              }}
              className="px-3 md:px-4 py-2 rounded-none bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-sm transition-all text-[11px] font-black uppercase tracking-wider whitespace-nowrap flex-1 sm:flex-none"
            >
              <Plus size={16} />
              <span className="inline sm:inline">Add Student</span>
              {!isSuperAdmin && <Lock size={10} className="opacity-70" />}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8 min-h-[400px]">
        <StudentTable
          students={filteredStudents}
          loading={loading}
          onView={setClickedStudent}
          onEdit={(s) => {
            if (!isSuperAdmin) { setShowAccessDenied(true); return; }
            setEditingStudent(s)
          }}
          onDelete={(id) => {
            if (!isSuperAdmin) { setShowAccessDenied(true); return; }
            setConfirmDeleteId(id)
          }}
          deleteLoadingId={deleteLoadingId}
          isSuperAdmin={isSuperAdmin}
          currentSort={{ key: sortKey, dir: sortDir }}
          onSort={handleSort}
          selectedIds={selectedIds}
          onSelectId={handleSelectId}
          onSelectAll={handleSelectAll}
        />

        <StudentGrid
          students={filteredStudents}
          loading={loading}
          onView={setClickedStudent}
          onEdit={(s) => {
            if (!isSuperAdmin) { setShowAccessDenied(true); return; }
            setEditingStudent(s)
          }}
          onDelete={(id) => {
            if (!isSuperAdmin) { setShowAccessDenied(true); return; }
            setConfirmDeleteId(id)
          }}
          deleteLoadingId={deleteLoadingId}
          isSuperAdmin={isSuperAdmin}
        />
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 px-6 py-4 bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900 rounded-none shadow-sm transition-all">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-neutral-400 font-black uppercase tracking-widest">Directory Status</p>
          <p className="text-[13px] text-neutral-500 font-bold">
            Showing <span className="text-neutral-900 dark:text-white font-black">{(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)}</span>
            <span className="mx-2 text-neutral-300">/</span>
            <span className="text-blue-600 font-black">{totalCount}</span> Students
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Enhanced Multi-Page Pagination */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-50 dark:bg-neutral-900/50 rounded-none border border-neutral-100 dark:border-neutral-800 max-w-full overflow-x-auto scrollbar-none">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 rounded-none text-neutral-400 hover:text-blue-600 disabled:opacity-30 transition-all hover:bg-white dark:hover:bg-neutral-800"
            >
              <ChevronRight size={16} className="rotate-180" />
            </button>

            <div className="flex items-center gap-1">
              {(() => {
                const totalPages = Math.ceil(totalCount / pageSize);
                const pages = [];
                const maxVisible = 5;

                let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                const endPage = Math.min(totalPages, startPage + maxVisible - 1);

                if (endPage - startPage + 1 < maxVisible) {
                  startPage = Math.max(1, endPage - maxVisible + 1);
                }

                if (startPage > 1) {
                  pages.push(
                    <button key={1} onClick={() => setCurrentPage(1)} className="w-8 h-8 flex items-center justify-center rounded-none text-[12px] font-bold text-neutral-400 hover:text-neutral-900 dark:hover:text-white">1</button>
                  );
                  if (startPage > 2) pages.push(<span key="dots-1" className="text-neutral-300 px-1">...</span>);
                }

                for (let i = Math.max(1, startPage); i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`w-8 h-8 flex items-center justify-center rounded-none text-[12px] font-black transition-all ${currentPage === i
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110'
                          : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
                        }`}
                    >
                      {i}
                    </button>
                  );
                }

                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) pages.push(<span key="dots-2" className="text-neutral-300 px-1">...</span>);
                  pages.push(
                    <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="w-8 h-8 flex items-center justify-center rounded-none text-[12px] font-bold text-neutral-400 hover:text-neutral-900 dark:hover:text-white">{totalPages}</button>
                  );
                }

                return pages;
              })()}
            </div>

            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= Math.ceil(totalCount / pageSize) || loading}
              className="p-2 rounded-none text-neutral-400 hover:text-blue-600 disabled:opacity-30 transition-all hover:bg-white dark:hover:bg-neutral-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-none text-[11px] font-black text-neutral-600 focus:outline-none cursor-pointer"
          >
            {[10, 20, 50, 100].map(size => (
              <option key={size} value={size}>Show {size}</option>
            ))}
          </select>
        </div>
      </div>


      <Drawer
        isOpen={showAddModal || !!editingStudent}
        onClose={() => { setShowAddModal(false); setEditingStudent(null); }}
        size="full"
      >
        <DrawerOverlay className="backdrop-blur-md bg-black/40" />
        <DrawerContent className="bg-white dark:bg-neutral-950 p-0 m-0 w-full max-w-full overflow-x-hidden">
          <StudentFormContent
            initialData={editingStudent}
            loading={editingStudent ? editLoading : createLoading}
            onCancel={() => { setShowAddModal(false); setEditingStudent(null); }}
            onSave={editingStudent ? handleUpdateStudent : handleCreateStudent}
          />
        </DrawerContent>
      </Drawer>

      <Drawer
        isOpen={!!clickedStudent}
        onClose={() => setClickedStudent(null)}
        size="full"
      >
        <DrawerOverlay className="backdrop-blur-md bg-black/40" />
        <DrawerContent className="bg-white dark:bg-neutral-950 p-0 m-0 w-full max-w-full overflow-x-hidden">
          <StudentDetailModal
            student={clickedStudent}
            onClose={() => setClickedStudent(null)}
          />
        </DrawerContent>
      </Drawer>

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] backdrop-blur-sm p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-none p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h4 className="text-lg font-bold mb-2">Delete Student?</h4>
            <p className="text-gray-600 mb-6 text-sm">Are you sure you want to delete this student? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-none" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-none hover:bg-red-700 shadow-md"
                onClick={() => handleDeleteStudent(confirmDeleteId)}
              >
                {deleteLoadingId === confirmDeleteId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SecurityConfirmationModal
        isOpen={showDeleteAllConfirm}
        onClose={() => setShowDeleteAllConfirm(false)}
        onConfirm={handleDeleteAll}
        title="Delete Entire Directory?"
        description={
          <div className="space-y-2">
            <p>You are about to delete <strong>ALL {students.length} students</strong> from the database.</p>
            <p className="font-semibold text-red-600 bg-red-50 p-3 rounded-none border border-red-100">
              Warning: This action is permanent and CANNOT be undone. All student records, photos, and associated data will be erased.
            </p>
          </div>
        }
        verificationText="DELETE ALL STUDENTS"
        variant="danger"
        loading={bulkActionLoading}
      />

      <SecurityConfirmationModal
        isOpen={showDeleteByClassConfirm}
        onClose={() => setShowDeleteByClassConfirm(false)}
        onConfirm={handleDeleteClass}
        title={`Delete Class ${deleteClassSelected}?`}
        description={
          <div className="space-y-4">
            <div className="bg-amber-50 p-4 rounded-none border border-amber-100">
              <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Select Class to Delete</label>
              <select
                value={deleteClassSelected}
                onChange={e => setDeleteClassSelected(e.target.value)}
                className="w-full border-amber-200 focus:ring-amber-500/20 focus:border-amber-500 rounded-none py-2.5"
              >
                {fetchedClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <p>This will delete all students currently assigned to <strong>Class {deleteClassSelected}</strong>.</p>
          </div>
        }
        verificationText={`DELETE CLASS ${deleteClassSelected}`}
        variant="warning"
        loading={bulkActionLoading}
      />

      {user && (
        <OTPVerificationModal
          isOpen={showOTPModal}
          onClose={() => { setShowOTPModal(false); setOtpAction(null); }}
          onVerifySuccess={() => {
            if (otpAction?.type === 'deleteAll') handleDeleteAll();
            else if (otpAction?.type === 'deleteClass') handleDeleteClass();
          }}
          email={user.email || ''}
          userId={user.uid}
          actionName={otpAction?.label || 'Critical Data Deletion'}
        />
      )}



    </div>
  )
}

export default AdminStudents

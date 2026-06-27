"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { 
  GraduationCap, Plus, Pencil, Trash2, Hash, 
  Coins, BookOpen, Star, Search, Loader2, Save,
  Users, Calculator, UserPlus, UserCheck, Info, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import FeeConfirmationModal from '../AdminFees/FeeConfirmationModal';
import { client } from '@/sanity/lib/client';

/* Hide number input spinners globally for this component */
const noSpinnerStyle = `
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
`;

interface AcademicClass {
  _id: string;
  name: string;
  code: string;
  group: string;
  monthlyFee: number;
  admissionFeeNew: number;
  admissionFeeOld: number;
  annualFee: number;
  order: number;
  isPopular: boolean;
}

const AdminClasses = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<AcademicClass | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    group: 'Primary School',
    monthlyFee: '' as number | '',
    admissionFeeNew: '' as number | '',
    admissionFeeOld: '' as number | '',
    annualFee: '' as number | '',
    order: '' as number | '',
    isPopular: false
  });

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/academic-classes');
      const json = await res.json();
      if (json.ok) {
        setClasses(json.data);
      } else {
        toast.error('Failed to fetch classes');
      }
    } catch (e) {
      toast.error('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentCounts = async () => {
    try {
      // Determine current session dynamically (YYYY-YYYY format)
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const currentSession = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

      const data = await client.fetch(
        `*[_type == "student" && session == $session && !(_id in path("drafts.**"))]{ admissionFor }`,
        { session: currentSession }
      );
      const counts: Record<string, number> = {};
      data.forEach((student: any) => {
        if (student.admissionFor) {
          counts[student.admissionFor] = (counts[student.admissionFor] || 0) + 1;
        }
      });
      setStudentCounts(counts);
    } catch (e) {
      console.error("Failed to fetch student counts", e);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchStudentCounts();
  }, []);

  const openAddDialog = () => {
    setEditingClass(null);
    setForm({
      name: '',
      code: '',
      group: 'Primary School',
      monthlyFee: '',
      admissionFeeNew: '',
      admissionFeeOld: '',
      annualFee: '',
      order: classes.length + 1,
      isPopular: false
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (cls: AcademicClass) => {
    setEditingClass(cls);
    setForm({
      name: cls.name || '',
      code: cls.code || '',
      group: cls.group || 'Primary School',
      monthlyFee: cls.monthlyFee || '',
      admissionFeeNew: cls.admissionFeeNew || '',
      admissionFeeOld: cls.admissionFeeOld || '',
      annualFee: cls.annualFee || '',
      order: cls.order || '',
      isPopular: cls.isPopular || false
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      toast.error('Please fill required fields properly');
      return;
    }
    
    setSubmitting(true);
    try {
      const token = await user?.getIdToken();
      const payload = editingClass 
        ? { id: editingClass._id, patch: form }
        : form;

      const res = await fetch('/api/academic-classes', {
        method: editingClass ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      
      if (json.ok) {
        toast.success(editingClass ? 'Class Updated!' : 'Class Created!');
        setIsDialogOpen(false);
        fetchClasses();
      } else {
        throw new Error(json.error);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/academic-classes?id=${deletingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.ok) {
        toast.success('Class Deleted');
        fetchClasses();
      } else {
        throw new Error(json.error);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    } finally {
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  const filteredClasses = classes.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.group || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (a.order || 0) - (b.order || 0));

  // Statistics Calculations
  const stats = useMemo(() => {
    const totalClasses = classes.length;
    const totalStudents = Object.values(studentCounts).reduce((a, b) => a + b, 0);
    const avgFee = totalClasses ? Math.round(classes.reduce((acc, c) => acc + c.monthlyFee, 0) / totalClasses) : 0;
    const potentialRevenue = classes.reduce((acc, cls) => {
      const count = studentCounts[cls.code] || 0;
      return acc + (cls.monthlyFee * count);
    }, 0);

    return {
      totalClasses,
      totalStudents,
      avgFee,
      potentialRevenue
    };
  }, [classes, studentCounts]);

  const getGroupColor = (group: string) => {
    const g = (group || '').toLowerCase();
    if (g.includes('pre') || g.includes('nursery') || g.includes('kindergarten')) return 'bg-pink-500 border-pink-500 text-pink-600 dark:text-pink-400';
    if (g.includes('primary')) return 'bg-emerald-500 border-emerald-500 text-emerald-600 dark:text-emerald-400';
    if (g.includes('middle')) return 'bg-indigo-500 border-indigo-500 text-indigo-600 dark:text-indigo-400';
    if (g.includes('secondary') || g.includes('high') || g.includes('ssc')) return 'bg-purple-500 border-purple-500 text-purple-600 dark:text-purple-400';
    return 'bg-neutral-500 border-neutral-500 text-neutral-600 dark:text-neutral-400';
  };

  const getGroupBgColor = (group: string) => {
    const g = (group || '').toLowerCase();
    if (g.includes('pre') || g.includes('nursery') || g.includes('kindergarten')) return 'bg-pink-50 dark:bg-pink-900/10 border-pink-100 dark:border-pink-800/30';
    if (g.includes('primary')) return 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30';
    if (g.includes('middle')) return 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30';
    if (g.includes('secondary') || g.includes('high') || g.includes('ssc')) return 'bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800/30';
    return 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800';
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <style>{noSpinnerStyle}</style>
      
      {/* Header & Search */}
      <div className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative w-full sm:w-96 z-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input 
            type="text" 
            placeholder="Search classes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
          />
        </div>
        <button 
          onClick={openAddDialog}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 z-10"
        >
          <Plus size={16} />
          New Class
        </button>
      </div>

      {/* Dynamic Statistics Section */}
      {!loading && classes.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex items-center gap-4 relative overflow-hidden transition-all hover:border-emerald-500/50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-colors" />
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50">
              <GraduationCap size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Classes</p>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">{stats.totalClasses}</h3>
            </div>
          </div>

          <div className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex items-center gap-4 relative overflow-hidden transition-all hover:border-blue-500/50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-colors" />
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/50">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Students</p>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">{stats.totalStudents}</h3>
            </div>
          </div>

          <div className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex items-center gap-4 relative overflow-hidden transition-all hover:border-purple-500/50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-500/20 transition-colors" />
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-800/50">
              <Coins size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Avg Fee</p>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">Rs. {stats.avgFee}</h3>
            </div>
          </div>

          <div className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex items-center gap-4 relative overflow-hidden transition-all hover:border-amber-500/50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/20 transition-colors" />
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800/50">
              <Calculator size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Potential</p>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">Rs. {stats.potentialRevenue.toLocaleString()}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-neutral-400 bg-white/50 dark:bg-black/50 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl">
          <GraduationCap size={48} className="mb-4 opacity-20" />
          <p className="font-semibold text-sm">No classes found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
          {filteredClasses.map((cls, index) => {
            const studentCount = studentCounts[cls.code] || 0;
            const groupColorClass = getGroupColor(cls.group);
            const bgColorClass = getGroupBgColor(cls.group);

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                key={cls._id} 
                className={`bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:shadow-xl transition-all group relative overflow-hidden flex flex-col`}
              >
                {/* Decorative Top Border Line */}
                <div className={`absolute top-0 left-0 right-0 h-1 \${groupColorClass.split(' ')[0]}`} />
                
                {cls.isPopular && (
                  <div className="absolute top-4 right-4 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 p-1.5 rounded-lg shadow-sm border border-amber-200 dark:border-amber-800/50">
                    <Star size={14} className="fill-current" />
                  </div>
                )}
                
                <div className="flex items-start gap-4 mb-5 mt-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border \${bgColorClass} \${groupColorClass.split(' ').slice(2).join(' ')}`}>
                    <GraduationCap size={22} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1 pr-4">
                    <h3 className="font-bold text-neutral-900 dark:text-white leading-tight truncate text-lg">{cls.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded uppercase tracking-widest border border-neutral-200 dark:border-neutral-700">
                          {cls.code}
                        </span>
                        <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-100 dark:border-blue-800/50">
                          {studentCount} Students
                        </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6 flex-1">
                  <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl p-3 border border-neutral-100 dark:border-neutral-800/50">
                      <div className="flex justify-between items-center text-xs mb-2 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                        <span className="font-bold text-neutral-400 uppercase tracking-widest">Group</span>
                        <span className="font-bold text-neutral-800 dark:text-neutral-200">{cls.group || 'General'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5"><Coins size={12}/> Monthly Fee</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">Rs. {cls.monthlyFee}</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                      <div className="bg-neutral-50 dark:bg-neutral-900/50 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800/50 flex flex-col justify-center">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1 flex items-center gap-1"><UserPlus size={10}/> Admission</span>
                          <span className="font-bold text-neutral-800 dark:text-neutral-200 text-xs">Rs. {cls.admissionFeeNew || 0}</span>
                      </div>
                      <div className="bg-neutral-50 dark:bg-neutral-900/50 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800/50 flex flex-col justify-center">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1 flex items-center gap-1"><BookOpen size={10}/> Annual</span>
                          <span className="font-bold text-neutral-800 dark:text-neutral-200 text-xs">Rs. {cls.annualFee || 0}</span>
                      </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => openEditDialog(cls)}
                    className="flex-1 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 p-2.5 rounded-xl text-xs font-bold transition-all border border-neutral-200 dark:border-neutral-800 flex items-center justify-center gap-2 hover:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => { setDeletingId(cls._id); setShowDeleteModal(true); }}
                    className="p-2.5 bg-white dark:bg-black hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-600 rounded-xl transition-all border border-neutral-200 dark:border-neutral-800 flex items-center justify-center hover:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
                    title="Delete Class"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-0 overflow-hidden flex flex-col">
              <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 border-b border-neutral-200 dark:border-neutral-800">
                  <DialogTitle className="text-xl font-black text-neutral-900 dark:text-white">
                      {editingClass ? 'Edit Class Structure' : 'Add New Class'}
                  </DialogTitle>
                  <p className="text-xs text-neutral-500 font-medium mt-1">
                      Define fees and details for this academic class.
                  </p>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                  <form id="class-form" onSubmit={handleSave} className="space-y-6">
                      
                      {/* Basic Details */}
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Basic Details</h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1">Class Name <span className="text-red-500">*</span></label>
                                  <input 
                                      required
                                      value={form.name}
                                      onChange={(e) => setForm({...form, name: e.target.value})}
                                      placeholder="e.g. Class 1"
                                      className="w-full h-10 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                  />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1">Class Code <span className="text-red-500">*</span></label>
                                  <div className="relative">
                                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14}/>
                                      <input 
                                          required
                                          value={form.code}
                                          onChange={(e) => setForm({...form, code: e.target.value})}
                                          placeholder="e.g. 1"
                                          className="w-full h-10 pl-9 pr-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                      />
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1">Class Group <span className="text-red-500">*</span></label>
                              <div className="relative">
                                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14}/>
                                  <input 
                                      required
                                      value={form.group}
                                      onChange={(e) => setForm({...form, group: e.target.value})}
                                      placeholder="e.g. Primary School"
                                      className="w-full h-10 pl-9 pr-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Fee Configuration */}
                      <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                          <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Fee Configuration</h4>

                          <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1">Monthly Tuition Fee <span className="text-red-500">*</span></label>
                              <div className="relative">
                                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={14}/>
                                  <input 
                                      required
                                      type="number"
                                      value={form.monthlyFee}
                                      onChange={(e) => setForm({...form, monthlyFee: e.target.value === '' ? '' : Number(e.target.value)})}
                                      placeholder="e.g. 1500"
                                      className="w-full h-10 pl-9 pr-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                  />
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1"><UserPlus size={10}/> Admission (New) <span className="text-red-500">*</span></label>
                                  <div className="relative">
                                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={14}/>
                                      <input 
                                          required
                                          type="number"
                                          value={form.admissionFeeNew}
                                          onChange={(e) => setForm({...form, admissionFeeNew: e.target.value === '' ? '' : Number(e.target.value)})}
                                          placeholder="e.g. 5000"
                                          className="w-full h-10 pl-9 pr-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                      />
                                  </div>
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1"><UserCheck size={10}/> Admission (Old) <span className="text-red-500">*</span></label>
                                  <div className="relative">
                                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={14}/>
                                      <input 
                                          required
                                          type="number"
                                          value={form.admissionFeeOld}
                                          onChange={(e) => setForm({...form, admissionFeeOld: e.target.value === '' ? '' : Number(e.target.value)})}
                                          placeholder="e.g. 2000"
                                          className="w-full h-10 pl-9 pr-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                      />
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1">Annual / Security Fee</label>
                              <div className="relative">
                                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" size={14}/>
                                  <input 
                                      type="number"
                                      value={form.annualFee}
                                      onChange={(e) => setForm({...form, annualFee: e.target.value === '' ? '' : Number(e.target.value)})}
                                      placeholder="e.g. 3000"
                                      className="w-full h-10 pl-9 pr-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Settings */}
                      <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                          <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Settings & Sorting</h4>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1">Display Order</label>
                                  <input 
                                      type="number"
                                      value={form.order}
                                      onChange={(e) => setForm({...form, order: e.target.value === '' ? '' : Number(e.target.value)})}
                                      placeholder="e.g. 1"
                                      className="w-full h-10 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                  />
                              </div>

                              <div className="flex items-center pt-5">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input 
                                          type="checkbox" 
                                          className="sr-only peer"
                                          checked={form.isPopular}
                                          onChange={(e) => setForm({...form, isPopular: e.target.checked})}
                                      />
                                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                                      <span className="ml-3 text-sm font-bold text-neutral-700 dark:text-neutral-300">Mark as Popular</span>
                                  </label>
                              </div>
                          </div>
                      </div>

                  </form>
              </div>

              <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex gap-3 justify-end">
                  <button 
                      type="button"
                      onClick={() => setIsDialogOpen(false)}
                      className="px-5 h-10 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-sm font-bold transition-all"
                  >
                      Cancel
                  </button>
                  <button 
                      type="submit"
                      form="class-form"
                      disabled={submitting}
                      className="px-6 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                  >
                      {submitting ? (
                          <><Loader2 size={16} className="animate-spin" /> Saving...</>
                      ) : (
                          <><Save size={16} /> Save Class</>
                      )}
                  </button>
              </div>
          </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <FeeConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeletingId(null); }}
        onConfirm={confirmDelete}
        title="Delete Academic Class"
        description="Are you sure you want to delete this class? This will permanently remove its global fee settings. Existing student fee records will remain."
        loading={submitting && !!deletingId}
      />
    </div>
  );
};

export default AdminClasses;

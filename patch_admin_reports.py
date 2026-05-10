import re
import sys

with open(r"d:\AL-GHAZALI WEBS\alghazali_vercel_app\components\AdminReports\AdminReports.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add missing imports
imports_to_add = "import { Upload, Users, PieChart, BarChart2, Loader2, X, Search, FileDown, Image as ImageIcon, Database, Receipt, FolderArchive, LayoutGrid, Eye, SearchIcon, FilterIcon, User } from 'lucide-react'\nimport StudentDetailModal from '../AdminStudents/StudentDetailModal'\n"
content = re.sub(r"import { Upload, Users, PieChart, BarChart2, Loader2, X } from 'lucide-react'\n", imports_to_add, content)

# 2. Add new states inside AdminReports
state_add = """  // VIP UI states
  const [insightSearch, setInsightSearch] = useState('')
  const [clickedStudent, setClickedStudent] = useState<any>(null)
  
  type ExportTabType = 'data' | 'fees' | 'forms' | 'pictures'
  const [activeExportTab, setActiveExportTab] = useState<ExportTabType>('data')
"""
content = re.sub(r"  // Modal to show lists for insights\n  const \[insightModal, setInsightModal\] = useState", state_add + r"  // Modal to show lists for insights\n  const [insightModal, setInsightModal] = useState", content)

# 3. Replace the JSX from `return (` to the end.
jsx_split = content.split("  return (")
if len(jsx_split) != 2:
    print("Could not split by '  return ('")
    sys.exit(1)

new_jsx = """  return (
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
                        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
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
                        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
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
                        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
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
                        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
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
      {insightModal.open && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label="Insight Details">
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
                <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
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
                       { header: 'Class', key: 'admissionFor', width: 10 },
                       { header: 'Phone', key: 'phoneNumber', width: 15 },
                     ];
                     
                     insightModal.items.forEach((s: any) => {
                       ws.addRow({
                         fullName: s.fullName || '',
                         grNumber: s.grNumber || '',
                         rollNumber: s.rollNumber || '',
                         admissionFor: s.admissionFor || '',
                         phoneNumber: s.phoneNumber || ''
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
                             <FilterIcon size={32} className="text-neutral-300" />
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
                                  <img src={(s.photoUrl || s.imageUrl) + '?w=64&h=64&fit=crop'} alt={s.fullName} className="w-full h-full object-cover" />
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
        </div>
      )}

      {/* Profile Detail Modal Layer */}
      {clickedStudent && (
        <div className="fixed inset-0 z-[60]">
          <StudentDetailModal
            student={clickedStudent}
            onClose={() => setClickedStudent(null)}
          />
        </div>
      )}

    </div>
  )
}

export default AdminReports
"""

content = jsx_split[0] + new_jsx

with open(r"d:\AL-GHAZALI WEBS\alghazali_vercel_app\components\AdminReports\AdminReports.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Done")

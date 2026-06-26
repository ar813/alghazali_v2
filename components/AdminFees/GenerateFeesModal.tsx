import React, { useState } from 'react';
import { X, Calendar, RotateCw } from 'lucide-react';

interface GenerateFeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (month: string, year: number, dueDate: string) => Promise<void>;
  months: readonly string[];
  isGenerating: boolean;
}

const GenerateFeesModal: React.FC<GenerateFeesModalProps> = ({ isOpen, onClose, onGenerate, months, isGenerating }) => {
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [dueDate, setDueDate] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-550" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">Auto-Generate Monthly Fees</h2>
          </div>
          <button onClick={onClose} disabled={isGenerating} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-500">This will automatically create unpaid fee records for all active students based on their class fee structure and previous arrears.</p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Month</label>
              <select 
                value={month} 
                onChange={e => setMonth(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium cursor-pointer"
              >
                {months.filter(m => m !== 'Month' && m !== 'admission').map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Year</label>
              <input 
                type="number" 
                value={year} 
                onChange={e => setYear(Number(e.target.value))}
                className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Due Date</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono font-medium"
                required
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end gap-2">
          <button 
            onClick={onClose} 
            disabled={isGenerating}
            className="px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onGenerate(month, year, dueDate)}
            disabled={isGenerating || !dueDate}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all shadow-sm active:scale-95"
          >
            {isGenerating && <RotateCw className="w-4 h-4 animate-spin" />}
            {isGenerating ? 'Generating...' : 'Generate Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateFeesModal;

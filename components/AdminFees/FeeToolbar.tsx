"use client";

import React from 'react';
import { Search, RotateCw, Upload, Trash2, Plus, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeeToolbarProps {
    filterClass: string;
    onFilterClassChange: (val: string) => void;
    filterMonth: string;
    onFilterMonthChange: (val: string) => void;
    filterYear: number | '';
    onFilterYearChange: (val: number | '') => void;
    filterStatus: string;
    onFilterStatusChange: (val: string) => void;
    search: string;
    onSearchChange: (val: string) => void;
    uniqueClasses: string[];
    months: readonly string[];
    onRefresh: () => void;
    onExport: () => void;
    onImportClick: () => void;
    onDeleteAll: () => void;
    onAddFee: () => void;
    onGenerateFees?: () => void;
    loading: boolean;
    importLoading: boolean;
    isGenerating?: boolean;
    hasFilters: boolean;
}

const FeeToolbar = ({
    filterClass,
    onFilterClassChange,
    filterMonth,
    onFilterMonthChange,
    filterYear,
    onFilterYearChange,
    filterStatus,
    onFilterStatusChange,
    search,
    onSearchChange,
    uniqueClasses,
    months,
    onRefresh,
    onExport,
    onImportClick,
    onDeleteAll,
    onAddFee,
    onGenerateFees,
    loading,
    importLoading,
    isGenerating,
    hasFilters
}: FeeToolbarProps) => {
    return (
        <div className="w-full space-y-3">
            {/* Main Container: Mobile First (Stack vertically) */}
            <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-3 sm:p-4">
                <div className="flex flex-col gap-3">

                    {/* Search */}
                    <div className="relative group w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 dark:group-focus-within:text-zinc-200 transition-colors" size={16} />
                        <input
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search by Receipt or Name..."
                            className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-400 font-medium"
                        />
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2 w-full">
                        {/* Class Filter */}
                        <div className="relative w-full lg:w-40">
                            <select
                                value={filterClass}
                                onChange={(e) => onFilterClassChange(e.target.value)}
                                className="w-full appearance-none bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all cursor-pointer font-medium"
                            >
                                <option value="">All Classes</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="relative w-full lg:w-36">
                            <select
                                value={filterStatus}
                                onChange={(e) => onFilterStatusChange(e.target.value)}
                                className="w-full appearance-none bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all cursor-pointer font-medium"
                            >
                                <option value="">Status: All</option>
                                <option value="paid">Paid</option>
                                <option value="partial">Partial</option>
                                <option value="unpaid">Unpaid</option>
                            </select>
                        </div>

                        {/* Month Filter */}
                        <div className="relative w-full lg:w-40">
                            <select
                                value={filterMonth}
                                onChange={(e) => onFilterMonthChange(e.target.value)}
                                className="w-full appearance-none bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all cursor-pointer font-medium"
                            >
                                <option value="">All Months</option>
                                {months.map(m => m !== 'Month' && <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        {/* Year Filter */}
                        <div className="relative w-full lg:w-28">
                            <input
                                type="number"
                                value={filterYear}
                                onChange={(e) => onFilterYearChange(e.target.value ? Number(e.target.value) : '')}
                                placeholder="Year"
                                className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono font-medium"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full justify-between sm:justify-end border-t border-zinc-100 dark:border-zinc-800 pt-3">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <button onClick={onRefresh} className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all" title="Reload Data">
                                <RotateCw size={18} className={cn(loading && "animate-spin")} />
                            </button>

                            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5"></div>

                            <button onClick={onExport} className="p-2 text-zinc-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-all" title="Export Excel">
                                <FileSpreadsheet size={18} />
                            </button>

                            <button onClick={onImportClick} disabled={importLoading} className="p-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all disabled:opacity-50" title="Import Excel">
                                <Upload size={18} />
                            </button>

                            {hasFilters && (
                                <button onClick={onDeleteAll} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-955/30 rounded-lg transition-all" title="Delete All Filtered">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                            {onGenerateFees && (
                                <button
                                    onClick={onGenerateFees}
                                    disabled={isGenerating}
                                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    <RotateCw size={16} className={cn(isGenerating && "animate-spin")} />
                                    <span>{isGenerating ? 'Generating...' : 'Auto Generate'}</span>
                                </button>
                            )}
                            <button
                                onClick={onAddFee}
                                className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95"
                            >
                                <Plus size={16} />
                                <span>New Entry</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeeToolbar;

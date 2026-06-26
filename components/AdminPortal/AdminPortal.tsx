"use client";

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { LayoutDashboard, Users as UsersIcon, BarChart3, IdCard, Printer, Wallet, FileQuestion, Award, Trophy, Smartphone, UserCheck, CalendarCheck, School } from 'lucide-react';
import Sidebar from '@/components/Sidebar/Sidebar';
import { useAuth } from '@/hooks/use-auth';
import AccessDeniedDialog from '@/components/Auth/AccessDeniedDialog';
import { useMobileNav } from '@/contexts/MobileNavContext';
import LogoutConfirmationDialog from '@/components/Auth/LogoutConfirmationDialog';

// Lazy load admin components
const AdminDashboard = dynamic(() => import('@/components/AdminDashboard/AdminDashboard'), { ssr: false });
const AdminReports = dynamic(() => import('@/components/AdminReports/AdminReports'), { ssr: false });
const AdminStudents = dynamic(() => import('@/components/AdminStudents/AdminStudents'), { ssr: false });
const AdminCards = dynamic(() => import('@/components/AdminCards/AdminCards'), { ssr: false });
const AdminFees = dynamic(() => import('@/components/AdminFees/AdminFees'), { ssr: false });

const AdminQuiz = dynamic(() => import('@/components/AdminQuiz/AdminQuiz'), { ssr: false });
const AdminResults = dynamic(() => import('@/components/AdminResults/AdminResults'), { ssr: false });
const AdminMobileAttendance = dynamic(() => import('@/components/AdminMobileAttendance/AdminMobileAttendance'), { ssr: false });
const AdminManualAttendance = dynamic(() => import('@/components/AdminManualAttendance/AdminManualAttendance'), { ssr: false });
const AdminAttendanceOverview = dynamic(() => import('@/components/AdminAttendanceOverview/AdminAttendanceOverview'), { ssr: false });
const AdminAdmitCards = dynamic(() => import('@/components/AdminAdmitCards/AdminAdmitCards'), { ssr: false });
const AdminResult = dynamic(() => import('@/components/AdminResult/AdminResult'), { ssr: false });

const AdminPortal = ({ 
    isBlurred = false, 
    onLoadingChange, 
    childLoading, 
    gender 
}: { 
    isBlurred?: boolean; 
    onLoadingChange?: (loading: boolean) => void; 
    childLoading?: boolean;
    gender?: "male" | "female";
}) => {
    // useAuth hook for global state
    const { loading: authLoading, isSuperAdmin, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'classes' | 'reports' | 'cards' | 'admit-cards' | 'fees' | 'quiz' | 'results' | 'exam-results' | 'mobile-attendance' | 'manual-attendance' | 'attendance-overview'>(() => {
        if (typeof window !== 'undefined') {
            const hash = window.location.hash.replace('#', '');
            if (hash) return hash as any;
        }
        return 'dashboard';
    });
    const [showAccessDenied, setShowAccessDenied] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Get mobile nav context for unified navigation
    const { setPortalNavConfig, clearPortalNav } = useMobileNav();

    // Sidebar items definition
    const sidebarItems = useMemo(() => {
        const baseItems = [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'students', label: 'Students', icon: UsersIcon },
            { id: 'reports', label: 'Reports', icon: BarChart3 },
            { id: 'cards', label: 'Cards', icon: IdCard },
            { id: 'admit-cards', label: 'Admit Cards', icon: Printer },
            { id: 'fees', label: 'Fees Collection', icon: Wallet },
            { id: 'quiz', label: 'Quiz', icon: FileQuestion },
            { id: 'results', label: 'Quiz Results', icon: Award },
            { id: 'exam-results', label: 'Exam Results', icon: Trophy },
            { id: 'mobile-attendance', label: 'Mobile Attendance', icon: Smartphone },
            { id: 'manual-attendance', label: 'Manual Attendance', icon: UserCheck },
            { id: 'attendance-overview', label: 'Attendance Audit', icon: CalendarCheck },
        ];

        return [...baseItems];
    }, []);

    // Effect to handle access denied for non-super admins (not needed anymore for global tabs, but keeping skeleton)
    useEffect(() => {
        // ... if any other super admin tabs exist ...
    }, [activeTab, isSuperAdmin, authLoading]);

    // Register sidebar items with mobile nav context
    useEffect(() => {
        setPortalNavConfig({
            title: 'Admin Panel',
            items: sidebarItems,
            activeId: activeTab,
            onItemClick: (id: string) => {
                setActiveTab(id as any);
                if (typeof window !== 'undefined') window.location.hash = id;
            }
        });

        return () => {
            clearPortalNav();
        };
    }, [sidebarItems, activeTab, setPortalNavConfig, clearPortalNav]);

    // Sync tab with URL hash
    useEffect(() => {
        const applyHash = () => {
            const hash = (typeof window !== 'undefined' && window.location.hash.replace('#', '')) as typeof activeTab | ''
            if (hash && sidebarItems.some(item => item.id === hash)) {
                setActiveTab(hash as any)
            }
        }
        applyHash()
        const onHash = () => applyHash()
        window.addEventListener('hashchange', onHash)
        return () => window.removeEventListener('hashchange', onHash)
    }, [sidebarItems, setActiveTab])

    // Notify parent to show loader whenever tab changes
    useEffect(() => {
        onLoadingChange?.(true)
    }, [activeTab, onLoadingChange]);

    // Loading state
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded animate-spin mx-auto mb-4"></div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${isBlurred ? 'pointer-events-none select-none' : ''} `}>

            <div className={`min-h-screen flex bg-white transition-all duration-300 ${isBlurred ? 'blur-sm scale-[.98] brightness-90' : ''}`}>

                {/* NEW Sidebar */}
                <Sidebar
                    items={sidebarItems}
                    activeTab={activeTab}
                    onTabChange={(id) => {
                        setActiveTab(id as any);
                        if (typeof window !== 'undefined') window.location.hash = id;
                    }}
                    loading={authLoading || childLoading} // Basic auth loading + content loading
                />

                {/* Main Content (separate scroll) */}
                <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 sm:py-8">
                    <div className="max-w-7xl mx-auto pb-20 md:pb-8">
                        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-1 capitalize tracking-tight">
                                    {sidebarItems.find(i => i.id === activeTab)?.label}
                                </h2>
                            </div>
                        </div>

                        {activeTab === 'dashboard' && <AdminDashboard onLoadingChange={onLoadingChange} genderFilter={gender} />}
                        {activeTab === 'students' && <AdminStudents onLoadingChange={onLoadingChange} genderFilter={gender} />}
                        {activeTab === 'reports' && <AdminReports onLoadingChange={onLoadingChange} genderFilter={gender} />}
                        {activeTab === 'cards' && <AdminCards onLoadingChange={onLoadingChange} genderFilter={gender} />}
                        {activeTab === 'admit-cards' && <AdminAdmitCards onLoadingChange={onLoadingChange} genderFilter={gender} />}
                        {activeTab === 'fees' && <AdminFees onLoadingChange={onLoadingChange} genderFilter={gender} />}
                        {activeTab === 'quiz' && <AdminQuiz onLoadingChange={onLoadingChange} genderFilter={gender} />}
                        {activeTab === 'results' && <AdminResults onLoadingChange={onLoadingChange} genderFilter={gender} />}
                        {activeTab === 'exam-results' && <AdminResult onLoadingChange={onLoadingChange} genderFilter={gender} />}
                        {activeTab === 'mobile-attendance' && <AdminMobileAttendance onLoadingChange={onLoadingChange} />}
                        {activeTab === 'manual-attendance' && <AdminManualAttendance onLoadingChange={onLoadingChange} />}
                        {activeTab === 'attendance-overview' && <AdminAttendanceOverview onLoadingChange={onLoadingChange} />}
                    </div>
                </main>
            </div>
            <AccessDeniedDialog open={showAccessDenied} onOpenChange={setShowAccessDenied} />
            <LogoutConfirmationDialog
                open={showLogoutConfirm}
                onOpenChange={setShowLogoutConfirm}
                onConfirm={async () => {
                    await logout();
                    window.location.href = '/admin';
                }}
            />
        </div>
    );
};

export default AdminPortal;

"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Bot, GraduationCap, BookOpen, MessageSquare, 
  Megaphone, FileDigit, CalendarClock, School, LayoutDashboard,
  ChevronLeft, ChevronRight, Menu, X, Mail, QrCode, ScrollText
} from 'lucide-react'
import { cn } from "@/lib/utils"
import { useAuth } from '@/hooks/use-auth'

const baseNavItems = [
  { name: 'QR Attendance', href: '/admin/qr-attendance', icon: QrCode },
  { name: 'Admissions', href: '/admin/admissions', icon: School },
  { name: 'Chatbot', href: '/admin/chatbot', icon: Bot },
  { name: 'Classes', href: '/admin/classes', icon: BookOpen },
  { name: 'Diary', href: '/admin/diary', icon: BookOpen },
  { name: 'Inquiries', href: '/admin/inquiries', icon: MessageSquare },
  { name: 'Notice Board', href: '/admin/notice', icon: Megaphone },
  { name: 'OMR Generator', href: '/admin/omr', icon: FileDigit },
  { name: 'Schedule', href: '/admin/schedule', icon: CalendarClock },
  { name: 'Students', href: '/admin/students', icon: GraduationCap },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { role } = useAuth()
  const isSuperAdmin = role === 'super_admin'

  const navItems = [
    ...baseNavItems,
    ...(isSuperAdmin ? [
      { name: 'Email Sender', href: '/admin/emails', icon: Mail },
      { name: 'Admin Logs', href: '/admin/logs', icon: ScrollText },
      { name: 'Users', href: '/admin/users', icon: Users },
    ] : [
      { name: 'Users', href: '/admin/users', icon: Users },
    ])
  ]
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-300">
      <div className="p-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
        <Link href="/admin" className={cn("flex items-center gap-3 transition-all hover:opacity-80", isCollapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center shrink-0">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="font-bold text-sm uppercase tracking-wider text-neutral-900 dark:text-neutral-100 line-clamp-1">
              Admin Portal
            </div>
          )}
        </Link>
        
        {/* Desktop Collapse Toggle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex w-6 h-6 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <div className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                    isActive 
                      ? "bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-400 font-bold" 
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium"
                  )}
                >
                  <item.icon size={18} className={cn("shrink-0", isActive && "text-pink-600 dark:text-pink-500")} />
                  {!isCollapsed && (
                    <span className="text-sm truncate">{item.name}</span>
                  )}
                  {isCollapsed && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-neutral-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity">
                      {item.name}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        <Link href="/admin">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium",
            isCollapsed && "justify-center"
          )}>
            <ChevronLeft size={18} className="shrink-0" />
            {!isCollapsed && <span className="text-sm">Back to Dashboard</span>}
          </div>
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="w-14 h-14 bg-pink-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30 hover:bg-pink-700 transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="lg:hidden fixed inset-y-0 left-0 w-[280px] z-50"
            >
              <SidebarContent />
              <button 
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-4 right-4 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-500"
              >
                <X size={16} />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:block h-screen sticky top-0 flex-shrink-0 transition-all duration-300",
        isCollapsed ? "w-[80px]" : "w-[260px]"
      )}>
        <SidebarContent />
      </div>
    </>
  )
}

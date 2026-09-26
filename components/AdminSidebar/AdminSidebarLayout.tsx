"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import AdminSidebar from './AdminSidebar'

export default function AdminSidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const globalRoutes = [
    '/admin/admissions',
    '/admin/chatbot',
    '/admin/classes',
    '/admin/diary',
    '/admin/inquiries',
    '/admin/notice',
    '/admin/omr',
    '/admin/schedule',
    '/admin/students',
    '/admin/users',
    '/admin/emails'
  ]

  // Only show sidebar on specific global admin routes
  const isInnerRoute = globalRoutes.some(route => pathname.startsWith(route))

  if (!isInnerRoute) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto h-full relative">
        {children}
      </div>
    </div>
  )
}

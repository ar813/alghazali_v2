"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import AdminSidebar from './AdminSidebar'

export default function AdminSidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Do not show sidebar on the main admin dashboard (/admin)
  // Only show it on inner global admin routes (e.g. /admin/omr)
  const isInnerRoute = pathname !== '/admin' && pathname.startsWith('/admin/')

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

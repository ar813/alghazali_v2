import { Metadata } from 'next';
import AdminClientWrapper from '@/components/AdminPortal/AdminClientWrapper';
import AdminSidebarLayout from '@/components/AdminSidebar/AdminSidebarLayout';
import AdminPWAProvider from '@/components/PWA/AdminPWAProvider';

export const metadata: Metadata = {
  title: 'Admin Portal',
  description: 'Manage school data, students, and results.',
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AGHS Admin'
  }
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminClientWrapper>
      <AdminPWAProvider>
        <AdminSidebarLayout>
          {children}
        </AdminSidebarLayout>
      </AdminPWAProvider>
    </AdminClientWrapper>
  );
}

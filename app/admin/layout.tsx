import { Metadata } from 'next';
import AdminClientWrapper from '@/components/AdminPortal/AdminClientWrapper';
import AdminSidebarLayout from '@/components/AdminSidebar/AdminSidebarLayout';

export const metadata: Metadata = {
  title: 'Admin Portal',
  description: 'Manage school data, students, and results.',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminClientWrapper>
      <AdminSidebarLayout>
        {children}
      </AdminSidebarLayout>
    </AdminClientWrapper>
  );
}

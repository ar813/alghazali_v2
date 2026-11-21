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

// The admin portal is a private, auth-gated area. Never prerender it at build
// time — a statically generated shell is served from the Vercel edge cache and
// goes stale the moment a new deploy ships, forcing a manual hard reload.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

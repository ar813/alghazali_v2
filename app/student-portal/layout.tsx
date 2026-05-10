import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Portal',
  description: 'Access your student dashboard, profile, schedule, and results.',
}

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}

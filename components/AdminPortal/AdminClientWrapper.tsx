"use client";

import { SessionProvider } from '@/context/SessionContext';

export default function AdminClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}

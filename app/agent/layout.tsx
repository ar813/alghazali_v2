import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Education Assistant',
  description: 'Chat with Al-Ghazali AI assistant for academic help and school information.',
}

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}

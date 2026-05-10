import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Academic Quiz',
  description: 'Test your knowledge with Al-Ghazali High School academic quizzes.',
}

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}

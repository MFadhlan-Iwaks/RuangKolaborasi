// src/app/(main)/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RuangKolaborasi',
  description: 'Workspace kolaborasi tim.',
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
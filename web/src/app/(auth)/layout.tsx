// src/app/(auth)/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RuangKolaborasi — Masuk atau Daftar',
  description: 'Login atau buat akun baru untuk mulai berkolaborasi bersama tim.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {children}
    </div>
  );
}

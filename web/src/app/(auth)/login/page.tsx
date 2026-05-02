// src/app/(auth)/login/page.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.push('/workspace');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Gagal masuk. Coba lagi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen">

      {/* KIRI — Branded Panel */}
      <div className="hidden lg:flex w-[45%] bg-indigo-950 flex-col justify-between p-10 relative overflow-hidden">
        
        {/* Background dekoratif */}
        <div className="absolute w-72 h-72 rounded-full bg-white/[0.03] -top-16 -right-16" />
        <div className="absolute w-52 h-52 rounded-full bg-white/[0.03] -bottom-12 -left-12" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <div className="grid grid-cols-2 gap-[3px]">
              <div className="w-[7px] h-[7px] bg-white rounded-[2px] opacity-90" />
              <div className="w-[7px] h-[7px] bg-white rounded-[2px] opacity-60" />
              <div className="w-[7px] h-[7px] bg-white rounded-[2px] opacity-60" />
              <div className="w-[7px] h-[7px] bg-white rounded-[2px] opacity-30" />
            </div>
          </div>
          <span className="text-white font-semibold text-base tracking-tight">
            RuangKolaborasi
          </span>
        </div>

        {/* Tagline & fitur */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-white text-3xl font-semibold leading-tight tracking-tight">
              Satu ruang untuk<br />semua diskusi tim.
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Chat, bagikan file, dan rangkum diskusi<br />
              dengan bantuan AI — semuanya di satu tempat.
            </p>
          </div>

          <ul className="space-y-3">
            {[
              { text: 'Real-time chat dengan Socket.io', color: 'bg-indigo-400' },
              { text: 'Drag & drop file langsung ke chat', color: 'bg-indigo-400' },
              { text: 'Rangkum diskusi dengan Gemini AI', color: 'bg-emerald-400' },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full ${item.color} shrink-0`} />
                <span className="text-white/60 text-xs">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-white/20 text-xs relative z-10">
          RuangKolaborasi © 2025 — Tugas Besar PABP
        </p>
      </div>

      {/* KANAN — Form Login */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 bg-white">
        <div className="w-full max-w-sm mx-auto space-y-6">

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Selamat datang kembali
            </h2>
            <p className="text-sm text-gray-500">
              Masuk ke workspace tim kamu
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="nama@email.com"
                required
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600">
                  Kata sandi
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Lupa kata sandi?
                </Link>
              </div>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            {errorMessage && (
              <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">atau</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Google */}
          <button className="w-full h-10 flex items-center justify-center gap-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Masuk dengan Google
          </button>

          {/* Register link */}
          <p className="text-center text-xs text-gray-400">
            Belum punya akun?{' '}
            <Link href="/register" className="text-indigo-600 hover:text-indigo-700">
              Daftar sekarang
            </Link>
          </p>

        </div>
      </div>

    </div>
  );
}

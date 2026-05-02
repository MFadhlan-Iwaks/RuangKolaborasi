// src/app/(auth)/register/page.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setIsError(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get('firstName') || '').trim();
    const lastName = String(formData.get('lastName') || '').trim();
    const username = String(formData.get('username') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    if (!firstName || !username || !email || !password) {
      setIsError(true);
      setMessage('Lengkapi nama depan, username, email, dan kata sandi.');
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage('Konfirmasi kata sandi tidak sama.');
      setIsSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setIsError(true);
      setMessage('Kata sandi minimal 8 karakter.');
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username,
          },
        },
      });

      if (error) {
        setIsError(true);
        setMessage(error.message);
        return;
      }

      if (data.session) {
        router.push('/workspace');
        return;
      }

      setMessage('Registrasi berhasil. Jika verifikasi email aktif, cek email sebelum login.');
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : 'Gagal membuat akun. Coba lagi.'
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

        {/* Tagline & steps */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-white text-3xl font-semibold leading-tight tracking-tight">
              Mulai berkolaborasi<br />bersama tim kamu.
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Buat akun gratis dan undang anggota tim<br />
              untuk bergabung dalam hitungan detik.
            </p>
          </div>

          <ol className="space-y-4">
            {[
              { step: '1', title: 'Buat akun', desc: 'Daftarkan email dan buat kata sandi' },
              { step: '2', title: 'Buat workspace', desc: 'Beri nama ruang kerja tim kamu' },
              { step: '3', title: 'Undang tim', desc: 'Bagikan link ke anggota dan mulai diskusi' },
            ].map((item) => (
              <li key={item.step} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-semibold shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div>
                  <p className="text-white/80 text-xs font-medium">{item.title}</p>
                  <p className="text-white/50 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <p className="text-white/20 text-xs relative z-10">
          RuangKolaborasi © 2025 — Tugas Besar PABP
        </p>
      </div>

      {/* KANAN — Form Register */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 bg-white overflow-y-auto">
        <div className="w-full max-w-sm mx-auto py-10 space-y-5">

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Buat akun baru
            </h2>
            <p className="text-sm text-gray-500">
              Gratis selamanya untuk tim kecil
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>

            {/* Nama depan & belakang */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-gray-600">
                  Nama depan
                </label>
                <input
                  name="firstName"
                  type="text"
                  placeholder="Fadhlan"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-gray-600">
                  Nama belakang
                </label>
                <input
                  name="lastName"
                  type="text"
                  placeholder="..."
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                Username
              </label>
              <input
                name="username"
                type="text"
                placeholder="fadhlan123"
                required
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
              <p className="text-[11px] text-gray-400">
                Digunakan untuk mention @kamu di chat
              </p>
            </div>

            {/* Email */}
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

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                Kata sandi
              </label>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
              <p className="text-[11px] text-gray-400">
                Minimal 8 karakter
              </p>
            </div>

            {/* Konfirmasi password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                Konfirmasi kata sandi
              </label>
              <input
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            {message && (
              <p
                className={`rounded-lg border px-3 py-2 text-xs ${
                  isError
                    ? 'border-red-100 bg-red-50 text-red-600'
                    : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? 'Memproses...' : 'Buat akun'}
            </button>

          </form>

          {/* Terms */}
          <p className="text-center text-[11px] text-gray-400 leading-relaxed">
            Dengan mendaftar, kamu menyetujui{' '}
            <Link href="/terms" className="text-indigo-600 hover:text-indigo-700">
              Syarat Layanan
            </Link>{' '}
            dan{' '}
            <Link href="/privacy" className="text-indigo-600 hover:text-indigo-700">
              Kebijakan Privasi
            </Link>{' '}
            kami.
          </p>

          {/* Login link */}
          <p className="text-center text-xs text-gray-400">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700">
              Masuk di sini
            </Link>
          </p>

        </div>
      </div>

    </div>
  );
}

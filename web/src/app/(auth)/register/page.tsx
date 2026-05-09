// src/app/(auth)/register/page.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import AuthTextField from '@/components/auth/AuthTextField';
import AuthThemeToggle from '@/components/auth/AuthThemeToggle';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

type RegisterFieldErrors = {
  firstName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});

  function clearFieldError(field: keyof RegisterFieldErrors) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    if (isError) setMessage('');
  }

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
    const nextErrors: RegisterFieldErrors = {};

    if (!firstName) {
      nextErrors.firstName = 'Nama depan wajib diisi.';
    }

    if (!username) {
      nextErrors.username = 'Username wajib diisi.';
    } else if (username.length < 3) {
      nextErrors.username = 'Username minimal 3 karakter.';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      nextErrors.username = 'Gunakan huruf, angka, titik, underscore, atau strip.';
    }

    if (!email) {
      nextErrors.email = 'Email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Format email belum valid.';
    }

    if (!password) {
      nextErrors.password = 'Kata sandi wajib diisi.';
    } else if (password.length < 8) {
      nextErrors.password = 'Kata sandi minimal 8 karakter.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Konfirmasi kata sandi wajib diisi.';
    } else if (password && password !== confirmPassword) {
      nextErrors.confirmPassword = 'Konfirmasi kata sandi tidak sama.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
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
        await supabase.auth.signOut();
      }

      router.push('/login');
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
    <div className="flex min-h-screen">
      <AuthThemeToggle />

      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-indigo-950 p-10 lg:flex">
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
            <div className="grid grid-cols-2 gap-[3px]">
              <div className="h-[7px] w-[7px] rounded-[2px] bg-white opacity-90" />
              <div className="h-[7px] w-[7px] rounded-[2px] bg-white opacity-60" />
              <div className="h-[7px] w-[7px] rounded-[2px] bg-white opacity-60" />
              <div className="h-[7px] w-[7px] rounded-[2px] bg-white opacity-30" />
            </div>
          </div>
          <span className="text-base font-semibold tracking-tight text-white">
            RuangKolaborasi
          </span>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white">
              Mulai berkolaborasi<br />bersama tim kamu.
            </h1>
            <p className="text-sm leading-relaxed text-white/50">
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
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white">
                  {item.step}
                </div>
                <div>
                  <p className="text-xs font-medium text-white/80">{item.title}</p>
                  <p className="text-xs leading-relaxed text-white/50">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="relative z-10 text-xs text-white/20">
          RuangKolaborasi (c) 2026 - Tugas Besar PABP
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center overflow-y-auto bg-white px-8 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm space-y-5 py-10">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Buat akun baru
            </h2>
            <p className="text-sm text-gray-500">
              Gratis selamanya untuk tim kecil
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="flex gap-3">
              <AuthTextField
                id="register-first-name"
                name="firstName"
                type="text"
                label="Nama depan"
                placeholder="Fadhlan"
                autoComplete="given-name"
                error={fieldErrors.firstName}
                onChange={() => clearFieldError('firstName')}
                className="flex-1"
              />
              <AuthTextField
                id="register-last-name"
                name="lastName"
                type="text"
                label="Nama belakang"
                placeholder="Opsional"
                autoComplete="family-name"
                className="flex-1"
              />
            </div>

            <AuthTextField
              id="register-username"
              name="username"
              type="text"
              label="Username"
              placeholder="fadhlan123"
              autoComplete="username"
              hint="Digunakan untuk mention @kamu di chat"
              error={fieldErrors.username}
              onChange={() => clearFieldError('username')}
            />

            <AuthTextField
              id="register-email"
              name="email"
              type="email"
              label="Email"
              placeholder="nama@email.com"
              autoComplete="email"
              error={fieldErrors.email}
              onChange={() => clearFieldError('email')}
            />

            <AuthTextField
              id="register-password"
              name="password"
              type="password"
              label="Kata sandi"
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              hint="Minimal 8 karakter"
              error={fieldErrors.password}
              onChange={() => clearFieldError('password')}
            />

            <AuthTextField
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              label="Konfirmasi kata sandi"
              placeholder="Ulangi kata sandi"
              autoComplete="new-password"
              error={fieldErrors.confirmPassword}
              onChange={() => clearFieldError('confirmPassword')}
            />

            {message && (
              <p
                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold leading-5 shadow-sm ${
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
              className="h-10 w-full rounded-lg bg-indigo-600 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Memproses...' : 'Buat akun'}
            </button>
          </form>

          <p className="text-center text-[11px] leading-relaxed text-gray-400">
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

// src/app/(auth)/login/page.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import AuthTextField from '@/components/auth/AuthTextField';
import AuthThemeToggle from '@/components/auth/AuthThemeToggle';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

type LoginFieldErrors = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  function clearFieldError(field: keyof LoginFieldErrors) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setErrorMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const nextErrors: LoginFieldErrors = {};

    if (!email) {
      nextErrors.email = 'Email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Format email belum valid.';
    }

    if (!password) {
      nextErrors.password = 'Kata sandi wajib diisi.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage('Email atau kata sandi tidak sesuai. Periksa kembali data login kamu.');
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

  async function handleGoogleLogin() {
    setErrorMessage('');
    setIsGoogleSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/workspace`,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Gagal masuk dengan Google.');
        setIsGoogleSubmitting(false);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Gagal masuk dengan Google.'
      );
      setIsGoogleSubmitting(false);
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
              Satu ruang untuk<br />semua diskusi tim.
            </h1>
            <p className="text-sm leading-relaxed text-white/50">
              Chat, bagikan file, dan rangkum diskusi<br />
              dengan bantuan AI, semuanya di satu tempat.
            </p>
          </div>

          <ul className="space-y-3">
            {[
              { text: 'Real-time chat dengan Socket.io', color: 'bg-indigo-400' },
              { text: 'Drag & drop file langsung ke chat', color: 'bg-indigo-400' },
              { text: 'Rangkum diskusi dengan Gemini AI', color: 'bg-emerald-400' },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3">
                <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.color}`} />
                <span className="text-xs text-white/60">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/20">
          RuangKolaborasi (c) 2026 - Tugas Besar PABP
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center overflow-y-auto bg-white px-8 py-10 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Selamat datang kembali
            </h2>
            <p className="text-sm text-gray-500">
              Masuk ke workspace tim kamu
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <AuthTextField
              id="login-email"
              name="email"
              type="email"
              label="Email"
              placeholder="nama@email.com"
              autoComplete="email"
              error={fieldErrors.email}
              onChange={() => clearFieldError('email')}
            />

            <AuthTextField
              id="login-password"
              name="password"
              type="password"
              label="Kata sandi"
              placeholder="Masukkan kata sandi"
              autoComplete="current-password"
              error={fieldErrors.password}
              onChange={() => clearFieldError('password')}
              rightContent={
                <Link
                  href="/forgot-password"
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Lupa kata sandi?
                </Link>
              }
            />

            {errorMessage && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-semibold leading-5 text-red-600 shadow-sm">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 w-full rounded-lg bg-indigo-600 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-400">atau</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting || isGoogleSubmitting}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {isGoogleSubmitting ? 'Mengalihkan...' : 'Masuk dengan Google'}
          </button>

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

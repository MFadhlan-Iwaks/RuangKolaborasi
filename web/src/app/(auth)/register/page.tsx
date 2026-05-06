// src/app/(auth)/register/page.tsx
import Link from 'next/link';

export default function RegisterPage() {
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
          <form className="space-y-4">

            {/* Nama depan & belakang */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-gray-600">
                  Nama depan
                </label>
                <input
                  type="text"
                  placeholder="Fadhlan"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-gray-600">
                  Nama belakang
                </label>
                <input
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
                type="text"
                placeholder="fadhlan123"
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
                type="email"
                placeholder="nama@email.com"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                Kata sandi
              </label>
              <input
                type="password"
                placeholder="••••••••"
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
                type="password"
                placeholder="••••••••"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Buat akun
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
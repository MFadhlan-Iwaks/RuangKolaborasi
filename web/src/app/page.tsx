'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function Home() {
  useEffect(() => {
    async function redirectBySession() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();

        window.location.replace(data.session ? '/workspace' : '/login');
      } catch {
        window.location.replace('/login');
      }
    }

    redirectBySession();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white text-gray-500">
      <div className="flex items-center gap-3 text-sm font-medium">
        <Loader2 size={18} className="animate-spin text-indigo-600" />
        Memeriksa sesi...
      </div>
    </main>
  );
}

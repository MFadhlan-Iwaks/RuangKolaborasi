'use client';

import { createClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from './env';
import type { Database } from '@/types/supabase';

let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { supabaseUrl, supabasePublishableKey } = getSupabasePublicEnv();
    browserClient = createClient<Database>(supabaseUrl, supabasePublishableKey);
  }

  return browserClient;
}

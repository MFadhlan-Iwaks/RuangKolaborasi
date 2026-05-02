// src/hooks/useGemini.ts
'use client';

import { useState } from 'react';
import { Message } from '@/types';
import { apiFetch } from '@/lib/apiClient';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

interface SummarizeResponse {
  summary: string;
}

interface PolishResponse {
  polishedText: string;
}

async function getAccessToken() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const token = data.session?.access_token;

  if (!token) {
    throw new Error('Silakan login terlebih dahulu untuk memakai fitur AI.');
  }

  return token;
}

export function useGemini() {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [summaryResult, setSummaryResult] = useState('');

  const summarize = async (messages: Message[]) => {
    if (messages.length === 0) return;
    setIsSummarizing(true);
    setSummaryResult('');

    try {
      const accessToken = await getAccessToken();
      const data = await apiFetch<SummarizeResponse>('/api/ai/summarize', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          messages: messages.map((message) => ({
            senderName: message.user,
            content: message.text ?? `(Mengirim file: ${message.fileName ?? 'Lampiran'})`,
            type: message.type,
          })),
        }),
      });

      setSummaryResult(data.summary);
    } catch (error) {
      console.error('Gagal merangkum:', error);
      setSummaryResult(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menghubungi backend AI.'
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  const polishText = async (text: string): Promise<string | null> => {
    setIsPolishing(true);
    try {
      const accessToken = await getAccessToken();
      const data = await apiFetch<PolishResponse>('/api/ai/polish-message', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          text,
        }),
      });

      return data.polishedText ? data.polishedText.replace(/^["']|["']$/g, '').trim() : null;
    } catch (error) {
      console.error('Gagal memoles teks:', error);
      return null;
    } finally {
      setIsPolishing(false);
    }
  };

  const clearSummary = () => setSummaryResult('');

  return {
    summarize,
    polishText,
    isSummarizing,
    isPolishing,
    summaryResult,
    clearSummary,
  };
}

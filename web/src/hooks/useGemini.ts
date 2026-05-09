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

function getSummaryContent(message: Message) {
  if (message.deletedForEveryone) return '[Pesan sudah dihapus]';

  const parts = [
    message.text?.trim(),
    message.replyTo
      ? `Membalas ${message.replyTo.user}: "${message.replyTo.preview}"`
      : '',
    message.forwardedFrom
      ? `Diteruskan dari ${message.forwardedFrom.user}: "${message.forwardedFrom.preview}"`
      : '',
    message.fileName
      ? `Lampiran: ${message.fileName}${message.fileSize ? ` (${message.fileSize})` : ''}`
      : '',
  ].filter(Boolean);

  return parts.join('\n') || '[Pesan tanpa teks]';
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

  const summarize = async (messages: Message[], channelId?: string) => {
    if (messages.length === 0 && !channelId) return;
    const readableMessages = messages
      .filter((message) => !message.deletedForEveryone)
      .slice(-100)
      .map((message) => ({
        senderName: message.user.replace(' (Kamu)', ''),
        content: `[${message.time}] ${getSummaryContent(message)}`,
        type: message.type,
      }));

    if (readableMessages.length === 0) {
      setSummaryResult('Belum ada pesan yang bisa dirangkum.');
      return;
    }

    setIsSummarizing(true);
    setSummaryResult('');

    try {
      const accessToken = await getAccessToken();
      const data = await apiFetch<SummarizeResponse>('/api/ai/summarize', {
        method: 'POST',
        accessToken,
        body: JSON.stringify(
          channelId
            ? { channelId, limit: 100 }
            : { messages: readableMessages }
        ),
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

// src/hooks/useGemini.ts
'use client';

import { useState } from 'react';
import { Message } from '@/types';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`;

export function useGemini() {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [summaryResult, setSummaryResult] = useState('');

  const summarize = async (messages: Message[]) => {
    if (messages.length === 0) return;
    setIsSummarizing(true);
    setSummaryResult('');

    try {
      const chatLog = messages
        .map((m) => `${m.user}: ${m.text ?? `(Mengirim file: ${m.fileName})`}`)
        .join('\n');

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Berikut adalah log obrolan dari ruang kerja kolaborasi kelompok mahasiswa:\n\n${chatLog}\n\nBuatkan ringkasan singkat dalam bahasa Indonesia mengenai poin-poin penting yang dibahas, dan berikan daftar tugas (action items) jika ada.`,
                },
              ],
            },
          ],
          systemInstruction: {
            parts: [
              {
                text: 'Kamu adalah asisten AI yang cerdas dan membantu merangkum diskusi teknis kelompok.',
              },
            ],
          },
        }),
      });

      const data = await response.json();
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ??
        'Gagal membuat rangkuman.';
      setSummaryResult(text);
    } catch (error) {
      console.error('Gagal merangkum:', error);
      setSummaryResult('Terjadi kesalahan saat menghubungi Gemini API.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const polishText = async (text: string): Promise<string | null> => {
    setIsPolishing(true);
    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Perbaiki kalimat berikut menjadi lebih profesional dan jelas untuk dikirim ke grup kerja perkuliahan (bahasa Indonesia). Kembalikan teks hasil perbaikan saja tanpa penjelasan:\n\n"${text}"`,
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      return result ? result.replace(/^["']|["']$/g, '').trim() : null;
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
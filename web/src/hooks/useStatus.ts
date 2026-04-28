// src/hooks/useStatus.ts
'use client';

import { useState, useEffect } from 'react';
import { Status } from '@/types';

export function useStatus() {
  const [status, setStatus] = useState<Status>('online');
  const [isManual, setIsManual] = useState(false);

  useEffect(() => {
    // Jika manual DND atau Offline, abaikan sistem otomatis
    if (isManual && (status === 'dnd' || status === 'offline')) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      if (status === 'idle') setStatus('online');

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setStatus('idle');
        setIsManual(false);
      }, 60000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      clearTimeout(timeoutId);
    };
  }, [status, isManual]);

  const setManualStatus = (newStatus: Status) => {
    setStatus(newStatus);
    setIsManual(true);
  };

  return { status, setManualStatus };
}
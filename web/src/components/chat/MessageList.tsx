// src/components/chat/MessageList.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* Indikator tanggal */}
      <div className="flex items-center justify-center my-6">
        <div className="border-b border-gray-200 flex-1" />
        <span className="mx-4 text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-50 px-3 py-1 rounded-full">
          Hari ini
        </span>
        <div className="border-b border-gray-200 flex-1" />
      </div>

      {/* Render pesan */}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      <div ref={endRef} className="h-4" />
    </div>
  );
}
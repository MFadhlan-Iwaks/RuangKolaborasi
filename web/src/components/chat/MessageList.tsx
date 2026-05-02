// src/components/chat/MessageList.tsx
'use client';

import { useEffect, useRef } from 'react';
import { MessageSquareText } from 'lucide-react';
import { Message } from '@/types';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  emptyTitle?: string;
  emptyDescription?: string;
  typingUser?: string;
  onReply: (message: Message) => void;
  onTogglePin: (messageId: number) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: number) => void;
}

export default function MessageList({
  messages,
  emptyTitle = 'Belum ada pesan di channel ini',
  emptyDescription = 'Mulai diskusi pertama, atau seret file ke area chat untuk membagikan dokumen ke tim.',
  typingUser,
  onReply,
  onTogglePin,
  onEdit,
  onDelete,
}: MessageListProps) {
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
      {messages.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-6 text-center">
          <div className="mb-3 rounded-full bg-white p-3 text-gray-400 shadow-sm">
            <MessageSquareText size={24} />
          </div>
          <h3 className="text-sm font-bold text-gray-900">{emptyTitle}</h3>
          <p className="mt-1 max-w-sm text-xs leading-5 text-gray-500">
            {emptyDescription}
          </p>
        </div>
      ) : (
        messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onReply={onReply}
            onTogglePin={onTogglePin}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}

      {typingUser && (
        <div className="flex items-center gap-3 pl-14 text-xs font-medium text-gray-400">
          <div className="flex gap-1 rounded-full bg-gray-100 px-3 py-2">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:240ms]" />
          </div>
          <span>{typingUser} sedang mengetik...</span>
        </div>
      )}

      <div ref={endRef} className="h-4" />
    </div>
  );
}

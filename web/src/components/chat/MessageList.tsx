// src/components/chat/MessageList.tsx
'use client';

import { useEffect, useRef, useMemo } from 'react';
import { MessageSquareText } from 'lucide-react';
import { Message } from '@/types';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  emptyTitle?: string;
  emptyDescription?: string;
  typingUser?: string;
  onReply: (message: Message) => void;
  onTogglePin: (messageId: Message['id']) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: Message['id']) => void;
  onRetry: (message: Message) => void;
  onToggleReaction: (messageId: Message['id'], emoji: string) => void;
  onPreviewFile: (message: Message) => void;
  onDownloadFile: (message: Message) => void;
  onCopyFileLink: (message: Message) => void;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  searchQuery?: string;
}

function computeGrouping(messages: Message[]): Message[] {
  // threshold in milliseconds (5 minutes)
  const THRESHOLD = 5 * 60 * 1000;

  function parseTimeToDateMs(timeStr: string) {
    // Expect formats like 'HH:mm' or ISO; try to create a Date for today
    const now = new Date();
    // If it's ISO-ish, Date.parse may work
    const iso = Date.parse(timeStr);
    if (!Number.isNaN(iso)) return iso;

    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        return d.getTime();
      }
    }

    return NaN;
  }

  return messages.map((message, index) => {
    const prevMessage = index > 0 ? messages[index - 1] : null;

    let isGroupStart = true;

    if (prevMessage) {
      // Extract sender name for comparison (handle case sensitivity)
      const currentSender = message.user.split(' (Kamu)')[0];
      const prevSender = prevMessage.user.split(' (Kamu)')[0];

      if (currentSender === prevSender) {
        // try parsing times and check threshold
        const currentMs = parseTimeToDateMs(message.time);
        const prevMs = parseTimeToDateMs(prevMessage.time);

        if (!Number.isNaN(currentMs) && !Number.isNaN(prevMs)) {
          const diff = Math.abs(currentMs - prevMs);
          if (diff <= THRESHOLD) {
            isGroupStart = false;
          }
        } else {
          // fallback: same sender -> group
          isGroupStart = false;
        }
      }
    }

    return {
      ...message,
      isGroupStart,
    };
  });
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
  onRetry,
  onToggleReaction,
  onPreviewFile,
  onDownloadFile,
  onCopyFileLink,
  emptyActionLabel,
  onEmptyAction,
  searchQuery = '',
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const messagesWithGrouping = useMemo(() => computeGrouping(messages), [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-0">

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
          {emptyActionLabel && onEmptyAction && (
            <button
              type="button"
              onClick={onEmptyAction}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"
            >
              {emptyActionLabel}
            </button>
          )}
        </div>
      ) : (
        messagesWithGrouping.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            searchQuery={searchQuery}
            onReply={onReply}
            onTogglePin={onTogglePin}
            onEdit={onEdit}
            onDelete={onDelete}
            onRetry={onRetry}
            onToggleReaction={onToggleReaction}
            onPreviewFile={onPreviewFile}
            onDownloadFile={onDownloadFile}
            onCopyFileLink={onCopyFileLink}
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

// src/components/chat/MessageList.tsx
'use client';

import { useEffect, useRef, useMemo } from 'react';
import { MessageSquareText, Search } from 'lucide-react';
import { ChatBackground, Message } from '@/types';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  background: ChatBackground;
  emptyTitle?: string;
  emptyDescription?: string;
  typingUser?: string;
  onReply: (message: Message) => void;
  onTogglePin: (messageId: Message['id']) => void;
  onEdit: (message: Message) => void;
  onRetry: (message: Message) => void;
  onInfo: (message: Message) => void;
  onForward: (message: Message) => void;
  onToggleStar: (messageId: Message['id']) => void;
  onToggleReaction: (messageId: Message['id'], emoji: string) => void;
  onDeleteForMe: (messageId: Message['id']) => void;
  onDeleteForEveryone: (message: Message) => void;
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
      const currentSender =
        message.senderId || message.user.replace(/\s+\(Kamu\)$/, '');
      const prevSender =
        prevMessage.senderId || prevMessage.user.replace(/\s+\(Kamu\)$/, '');

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
  background,
  emptyTitle = 'Belum ada pesan di channel ini',
  emptyDescription = 'Mulai diskusi pertama, atau seret file ke area chat untuk membagikan dokumen ke tim.',
  typingUser,
  onReply,
  onTogglePin,
  onEdit,
  onRetry,
  onInfo,
  onForward,
  onToggleStar,
  onToggleReaction,
  onDeleteForMe,
  onDeleteForEveryone,
  onPreviewFile,
  onDownloadFile,
  onCopyFileLink,
  emptyActionLabel,
  onEmptyAction,
  searchQuery = '',
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const messagesWithGrouping = useMemo(() => computeGrouping(messages), [messages]);
  const backgroundClass = {
    pattern: 'bg-[#f3f5f7]',
    clean: 'bg-white',
    focus: 'bg-slate-100',
    warm: 'bg-amber-50',
  }[background];
  const backgroundStyle =
    background === 'pattern'
      ? {
          backgroundImage:
            'linear-gradient(135deg, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(45deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }
      : undefined;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      className={`flex-1 overflow-y-auto space-y-0 ${backgroundClass}`}
      style={backgroundStyle}
    >

      {/* Indikator tanggal */}
      <div className="flex items-center justify-center px-6 py-6">
        <div className="border-b border-gray-200 flex-1" />
        <span className="mx-4 text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-50 px-3 py-1 rounded-full">
          Hari ini
        </span>
        <div className="border-b border-gray-200 flex-1" />
      </div>

      {searchQuery && messages.length > 0 && (
        <div className="mx-6 mb-4 rounded-2xl border border-gray-100 bg-white/95 p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
            <Search size={13} />
            Hasil pencarian
          </div>
          <div className="space-y-1">
            {messages.slice(0, 5).map((message) => (
              <button
                key={`search-${message.id}`}
                type="button"
                onClick={() =>
                  document
                    .getElementById(`message-${message.id}`)
                    ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
                }
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-50"
              >
                <span className="min-w-0 truncate text-sm font-semibold text-gray-700">
                  {message.text ?? message.fileName ?? 'Lampiran'}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {message.user}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Render pesan */}
      {messages.length === 0 ? (
        <div className="mx-6 flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/80 px-6 text-center shadow-sm">
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
            onRetry={onRetry}
            onInfo={onInfo}
            onForward={onForward}
            onToggleStar={onToggleStar}
            onToggleReaction={onToggleReaction}
            onDeleteForMe={onDeleteForMe}
            onDeleteForEveryone={onDeleteForEveryone}
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

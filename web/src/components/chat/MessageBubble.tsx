import { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Download,
  Eye,
  FileText,
  Loader2,
  MoreVertical,
  Pin,
  Reply,
  RotateCcw,
  Smile,
} from 'lucide-react';
import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  searchQuery?: string;
  onReply: (message: Message) => void;
  onTogglePin: (messageId: Message['id']) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: Message['id']) => void;
  onRetry: (message: Message) => void;
  onToggleReaction: (messageId: Message['id'], emoji: string) => void;
  onPreviewFile: (message: Message) => void;
  onDownloadFile: (message: Message) => void;
  onCopyFileLink: (message: Message) => void;
}

export default function MessageBubble({
  message,
  searchQuery = '',
  onReply,
  onTogglePin,
  onEdit,
  onDelete,
  onRetry,
  onToggleReaction,
  onPreviewFile,
  onDownloadFile,
  onCopyFileLink,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  const isMine = !!message.isMine;
  const query = searchQuery.trim();
  const isSending = message.deliveryStatus === 'sending';
  const isFailed = message.deliveryStatus === 'failed';
  const isGroupStart = message.isGroupStart !== false;

  // Reaction emoji options
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '✨'];

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setEmojiPickerOpen(false);
      }
    }

    if (menuOpen || emojiPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen, emojiPickerOpen]);

  function renderHighlightedText(text: string) {
    if (!query) return text;

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={`${part}-${index}`} className="rounded bg-yellow-100 px-0.5 text-gray-900">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        const padding = 12;
        const estMenuWidth = 220; // estimated menu width
        const estMenuHeight = 220; // estimated menu height
        const maxX = window.innerWidth - estMenuWidth - padding;
        const maxY = window.innerHeight - estMenuHeight - padding;
        const x = Math.min(e.clientX, Math.max(padding, maxX));
        const y = Math.min(e.clientY, Math.max(padding, maxY));
        setMenuOpen(true);
        setMenuPosition({ x, y });
        // prepare emoji picker to open near the cursor if user selects React from context menu
        setEmojiPickerPosition(null);
      }}
      className={`group flex items-start space-x-4 ${isSending ? 'opacity-75' : ''} ${isGroupStart ? 'mt-2' : 'mt-0.5'}`}
    >
      {/* Avatar - only show if group start */}
      {isGroupStart ? (
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm ${message.avatar}`}
        >
          {message.user.charAt(0)}
        </div>
      ) : (
        <div className="h-0 w-10 shrink-0" /> // Spacer to align text (no height)
      )}

      <div className="relative min-w-0 flex-1">
        {/* Header: Username + timestamp + status badges */}
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline space-x-2">
            {/* Show username only at group start */}
            {isGroupStart && (
              <>
                <span className="text-sm font-bold text-gray-900">{message.user}</span>
                <span className="text-xs font-medium text-gray-400">{message.time}</span>
              </>
            )}
            {message.edited && (
              <span className="text-[10px] font-medium text-gray-400">
                diedit
              </span>
            )}
            {isSending && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-500">
                <Loader2 size={10} className="animate-spin" />
                mengirim
              </span>
            )}
            {isFailed && (
              <span className="text-[10px] font-semibold text-red-500">
                gagal terkirim
              </span>
            )}
            {message.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                <Pin size={10} />
                Pin
              </span>
            )}
          </div>
          {/* Action buttons: overlay on hover */}
          <div className="absolute right-0 top-0 flex items-center gap-1 rounded-md bg-white px-2 py-1 shadow-md opacity-0 transition-opacity group-hover:opacity-100">
            {isFailed && (
              <button
                type="button"
                onClick={() => onRetry(message)}
                title="Coba kirim ulang"
                className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-50"
              >
                <RotateCcw size={14} />
              </button>
            )}
            
            {/* Primary actions */}
            <button
              type="button"
              onClick={() => onReply(message)}
              disabled={isSending}
              title="Balas pesan"
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Reply size={14} />
            </button>

            <button
              type="button"
              onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
              title="Tambah reaksi"
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-yellow-50 hover:text-yellow-600"
            >
              <Smile size={14} />
            </button>

            {/* Emoji picker: either anchored to action bar (default) or fixed at a custom position (from context menu) */}
            {emojiPickerOpen && (
              emojiPickerPosition ? (
                <div ref={emojiPickerRef} className="fixed z-50" style={{ left: emojiPickerPosition.x, top: emojiPickerPosition.y }}>
                  <div className="rounded-lg border border-gray-200 bg-white shadow-lg p-2">
                    <div className="grid grid-cols-4 gap-1">
                      {reactionEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            onToggleReaction(message.id, emoji);
                            setEmojiPickerOpen(false);
                            setEmojiPickerPosition(null);
                          }}
                          className="rounded p-2 text-lg hover:bg-gray-100 transition-colors"
                          title={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full right-0 mb-1 rounded-lg border border-gray-200 bg-white shadow-lg p-2 z-50"
                >
                  <div className="grid grid-cols-4 gap-1">
                    {reactionEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          onToggleReaction(message.id, emoji);
                          setEmojiPickerOpen(false);
                        }}
                        className="rounded p-2 text-lg hover:bg-gray-100 transition-colors"
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* Secondary actions menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(!menuOpen);
                  setMenuPosition(null);
                }}
                title="Opsi lainnya"
                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <MoreVertical size={14} />
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                menuPosition ? (
                  <div ref={menuRef} className="fixed z-50" style={{ left: menuPosition.x, top: menuPosition.y }}>
                    <div className="rounded-lg border border-gray-200 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            if (menuPosition) {
                              setEmojiPickerPosition({ x: menuPosition.x + 8, y: menuPosition.y + 8 });
                            }
                            setEmojiPickerOpen(true);
                            setMenuOpen(false);
                          }}
                          className="block w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          😊 React
                        </button>
                      <button
                        type="button"
                        onClick={() => {
                          onTogglePin(message.id);
                          setMenuOpen(false);
                        }}
                        disabled={isSending || isFailed}
                        className="block w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-t-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {message.pinned ? '📌 Lepas pin' : '📌 Pin pesan'}
                      </button>

                      {isMine && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onEdit(message);
                              setMenuOpen(false);
                            }}
                            disabled={isSending || isFailed}
                            className="block w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(message.id);
                              setMenuOpen(false);
                            }}
                            disabled={isSending}
                            className="block w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 rounded-b-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            🗑️ Hapus
                          </button>
                        </>
                      )}

                      {!isMine && (
                        <div className="px-3 py-2 text-[11px] text-gray-500">
                          (Hanya pengirim bisa edit/hapus)
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div ref={menuRef} className="absolute right-0 top-full mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                    <button
                      type="button"
                      onClick={() => {
                        // open picker anchored to the dropdown (absolute) menu
                        setEmojiPickerPosition(null);
                        setEmojiPickerOpen(true);
                        setMenuOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      😊 React
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onTogglePin(message.id);
                        setMenuOpen(false);
                      }}
                      disabled={isSending || isFailed}
                      className="block w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-t-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {message.pinned ? '📌 Lepas pin' : '📌 Pin pesan'}
                    </button>

                    {isMine && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onEdit(message);
                            setMenuOpen(false);
                          }}
                          disabled={isSending || isFailed}
                          className="block w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(message.id);
                            setMenuOpen(false);
                          }}
                          disabled={isSending}
                          className="block w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 rounded-b-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          🗑️ Hapus
                        </button>
                      </>
                    )}

                    {!isMine && (
                      <div className="px-3 py-2 text-[11px] text-gray-500">
                        (Hanya pengirim bisa edit/hapus)
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {message.replyTo && (
          <div className="mb-1 rounded-lg border-l-2 border-blue-300 bg-blue-50/60 px-3 py-2">
            <p className="text-[11px] font-bold text-blue-700">
              Membalas {message.replyTo.user}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
              {message.replyTo.preview}
            </p>
          </div>
        )}

        {/* Message content with timestamp at bottom-right */}
        <div className="flex flex-col">
          {message.type === 'text' ? (
            <p className="text-sm leading-relaxed text-gray-700">
              {renderHighlightedText(message.text ?? '')}
            </p>
          ) : (
            <div className="space-y-2">
              {message.text && (
                <p className="text-sm leading-relaxed text-gray-700">
                  {renderHighlightedText(message.text)}
                </p>
              )}
              {message.fileUrl && message.mimeType?.startsWith('image/') && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.fileUrl}
                  alt={message.fileName || 'Lampiran gambar'}
                  className="max-h-80 max-w-md rounded-lg border border-gray-200 object-contain"
                />
              )}
              <div className="group/file flex w-full max-w-72 cursor-pointer items-start space-x-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors group-hover/file:bg-blue-100">
                  <FileText size={24} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {message.fileName}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {message.fileSize} - Dokumen
                  </p>
                </div>
              </div>
              {!isSending && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onPreviewFile(message)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <Eye size={13} />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadFile(message)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <Download size={13} />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopyFileLink(message)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <Copy size={13} />
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Timestamp now in header, removed from content */}
        </div>

        {/* Reactions handled via emoji picker only (no compact badges) */}
      </div>
    </div>
  );
}

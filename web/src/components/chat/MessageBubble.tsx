import {
  Copy,
  Download,
  Edit3,
  Eye,
  FileText,
  Loader2,
  Pin,
  PinOff,
  Reply,
  RotateCcw,
  Trash2,
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
  const isMine = !!message.isMine;
  const query = searchQuery.trim();
  const isSending = message.deliveryStatus === 'sending';
  const isFailed = message.deliveryStatus === 'failed';

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
    <div className={`group flex items-start space-x-4 ${isSending ? 'opacity-75' : ''}`}>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm ${message.avatar}`}
      >
        {message.user.charAt(0)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline space-x-2">
            <span className="text-sm font-bold text-gray-900">{message.user}</span>
            <span className="text-xs font-medium text-gray-400">{message.time}</span>
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
          <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
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
              onClick={() => onTogglePin(message.id)}
              disabled={isSending || isFailed}
              title={message.pinned ? 'Lepas pin' : 'Pin pesan'}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {message.pinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
            {isMine && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(message)}
                  disabled={isSending || isFailed}
                  title="Edit pesan"
                  className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(message.id)}
                  disabled={isSending}
                  title="Hapus pesan"
                  className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {message.replyTo && (
          <div className="mb-2 rounded-lg border-l-2 border-blue-300 bg-blue-50/60 px-3 py-2">
            <p className="text-[11px] font-bold text-blue-700">
              Membalas {message.replyTo.user}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
              {message.replyTo.preview}
            </p>
          </div>
        )}

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

        {!isSending && !isFailed && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['👍', '✅', '👀'].map((emoji) => {
              const reaction = message.reactions?.find(
                (item) => item.emoji === emoji
              );

              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction(message.id, emoji)}
                  className={`rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${
                    reaction?.reacted
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span>{emoji}</span>
                  {reaction && reaction.count > 0 && (
                    <span className="ml-1">{reaction.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

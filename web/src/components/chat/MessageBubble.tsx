import { Edit3, FileText, Pin, PinOff, Reply, Trash2 } from 'lucide-react';
import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  onReply: (message: Message) => void;
  onTogglePin: (messageId: Message['id']) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: Message['id']) => void;
}

export default function MessageBubble({
  message,
  onReply,
  onTogglePin,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const isMine = message.user.includes('(Kamu)');

  return (
    <div className="group flex items-start space-x-4">
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
            {message.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                <Pin size={10} />
                Pin
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onReply(message)}
              title="Balas pesan"
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
            >
              <Reply size={14} />
            </button>
            <button
              type="button"
              onClick={() => onTogglePin(message.id)}
              title={message.pinned ? 'Lepas pin' : 'Pin pesan'}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
            >
              {message.pinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
            {isMine && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(message)}
                  title="Edit pesan"
                  className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(message.id)}
                  title="Hapus pesan"
                  className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
          <p className="text-sm leading-relaxed text-gray-700">{message.text}</p>
        ) : (
          <div className="space-y-2">
            {message.text && (
              <p className="text-sm leading-relaxed text-gray-700">
                {message.text}
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
            <div className="group/file flex w-72 cursor-pointer items-start space-x-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
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
          </div>
        )}
      </div>
    </div>
  );
}

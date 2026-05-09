import { useEffect, useRef, useState } from 'react';
import {
  Ban,
  CheckCheck,
  Copy,
  Download,
  Edit3,
  Eye,
  Forward,
  FileText,
  Loader2,
  MoreVertical,
  Pin,
  PinOff,
  Reply,
  RotateCcw,
  Smile,
  Star,
  Trash2,
} from 'lucide-react';
import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  searchQuery?: string;
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
}

const MENU_WIDTH = 224;
const MENU_MAX_HEIGHT = 408;
const VIEWPORT_PADDING = 12;
const REACTION_EMOJIS = [
  '\u{1F44D}',
  '\u2705',
  '\u{1F602}',
  '\u{1F62E}',
  '\u{1F64F}',
  '\u{1F440}',
];

export default function MessageBubble({
  message,
  searchQuery = '',
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
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isMine = !!message.isMine;
  const query = searchQuery.trim();
  const isSending = message.deliveryStatus === 'sending';
  const isFailed = message.deliveryStatus === 'failed';

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setReactionOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setReactionOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function updateMenuPosition() {
      const rect = menuButtonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const preferredLeft = isMine ? rect.right - MENU_WIDTH : rect.left;
      const maxLeft = window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING;
      const left = Math.min(Math.max(VIEWPORT_PADDING, preferredLeft), maxLeft);
      const preferredTop = rect.bottom + 8;
      const maxTop = window.innerHeight - MENU_MAX_HEIGHT - VIEWPORT_PADDING;
      const top = Math.min(
        Math.max(VIEWPORT_PADDING, preferredTop),
        Math.max(VIEWPORT_PADDING, maxTop)
      );

      setMenuPosition({ left, top });
    }

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isMine, menuOpen]);

  function renderHighlightedText(text: string) {
    if (!query) return text;

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={`${part}-${index}`}
          className="rounded bg-yellow-100 px-0.5 text-gray-900"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  if (message.deletedForEveryone) {
    return (
      <div className={`flex px-6 py-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className="inline-flex max-w-[70%] items-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-xs italic text-gray-500 shadow-sm">
          <Ban size={14} />
          Pesan ini telah dihapus
        </div>
      </div>
    );
  }

  return (
    <div
      id={`message-${message.id}`}
      className={`group flex px-3 sm:px-6 ${
        message.reactions?.length ? 'pb-4 pt-1.5' : 'py-1.5'
      } ${isMine ? 'justify-end' : 'justify-start'} ${
        isSending ? 'opacity-75' : ''
      }`}
    >
      <div
        className={`flex max-w-[88%] items-end gap-1.5 sm:max-w-[76%] sm:gap-2 ${
          isMine ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {!isMine && message.isGroupStart !== false ? (
          message.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.photoUrl}
              alt={message.user}
              className="mb-1 hidden h-8 w-8 shrink-0 rounded-full object-cover shadow-sm sm:block"
            />
          ) : (
            <div
              className={`mb-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm sm:flex ${message.avatar}`}
            >
              {message.user.charAt(0)}
            </div>
          )
        ) : (
          <div className="h-0 w-0 shrink-0 sm:h-8 sm:w-8" />
        )}

        <div
          className={`relative rounded-2xl px-3 py-2 shadow-sm ${
            isMine
              ? 'rounded-br-md bg-blue-600 text-white'
              : 'rounded-bl-md border border-gray-100 bg-white text-gray-800'
          }`}
        >
          {!isMine && message.isGroupStart !== false && (
            <p className="mb-1 text-xs font-bold text-blue-700">{message.user}</p>
          )}

          {message.replyTo && (
            <div
              className={`mb-2 rounded-lg border-l-2 px-3 py-2 ${
                isMine
                  ? 'border-white/70 bg-white/15 text-white'
                  : 'border-blue-300 bg-blue-50 text-gray-700'
              }`}
            >
              <p
                className={`text-[11px] font-bold ${
                  isMine ? 'text-white' : 'text-blue-700'
                }`}
              >
                {message.replyTo.user}
              </p>
              <p
                className={`mt-0.5 line-clamp-1 text-xs ${
                  isMine ? 'text-blue-50' : 'text-gray-500'
                }`}
              >
                {message.replyTo.preview}
              </p>
            </div>
          )}

          {message.forwardedFrom && (
            <div
              className={`mb-1.5 inline-flex max-w-full items-center gap-1.5 text-[11px] font-bold ${
                isMine ? 'text-blue-50' : 'text-gray-500'
              }`}
            >
              <Forward size={13} />
              <span className="truncate">
                Diteruskan dari {message.forwardedFrom.user}
              </span>
            </div>
          )}

          {message.type === 'text' ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {renderHighlightedText(message.text ?? '')}
            </p>
          ) : (
            <div className="space-y-2">
              {message.text && (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {renderHighlightedText(message.text)}
                </p>
              )}
              {message.fileUrl && message.mimeType?.startsWith('image/') && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.fileUrl}
                  alt={message.fileName || 'Lampiran gambar'}
                  className="max-h-72 max-w-full rounded-xl border border-black/5 object-contain sm:max-w-sm"
                />
              )}
              {message.fileUrl && message.mimeType?.startsWith('video/') && (
                <video
                  src={message.fileUrl}
                  controls
                  className="max-h-72 w-[min(20rem,78vw)] max-w-full rounded-xl border border-black/5 bg-black"
                />
              )}
              {message.fileUrl && message.mimeType?.startsWith('audio/') && (
                <div
                  className={`rounded-xl p-3 ${
                    isMine ? 'bg-white/15' : 'bg-gray-50'
                  }`}
                >
                  <audio src={message.fileUrl} controls className="w-[min(18rem,76vw)] max-w-full" />
                </div>
              )}
              {!message.mimeType?.startsWith('image/') &&
                !message.mimeType?.startsWith('video/') &&
                !message.mimeType?.startsWith('audio/') && (
                  <div
                    className={`flex w-72 max-w-full items-start gap-3 rounded-xl p-3 ${
                      isMine ? 'bg-white/15' : 'bg-gray-50'
                    }`}
                  >
                    <div
                      className={`rounded-lg p-2 ${
                        isMine
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      <FileText size={22} strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {message.fileName}
                      </p>
                      <p
                        className={`mt-0.5 text-xs ${
                          isMine ? 'text-blue-50' : 'text-gray-500'
                        }`}
                      >
                        {message.fileSize} - Dokumen
                      </p>
                    </div>
                  </div>
                )}
            </div>
          )}

          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
              isMine ? 'text-blue-50' : 'text-gray-400'
            }`}
          >
            {message.edited && <span>diedit</span>}
            {isSending && (
              <span className="inline-flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" />
                mengirim
              </span>
            )}
            {isFailed && (
              <span className={isMine ? 'text-red-100' : 'text-red-500'}>
                gagal
              </span>
            )}
            {message.pinned && <Pin size={10} />}
            {message.starred && <Star size={10} fill="currentColor" />}
            <span>{message.time}</span>
            {isMine && !isSending && !isFailed && <CheckCheck size={12} />}
          </div>

          {message.reactions && message.reactions.length > 0 && (
            <div
              className="absolute bottom-0 left-3 z-10 flex translate-y-1/2 gap-1 rounded-full border border-gray-100 bg-white px-1.5 py-0.5 text-xs shadow-sm"
            >
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  type="button"
                  onClick={() => onToggleReaction(message.id, reaction.emoji)}
                  className="flex items-center gap-0.5 text-gray-700"
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-[10px]">{reaction.count}</span>
                </button>
              ))}
            </div>
          )}

          <div
            ref={menuRef}
            className={`absolute top-1 transition-opacity ${
              menuOpen || reactionOpen
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            } ${isMine ? 'right-1' : 'right-1'}`}
          >
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => {
                setMenuOpen((current) => !current);
                setReactionOpen(false);
              }}
              className={`rounded-full p-1.5 shadow-sm ${
                isMine
                  ? 'bg-blue-700/80 text-white hover:bg-blue-700'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
              title="Opsi pesan"
            >
              <MoreVertical size={14} />
            </button>

            {menuOpen && (
              <div
                className="fixed z-[80] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-2xl"
                style={{
                  left: menuPosition.left,
                  top: menuPosition.top,
                  width: MENU_WIDTH,
                  maxHeight: MENU_MAX_HEIGHT,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onInfo(message);
                    setMenuOpen(false);
                  }}
                  disabled={false}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Eye size={15} />
                  Info pesan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onForward(message);
                    setMenuOpen(false);
                  }}
                  disabled={isSending || isFailed}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Forward size={15} />
                  Teruskan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleStar(message.id);
                    setMenuOpen(false);
                  }}
                  disabled={isSending || isFailed}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Star size={15} fill={message.starred ? 'currentColor' : 'none'} />
                  {message.starred ? 'Hapus bintang' : 'Beri bintang'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReply(message);
                    setMenuOpen(false);
                  }}
                  disabled={isSending}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Reply size={15} />
                  Balas
                </button>
                <button
                  type="button"
                  onClick={() => setReactionOpen((current) => !current)}
                  disabled={isSending || isFailed}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Smile size={15} />
                  Beri reaksi
                </button>
                {reactionOpen && (
                  <div className="mx-2 my-1 grid grid-cols-6 gap-1 rounded-lg bg-gray-50 p-1">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          onToggleReaction(message.id, emoji);
                          setReactionOpen(false);
                          setMenuOpen(false);
                        }}
                        className="rounded-md p-1 text-base hover:bg-white"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onTogglePin(message.id);
                    setMenuOpen(false);
                  }}
                  disabled={isSending || isFailed}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {message.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                  {message.pinned ? 'Lepas pin' : 'Pin pesan'}
                </button>
                {message.type === 'file' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onPreviewFile(message);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                    >
                      <Eye size={15} />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDownloadFile(message);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                    >
                      <Download size={15} />
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onCopyFileLink(message);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                    >
                      <Copy size={15} />
                      Copy link
                    </button>
                  </>
                )}
                {isMine && message.type === 'text' && (
                  <button
                    type="button"
                    onClick={() => {
                      onEdit(message);
                      setMenuOpen(false);
                    }}
                    disabled={isSending || isFailed}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Edit3 size={15} />
                    Edit pesan
                  </button>
                )}
                {isFailed && (
                  <button
                    type="button"
                    onClick={() => {
                      onRetry(message);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50"
                  >
                    <RotateCcw size={15} />
                    Coba lagi
                  </button>
                )}
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => {
                    onDeleteForMe(message.id);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                >
                  <Trash2 size={15} />
                  Hapus untuk saya
                </button>
                {isMine && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteForEveryone(message);
                      setMenuOpen(false);
                    }}
                    disabled={isSending}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    Hapus untuk semua orang
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import type { HTMLAttributes } from 'react';
import { Archive, Hash, Sparkles } from 'lucide-react';
import { FileCategory, Message, MessageFilter, Room } from '@/types';
import ChatInput from '@/components/chat/ChatInput';
import MessageFilterBar from '@/components/chat/MessageFilterBar';
import MessageList from '@/components/chat/MessageList';
import FilePanel from '@/components/workspace/FilePanel';
import FilePreviewModal from '@/components/workspace/FilePreviewModal';
import { getMessagePreview } from '@/lib/workspaceUtils';

interface WorkspaceChatAreaProps {
  activeRoom?: Room;
  messages: Message[];
  filteredMessages: Message[];
  pinnedMessages: Message[];
  channelFiles: Message[];
  filteredChannelFiles: Message[];
  messageFilter: MessageFilter;
  searchQuery: string;
  typingUser: string;
  draftFile: File | null;
  replyToMessage: Message | null;
  showFilePanel: boolean;
  fileCategory: FileCategory;
  fileNotice: string;
  selectedFileMessage: Message | null;
  isDragging: boolean;
  isSending?: boolean;
  dragHandlers: HTMLAttributes<HTMLDivElement>;
  onClearSearch: () => void;
  onOpenFilePanel: () => void;
  onFilterChange: (filter: MessageFilter) => void;
  onSendMessage: (text: string, file?: File) => void;
  onDraftFileChange: (file: File | null) => void;
  onCancelReply: () => void;
  onReply: (message: Message) => void;
  onTogglePin: (messageId: Message['id']) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: Message['id']) => void;
  onRetryMessage: (message: Message) => void;
  onToggleReaction: (messageId: Message['id'], emoji: string) => void;
  onFileCategoryChange: (category: FileCategory) => void;
  onCloseFilePanel: () => void;
  onPreviewFile: (message: Message | null) => void;
  onDownloadFile: (message: Message) => void;
  onCopyFileLink: (message: Message) => void;
  onCreateChannel: () => void;
}

export default function WorkspaceChatArea({
  activeRoom,
  messages,
  filteredMessages,
  pinnedMessages,
  channelFiles,
  filteredChannelFiles,
  messageFilter,
  searchQuery,
  typingUser,
  draftFile,
  replyToMessage,
  showFilePanel,
  fileCategory,
  fileNotice,
  selectedFileMessage,
  isDragging,
  isSending = false,
  dragHandlers,
  onClearSearch,
  onOpenFilePanel,
  onFilterChange,
  onSendMessage,
  onDraftFileChange,
  onCancelReply,
  onReply,
  onTogglePin,
  onEdit,
  onDelete,
  onRetryMessage,
  onToggleReaction,
  onFileCategoryChange,
  onCloseFilePanel,
  onPreviewFile,
  onDownloadFile,
  onCopyFileLink,
  onCreateChannel,
}: WorkspaceChatAreaProps) {
  if (!activeRoom) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Hash size={22} />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Belum ada ruang diskusi aktif
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Buat channel pertama agar tim bisa mulai mengirim pesan dan file.
            </p>
            <button
              type="button"
              onClick={onCreateChannel}
              className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
              Buat Channel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <MessageFilterBar
        filter={messageFilter}
        visibleCount={filteredMessages.length}
        totalCount={messages.length}
        onFilterChange={onFilterChange}
      />

      <div className="flex min-h-0 flex-1">
        <div
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden"
          {...dragHandlers}
        >
          {pinnedMessages.length > 0 && (
            <button
              type="button"
              onClick={() => onFilterChange('pinned')}
              className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100/70"
            >
              <div className="rounded-lg bg-white px-2 py-1 text-xs font-black text-amber-600 shadow-sm">
                PIN
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-700">
                  {pinnedMessages.length} pesan dipin di channel ini
                </p>
                <p className="truncate text-xs text-amber-600/80">
                  {getMessagePreview(pinnedMessages[0])}
                </p>
              </div>
            </button>
          )}

          {activeRoom.archived && (
            <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
              <Archive size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold">Channel ini diarsipkan</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  Pesan lama tetap bisa dibaca, tapi pengiriman pesan dan file
                  dikunci sampai channel dipulihkan.
                </p>
              </div>
            </div>
          )}

          <MessageList
            messages={filteredMessages}
            emptyTitle={
              searchQuery || messageFilter !== 'all'
                ? 'Tidak ada pesan yang cocok'
                : undefined
            }
            emptyDescription={
              searchQuery || messageFilter !== 'all'
                ? 'Coba ubah kata pencarian atau filter pesan.'
                : undefined
            }
            typingUser={typingUser}
            onReply={onReply}
            onTogglePin={onTogglePin}
            onEdit={onEdit}
            onDelete={onDelete}
            onRetry={onRetryMessage}
            onToggleReaction={onToggleReaction}
            onPreviewFile={onPreviewFile}
            onDownloadFile={onDownloadFile}
            onCopyFileLink={onCopyFileLink}
            searchQuery={searchQuery}
            emptyActionLabel={
              searchQuery || messageFilter !== 'all'
                ? 'Reset pencarian'
                : 'Buka panel file'
            }
            onEmptyAction={
              searchQuery || messageFilter !== 'all' ? onClearSearch : onOpenFilePanel
            }
          />

          <ChatInput
            onSendMessage={onSendMessage}
            activeRoom={activeRoom?.name ?? 'channel ini'}
            draftFile={draftFile}
            onDraftFileChange={onDraftFileChange}
            replyTo={replyToMessage}
            onCancelReply={onCancelReply}
            isSending={isSending}
            disabled={!!activeRoom.archived}
            disabledReason="Channel ini diarsipkan. Pulihkan dulu untuk mengirim pesan."
          />

          {isDragging && (
            <div className="absolute inset-0 z-50 m-4 flex flex-col items-center justify-center rounded-2xl border-4 border-dashed border-blue-400 bg-white/90 backdrop-blur-sm">
              <div className="mb-4 rounded-full bg-blue-50 p-6 text-blue-600">
                <Sparkles size={48} strokeWidth={1.5} />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-800">
                Jatuhkan file di sini
              </h2>
              <p className="text-gray-500">
                Dokumen akan ditambahkan ke draft pesan di{' '}
                <span className="font-bold text-blue-600">
                  {activeRoom?.name ?? 'aktif'}
                </span>
              </p>
            </div>
          )}
        </div>

        {showFilePanel && (
          <FilePanel
            activeRoomName={activeRoom?.name}
            files={channelFiles}
            filteredFiles={filteredChannelFiles}
            category={fileCategory}
            notice={fileNotice}
            onCategoryChange={onFileCategoryChange}
            onClose={onCloseFilePanel}
            onPreview={onPreviewFile}
            onDownload={onDownloadFile}
            onEmptyUpload={onCloseFilePanel}
          />
        )}

        {selectedFileMessage && (
          <FilePreviewModal
            file={selectedFileMessage}
            onClose={() => onPreviewFile(null)}
            onDownload={onDownloadFile}
          />
        )}
      </div>
    </>
  );
}

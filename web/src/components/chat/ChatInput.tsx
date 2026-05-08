// src/components/chat/ChatInput.tsx
'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useGemini } from '@/hooks/useGemini';
import { Message } from '@/types';
import { formatFileSize } from '@/lib/workspaceUtils';

interface ChatInputProps {
  onSendMessage: (text: string, file?: File) => void;
  activeRoom: string;
  draftFile: File | null;
  onDraftFileChange: (file: File | null) => void;
  replyTo: Message | null;
  editingMessage?: Message | null;
  onCancelReply: () => void;
  onCancelEdit?: () => void;
  onSaveEdit?: (message: Message, text: string) => void | Promise<void>;
  isSending?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

export default function ChatInput({
  onSendMessage,
  activeRoom,
  draftFile,
  onDraftFileChange,
  replyTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  onSaveEdit,
  isSending = false,
  disabled = false,
  disabledReason,
}: ChatInputProps) {
  const [inputText, setInputText] = useState(editingMessage?.text ?? '');
  const [fileError, setFileError] = useState('');
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [fileAccept, setFileAccept] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const { polishText, isPolishing } = useGemini();
  const isDraftImage = !!draftFile?.type.startsWith('image/');
  const draftPreviewUrl = useMemo(
    () => (draftFile && isDraftImage ? URL.createObjectURL(draftFile) : ''),
    [draftFile, isDraftImage]
  );

  useEffect(() => {
    return () => {
      if (draftPreviewUrl) URL.revokeObjectURL(draftPreviewUrl);
    };
  }, [draftPreviewUrl]);

  useEffect(() => {
    return () => {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function handleDraftFileChange(file: File | null) {
    setFileError('');

    if (file && file.size > 10 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 10 MB.');
      onDraftFileChange(null);
      return;
    }

    onDraftFileChange(file);
  }

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (editingMessage) {
      if (!inputText.trim() || isSending || disabled) return;
      await onSaveEdit?.(editingMessage, inputText.trim());
      return;
    }

    if ((!inputText.trim() && !draftFile) || isSending || disabled) return;
    onSendMessage(inputText.trim(), draftFile ?? undefined);
    setInputText('');
    onDraftFileChange(null);
  };

  const handlePolish = async () => {
    if (!inputText.trim()) return;
    const result = await polishText(inputText);
    if (result) setInputText(result);
  };

  function openAttachmentPicker(accept: string) {
    setFileAccept(accept);
    setAttachmentOpen(false);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  async function startRecording() {
    if (disabled || isSending || editingMessage) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setFileError('Browser ini belum mendukung voice note.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
      };
      recorder.start();
      setIsRecording(true);
      setRecordingStartedAt(Date.now());
      setFileError('');
    } catch {
      setFileError('Izin mikrofon ditolak atau tidak tersedia.');
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = () => {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;

      const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
      const duration = recordingStartedAt
        ? Math.max(1, Math.round((Date.now() - recordingStartedAt) / 1000))
        : 1;
      const file = new File(
        [blob],
        `voice-note-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`,
        { type: 'audio/webm' }
      );

      onDraftFileChange(file);
      setInputText((current) => current || `Voice note ${duration} detik`);
      recordingChunksRef.current = [];
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setRecordingStartedAt(null);
    };
    recorder.stop();
  }

  function cancelRecording() {
    const recorder = mediaRecorderRef.current;
    recordingChunksRef.current = [];
    recorder?.stop();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingStartedAt(null);
  }

  return (
    <div className="z-10 shrink-0 border-t border-gray-100 bg-white p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        {draftFile && (
          <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white p-2 text-blue-600 shadow-sm">
                <FileText size={22} strokeWidth={1.7} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {draftFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(draftFile.size)} - siap dikirim
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDraftFileChange(null)}
                title="Hapus file dari draft"
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            {draftPreviewUrl && (
              <div className="mt-3 overflow-hidden rounded-xl border border-blue-100 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draftPreviewUrl}
                  alt={draftFile.name}
                  className="max-h-52 w-full object-contain"
                />
              </div>
            )}
          </div>
        )}

        {fileError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
            {fileError}
          </p>
        )}

        {isRecording && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-red-700 shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
              <div className="min-w-0">
                <p className="text-sm font-bold">Merekam voice note</p>
                <p className="truncate text-xs text-red-600/80">
                  Klik stop untuk menjadikan rekaman sebagai draft audio.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                title="Batalkan rekaman"
                className="rounded-lg bg-white p-2 text-red-500 transition-colors hover:bg-red-100"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={stopRecording}
                title="Stop rekaman"
                className="rounded-lg bg-red-600 p-2 text-white transition-colors hover:bg-red-700"
              >
                <Square size={16} fill="currentColor" />
              </button>
            </div>
          </div>
        )}

        {editingMessage && (
          <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50 p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 border-l-2 border-amber-400 pl-3">
                <p className="text-xs font-bold text-amber-700">
                  Edit pesan
                </p>
                <p className="mt-0.5 truncate text-xs text-amber-700/80">
                  {editingMessage.text}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onCancelEdit?.();
                  setInputText('');
                }}
                title="Batalkan edit"
                className="rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {replyTo && (
          <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 border-l-2 border-blue-400 pl-3">
                <p className="text-xs font-bold text-blue-700">
                  Membalas {replyTo.user}
                </p>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {replyTo.text ?? replyTo.fileName ?? 'Lampiran'}
                </p>
              </div>
              <button
                type="button"
                onClick={onCancelReply}
                title="Batalkan balasan"
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSend}
          className="flex items-end gap-1.5 rounded-xl border border-gray-200 bg-gray-50 p-2 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 sm:gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={fileAccept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              handleDraftFileChange(file);
              e.target.value = '';
            }}
          />
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setAttachmentOpen((current) => !current)}
              disabled={isSending || disabled || !!editingMessage}
              title="Lampirkan file"
              className="p-2.5 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Paperclip size={20} />
            </button>
            {attachmentOpen && (
              <div className="absolute bottom-full left-0 z-40 mb-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-xl">
                <button
                  type="button"
                  onClick={() => openAttachmentPicker('.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.js,.ts,.tsx,.jsx,.html,.css,.json,.md')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                >
                  <FileText size={16} />
                  Dokumen
                </button>
                <button
                  type="button"
                  onClick={() => openAttachmentPicker('image/*')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                >
                  <FileImage size={16} />
                  Gambar
                </button>
                <button
                  type="button"
                  onClick={() => openAttachmentPicker('video/*')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                >
                  <FileVideo size={16} />
                  Video
                </button>
                <button
                  type="button"
                  onClick={() => openAttachmentPicker('audio/*')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                >
                  <FileAudio size={16} />
                  Audio
                </button>
              </div>
            )}
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (!e.shiftKey || e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            disabled={isSending || disabled}
            placeholder={
              disabled
                ? disabledReason ?? 'Channel tidak bisa menerima pesan.'
                : editingMessage
                  ? 'Edit pesan...'
                  : `Kirim pesan ke ${activeRoom}, atau drag & drop dokumen...`
            }
            className="min-h-[44px] min-w-0 flex-1 max-h-32 resize-none border-none bg-transparent py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            rows={1}
          />

          {/* Tombol polish AI */}
          <button
            type="button"
            onClick={handlePolish}
            disabled={isPolishing || isSending || disabled || !inputText.trim()}
            title="Perbaiki teks dengan AI"
            className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isPolishing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Sparkles size={18} />
            )}
          </button>

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isSending || disabled || !!editingMessage}
            title={isRecording ? 'Stop voice note' : 'Rekam voice note'}
            className={`rounded-lg p-2.5 transition-colors shrink-0 disabled:cursor-not-allowed disabled:opacity-50 ${
              isRecording
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
          </button>

          {/* Tombol kirim */}
          <button
            type="submit"
            disabled={
              isSending ||
              disabled ||
              (editingMessage ? !inputText.trim() : !inputText.trim() && !draftFile)
            }
            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm"
          >
            {isSending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
                <Send size={18} className="translate-x-[1px]" />
            )}
          </button>
        </form>

        <p className="text-center mt-2 text-[10px] text-gray-400 font-medium">
          {disabled
            ? disabledReason ?? 'Channel ini sedang tidak menerima pesan.'
            : 'Tip: Seret file langsung ke area layar untuk membagikannya.'}
        </p>
      </div>
    </div>
  );
}

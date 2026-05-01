// src/components/chat/ChatInput.tsx
'use client';

import { useRef, useState, type FormEvent } from 'react';
import { FileText, Loader2, Paperclip, Send, Sparkles, X } from 'lucide-react';
import { useGemini } from '@/hooks/useGemini';
import { Message } from '@/types';

interface ChatInputProps {
  onSendMessage: (text: string, file?: File) => void;
  activeRoom: string;
  draftFile: File | null;
  onDraftFileChange: (file: File | null) => void;
  replyTo: Message | null;
  onCancelReply: () => void;
}

export default function ChatInput({
  onSendMessage,
  activeRoom,
  draftFile,
  onDraftFileChange,
  replyTo,
  onCancelReply,
}: ChatInputProps) {
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { polishText, isPolishing } = useGemini();

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !draftFile) return;
    onSendMessage(inputText.trim(), draftFile ?? undefined);
    setInputText('');
    onDraftFileChange(null);
  };

  const handlePolish = async () => {
    if (!inputText.trim()) return;
    const result = await polishText(inputText);
    if (result) setInputText(result);
  };

  return (
    <div className="p-4 bg-white shrink-0 border-t border-gray-100 z-10">
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
                  {(draftFile.size / 1024).toFixed(2)} KB - siap dikirim
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDraftFileChange(null)}
                title="Hapus file dari draft"
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
              >
                <X size={18} />
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
          className="bg-gray-50 border border-gray-200 rounded-xl flex items-end gap-2 p-2 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition-all shadow-sm"
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              onDraftFileChange(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Lampirkan file"
            className="p-2.5 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50 shrink-0"
          >
            <Paperclip size={20} />
          </button>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={`Kirim pesan ke ${activeRoom}, atau drag & drop dokumen...`}
            className="flex-1 bg-transparent border-none text-gray-800 focus:outline-none placeholder:text-gray-400 text-sm py-2.5 resize-none max-h-32 min-h-[44px]"
            rows={1}
          />

          {/* Tombol polish AI */}
          <button
            type="button"
            onClick={handlePolish}
            disabled={isPolishing || !inputText.trim()}
            title="Perbaiki teks dengan AI"
            className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isPolishing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Sparkles size={18} />
            )}
          </button>

          {/* Tombol kirim */}
          <button
            type="submit"
            disabled={!inputText.trim() && !draftFile}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm"
          >
            <Send size={18} className="translate-x-[1px]" />
          </button>
        </form>

        <p className="text-center mt-2 text-[10px] text-gray-400 font-medium">
          Tip: Seret file langsung ke area layar untuk membagikannya.
        </p>
      </div>
    </div>
  );
}

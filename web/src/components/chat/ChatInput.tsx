// src/components/chat/ChatInput.tsx
'use client';

import { useState } from 'react';
import { Paperclip, Send, Sparkles, Loader2 } from 'lucide-react';
import { useGemini } from '@/hooks/useGemini';
import { Message } from '@/types';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  activeRoom: string;
  messages: Message[];
}

export default function ChatInput({
  onSendMessage,
  activeRoom,
  messages,
}: ChatInputProps) {
  const [inputText, setInputText] = useState('');
  const { polishText, isPolishing } = useGemini();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handlePolish = async () => {
    if (!inputText.trim()) return;
    const result = await polishText(inputText);
    if (result) setInputText(result);
  };

  return (
    <div className="p-4 bg-white shrink-0 border-t border-gray-100 z-10">
      <div className="max-w-4xl mx-auto">
        <form
          onSubmit={handleSend}
          className="bg-gray-50 border border-gray-200 rounded-xl flex items-end gap-2 p-2 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition-all shadow-sm"
        >
          <button
            type="button"
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
            disabled={!inputText.trim()}
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
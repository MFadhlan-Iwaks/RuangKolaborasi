// src/app/(main)/workspace/page.tsx
'use client';

import { useState } from 'react';
import { Sparkles, Search, Bell, MoreVertical, Loader2, X } from 'lucide-react';
import { Message } from '@/types';
import Sidebar from '@/components/layout/Sidebar';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import { useGemini } from '@/hooks/useGemini';
import { useDragDrop } from '@/hooks/useDragDrop';

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    user: 'Rezza',
    avatar: 'bg-blue-500',
    time: '09:00',
    type: 'text',
    text: 'Pagi tim! Struktur database udah aku push ke repo ya. Tolong dicek.',
  },
  {
    id: 2,
    user: 'Sammi Zaki',
    avatar: 'bg-emerald-500',
    time: '09:15',
    type: 'text',
    text: 'Sip, nanti aku tarik buat disambungin ke form Next.js.',
  },
  {
    id: 3,
    user: 'Gibran',
    avatar: 'bg-amber-500',
    time: '09:30',
    type: 'text',
    text: 'Akses kamera di mobile udah bisa baca QR code. Tinggal nunggu endpoint dari Rezza.',
  },
];

export default function WorkspacePage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [activeRoom, setActiveRoom] = useState('Diskusi Utama');

  const { summarize, isSummarizing, summaryResult, clearSummary } = useGemini();
  const { isDragging, dragHandlers } = useDragDrop({ onFileDrop: handleFileDrop });

  function handleFileDrop(file: File) {
    const newMessage: Message = {
      id: messages.length + 1,
      user: 'Fadhlan (Kamu)',
      avatar: 'bg-indigo-600',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'file',
      fileName: file.name,
      fileSize: (file.size / 1024).toFixed(2) + ' KB',
    };
    setMessages((prev) => [...prev, newMessage]);
  }

  function handleSendMessage(text: string) {
    const newMessage: Message = {
      id: messages.length + 1,
      user: 'Fadhlan (Kamu)',
      avatar: 'bg-indigo-600',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      text,
    };
    setMessages((prev) => [...prev, newMessage]);
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-800 font-sans overflow-hidden">

      <Sidebar activeRoom={activeRoom} onRoomChange={setActiveRoom} />

      <div className="flex-1 flex flex-col bg-white">

        {/* Header */}
        <div className="h-16 px-6 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-lg text-gray-900">{activeRoom}</h2>
            <p className="text-xs text-gray-500">4 anggota tim ada di dalam ruang ini</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => summarize(messages)}
              disabled={isSummarizing || messages.length === 0}
              className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 border border-indigo-100"
            >
              {isSummarizing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              <span>Rangkum Diskusi</span>
            </button>
            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari pesan atau file..."
                className="pl-9 pr-4 py-1.5 bg-gray-100 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none w-64 transition-all"
              />
            </div>
            <button className="text-gray-400 hover:text-gray-600 relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col relative overflow-hidden" {...dragHandlers}>

          <MessageList messages={messages} />

          <ChatInput
            onSendMessage={handleSendMessage}
            activeRoom={activeRoom}
            messages={messages}
          />

          {/* Overlay drag & drop */}
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center m-4 rounded-2xl border-4 border-dashed border-blue-400">
              <div className="bg-blue-50 text-blue-600 p-6 rounded-full mb-4">
                <Sparkles size={48} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Jatuhkan file di sini
              </h2>
              <p className="text-gray-500">
                Dokumen akan diunggah ke ruang{' '}
                <span className="font-bold text-blue-600">{activeRoom}</span>
              </p>
            </div>
          )}

          {/* Modal rangkuman */}
          {(isSummarizing || summaryResult) && (
            <div className="absolute inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
                  <div className="flex items-center space-x-2 text-indigo-700">
                    <Sparkles size={20} className={isSummarizing ? 'animate-pulse' : ''} />
                    <h3 className="font-bold text-lg">Rangkuman Diskusi</h3>
                  </div>
                  <button
                    onClick={clearSummary}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                  {isSummarizing ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4 text-indigo-600">
                      <Loader2 size={32} className="animate-spin" />
                      <p className="font-medium text-sm animate-pulse">
                        Gemini sedang membaca histori chat...
                      </p>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {summaryResult}
                    </div>
                  )}
                </div>
                {!isSummarizing && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={clearSummary}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
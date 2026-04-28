// src/components/chat/MessageBubble.tsx
import { FileText } from 'lucide-react';
import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className="flex items-start space-x-4 group">

      {/* Avatar */}
      <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm ${message.avatar}`}>
        {message.user.charAt(0)}
      </div>

      {/* Konten */}
      <div className="flex-1 min-w-0">
        {/* Nama & waktu */}
        <div className="flex items-baseline space-x-2 mb-1">
          <span className="font-bold text-gray-900 text-sm">{message.user}</span>
          <span className="text-xs text-gray-400 font-medium">{message.time}</span>
        </div>

        {/* Isi pesan */}
        {message.type === 'text' ? (
          <p className="text-gray-700 text-sm leading-relaxed">{message.text}</p>
        ) : (
          <div className="mt-2 w-72 bg-white border border-gray-200 rounded-lg p-3 flex items-start space-x-3 shadow-sm hover:shadow-md cursor-pointer transition-shadow group/file">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover/file:bg-blue-100 transition-colors">
              <FileText size={24} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {message.fileName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {message.fileSize} · Dokumen
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
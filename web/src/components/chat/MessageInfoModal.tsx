'use client';

import { CheckCheck, FileText, Info, Pin, Star, X } from 'lucide-react';
import { Message } from '@/types';

interface MessageInfoModalProps {
  message: Message;
  onClose: () => void;
}

export default function MessageInfoModal({ message, onClose }: MessageInfoModalProps) {
  const rows = [
    ['Pengirim', message.user],
    ['Waktu', message.time],
    ['Tipe', message.type === 'file' ? 'File' : 'Teks'],
    ['Status', message.deliveryStatus ?? 'terkirim'],
    ['Diedit', message.edited ? 'Ya' : 'Tidak'],
    ['Dipin', message.pinned ? 'Ya' : 'Tidak'],
    ['Bintang', message.starred ? 'Ya' : 'Tidak'],
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Info size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Info Pesan</h3>
              <p className="text-xs text-gray-500">
                Detail pesan yang dipilih.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="line-clamp-4 text-sm leading-6 text-gray-700">
              {message.deletedForEveryone
                ? 'Pesan ini telah dihapus.'
                : message.text ?? message.fileName ?? 'Lampiran'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
              {message.type === 'file' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
                  <FileText size={12} />
                  {message.fileSize ?? 'File'}
                </span>
              )}
              {message.pinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-600">
                  <Pin size={12} />
                  Pinned
                </span>
              )}
              {message.starred && (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1 text-yellow-600">
                  <Star size={12} fill="currentColor" />
                  Bintang
                </span>
              )}
              {message.isMine && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-blue-600">
                  <CheckCheck size={12} />
                  Milik kamu
                </span>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  {label}
                </span>
                <span className="text-right text-sm font-semibold text-gray-700">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

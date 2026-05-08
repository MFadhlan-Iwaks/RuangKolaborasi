'use client';

import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { Message } from '@/types';
import { getMessagePreview } from '@/lib/workspaceUtils';

interface DeleteMessageModalProps {
  message: Message;
  onClose: () => void;
  onConfirm: (messageId: Message['id']) => void;
  isDeleting?: boolean;
}

export default function DeleteMessageModal({
  message,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteMessageModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-red-50 p-2 text-red-600">
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Hapus Pesan
              </h3>
              <p className="text-xs text-gray-500">
                Pesan akan hilang dari tampilan diskusi.
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

        <div className="px-6 py-5">
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-bold text-red-700">
                  Yakin ingin menghapus pesan ini?
                </p>
                <p className="mt-1 line-clamp-3 text-xs leading-5 text-red-600">
                  {getMessagePreview(message)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(message.id)}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting && <Loader2 size={15} className="animate-spin" />}
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

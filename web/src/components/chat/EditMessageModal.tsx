'use client';

import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Message } from '@/types';

interface EditMessageModalProps {
  message: Message;
  onClose: () => void;
  onSave: (message: Message, text: string) => void;
}

export default function EditMessageModal({
  message,
  onClose,
  onSave,
}: EditMessageModalProps) {
  const [text, setText] = useState(message.text ?? '');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (message.type === 'text' && !text.trim()) return;
    onSave(message, text.trim());
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Edit Pesan</h3>
            <p className="text-xs text-gray-500">
              Perbarui isi pesan atau caption lampiran.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5">
          {message.type === 'file' && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="truncate text-xs font-semibold text-blue-700">
                {message.fileName}
              </p>
              <p className="text-[11px] text-blue-600">
                Caption file boleh dikosongkan.
              </p>
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={
              message.type === 'file' ? 'Tulis caption file...' : 'Tulis pesan...'
            }
            className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={message.type === 'text' && !text.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}

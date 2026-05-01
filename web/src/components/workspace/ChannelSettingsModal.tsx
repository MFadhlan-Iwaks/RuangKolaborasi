'use client';

import { useState, type FormEvent } from 'react';
import { Archive, Hash, RotateCcw, Star, X } from 'lucide-react';
import { Room } from '@/types';

interface ChannelSettingsModalProps {
  room: Room;
  messageCount: number;
  fileCount: number;
  onClose: () => void;
  onUpdate: (updates: Pick<Room, 'name' | 'description' | 'favorite'>) => void;
  onArchiveToggle: () => void;
}

export default function ChannelSettingsModal({
  room,
  messageCount,
  fileCount,
  onClose,
  onUpdate,
  onArchiveToggle,
}: ChannelSettingsModalProps) {
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? '');
  const [favorite, setFavorite] = useState(!!room.favorite);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;

    onUpdate({
      name: name.trim(),
      description: description.trim(),
      favorite,
    });
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Hash size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Pengaturan Channel
              </h3>
              <p className="text-xs text-gray-500">
                Kelola nama, deskripsi, favorit, dan status arsip.
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

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Pesan
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {messageCount}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                File
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">{fileCount}</p>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-600">
              Nama channel
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-600">Deskripsi</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Channel ini dipakai untuk..."
              className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <button
            type="button"
            onClick={() => setFavorite((current) => !current)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
              favorite
                ? 'border-amber-100 bg-amber-50 text-amber-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>
              <span className="block text-sm font-bold">Channel Favorit</span>
              <span className="text-xs">
                Tampilkan channel ini di bagian Favorit sidebar.
              </span>
            </span>
            <Star size={18} fill={favorite ? 'currentColor' : 'none'} />
          </button>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-bold text-gray-900">
              {room.archived ? 'Pulihkan channel' : 'Arsipkan channel'}
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              {room.archived
                ? 'Channel akan kembali muncul di daftar Ruang Diskusi.'
                : 'Channel dipindahkan ke Arsip tanpa menghapus pesan.'}
            </p>
            <button
              type="button"
              onClick={onArchiveToggle}
              className={`mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors ${
                room.archived
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-slate-700 hover:bg-slate-800'
              }`}
            >
              {room.archived ? <RotateCcw size={14} /> : <Archive size={14} />}
              {room.archived ? 'Pulihkan Channel' : 'Arsipkan Channel'}
            </button>
          </div>
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
            disabled={!name.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Simpan Channel
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { AlertTriangle, Hash, Loader2, Trash2, X } from 'lucide-react';
import { Room, Workspace } from '@/types';

interface CreateChannelModalProps {
  workspaceName: string;
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
  isCreating?: boolean;
}

export function CreateChannelModal({
  workspaceName,
  onClose,
  onCreate,
  isCreating = false,
}: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const descriptionLimit = 160;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || isCreating) return;
    onCreate(name.trim(), description.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Hash size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Buat Channel Baru
              </h3>
              <p className="text-xs text-gray-500">
                Channel akan dibuat di {workspaceName}.
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
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-600">
              Nama channel
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Sprint Minggu Ini"
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="flex items-center justify-between text-xs font-semibold text-gray-600">
              <span>Deskripsi</span>
              <span className="font-medium text-gray-400">
                {description.length}/{descriptionLimit}
              </span>
            </span>
            <textarea
              value={description}
              maxLength={descriptionLimit}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Channel ini dipakai untuk..."
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isCreating || !name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating && <Loader2 size={15} className="animate-spin" />}
            Buat Channel
          </button>
        </div>
      </form>
    </div>
  );
}

interface DeleteChannelModalProps {
  activeRoom?: Room;
  workspace: Workspace;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteChannelModal({
  activeRoom,
  workspace,
  isDeleting = false,
  onClose,
  onConfirm,
}: DeleteChannelModalProps) {
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
                Hapus Ruang Diskusi
              </h3>
              <p className="text-xs text-gray-500">
                Menghapus ruang yang sedang dibuka.
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
          {!activeRoom ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-gray-900">
                Belum ada ruang diskusi
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Buat channel terlebih dahulu sebelum menghapus.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-bold text-red-700">
                    Yakin ingin menghapus ruang ini?
                  </p>
                  <p className="mt-1 text-xs leading-5 text-red-600">
                    Semua pesan mock di channel{' '}
                    <span className="font-bold">{activeRoom.name}</span> dari{' '}
                    {workspace.name} akan ikut hilang dari tampilan frontend.
                  </p>
                </div>
              </div>
            </div>
          )}
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
            onClick={onConfirm}
            disabled={isDeleting || !activeRoom}
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

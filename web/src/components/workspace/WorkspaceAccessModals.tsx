'use client';

import { useState, type FormEvent } from 'react';
import { Building2, LogIn, X } from 'lucide-react';

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

export function CreateWorkspaceModal({
  onClose,
  onCreate,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim());
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Buat Grup Baru
              </h3>
              <p className="text-xs text-gray-500">
                Buat workspace untuk tim atau proyek lain.
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
            <span className="text-xs font-semibold text-gray-600">Nama grup</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Tim Capstone"
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-600">Deskripsi</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Grup ini dipakai untuk..."
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            />
          </label>
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
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buat Grup
          </button>
        </div>
      </form>
    </div>
  );
}

interface JoinWorkspaceModalProps {
  feedback: string;
  onClose: () => void;
  onJoin: (code: string) => void;
  onFeedbackClear: () => void;
}

export function JoinWorkspaceModal({
  feedback,
  onClose,
  onJoin,
  onFeedbackClear,
}: JoinWorkspaceModalProps) {
  const [code, setCode] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onJoin(code);
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <LogIn size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Join Grup</h3>
              <p className="text-xs text-gray-500">
                Masukkan kode invite dari teman satu tim.
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
              Kode invite
            </span>
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                onFeedbackClear();
              }}
              placeholder="Contoh: PABP-2026"
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-semibold uppercase tracking-wide text-gray-900 outline-none transition-all placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          {feedback && (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
              {feedback}
            </p>
          )}
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
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Join Grup
          </button>
        </div>
      </form>
    </div>
  );
}

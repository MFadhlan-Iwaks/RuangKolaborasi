'use client';

import { ChangeEvent, useState } from 'react';
import { Camera, Maximize2, X } from 'lucide-react';
import { Status } from '@/types';
import { STATUS_CONFIG } from '@/components/ui/StatusMenu';

interface UserProfileModalProps {
  name: string;
  email: string;
  initial: string;
  photoUrl?: string;
  bio: string;
  status: Status;
  onClose: () => void;
  onSave: (profile: { name: string; photoUrl?: string; bio: string }) => void;
}

export default function UserProfileModal({
  name,
  email,
  initial,
  photoUrl,
  bio,
  status,
  onClose,
  onSave,
}: UserProfileModalProps) {
  const currentStatus = STATUS_CONFIG[status];
  const StatusIcon = currentStatus.icon;
  const [draftName, setDraftName] = useState(name);
  const [draftPhotoUrl, setDraftPhotoUrl] = useState(photoUrl);
  const [draftBio, setDraftBio] = useState(bio);
  const [previewOpen, setPreviewOpen] = useState(false);
  const bioCharactersLeft = 120 - draftBio.length;

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setDraftPhotoUrl(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!draftName.trim()) return;

    onSave({
      name: draftName.trim(),
      photoUrl: draftPhotoUrl,
      bio: draftBio.trim() || 'Tidak ada bio.',
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Profil Pengguna</h3>
            <p className="text-sm text-gray-500">Informasi akun web saat ini.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="relative">
              {draftPhotoUrl ? (
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  title="Lihat foto profil"
                  className="group relative rounded-full focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={draftPhotoUrl}
                    alt={draftName}
                    className="h-20 w-20 rounded-full object-cover shadow-sm"
                  />
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
                    <Maximize2 size={18} />
                  </span>
                </button>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-xl font-black text-white shadow-sm">
                  {initial}
                </div>
              )}
              <span
                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${currentStatus.bgColor}`}
              />
              <label
                title="Ganti foto profil"
                className="absolute bottom-0 left-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-colors hover:bg-gray-700"
              >
                <Camera size={15} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="min-w-0">
              <h4 className="truncate text-xl font-black text-gray-900">{draftName}</h4>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-600">
                {draftBio || 'Tidak ada bio.'}
              </p>
              <p className="truncate text-sm text-gray-500">{email}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                <StatusIcon size={12} className={currentStatus.color} />
                {currentStatus.label}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Nama pengguna
              </span>
              <input
                value={draftName}
                maxLength={40}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Nama yang tampil di chat"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
              />
            </label>

            <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="profile-bio"
                className="text-xs font-bold uppercase tracking-wide text-gray-400"
              >
                Bio
              </label>
              <span
                className={`text-xs font-semibold ${
                  bioCharactersLeft < 0 ? 'text-red-500' : 'text-gray-400'
                }`}
              >
                {bioCharactersLeft}
              </span>
            </div>
            <textarea
              id="profile-bio"
              value={draftBio}
              maxLength={120}
              onChange={(event) => setDraftBio(event.target.value)}
              rows={3}
              placeholder="Tulis bio singkat..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            />
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="mr-2 rounded-lg px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!draftName.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
      </div>
      {previewOpen && draftPhotoUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/85 p-6 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            title="Tutup preview"
          >
            <X size={22} />
          </button>
          <div className="max-w-xl text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draftPhotoUrl}
              alt={draftName}
              className="max-h-[78vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <p className="mt-4 text-sm font-bold text-white">{draftName}</p>
            <p className="mt-1 text-xs text-white/60">{email}</p>
          </div>
        </div>
      )}
    </div>
  );
}

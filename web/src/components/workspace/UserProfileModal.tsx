'use client';

import { ChangeEvent, useState } from 'react';
import { Camera, X } from 'lucide-react';
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
  onSave: (profile: { photoUrl?: string; bio: string }) => void;
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
  const [draftPhotoUrl, setDraftPhotoUrl] = useState(photoUrl);
  const [draftBio, setDraftBio] = useState(bio);
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
    onSave({
      photoUrl: draftPhotoUrl,
      bio: draftBio.trim() || 'Tidak ada bio.',
    });
    onClose();
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
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
          <div className="flex items-center gap-4">
            <div className="relative">
              {draftPhotoUrl ? (
                <img
                  src={draftPhotoUrl}
                  alt={name}
                  className="h-20 w-20 rounded-full object-cover shadow-sm"
                />
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
              <h4 className="truncate text-xl font-black text-gray-900">{name}</h4>
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

          <div className="mt-6">
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
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

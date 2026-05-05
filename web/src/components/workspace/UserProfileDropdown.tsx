'use client';

import { LogOut, Settings, UserRound } from 'lucide-react';
import { Status } from '@/types';
import { STATUS_CONFIG } from '@/components/ui/StatusMenu';

interface UserProfileDropdownProps {
  name: string;
  email: string;
  initial: string;
  photoUrl?: string;
  bio: string;
  status: Status;
  role?: string;
  open: boolean;
  onToggle: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export default function UserProfileDropdown({
  name,
  email,
  initial,
  photoUrl,
  bio,
  status,
  role,
  open,
  onToggle,
  onOpenProfile,
  onLogout,
}: UserProfileDropdownProps) {
  const currentStatus = STATUS_CONFIG[status];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        title="Profil pengguna"
        className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors ${
          open
            ? 'border-blue-100 bg-blue-50'
            : 'border-gray-200 bg-white hover:bg-gray-50'
        }`}
      >
        <div className="relative">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">
              {initial}
            </div>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${currentStatus.bgColor}`}
          />
        </div>
        <div className="hidden max-w-28 text-left lg:block">
          <p className="truncate text-xs font-bold text-gray-900">{name}</p>
          <p className={`truncate text-[11px] font-semibold ${currentStatus.color}`}>
            {currentStatus.label}
          </p>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={name}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">
                    {initial}
                  </div>
                )}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${currentStatus.bgColor}`}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">{name}</p>
                <p className="truncate text-xs text-gray-500">{bio}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  {role ?? 'Member'}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-gray-400">{email}</p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <UserRound size={16} className="text-gray-400" />
              Profil saya
            </button>
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Settings size={16} className="text-gray-400" />
              Pengaturan akun
            </button>
          </div>

          <div className="border-t border-gray-100 p-2">
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={16} />
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

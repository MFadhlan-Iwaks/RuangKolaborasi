'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Copy,
  ImageOff,
  Loader2,
  LogOut,
  Palette,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { TeamMember, Workspace } from '@/types';

const COLOR_OPTIONS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-rose-600',
  'bg-amber-500',
  'bg-slate-700',
];

type SettingsTab = 'general' | 'members' | 'access';

interface WorkspaceSettingsModalProps {
  workspace: Workspace;
  members: TeamMember[];
  canLeave: boolean;
  canManageWorkspace: boolean;
  isSaving?: boolean;
  isLeaving?: boolean;
  onClose: () => void;
  onUpdate: (updates: Pick<Workspace, 'name' | 'shortName' | 'description' | 'color' | 'photoUrl'>) => void;
  onLeave: () => void;
}

export default function WorkspaceSettingsModal({
  workspace,
  members,
  canLeave,
  canManageWorkspace,
  isSaving = false,
  isLeaving = false,
  onClose,
  onUpdate,
  onLeave,
}: WorkspaceSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [name, setName] = useState(workspace.name);
  const [shortName, setShortName] = useState(workspace.shortName);
  const [description, setDescription] = useState(workspace.description);
  const [color, setColor] = useState(workspace.color);
  const [photoUrl, setPhotoUrl] = useState(workspace.photoUrl);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const descriptionLimit = 160;
  const tabs: Array<{ id: SettingsTab; label: string; count?: number }> = [
    { id: 'general', label: 'Umum' },
    { id: 'members', label: 'Anggota', count: members.length },
    { id: 'access', label: 'Akses' },
  ];

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManageWorkspace || !name.trim() || !shortName.trim() || isSaving) return;

    onUpdate({
      name: name.trim(),
      shortName: shortName.trim().slice(0, 3).toUpperCase(),
      description: description.trim(),
      color,
      photoUrl,
    });
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  async function handleCopyInviteCode() {
    try {
      await navigator.clipboard.writeText(workspace.inviteCode);
    } finally {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={name}
                className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${color}`}>
                {shortName.slice(0, 3).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-gray-900">
                Pengaturan Grup
              </h3>
              <p className="truncate text-xs text-gray-500">
                {canManageWorkspace
                  ? 'Kelola identitas, anggota, dan akses workspace.'
                  : 'Lihat anggota, kode invite, dan akses workspace.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isLeaving}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-gray-100 px-6 pt-4">
          <div className="grid grid-cols-3 rounded-xl bg-gray-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
                {typeof tab.count === 'number' && (
                  <span className="ml-1 text-[10px] opacity-70">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeTab === 'general' && (
            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Settings size={16} className="text-gray-400" />
                Identitas Grup
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt={name}
                      className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-sm"
                    />
                  ) : (
                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-sm ${color}`}>
                      {shortName.slice(0, 3).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      Foto profil grup
                    </p>
                    <p className="mt-1 max-w-md text-xs leading-5 text-gray-500">
                      Foto ini tampil di daftar grup dan header workspace web.
                    </p>
                  </div>
                </div>

                {canManageWorkspace && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700">
                      <Camera size={14} />
                      Ganti Foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        disabled={isSaving}
                        className="hidden"
                      />
                    </label>
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl(undefined)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ImageOff size={14} />
                        Hapus
                      </button>
                    )}
                  </div>
                )}
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">
                  Nama grup
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canManageWorkspace || isSaving}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-gray-600">
                    Ikon teks
                  </span>
                  <input
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value.toUpperCase())}
                    maxLength={3}
                    disabled={!canManageWorkspace || isSaving}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-bold uppercase tracking-wide text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
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
                    rows={2}
                    disabled={!canManageWorkspace || isSaving}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <Palette size={14} />
                  Warna badge grup
                </div>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      disabled={!canManageWorkspace || isSaving}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${option}`}
                    >
                      {color === option && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Batal
                </button>
                {canManageWorkspace && (
                  <button
                    type="submit"
                    disabled={isSaving || !name.trim() || !shortName.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving && <Loader2 size={15} className="animate-spin" />}
                    Simpan Perubahan
                  </button>
                )}
              </div>
            </form>
          )}

          {activeTab === 'members' && (
            <div className="space-y-3 p-6">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Users size={16} className="text-gray-400" />
                Anggota & Role
              </div>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2"
                  >
                    {member.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${member.avatar}`}
                      >
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {member.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {member.bio || member.email}
                      </p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'access' && (
            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Kode invite
                </p>
                {canManageWorkspace && workspace.inviteCode ? (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-bold tracking-wide text-gray-800">
                      {workspace.inviteCode}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyInviteCode}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-500">
                    Kode invite hanya dapat dilihat oleh owner atau admin.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-bold text-red-700">
                      Keluar dari grup
                    </p>
                    <p className="mt-1 text-xs leading-5 text-red-600">
                      Grup akan hilang dari sidebar workspace lokal.
                    </p>
                  </div>
                </div>

                {confirmLeave ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmLeave(false)}
                      disabled={isLeaving}
                      className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={onLeave}
                      disabled={!canLeave || isLeaving}
                      className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLeaving ? 'Keluar...' : 'Ya, Keluar'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(true)}
                    disabled={!canLeave || isLeaving}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LogOut size={14} />
                    Keluar Grup
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

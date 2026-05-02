'use client';

import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
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

interface WorkspaceSettingsModalProps {
  workspace: Workspace;
  members: TeamMember[];
  canLeave: boolean;
  onClose: () => void;
  onUpdate: (updates: Pick<Workspace, 'name' | 'shortName' | 'description' | 'color'>) => void;
  onLeave: () => void;
}

export default function WorkspaceSettingsModal({
  workspace,
  members,
  canLeave,
  onClose,
  onUpdate,
  onLeave,
}: WorkspaceSettingsModalProps) {
  const [name, setName] = useState(workspace.name);
  const [shortName, setShortName] = useState(workspace.shortName);
  const [description, setDescription] = useState(workspace.description);
  const [color, setColor] = useState(workspace.color);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !shortName.trim()) return;

    onUpdate({
      name: name.trim(),
      shortName: shortName.trim().slice(0, 3).toUpperCase(),
      description: description.trim(),
      color,
    });
  }

  async function handleCopyInviteCode() {
    try {
      await navigator.clipboard.writeText(workspace.inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white ${color}`}>
              {shortName.slice(0, 3).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Pengaturan Grup
              </h3>
              <p className="text-xs text-gray-500">
                Kelola identitas, invite, dan anggota workspace.
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

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1fr_20rem]">
          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Settings size={16} className="text-gray-400" />
              Identitas Grup
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-gray-600">
                Nama grup
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-bold uppercase tracking-wide text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">
                  Deskripsi
                </span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm ${option}`}
                  >
                    {color === option && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Kode invite
              </p>
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
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!name.trim() || !shortName.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>

          <aside className="border-t border-gray-100 bg-gray-50 p-5 md:border-l md:border-t-0">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
              <Users size={16} className="text-gray-400" />
              Anggota & Role
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${member.avatar}`}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {member.name}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {member.email}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4">
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
                    className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-600"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={onLeave}
                    disabled={!canLeave}
                    className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Ya, Keluar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmLeave(true)}
                  disabled={!canLeave}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LogOut size={14} />
                  Keluar Grup
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

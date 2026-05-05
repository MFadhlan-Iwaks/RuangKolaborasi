'use client';

import { useState, type FormEvent } from 'react';
import { Mail, UserPlus, Users, X } from 'lucide-react';
import { TeamMember, Workspace } from '@/types';

interface InviteConfirmation {
  id: string;
  email: string;
  workspaceName: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface InviteMemberModalProps {
  workspace: Workspace;
  members: TeamMember[];
  invites: InviteConfirmation[];
  message: string;
  onClose: () => void;
  onInvite: (email: string, role: TeamMember['role']) => void;
  onAcceptInvite: (inviteId: string) => void;
  onDeclineInvite: (inviteId: string) => void;
  onMessageClear: () => void;
}

export default function InviteMemberModal({
  workspace,
  members,
  invites,
  message,
  onClose,
  onInvite,
  onAcceptInvite,
  onDeclineInvite,
  onMessageClear,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('Member');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onInvite(email, role);
    setEmail('');
    setRole('Member');
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Invite Anggota
              </h3>
              <p className="text-xs text-gray-500">
                Undang teman ke {workspace.name}.
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

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-[1fr_8rem]">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-gray-600">
                Email user
              </span>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    onMessageClear();
                  }}
                  placeholder="teman@kampus.ac.id"
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-gray-600">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TeamMember['role'])}
                className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              >
                <option>Member</option>
                <option>Admin</option>
              </select>
            </label>
          </div>

          {message && (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
              {message}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Kode grup: {workspace.inviteCode}
            </p>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <UserPlus size={16} />
              Kirim Invite
            </button>
          </div>
        </form>

        <div className="border-t border-gray-100 px-6 py-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
            <Mail size={16} className="text-gray-400" />
            Konfirmasi Invite
          </div>
          {invites.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-3 py-3 text-xs font-medium text-gray-500">
              Belum ada invite yang menunggu konfirmasi.
            </p>
          ) : (
            <div className="space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-lg border border-gray-100 bg-white px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">
                        {invite.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        Invite ke {invite.workspaceName}
                      </p>
                    </div>
                    {invite.status === 'pending' ? (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => onAcceptInvite(invite.id)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                        >
                          Gabung
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeclineInvite(invite.id)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          Tolak
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                          invite.status === 'accepted'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {invite.status === 'accepted' ? 'Diterima' : 'Ditolak'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
            <Users size={16} className="text-gray-400" />
            Anggota Workspace
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
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
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    member.status === 'active'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  {member.status === 'active' ? 'Aktif' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, Mail, UserPlus, X } from 'lucide-react';
import { TeamMember, Workspace } from '@/types';

interface InviteConfirmation {
  id: string;
  email: string;
  workspaceName: string;
  status: 'pending' | 'accepted' | 'declined';
  direction: 'incoming' | 'outgoing';
}

interface InviteMemberModalProps {
  workspace: Workspace;
  members: TeamMember[];
  invites: InviteConfirmation[];
  message: string;
  isInviting?: boolean;
  onClose: () => void;
  onInvite: (email: string, role: TeamMember['role']) => void;
  onAcceptInvite: (inviteId: string) => void;
  onDeclineInvite: (inviteId: string) => void;
  onMessageClear: () => void;
}

type InviteTab = 'sent' | 'incoming' | 'members';

export default function InviteMemberModal({
  workspace,
  members,
  invites,
  message,
  isInviting = false,
  onClose,
  onInvite,
  onAcceptInvite,
  onDeclineInvite,
  onMessageClear,
}: InviteMemberModalProps) {
  const [activeTab, setActiveTab] = useState<InviteTab>('sent');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('Member');
  const outgoingInvites = invites.filter((invite) => invite.direction === 'outgoing');
  const incomingInvites = invites.filter((invite) => invite.direction === 'incoming');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isInviting) return;
    onInvite(email, role);
    setEmail('');
    setRole('Member');
  }

  const tabs: Array<{ id: InviteTab; label: string; count?: number }> = [
    { id: 'sent', label: 'Kirim', count: outgoingInvites.length },
    { id: 'incoming', label: 'Masuk', count: incomingInvites.length },
    { id: 'members', label: 'Anggota', count: members.length },
  ];

  function renderInviteStatus(invite: InviteConfirmation) {
    if (invite.status === 'pending') {
      return (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onAcceptInvite(invite.id)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
          >
            {invite.direction === 'incoming' ? 'Gabung' : 'Tandai diterima'}
          </button>
          <button
            type="button"
            onClick={() => onDeclineInvite(invite.id)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
          >
            {invite.direction === 'incoming' ? 'Tolak' : 'Batalkan'}
          </button>
        </div>
      );
    }

    return (
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
          invite.status === 'accepted'
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-gray-100 text-gray-500'
        }`}
      >
        {invite.status === 'accepted' ? 'Diterima' : 'Ditolak'}
      </span>
    );
  }

  function renderInviteList(items: InviteConfirmation[], emptyText: string) {
    if (items.length === 0) {
      return (
        <p className="rounded-lg bg-gray-50 px-3 py-3 text-xs font-medium text-gray-500">
          {emptyText}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((invite) => (
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
                  {invite.direction === 'incoming' ? 'Undangan ke' : 'Invite ke'}{' '}
                  {invite.workspaceName}
                </p>
              </div>
              {renderInviteStatus(invite)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
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
                Undang atau konfirmasi akses ke {workspace.name}.
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

        <div className="border-b border-gray-100 px-6 pt-4">
          <div className="grid grid-cols-3 rounded-xl bg-gray-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-600 shadow-sm'
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'sent' && (
            <div className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-4">
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
                        disabled={isInviting}
                        placeholder="teman@kampus.ac.id"
                        className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:opacity-70"
                      />
                    </div>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-gray-600">
                      Role
                    </span>
                    <select
                      value={role}
                      disabled={isInviting}
                      onChange={(e) =>
                        setRole(e.target.value as TeamMember['role'])
                      }
                      className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:opacity-70"
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
                    disabled={isInviting || !email.trim()}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isInviting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <UserPlus size={16} />
                    )}
                    Kirim Invite
                  </button>
                </div>
              </form>

              {renderInviteList(
                outgoingInvites,
                'Belum ada invite keluar untuk workspace ini.'
              )}
            </div>
          )}

          {activeTab === 'incoming' &&
            renderInviteList(incomingInvites, 'Belum ada undangan masuk.')}

          {activeTab === 'members' && (
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
          )}
        </div>
      </div>
    </div>
  );
}

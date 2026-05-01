'use client';

import {
  Bell,
  SlidersHorizontal,
  Files,
  Hash,
  Loader2,
  MoreVertical,
  Search,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { Room, Workspace } from '@/types';

interface WorkspaceHeaderProps {
  activeRoom?: Room;
  activeWorkspace: Workspace;
  memberCount: number;
  searchQuery: string;
  showFilePanel: boolean;
  isSummarizing: boolean;
  canSummarize: boolean;
  onSearchChange: (query: string) => void;
  onInvite: () => void;
  onSummarize: () => void;
  onToggleFilePanel: () => void;
  onOpenChannelSettings: () => void;
  onOpenSettings: () => void;
}

export default function WorkspaceHeader({
  activeRoom,
  activeWorkspace,
  memberCount,
  searchQuery,
  showFilePanel,
  isSummarizing,
  canSummarize,
  onSearchChange,
  onInvite,
  onSummarize,
  onToggleFilePanel,
  onOpenChannelSettings,
  onOpenSettings,
}: WorkspaceHeaderProps) {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Hash size={18} className="text-gray-400" />
          <h2 className="truncate text-lg font-bold text-gray-900">
            {activeRoom?.name ?? 'Tanpa Channel'}
          </h2>
        </div>
        <p className="truncate text-xs text-gray-500">
          {activeRoom?.description ?? activeWorkspace.description} {memberCount}{' '}
          anggota di {activeWorkspace.name}.
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={onInvite}
          className="hidden items-center space-x-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 md:flex"
        >
          <UserPlus size={16} />
          <span>Invite</span>
        </button>
        <button
          onClick={onSummarize}
          disabled={isSummarizing || !canSummarize}
          className="hidden items-center space-x-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-50 md:flex"
        >
          {isSummarizing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          <span>Rangkum Diskusi</span>
        </button>
        <button
          onClick={onToggleFilePanel}
          className={`hidden items-center space-x-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors md:flex ${
            showFilePanel
              ? 'border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Files size={16} />
          <span>File</span>
        </button>
        <button
          onClick={onOpenChannelSettings}
          disabled={!activeRoom}
          className="hidden items-center space-x-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 md:flex"
        >
          <SlidersHorizontal size={16} />
          <span>Channel</span>
        </button>
        <div className="relative hidden md:block">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari pesan atau file..."
            className="w-64 rounded-full bg-gray-100 py-1.5 pl-9 pr-4 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <button className="relative text-gray-400 hover:text-gray-600">
          <Bell size={20} />
          <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          title="Pengaturan grup"
          className="text-gray-400 hover:text-gray-600"
        >
          <MoreVertical size={20} />
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SlidersHorizontal,
  Files,
  Hash,
  Loader2,
  MoreVertical,
  Search,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { NotificationItem, Room, Status, Workspace } from '@/types';
import NotificationDropdown from './NotificationDropdown';
import UserProfileDropdown from './UserProfileDropdown';

interface WorkspaceHeaderProps {
  activeRoom?: Room;
  activeWorkspace: Workspace;
  memberCount: number;
  currentUserName: string;
  currentUserEmail: string;
  currentUserInitial: string;
  currentUserPhotoUrl?: string;
  currentUserBio: string;
  currentUserStatus: Status;
  notifications: NotificationItem[];
  searchQuery: string;
  showFilePanel: boolean;
  isSummarizing: boolean;
  canSummarize: boolean;
  canManageWorkspace: boolean;
  onSearchChange: (query: string) => void;
  onInvite: () => void;
  onSummarize: () => void;
  onToggleFilePanel: () => void;
  onOpenChannelSettings: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onAcceptInvite: (notification: NotificationItem) => void;
  onDeclineInvite: (notification: NotificationItem) => void;
}

export default function WorkspaceHeader({
  activeRoom,
  activeWorkspace,
  memberCount,
  currentUserName,
  currentUserEmail,
  currentUserInitial,
  currentUserPhotoUrl,
  currentUserBio,
  currentUserStatus,
  notifications,
  searchQuery,
  showFilePanel,
  isSummarizing,
  canSummarize,
  canManageWorkspace,
  onSearchChange,
  onInvite,
  onSummarize,
  onToggleFilePanel,
  onOpenChannelSettings,
  onOpenSettings,
  onOpenProfile,
  onLogout,
  onAcceptInvite,
  onDeclineInvite,
}: WorkspaceHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const actionsRef = useRef<HTMLDivElement>(null);
  const headerDescription = `${
    activeRoom?.description ?? activeWorkspace.description
  } - ${memberCount} anggota di ${activeWorkspace.name}.`;

  const notificationItems = useMemo(
    () =>
      notifications.map((item) => ({
        ...item,
        unread: item.unread && !readNotificationIds.includes(item.id),
      })),
    [notifications, readNotificationIds]
  );

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setShowNotifications(false);
        setShowProfile(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowProfile(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Hash size={18} className="text-gray-400" />
          <h2 className="truncate text-lg font-bold text-gray-900">
            {activeRoom?.name ?? 'Tanpa Channel'}
          </h2>
        </div>
        <p
          title={headerDescription}
          className="max-w-full truncate text-xs text-gray-500"
        >
          {headerDescription}
        </p>
      </div>

      <div ref={actionsRef} className="flex shrink-0 items-center space-x-2 lg:space-x-3">
        {canManageWorkspace && (
          <button
            onClick={onInvite}
            className="hidden items-center space-x-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 lg:flex"
          >
            <UserPlus size={16} />
            <span>Invite</span>
          </button>
        )}
        <button
          onClick={onSummarize}
          disabled={isSummarizing || !canSummarize}
          className="hidden items-center space-x-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-50 lg:flex"
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
          className={`hidden items-center space-x-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors lg:flex ${
            showFilePanel
              ? 'border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Files size={16} />
          <span>File</span>
        </button>
        {canManageWorkspace && (
          <button
            onClick={onOpenChannelSettings}
            disabled={!activeRoom}
            className="hidden items-center space-x-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 lg:flex"
          >
            <SlidersHorizontal size={16} />
            <span>Channel</span>
          </button>
        )}
        <div className="relative hidden xl:block">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            id="workspace-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari pesan atau file..."
            className="w-64 rounded-full bg-gray-100 py-1.5 pl-9 pr-4 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <NotificationDropdown
          items={notificationItems}
          open={showNotifications}
          onToggle={() => {
            setShowNotifications((current) => !current);
            setShowProfile(false);
          }}
          onMarkAllRead={() =>
            setReadNotificationIds((current) => [
              ...new Set([
                ...current,
                ...notifications.map((item) => item.id),
              ]),
            ])
          }
          onAcceptInvite={onAcceptInvite}
          onDeclineInvite={onDeclineInvite}
        />
        <UserProfileDropdown
          name={currentUserName}
          email={currentUserEmail}
          initial={currentUserInitial}
          photoUrl={currentUserPhotoUrl}
          bio={currentUserBio}
          status={currentUserStatus}
          open={showProfile}
          onToggle={() => {
            setShowProfile((current) => !current);
            setShowNotifications(false);
          }}
          onOpenProfile={() => {
            setShowProfile(false);
            onOpenProfile();
          }}
          onLogout={onLogout}
        />
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

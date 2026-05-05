// src/components/layout/Sidebar.tsx
'use client';

import { useState } from 'react';
import { Archive, Folder, MessageSquare, Plus, Star, Trash2 } from 'lucide-react';
import { Room, Status, TeamMember } from '@/types';
import StatusMenu from '@/components/ui/StatusMenu';

interface SidebarProps {
  workspaceName: string;
  workspaceInitials: string;
  workspaceColor: string;
  currentUserName: string;
  currentUserInitial: string;
  currentUserStatus: Status;
  memberCount: number;
  members: TeamMember[];
  rooms: Room[];
  activeRoomId: string;
  onRoomChange: (roomId: string) => void;
  onCreateChannel: () => void;
  onDeleteChannel: () => void;
  onToggleFavoriteChannel: (roomId: string) => void;
  onStatusChange: (status: Status) => void;
}

export default function Sidebar({
  workspaceName,
  workspaceInitials,
  workspaceColor,
  currentUserName,
  currentUserInitial,
  currentUserStatus,
  memberCount,
  members,
  rooms,
  activeRoomId,
  onRoomChange,
  onCreateChannel,
  onDeleteChannel,
  onToggleFavoriteChannel,
  onStatusChange,
}: SidebarProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const favoriteRooms = rooms.filter((room) => room.favorite && !room.archived);
  const activeRooms = rooms.filter((room) => !room.archived);
  const archivedRooms = rooms.filter((room) => room.archived);

  function renderRoom(room: Room) {
    const isActive = activeRoomId === room.id;
    const Icon = room.icon === 'message' ? MessageSquare : Folder;

    return (
      <div key={room.id} className="group relative">
        <button
          onClick={() => onRoomChange(room.id)}
          className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md transition-colors ${
            isActive
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {room.archived ? (
            <Archive
              size={18}
              className={isActive ? 'text-blue-600' : 'text-gray-400'}
            />
          ) : (
            <Icon
              size={18}
              className={isActive ? 'text-blue-600' : 'text-gray-400'}
            />
          )}
          <span className="min-w-0 flex-1 truncate text-left text-sm">
            {room.name}
          </span>
          {!!room.unread && (
            <span className="min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {room.unread}
            </span>
          )}
        </button>
        {!room.archived && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavoriteChannel(room.id);
            }}
            title={room.favorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
            className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-opacity ${
              room.favorite
                ? 'text-amber-500 opacity-100'
                : 'text-gray-400 opacity-0 group-hover:opacity-100'
            } hover:bg-amber-50 hover:text-amber-500`}
          >
            <Star size={13} fill={room.favorite ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">

      {/* Header Workspace */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 ${workspaceColor} text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-sm`}>
            {workspaceInitials}
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm text-gray-900 leading-tight">
              {workspaceName}
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              {memberCount} anggota
            </p>
          </div>
        </div>
      </div>

      {/* Navigasi */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">

        {/* Ruang Diskusi */}
        <div>
          {favoriteRooms.length > 0 && (
            <div className="mb-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                Favorit
              </h2>
              <div className="space-y-0.5">
                {favoriteRooms.map((room) => renderRoom(room))}
              </div>
            </div>
          )}

          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 flex justify-between items-center">
            Ruang Diskusi
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={onCreateChannel}
                title="Buat channel baru"
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={onDeleteChannel}
                title="Hapus ruang diskusi aktif"
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </span>
          </h2>
          <div className="space-y-0.5">
            {activeRooms.map((room) => renderRoom(room))}
            {activeRooms.length === 0 && (
              <p className="px-2 py-2 text-xs leading-5 text-gray-400">
                Semua ruang diarsipkan.
              </p>
            )}
          </div>
        </div>

        {archivedRooms.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
              Arsip
            </h2>
            <div className="space-y-0.5">
              {archivedRooms.map((room) => renderRoom(room))}
            </div>
          </div>
        )}

        {/* Anggota Online */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
            Anggota Online
          </h2>
          <div className="space-y-0.5">
            {members
              .filter((member) => member.status === 'active')
              .map((member) => {
                const memberStatus = member.profileStatus || 'online';
                const memberBio = member.bio || 'Siap diskusi di ruang kerja.';

                return (
              <div
                key={member.id}
                className="w-full flex items-center space-x-3 px-2 py-2 rounded-md text-gray-600"
              >
                <div className="relative">
                  <div className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${member.avatar}`}>
                    {member.name.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 ${
                    memberStatus === 'online'
                      ? 'bg-green-500'
                      : memberStatus === 'idle'
                        ? 'bg-amber-500'
                        : memberStatus === 'dnd'
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                  } border-2 border-white rounded-full`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-700">
                    {member.name}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {memberBio}
                  </p>
                </div>
              </div>
                );
              })}
          </div>
        </div>

      </div>

      {/* User Info + Status */}
      <div className="p-4 border-t border-gray-200 relative">
        <StatusMenu
          status={currentUserStatus}
          onStatusChange={onStatusChange}
          show={showStatusMenu}
          onToggle={() => setShowStatusMenu(!showStatusMenu)}
          userName={currentUserName}
          userInitial={currentUserInitial}
        />
      </div>

    </div>
  );
}

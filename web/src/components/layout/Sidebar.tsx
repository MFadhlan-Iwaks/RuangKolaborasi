// src/components/layout/Sidebar.tsx
'use client';

import { useState } from 'react';
import { MessageSquare, Folder, ChevronDown } from 'lucide-react';
import { Room, Status } from '@/types';
import StatusMenu from '@/components/ui/StatusMenu';

const ROOMS: Room[] = [
  { id: 'diskusi-utama', name: 'Diskusi Utama', icon: 'message' },
  { id: 'pengembangan-api', name: 'Pengembangan API', icon: 'folder' },
  { id: 'ui-ux-design', name: 'UI/UX Design', icon: 'folder' },
];

const DM_LIST = [
  { name: 'Rezza', avatar: 'bg-blue-500' },
  { name: 'Sammi Zaki', avatar: 'bg-emerald-500' },
  { name: 'Gibran', avatar: 'bg-amber-500' },
];

interface SidebarProps {
  activeRoom: string;
  onRoomChange: (roomName: string) => void;
}

export default function Sidebar({ activeRoom, onRoomChange }: SidebarProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [status, setStatus] = useState<Status>('online');

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">

      {/* Header Workspace */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-sm">
            TB
          </div>
          <div>
            <h1 className="font-bold text-sm text-gray-900 leading-tight">
              Tugas Besar PABP
            </h1>
            <p className="text-xs text-gray-500 font-medium">Tim 4 Orang</p>
          </div>
        </div>
        <ChevronDown size={16} className="text-gray-400" />
      </div>

      {/* Navigasi */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">

        {/* Ruang Diskusi */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 flex justify-between items-center">
            Ruang Diskusi
            <span className="cursor-pointer hover:text-blue-600">+</span>
          </h2>
          <div className="space-y-0.5">
            {ROOMS.map((room) => {
              const isActive = activeRoom === room.name;
              const Icon = room.icon === 'message' ? MessageSquare : Folder;
              return (
                <button
                  key={room.id}
                  onClick={() => onRoomChange(room.name)}
                  className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon
                    size={18}
                    className={isActive ? 'text-blue-600' : 'text-gray-400'}
                  />
                  <span className="text-sm">{room.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pesan Langsung */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
            Pesan Langsung
          </h2>
          <div className="space-y-0.5">
            {DM_LIST.map((dm) => (
              <button
                key={dm.name}
                className="w-full flex items-center space-x-3 px-2 py-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <div className="relative">
                  <div className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${dm.avatar}`}>
                    {dm.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <span className="text-sm">{dm.name}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* User Info + Status */}
      <div className="p-4 border-t border-gray-200 relative">
        <StatusMenu
          status={status}
          onStatusChange={setStatus}
          show={showStatusMenu}
          onToggle={() => setShowStatusMenu(!showStatusMenu)}
        />
      </div>

    </div>
  );
}
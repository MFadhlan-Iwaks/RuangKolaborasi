'use client';

import { Forward, Hash, X } from 'lucide-react';
import { Message, Room } from '@/types';
import { getMessagePreview } from '@/lib/workspaceUtils';

interface ForwardMessageModalProps {
  message: Message;
  rooms: Room[];
  activeRoomId: string;
  onClose: () => void;
  onForward: (roomId: string) => void;
}

export default function ForwardMessageModal({
  message,
  rooms,
  activeRoomId,
  onClose,
  onForward,
}: ForwardMessageModalProps) {
  const availableRooms = rooms.filter((room) => !room.archived);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Forward size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Teruskan Pesan
              </h3>
              <p className="text-xs text-gray-500">
                Pilih channel tujuan di workspace ini.
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

        <div className="px-6 py-5">
          <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Preview
            </p>
            <p className="mt-1 line-clamp-3 text-sm leading-6 text-gray-700">
              {getMessagePreview(message)}
            </p>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {availableRooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => onForward(room.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-3 text-left transition-colors hover:border-emerald-100 hover:bg-emerald-50"
              >
                <div className="rounded-lg bg-gray-100 p-2 text-gray-500">
                  <Hash size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">
                    {room.name}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {room.id === activeRoomId ? 'Channel saat ini' : room.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

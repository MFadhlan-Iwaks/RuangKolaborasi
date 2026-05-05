'use client';

import {
  AtSign,
  Bell,
  FileText,
  MailPlus,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { NotificationItem, NotificationKind } from '@/types';

const NOTIFICATION_ICONS: Record<NotificationKind, typeof MessageSquare> = {
  message: MessageSquare,
  file: FileText,
  mention: AtSign,
  invite: MailPlus,
  ai: Sparkles,
};

const NOTIFICATION_STYLES: Record<NotificationKind, string> = {
  message: 'bg-blue-50 text-blue-600',
  file: 'bg-emerald-50 text-emerald-600',
  mention: 'bg-amber-50 text-amber-600',
  invite: 'bg-violet-50 text-violet-600',
  ai: 'bg-indigo-50 text-indigo-600',
};

interface NotificationDropdownProps {
  items: NotificationItem[];
  open: boolean;
  onToggle: () => void;
  onMarkAllRead: () => void;
  onAcceptInvite: (notification: NotificationItem) => void;
  onDeclineInvite: (notification: NotificationItem) => void;
}

export default function NotificationDropdown({
  items,
  open,
  onToggle,
  onMarkAllRead,
  onAcceptInvite,
  onDeclineInvite,
}: NotificationDropdownProps) {
  const unreadCount = items.filter((item) => item.unread).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        title="Notifikasi"
        className={`relative rounded-lg p-2 transition-colors ${
          open
            ? 'bg-blue-50 text-blue-600'
            : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
        }`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Notifikasi</h3>
              <p className="text-xs text-gray-500">{unreadCount} belum dibaca</p>
            </div>
            <button
              type="button"
              onClick={onMarkAllRead}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
            >
              Tandai dibaca
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto py-1">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Belum ada notifikasi.
              </div>
            ) : (
              items.map((item) => {
                const Icon = NOTIFICATION_ICONS[item.kind];

                return (
                  <div
                    key={item.id}
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${NOTIFICATION_STYLES[item.kind]}`}
                    >
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {item.title}
                        </p>
                        {item.unread && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="line-clamp-2 text-xs leading-5 text-gray-500">
                        {item.description}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-gray-400">
                        {item.time}
                      </p>
                      {item.kind === 'invite' && item.inviteStatus && (
                        <div className="mt-2">
                          {item.inviteStatus === 'pending' ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => onAcceptInvite(item)}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                              >
                                Gabung
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeclineInvite(item)}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                item.inviteStatus === 'accepted'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {item.inviteStatus === 'accepted'
                                ? 'Undangan diterima'
                                : 'Undangan ditolak'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

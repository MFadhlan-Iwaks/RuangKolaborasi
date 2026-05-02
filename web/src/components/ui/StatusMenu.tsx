// src/components/ui/StatusMenu.tsx
'use client';

import { CircleDot, Moon, MinusCircle, Circle } from 'lucide-react';
import { Status, StatusConfig } from '@/types';

export const STATUS_CONFIG: Record<Status, StatusConfig> = {
  online:  { label: 'Online',          color: 'text-green-600', bgColor: 'bg-green-500',  icon: CircleDot   },
  idle:    { label: 'Idle',            color: 'text-amber-500', bgColor: 'bg-amber-500',  icon: Moon        },
  dnd:     { label: 'Do Not Disturb',  color: 'text-red-500',   bgColor: 'bg-red-500',    icon: MinusCircle },
  offline: { label: 'Offline',         color: 'text-gray-500',  bgColor: 'bg-gray-400',   icon: Circle      },
};

interface StatusMenuProps {
  status: Status;
  onStatusChange: (status: Status) => void;
  show: boolean;
  onToggle: () => void;
  userName: string;
  userInitial: string;
}

export default function StatusMenu({
  status,
  onStatusChange,
  show,
  onToggle,
  userName,
  userInitial,
}: StatusMenuProps) {
  const current = STATUS_CONFIG[status];
  const CurrentIcon = current.icon;

  return (
    <>
      {/* Trigger — info user */}
      <div
        onClick={onToggle}
        className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors"
      >
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shadow-sm">
            {userInitial}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${current.bgColor} border-[2.5px] border-white rounded-full transition-colors duration-300`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{userName}</p>
          <p className={`text-xs ${current.color} flex items-center font-medium`}>
            <CurrentIcon size={10} className="mr-1" />
            {current.label}
          </p>
        </div>
      </div>

      {/* Popup menu */}
      {show && (
        <div className="absolute bottom-[4.5rem] left-4 w-52 bg-white border border-gray-200 shadow-xl rounded-xl py-2 z-50">
          <div className="px-3 py-1.5 mb-1 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Setel Status
            </p>
          </div>
          {(Object.entries(STATUS_CONFIG) as [Status, StatusConfig][]).map(
            ([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => onStatusChange(key)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    status === key
                      ? 'bg-blue-50/50 text-gray-900 font-medium'
                      : 'text-gray-600'
                  }`}
                >
                  <Icon size={16} className={config.color} />
                  <span>{config.label}</span>
                </button>
              );
            }
          )}
        </div>
      )}
    </>
  );
}

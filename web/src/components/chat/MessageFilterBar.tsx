'use client';

import { ChatBackground, MessageFilter } from '@/types';

interface MessageFilterBarProps {
  filter: MessageFilter;
  background: ChatBackground;
  visibleCount: number;
  totalCount: number;
  onFilterChange: (filter: MessageFilter) => void;
  onBackgroundChange: (background: ChatBackground) => void;
}

const FILTERS: Array<{ value: MessageFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'files', label: 'File' },
  { value: 'pinned', label: 'Pinned' },
  { value: 'starred', label: 'Bintang' },
];

const BACKGROUNDS: Array<{ value: ChatBackground; label: string }> = [
  { value: 'pattern', label: 'Pattern' },
  { value: 'clean', label: 'Clean' },
  { value: 'focus', label: 'Focus' },
  { value: 'warm', label: 'Warm' },
];

export default function MessageFilterBar({
  filter,
  background,
  visibleCount,
  totalCount,
  onFilterChange,
  onBackgroundChange,
}: MessageFilterBarProps) {
  return (
    <div className="flex min-h-12 shrink-0 flex-col gap-2 border-b border-gray-100 bg-gray-50/70 px-3 py-2 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onFilterChange(item.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === item.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-white hover:text-gray-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-white p-1 shadow-sm">
          {BACKGROUNDS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onBackgroundChange(item.value)}
              className={`rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
                background === item.value
                  ? 'bg-slate-800 text-white'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="hidden text-xs font-medium text-gray-400 md:block">
          {visibleCount} dari {totalCount} pesan ditampilkan
        </p>
      </div>
    </div>
  );
}

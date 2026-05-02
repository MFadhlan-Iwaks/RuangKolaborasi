'use client';

import { MessageFilter } from '@/types';

interface MessageFilterBarProps {
  filter: MessageFilter;
  visibleCount: number;
  totalCount: number;
  onFilterChange: (filter: MessageFilter) => void;
}

const FILTERS: Array<{ value: MessageFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'files', label: 'File' },
  { value: 'pinned', label: 'Pinned' },
];

export default function MessageFilterBar({
  filter,
  visibleCount,
  totalCount,
  onFilterChange,
}: MessageFilterBarProps) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50/70 px-6">
      <div className="flex items-center gap-2">
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
      <p className="hidden text-xs font-medium text-gray-400 md:block">
        {visibleCount} dari {totalCount} pesan ditampilkan
      </p>
    </div>
  );
}

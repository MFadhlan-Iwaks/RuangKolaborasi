'use client';

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastMessage } from '@/types';

interface ToastStackProps {
  items: ToastMessage[];
  onDismiss: (id: string) => void;
}

const TOAST_STYLES: Record<ToastMessage['type'], string> = {
  success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  error: 'border-red-100 bg-red-50 text-red-700',
  info: 'border-blue-100 bg-blue-50 text-blue-700',
};

const TOAST_ICONS: Record<ToastMessage['type'], typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export default function ToastStack({ items, onDismiss }: ToastStackProps) {
  if (items.length === 0) return null;

  return (
    <div className="fixed right-4 top-20 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {items.map((toast) => {
        const Icon = TOAST_ICONS[toast.type];

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${TOAST_STYLES[toast.type]}`}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p title={toast.title} className="truncate text-sm font-bold">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-0.5 line-clamp-2 break-words text-xs leading-5 opacity-80">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-md p-1 opacity-60 transition hover:bg-white/60 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { AlertTriangle, Loader2, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  tone?: 'danger' | 'primary';
  onClose: () => void;
  onConfirm: () => void;
}

const toneStyles = {
  danger: {
    iconWrap: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300',
    panel: 'border-red-100 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200',
    button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  primary: {
    iconWrap: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300',
    panel: 'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200',
    button: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
  },
};

export default function ConfirmDialog({
  open,
  title,
  description,
  detail,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  isLoading = false,
  tone = 'danger',
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  const styles = toneStyles[tone];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-950"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-white/10">
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-2.5 ${styles.iconWrap}`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3
                id="confirm-dialog-title"
                className="text-base font-bold text-gray-950 dark:text-white"
              >
                {title}
              </h3>
              <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-gray-100"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {detail && (
          <div className="px-6 py-5">
            <div className={`rounded-xl border px-4 py-3 text-sm leading-5 ${styles.panel}`}>
              {detail}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-white/10 dark:bg-white/[0.03]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-white/10"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-gray-950 ${styles.button}`}
          >
            {isLoading && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

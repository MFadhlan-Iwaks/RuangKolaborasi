'use client';

import { Download, X } from 'lucide-react';
import { Message } from '@/types';
import { FileCategoryIcon, getFileCategory } from '@/lib/workspaceUtils';

interface FilePreviewModalProps {
  file: Message;
  onClose: () => void;
  onDownload: (file: Message) => void;
}

export default function FilePreviewModal({
  file,
  onClose,
  onDownload,
}: FilePreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <FileCategoryIcon category={getFileCategory(file.fileName)} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-gray-900">
                {file.fileName}
              </h3>
              <p className="text-xs text-gray-500">
                {file.fileSize} - dikirim oleh {file.user}
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

        <div className="p-6">
          <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                <FileCategoryIcon category={getFileCategory(file.fileName)} />
              </div>
              <p className="text-sm font-bold text-gray-900">Preview file mock</p>
              <p className="mt-1 text-xs text-gray-500">
                Integrasi preview asli bisa disambungkan ke storage nanti.
              </p>
            </div>
          </div>

          {file.text && (
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Caption
              </p>
              <p className="mt-1 text-sm leading-6 text-gray-700">{file.text}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => onDownload(file)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { Download, Eye, Files, X } from 'lucide-react';
import { FileCategory, Message } from '@/types';
import {
  FileCategoryIcon,
  getFileCategory,
  getFileCategoryLabel,
} from '@/lib/workspaceUtils';

interface FilePanelProps {
  activeRoomName?: string;
  files: Message[];
  filteredFiles: Message[];
  category: FileCategory;
  notice: string;
  onCategoryChange: (category: FileCategory) => void;
  onClose: () => void;
  onPreview: (message: Message) => void;
  onDownload: (message: Message) => void;
}

const FILE_FILTERS: Array<{ value: FileCategory; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'documents', label: 'Doc' },
  { value: 'images', label: 'Img' },
  { value: 'code', label: 'Code' },
];

export default function FilePanel({
  activeRoomName,
  files,
  filteredFiles,
  category,
  notice,
  onCategoryChange,
  onClose,
  onPreview,
  onDownload,
}: FilePanelProps) {
  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-gray-200 bg-gray-50/80 xl:flex">
      <div className="border-b border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">File Dibagikan</h3>
            <p className="text-xs text-gray-500">
              {files.length} file di {activeRoomName ?? 'channel'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Tutup panel file"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-gray-100 p-1">
          {FILE_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onCategoryChange(item.value)}
              className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors ${
                category === item.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="mx-4 mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          {notice}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {filteredFiles.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-5 text-center">
            <div className="mb-3 rounded-full bg-blue-50 p-3 text-blue-600">
              <Files size={22} />
            </div>
            <p className="text-sm font-bold text-gray-900">Belum ada file</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              File yang dikirim lewat drag & drop atau paperclip akan muncul di
              panel ini.
            </p>
          </div>
        ) : (
          filteredFiles.map((fileMessage) => {
            const fileCategory = getFileCategory(fileMessage.fileName);

            return (
              <div
                key={fileMessage.id}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <FileCategoryIcon category={fileCategory} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {fileMessage.fileName}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {fileMessage.fileSize} - {getFileCategoryLabel(fileCategory)}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-gray-400">
                      {fileMessage.user} - {fileMessage.time}
                    </p>
                  </div>
                </div>

                {fileMessage.text && (
                  <p className="mt-3 line-clamp-2 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600">
                    {fileMessage.text}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onPreview(fileMessage)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <Eye size={13} />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownload(fileMessage)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    <Download size={13} />
                    Download
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

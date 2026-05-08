'use client';

import { Loader2, Sparkles, X } from 'lucide-react';

interface SummaryModalProps {
  isSummarizing: boolean;
  summaryResult: string;
  onClose: () => void;
}

export default function SummaryModal({
  isSummarizing,
  summaryResult,
  onClose,
}: SummaryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-indigo-50/50 px-6 py-4">
          <div className="flex items-center space-x-2 text-indigo-700">
            <Sparkles size={20} className={isSummarizing ? 'animate-pulse' : ''} />
            <h3 className="text-lg font-bold">Rangkuman Diskusi</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {isSummarizing ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-10 text-indigo-600">
              <Loader2 size={32} className="animate-spin" />
              <p className="animate-pulse text-sm font-medium">
                Gemini sedang membaca histori chat...
              </p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-gray-700">
              {summaryResult}
            </div>
          )}
        </div>
        {!isSummarizing && (
          <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

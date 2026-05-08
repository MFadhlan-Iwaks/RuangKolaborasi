'use client';

import { Download, FileText, Loader2, Sparkles, X } from 'lucide-react';

interface SummaryModalProps {
  isSummarizing: boolean;
  summaryResult: string;
  workspaceName?: string;
  roomName?: string;
  messageCount?: number;
  onClose: () => void;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'rangkuman-diskusi';
}

function escapePdfText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapLine(line: string, maxLength: number) {
  if (!line.trim()) return [''];

  const words = line.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    if (!current) {
      current = word;
      return;
    }

    if (`${current} ${word}`.length <= maxLength) {
      current = `${current} ${word}`;
      return;
    }

    lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  return lines;
}

function buildPdfBlob(text: string) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 48;
  const startY = 770;
  const linesPerPage = 48;
  const wrappedLines = text
    .split('\n')
    .flatMap((line) => wrapLine(line, 84));
  const pages: string[][] = [];

  for (let index = 0; index < wrappedLines.length; index += linesPerPage) {
    pages.push(wrappedLines.slice(index, index + linesPerPage));
  }

  const pageCount = Math.max(pages.length, 1);
  const fontObjectNumber = 3 + pageCount * 2;
  const objects: string[] = [];

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${Array.from(
    { length: pageCount },
    (_, index) => `${3 + index * 2} 0 R`
  ).join(' ')}] /Count ${pageCount} >>`;

  pages.forEach((pageLines, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    const streamLines = [
      'BT',
      `/F1 11 Tf`,
      '14 TL',
      `${marginX} ${startY} Td`,
      ...pageLines.map((line) => `(${escapePdfText(line)}) Tj T*`),
      'ET',
    ];
    const stream = streamLines.join('\n');

    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber] =
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  objects[fontObjectNumber] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    if (!objects[index]) continue;
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index] || 0).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function SummaryModal({
  isSummarizing,
  summaryResult,
  workspaceName = 'RuangKolaborasi',
  roomName = 'Ruang diskusi',
  messageCount = 0,
  onClose,
}: SummaryModalProps) {
  const generatedAt = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const fileBaseName = `${slugify(workspaceName)}-${slugify(roomName)}-rangkuman`;
  const reportText = [
    'Rangkuman Diskusi RuangKolaborasi',
    `Workspace: ${workspaceName}`,
    `Ruang: ${roomName}`,
    `Jumlah pesan dibaca: ${messageCount}`,
    `Dibuat: ${generatedAt}`,
    '',
    summaryResult,
  ].join('\n');

  function handleDownloadText() {
    downloadBlob(
      new Blob([reportText], { type: 'text/plain;charset=utf-8' }),
      `${fileBaseName}.txt`
    );
  }

  function handleDownloadPdf() {
    downloadBlob(buildPdfBlob(reportText), `${fileBaseName}.pdf`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[84vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-indigo-50/50 px-6 py-4">
          <div className="flex min-w-0 items-center space-x-2 text-indigo-700">
            <Sparkles size={20} className={`shrink-0 ${isSummarizing ? 'animate-pulse' : ''}`} />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold">Rangkuman Diskusi</h3>
              <p className="truncate text-xs font-medium text-indigo-500">
                {workspaceName} / {roomName}
              </p>
            </div>
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
            <div className="space-y-4">
              <div className="grid gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-700 sm:grid-cols-3">
                <div>
                  <p className="font-bold">Workspace</p>
                  <p className="mt-1 truncate">{workspaceName}</p>
                </div>
                <div>
                  <p className="font-bold">Ruang</p>
                  <p className="mt-1 truncate">{roomName}</p>
                </div>
                <div>
                  <p className="font-bold">Pesan dibaca</p>
                  <p className="mt-1">{messageCount} pesan</p>
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-gray-700">
                  {summaryResult}
                </div>
              </div>
            </div>
          )}
        </div>
        {!isSummarizing && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
            <button
              type="button"
              onClick={handleDownloadText}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              <FileText size={16} />
              Download TXT
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <Download size={16} />
              Download PDF
            </button>
            <button
              type="button"
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

import { FileCode2, FileImage, FileText } from 'lucide-react';
import { FileCategory, Message, Workspace } from '@/types';

export function makeSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function makeInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length === 1
      ? words[0].slice(0, 2)
      : `${words[0][0]}${words[1][0]}`;

  return initials.toUpperCase();
}

export function makeJoinedWorkspace(code: string): Workspace {
  const cleanCode = code.toUpperCase();
  return {
    id: `joined-${makeSlug(cleanCode)}-${Date.now().toString().slice(-4)}`,
    name: `Grup ${cleanCode}`,
    shortName: cleanCode.slice(0, 2),
    description: `Workspace yang diikuti memakai kode ${cleanCode}.`,
    color: 'bg-sky-600',
    inviteCode: cleanCode,
  };
}

export function getMessagePreview(message: Message) {
  return message.text ?? message.fileName ?? 'Lampiran';
}

export function getFileExtension(fileName = '') {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

export function getFileCategory(fileName = ''): Exclude<FileCategory, 'all'> {
  const extension = getFileExtension(fileName);

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
    return 'images';
  }

  if (
    [
      'js',
      'jsx',
      'ts',
      'tsx',
      'html',
      'css',
      'json',
      'sql',
      'md',
      'dart',
      'py',
    ].includes(extension)
  ) {
    return 'code';
  }

  return 'documents';
}

export function getFileCategoryLabel(category: Exclude<FileCategory, 'all'>) {
  const labels = {
    documents: 'Dokumen',
    images: 'Gambar',
    code: 'Kode',
  };

  return labels[category];
}

export function FileCategoryIcon({
  category,
  className = '',
}: {
  category: Exclude<FileCategory, 'all'>;
  className?: string;
}) {
  if (category === 'images') return <FileImage size={18} className={className} />;
  if (category === 'code') return <FileCode2 size={18} className={className} />;
  return <FileText size={18} className={className} />;
}

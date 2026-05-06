// src/hooks/useDragDrop.ts
'use client';

import { useState } from 'react';

interface UseDragDropProps {
  onFileDrop: (file: File) => void;
}

export function useDragDrop({ onFileDrop }: UseDragDropProps) {
  const [isDragging, setIsDragging] = useState(false);

  const dragHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
      }
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        Array.from(files).forEach((file) => onFileDrop(file));
      }
    },
  };

  return { isDragging, dragHandlers };
}
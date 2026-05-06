// src/types/index.ts

export type Status = 'online' | 'idle' | 'dnd' | 'offline';

export type MessageType = 'text' | 'file';
import type { ElementType } from 'react';

export interface User {
  id: string;
  name: string;
  avatar: string; 
}

export interface Message {
  id: number;
  user: string;
  avatar: string;
  time: string;
  type: MessageType;
  text?: string;
  fileName?: string;
  fileSize?: string;
}

export interface Room {
  id: string;
  name: string;
  icon: 'message' | 'folder';
}

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: ElementType;   
}

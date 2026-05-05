// src/types/index.ts

export type Status = 'online' | 'idle' | 'dnd' | 'offline';

export type MessageType = 'text' | 'file';
export type MessageFilter = 'all' | 'files' | 'pinned';
export type FileCategory = 'all' | 'documents' | 'images' | 'code';
export type NotificationKind = 'message' | 'file' | 'mention' | 'invite' | 'ai';
import type { ElementType } from 'react';

export interface User {
  id: string;
  name: string;
  avatar: string; 
}

export interface Message {
  id: number | string;
  user: string;
  avatar: string;
  time: string;
  type: MessageType;
  text?: string;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
  mimeType?: string;
  pinned?: boolean;
  edited?: boolean;
  replyTo?: {
    user: string;
    preview: string;
  };
}

export interface Room {
  id: string;
  name: string;
  icon: 'message' | 'folder';
  description?: string;
  unread?: number;
  favorite?: boolean;
  archived?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  inviteCode: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Member';
  status: 'active' | 'pending';
  profileStatus?: Status;
  avatar: string;
  bio?: string;
}

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  time: string;
  unread?: boolean;
  inviteCode?: string;
  inviteWorkspaceName?: string;
  inviteStatus?: 'pending' | 'accepted' | 'declined';
}

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: ElementType;   
}

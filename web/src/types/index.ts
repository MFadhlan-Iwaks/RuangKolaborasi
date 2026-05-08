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

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  initial: string;
  avatar: string;
  photoUrl?: string;
  bio: string;
  status: Status;
}

export interface Message {
  id: number | string;
  user: string;
  avatar: string;
  time: string;
  type: MessageType;
  isMine?: boolean;
  deliveryStatus?: 'sending' | 'sent' | 'failed';
  reactions?: Array<{
    emoji: string;
    count: number;
    reacted?: boolean;
  }>;
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
  photoUrl?: string;
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
  inviteMode?: 'incoming' | 'outgoing';
}

export interface PendingInvitation {
  id: string;
  workspaceId?: string;
  workspaceName: string;
  inviterName: string;
  invitedEmail?: string;
  role?: TeamMember['role'];
  inviteCode: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: ElementType;   
}

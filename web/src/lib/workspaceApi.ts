'use client';

import {
  CurrentUser,
  Message,
  Room,
  Status,
  TeamMember,
  Workspace,
} from '@/types';
import { apiFetch } from '@/lib/apiClient';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { makeInitials } from '@/lib/workspaceUtils';

export const WORKSPACE_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-teal-600',
];

export interface WorkspaceRow {
  id: string;
  name: string;
  description: string | null;
  short_name?: string | null;
  color?: string | null;
  invite_code?: string | null;
  photo_url?: string | null;
}

export interface ChannelRow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  favorite?: boolean;
  archived?: boolean;
}

export interface MessageRow {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string | null;
  type: string;
  pinned?: boolean;
  edited?: boolean;
  created_at: string;
}

export interface BootstrapMessageRow extends MessageRow {
  sender_name?: string | null;
  file?: {
    id: string;
    file_name: string;
    mime_type: string | null;
    file_size: number | null;
    signed_url: string | null;
  } | null;
}

export interface BootstrapMemberRow {
  id: string;
  role: 'owner' | 'admin' | 'member';
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  bio?: string | null;
  profile_status?: Status | null;
}

export interface BootstrapResponse {
  workspaces: WorkspaceRow[];
  roomsByWorkspace: Record<string, ChannelRow[]>;
  messagesByWorkspace: Record<string, Record<string, BootstrapMessageRow[]>>;
  membersByWorkspace: Record<string, BootstrapMemberRow[]>;
}

export interface CreateWorkspaceResponse {
  workspace: WorkspaceRow;
  channel: ChannelRow;
}

export interface CreateChannelResponse {
  channel: ChannelRow;
}

export interface CreateMessageResponse {
  message: BootstrapMessageRow;
}

export interface InviteMemberResponse {
  member: BootstrapMemberRow;
}

export interface JoinWorkspaceResponse {
  workspace: WorkspaceRow;
  channel: ChannelRow;
}

export interface UpdateWorkspaceResponse {
  workspace: WorkspaceRow;
}

export interface UpdateChannelResponse {
  channel: ChannelRow;
}

interface EnsureProfileResponse {
  profile: {
    id: string;
    status?: Status | null;
  };
}

export function getDisplayName(options: {
  email?: string;
  fullName?: string | null;
  username?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const metadataName =
    typeof options.metadata?.full_name === 'string'
      ? options.metadata.full_name
      : typeof options.metadata?.name === 'string'
        ? options.metadata.name
        : '';
  const metadataUsername =
    typeof options.metadata?.username === 'string'
      ? options.metadata.username
      : '';

  return (
    options.fullName ||
    metadataName ||
    options.username ||
    metadataUsername ||
    options.email?.split('@')[0] ||
    'Pengguna'
  );
}

export function getReadableError(error: unknown) {
  if (error instanceof Error) return error.message;

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = [record.message, record.details, record.hint, record.code]
      .filter(Boolean)
      .join(' ');

    if (message) return message;

    try {
      return JSON.stringify(error);
    } catch {
      return 'Terjadi error tidak dikenal.';
    }
  }

  return String(error || 'Terjadi error tidak dikenal.');
}

export function toWorkspace(row: WorkspaceRow, index: number): Workspace {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name || makeInitials(row.name),
    description: row.description || 'Workspace kolaborasi tim.',
    color: row.color || WORKSPACE_COLORS[index % WORKSPACE_COLORS.length],
    inviteCode: row.invite_code || '',
    photoUrl: row.photo_url || undefined,
  };
}

export function toRoom(row: ChannelRow): Room {
  return {
    id: row.id,
    name: row.name,
    icon: 'message',
    description: row.description || `Ruang diskusi untuk ${row.name}.`,
    favorite: !!row.favorite,
    archived: !!row.archived,
  };
}

export function toMessage(
  row: BootstrapMessageRow,
  currentUser: CurrentUser
): Message {
  const isMine = row.sender_id === currentUser.id;
  const createdAt = new Date(row.created_at);

  return {
    id: row.id,
    senderId: row.sender_id,
    user: isMine ? `${currentUser.name} (Kamu)` : row.sender_name || 'Anggota',
    avatar: isMine ? currentUser.avatar : 'bg-slate-500',
    isMine,
    time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: row.type === 'file' || row.type === 'image' ? 'file' : 'text',
    text: row.content || undefined,
    fileName: row.file?.file_name,
    fileSize: row.file?.file_size
      ? `${(row.file.file_size / 1024).toFixed(2)} KB`
      : undefined,
    fileUrl: row.file?.signed_url || undefined,
    mimeType: row.file?.mime_type || undefined,
    pinned: !!row.pinned,
    edited: !!row.edited,
  };
}

export function toMember(
  row: BootstrapMemberRow,
  currentUser: CurrentUser
): TeamMember {
  const isMine = row.id === currentUser.id;

  return {
    id: row.id,
    name: isMine ? currentUser.name : row.full_name || 'Anggota',
    email: isMine ? currentUser.email : row.email || 'anggota@workspace.local',
    role:
      row.role === 'owner' ? 'Owner' : row.role === 'admin' ? 'Admin' : 'Member',
    status: 'active',
    avatar: isMine ? currentUser.avatar : 'bg-slate-500',
    photoUrl: isMine ? currentUser.photoUrl : row.avatar_url || undefined,
    profileStatus: isMine ? currentUser.status : row.profile_status || 'online',
    bio: isMine ? currentUser.bio : row.bio || 'Siap bantu progres diskusi tim.',
  };
}

export async function ensureProfile(
  accessToken: string,
  currentUser: CurrentUser
) {
  return apiFetch<EnsureProfileResponse>('/api/auth/ensure-profile', {
    method: 'POST',
    accessToken,
    body: JSON.stringify({
      fullName: currentUser.name,
      username: currentUser.email.split('@')[0],
    }),
  });
}

export async function getAccessToken() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  const token = data.session?.access_token;

  if (!token) {
    throw new Error('Session tidak ditemukan. Silakan login ulang.');
  }

  return token;
}

export function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

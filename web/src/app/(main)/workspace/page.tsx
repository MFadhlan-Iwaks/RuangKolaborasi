// src/app/(main)/workspace/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import {
  FileCategory,
  Message,
  MessageFilter,
  NotificationItem,
  Room,
  Status,
  TeamMember,
  Workspace,
} from '@/types';
import WorkspaceSwitcher from '@/components/layout/WorkspaceSwitcher';
import Sidebar from '@/components/layout/Sidebar';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import MessageFilterBar from '@/components/chat/MessageFilterBar';
import EditMessageModal from '@/components/chat/EditMessageModal';
import FilePanel from '@/components/workspace/FilePanel';
import FilePreviewModal from '@/components/workspace/FilePreviewModal';
import { CreateChannelModal, DeleteChannelModal } from '@/components/workspace/ChannelModals';
import ChannelSettingsModal from '@/components/workspace/ChannelSettingsModal';
import InviteMemberModal from '@/components/workspace/InviteMemberModal';
import { CreateWorkspaceModal, JoinWorkspaceModal } from '@/components/workspace/WorkspaceAccessModals';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import WorkspaceSettingsModal from '@/components/workspace/WorkspaceSettingsModal';
import UserProfileModal from '@/components/workspace/UserProfileModal';
import { useGemini } from '@/hooks/useGemini';
import { useDragDrop } from '@/hooks/useDragDrop';
import {
  getFileCategory,
  getMessagePreview,
  makeInitials,
} from '@/lib/workspaceUtils';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { apiFetch } from '@/lib/apiClient';
const EMPTY_MEMBERS: TeamMember[] = [];
const EMPTY_MESSAGES: Message[] = [];
const WORKSPACE_COLORS = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-teal-600'];

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  initial: string;
  avatar: string;
  photoUrl?: string;
  bio: string;
  status: Status;
}

function getDisplayName(options: {
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

function getReadableError(error: unknown) {
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

interface WorkspaceRow {
  id: string;
  name: string;
  description: string | null;
  short_name?: string | null;
  color?: string | null;
}

interface ChannelRow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  favorite?: boolean;
  archived?: boolean;
}

interface MessageRow {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string | null;
  type: string;
  pinned?: boolean;
  edited?: boolean;
  created_at: string;
}

interface BootstrapMessageRow extends MessageRow {
  sender_name?: string | null;
  file?: {
    id: string;
    file_name: string;
    mime_type: string | null;
    file_size: number | null;
    signed_url: string | null;
  } | null;
}

interface BootstrapMemberRow {
  id: string;
  role: 'owner' | 'admin' | 'member';
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  bio?: string | null;
  profile_status?: Status | null;
}

interface BootstrapResponse {
  workspaces: WorkspaceRow[];
  roomsByWorkspace: Record<string, ChannelRow[]>;
  messagesByWorkspace: Record<string, Record<string, BootstrapMessageRow[]>>;
  membersByWorkspace: Record<string, BootstrapMemberRow[]>;
}

interface CreateWorkspaceResponse {
  workspace: WorkspaceRow;
  channel: ChannelRow;
}

interface CreateChannelResponse {
  channel: ChannelRow;
}

interface CreateMessageResponse {
  message: BootstrapMessageRow;
}

interface InviteMemberResponse {
  member: BootstrapMemberRow;
}

interface JoinWorkspaceResponse {
  workspace: WorkspaceRow;
  channel: ChannelRow;
}

interface UpdateWorkspaceResponse {
  workspace: WorkspaceRow;
}

interface UpdateChannelResponse {
  channel: ChannelRow;
}

interface EnsureProfileResponse {
  profile: {
    id: string;
    status?: Status | null;
  };
}

interface PendingInvitation {
  id: string;
  workspaceId?: string;
  workspaceName: string;
  inviterName: string;
  invitedEmail?: string;
  role?: TeamMember['role'];
  inviteCode: string;
  status: 'pending' | 'accepted' | 'declined';
}

function toWorkspace(row: WorkspaceRow, index: number): Workspace {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name || makeInitials(row.name),
    description: row.description || 'Workspace kolaborasi tim.',
    color: row.color || WORKSPACE_COLORS[index % WORKSPACE_COLORS.length],
    inviteCode: row.id.slice(0, 8).toUpperCase(),
  };
}

function toRoom(row: ChannelRow): Room {
  return {
    id: row.id,
    name: row.name,
    icon: 'message',
    description: row.description || `Ruang diskusi untuk ${row.name}.`,
    favorite: !!row.favorite,
    archived: !!row.archived,
  };
}

function toMessage(row: BootstrapMessageRow, currentUser: CurrentUser): Message {
  const isMine = row.sender_id === currentUser.id;
  const createdAt = new Date(row.created_at);

  return {
    id: row.id,
    user: isMine ? `${currentUser.name} (Kamu)` : row.sender_name || 'Anggota',
    avatar: isMine ? currentUser.avatar : 'bg-slate-500',
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

function toMember(row: BootstrapMemberRow, currentUser: CurrentUser): TeamMember {
  const isMine = row.id === currentUser.id;

  return {
    id: row.id,
    name: isMine ? currentUser.name : row.full_name || 'Anggota',
    email: isMine ? currentUser.email : row.email || 'anggota@workspace.local',
    role:
      row.role === 'owner' ? 'Owner' : row.role === 'admin' ? 'Admin' : 'Member',
    status: 'active',
    avatar: isMine ? currentUser.avatar : 'bg-slate-500',
    profileStatus: isMine ? currentUser.status : row.profile_status || 'online',
    bio:
      isMine
        ? currentUser.bio
        : row.bio || 'Siap bantu progres diskusi tim.',
  };
}

async function ensureProfile(accessToken: string, currentUser: CurrentUser) {
  return apiFetch<EnsureProfileResponse>('/api/auth/ensure-profile', {
    method: 'POST',
    accessToken,
    body: JSON.stringify({
      fullName: currentUser.name,
      username: currentUser.email.split('@')[0],
    }),
  });
}

async function getAccessToken() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  const token = data.session?.access_token;

  if (!token) {
    throw new Error('Session tidak ditemukan. Silakan login ulang.');
  }

  return token;
}

function readFileAsBase64(file: File) {
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

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');
  const [activeRoomId, setActiveRoomId] = useState('');
  const [roomsByWorkspace, setRoomsByWorkspace] = useState<Record<string, Room[]>>(
    {}
  );
  const [messagesByWorkspace, setMessagesByWorkspace] = useState<
    Record<string, Record<string, Message[]>>
  >({});
  const [membersByWorkspace, setMembersByWorkspace] = useState<
    Record<string, TeamMember[]>
  >({});
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showDeleteChannelModal, setShowDeleteChannelModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [workspaceModal, setWorkspaceModal] = useState<'create' | 'join' | null>(
    null
  );
  const [inviteMessage, setInviteMessage] = useState('');
  const [workspaceFeedback, setWorkspaceFeedback] = useState('');
  const [incomingInvites, setIncomingInvites] = useState<PendingInvitation[]>([]);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [deleteConfirmRoomId, setDeleteConfirmRoomId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageFilter, setMessageFilter] = useState<MessageFilter>('all');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [typingUser, setTypingUser] = useState('');
  const [showFilePanel, setShowFilePanel] = useState(true);
  const [fileCategory, setFileCategory] = useState<FileCategory>('all');
  const [selectedFileMessage, setSelectedFileMessage] = useState<Message | null>(
    null
  );
  const [fileNotice, setFileNotice] = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState('');

  const { summarize, isSummarizing, summaryResult, clearSummary } = useGemini();
  const { isDragging, dragHandlers } = useDragDrop({ onFileDrop: handleFileDrop });
  const currentUserName = currentUser?.name ?? 'Kamu';
  const currentUserEmail = currentUser?.email ?? 'user@local.test';
  const currentUserInitial = currentUser?.initial ?? 'K';
  const currentUserAvatar = currentUser?.avatar ?? 'bg-indigo-600';
  const currentUserPhotoUrl = currentUser?.photoUrl;
  const currentUserBio = currentUser?.bio ?? 'Fokus diskusi tim dan siap bantu progres tugas.';
  const currentUserStatus = currentUser?.status ?? 'online';
  const currentUserId = currentUser?.id ?? '';

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0];
  const rooms = roomsByWorkspace[activeWorkspaceId] ?? [];
  const members = membersByWorkspace[activeWorkspaceId] ?? EMPTY_MEMBERS;
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];
  const currentMember = members.find((member) => member.id === currentUserId);
  const messages =
    messagesByWorkspace[activeWorkspaceId]?.[activeRoom?.id ?? ''] ?? EMPTY_MESSAGES;
  const typingMemberName =
    members.find((member) => member.status === 'active' && member.name !== currentUserName)
      ?.name ?? '';
  const pinnedMessages = messages.filter((message) => message.pinned);
  const channelFiles = messages.filter((message) => message.type === 'file');
  const filteredChannelFiles = channelFiles.filter(
    (message) =>
      fileCategory === 'all' ||
      getFileCategory(message.fileName) === fileCategory
  );
  const filteredMessages = messages.filter((message) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesFilter =
      messageFilter === 'all' ||
      (messageFilter === 'files' && message.type === 'file') ||
      (messageFilter === 'pinned' && message.pinned);

    if (!matchesFilter) return false;
    if (!query) return true;

    return [
      message.user,
      message.text,
      message.fileName,
      message.replyTo?.user,
      message.replyTo?.preview,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(query));
  });
  const headerNotifications = useMemo<NotificationItem[]>(() => {
    if (!activeWorkspace) return [];

    const latestMessage = messages.at(-1);
    const latestFile = [...messages].reverse().find((message) => message.type === 'file');
    const latestPinned = [...messages].reverse().find((message) => message.pinned);
    const roomName = activeRoom?.name ?? 'channel aktif';

    return [
      ...incomingInvites.map((invite) => ({
        id: invite.id,
        kind: 'invite' as const,
        title: invite.invitedEmail
          ? `Invite untuk ${invite.invitedEmail}`
          : `${invite.inviterName} mengundang kamu`,
        description: invite.invitedEmail
          ? `${invite.invitedEmail} perlu konfirmasi untuk gabung ke ${invite.workspaceName}.`
          : `Gabung ke ${invite.workspaceName} dengan kode ${invite.inviteCode}.`,
        time: 'Baru saja',
        unread: invite.status === 'pending',
        inviteCode: invite.inviteCode,
        inviteWorkspaceName: invite.workspaceName,
        inviteStatus: invite.status,
      })),
      latestMessage && {
        id: `message-${latestMessage.id}`,
        kind: 'message' as const,
        title: `Pesan baru di #${roomName}`,
        description: getMessagePreview(latestMessage),
        time: latestMessage.time,
        unread: true,
      },
      latestFile && {
        id: `file-${latestFile.id}`,
        kind: 'file' as const,
        title: 'File baru dibagikan',
        description: latestFile.fileName ?? 'Lampiran dari anggota workspace.',
        time: latestFile.time,
        unread: true,
      },
      latestPinned && {
        id: `pin-${latestPinned.id}`,
        kind: 'mention' as const,
        title: 'Pesan penting dipin',
        description: getMessagePreview(latestPinned),
        time: latestPinned.time,
        unread: false,
      },
      {
        id: `invite-${activeWorkspace.id}`,
        kind: 'invite' as const,
        title: 'Kode invite siap dibagikan',
        description: `${activeWorkspace.inviteCode} untuk mengundang anggota ke ${activeWorkspace.name}.`,
        time: 'Baru saja',
        unread: false,
      },
      {
        id: `ai-${activeRoom?.id ?? activeWorkspace.id}`,
        kind: 'ai' as const,
        title: 'Rangkuman AI tersedia',
        description: messages.length
          ? 'Gunakan Rangkum Diskusi untuk membaca inti percakapan.'
          : 'Mulai diskusi dulu agar Gemini bisa membuat rangkuman.',
        time: 'Hari ini',
        unread: false,
      },
    ].filter(Boolean) as NotificationItem[];
  }, [activeRoom?.id, activeRoom?.name, activeWorkspace, incomingInvites, messages]);

  async function loadWorkspaceData(currentUser: CurrentUser, accessToken: string) {
    const payload = await apiFetch<BootstrapResponse>('/api/workspaces/bootstrap', {
      accessToken,
    });

    const nextWorkspaces = payload.workspaces.map(toWorkspace);
    const nextRoomsByWorkspace: Record<string, Room[]> = {};
    const nextMessagesByWorkspace: Record<string, Record<string, Message[]>> = {};
    const nextMembersByWorkspace: Record<string, TeamMember[]> = {};

    for (const workspace of payload.workspaces) {
      const nextChannelRows = payload.roomsByWorkspace[workspace.id] || [];
      nextRoomsByWorkspace[workspace.id] = nextChannelRows.map(toRoom);
      nextMembersByWorkspace[workspace.id] = (payload.membersByWorkspace[workspace.id] || []).map(
        (member) => toMember(member, currentUser)
      );
      nextMessagesByWorkspace[workspace.id] = {};

      for (const channel of nextChannelRows) {
        nextMessagesByWorkspace[workspace.id][channel.id] = (
          payload.messagesByWorkspace[workspace.id]?.[channel.id] || []
        ).map(
          (message) => toMessage(message, currentUser)
        );
      }
    }

    setWorkspaces(nextWorkspaces);
    setRoomsByWorkspace(nextRoomsByWorkspace);
    setMessagesByWorkspace(nextMessagesByWorkspace);
    setMembersByWorkspace(nextMembersByWorkspace);
    setActiveWorkspaceId(nextWorkspaces[0]?.id ?? '');
    setActiveRoomId(nextRoomsByWorkspace[nextWorkspaces[0]?.id ?? '']?.[0]?.id ?? '');
  }

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const user = sessionData.session?.user;
        const accessToken = sessionData.session?.access_token;

        if (!user || !accessToken) {
          window.location.replace('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username, avatar_url, status')
          .eq('id', user.id)
          .maybeSingle();

        const name = getDisplayName({
          email: user.email,
          fullName: profile?.full_name,
          username: profile?.username,
          metadata: user.user_metadata,
        });
        const nextCurrentUser: CurrentUser = {
          id: user.id,
          name,
          email: user.email ?? '',
          initial: makeInitials(name).slice(0, 2) || 'U',
          avatar: 'bg-indigo-600',
          photoUrl: profile?.avatar_url || undefined,
          bio:
            typeof user.user_metadata?.bio === 'string'
              ? user.user_metadata.bio
              : 'Fokus diskusi tim dan siap bantu progres tugas.',
          status: (profile?.status as Status | null) || 'online',
        };

        if (!isMounted) return;

        const { profile: ensuredProfile } = await ensureProfile(accessToken, nextCurrentUser);
        const currentUserWithStatus = {
          ...nextCurrentUser,
          status: ensuredProfile.status || nextCurrentUser.status,
        };

        setCurrentUser(currentUserWithStatus);
        await loadWorkspaceData(currentUserWithStatus, accessToken);
      } catch (error) {
        const readableError = getReadableError(error);

        console.error('Gagal memuat user workspace:', readableError, error);
        if (!isMounted) return;

        setWorkspaceError(readableError);
      } finally {
        if (isMounted) setIsAuthLoading(false);
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeRoomId || !activeWorkspaceId || !currentUser) return undefined;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`room-messages:${activeRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${activeRoomId}`,
        },
        async (payload) => {
          const row = payload.new as BootstrapMessageRow;

          if (row.type === 'file' || row.type === 'image') {
            try {
              await loadWorkspaceData(currentUser, await getAccessToken());
            } catch (error) {
              console.error('Gagal memuat ulang file message:', getReadableError(error), error);
            }
            return;
          }

          const nextMessage = toMessage(row, currentUser);

          setMessagesByWorkspace((prev) => {
            const currentMessages = prev[activeWorkspaceId]?.[activeRoomId] ?? [];

            if (currentMessages.some((message) => message.id === nextMessage.id)) {
              return prev;
            }

            return {
              ...prev,
              [activeWorkspaceId]: {
                ...(prev[activeWorkspaceId] ?? {}),
                [activeRoomId]: [...currentMessages, nextMessage],
              },
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, activeWorkspaceId, currentUser]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel('profile-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const profile = payload.new as { id?: string; status?: Status };

          if (!profile.id || !profile.status) return;

          if (profile.id === currentUserId) {
            setCurrentUser((prev) =>
              prev ? { ...prev, status: profile.status as Status } : prev
            );
          }

          setMembersByWorkspace((prev) =>
            Object.fromEntries(
              Object.entries(prev).map(([workspaceId, workspaceMembers]) => [
                workspaceId,
                workspaceMembers.map((member) =>
                  member.id === profile.id
                    ? { ...member, profileStatus: profile.status }
                    : member
                ),
              ])
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    const startTimeout = window.setTimeout(
      () => setTypingUser(typingMemberName && activeRoomId ? typingMemberName : ''),
      0
    );
    const stopTimeout = window.setTimeout(() => setTypingUser(''), 1800);

    return () => {
      window.clearTimeout(startTimeout);
      window.clearTimeout(stopTimeout);
    };
  }, [activeWorkspaceId, activeRoomId, typingMemberName]);

  function switchWorkspace(workspaceId: string) {
    const nextRooms = roomsByWorkspace[workspaceId] ?? [];
    setActiveWorkspaceId(workspaceId);
    setActiveRoomId(nextRooms.find((room) => !room.archived)?.id ?? nextRooms[0]?.id ?? '');
    setDraftFile(null);
    setReplyToMessage(null);
    setSearchQuery('');
    setMessageFilter('all');
    setFileCategory('all');
    setSelectedFileMessage(null);
    clearSummary();
  }

  function handleFileDrop(file: File) {
    setDraftFile(file);
  }

  async function handleStatusChange(status: Status) {
    if (!currentUser) return;

    const previousStatus = currentUser.status;

    setCurrentUser((prev) => (prev ? { ...prev, status } : prev));
    setMembersByWorkspace((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([workspaceId, workspaceMembers]) => [
          workspaceId,
          workspaceMembers.map((member) =>
            member.id === currentUser.id ? { ...member, profileStatus: status } : member
          ),
        ])
      )
    );

    try {
      await apiFetch('/api/auth/status', {
        method: 'PATCH',
        accessToken: await getAccessToken(),
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Gagal mengubah status:', getReadableError(error), error);
      setCurrentUser((prev) => (prev ? { ...prev, status: previousStatus } : prev));
      setMembersByWorkspace((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([workspaceId, workspaceMembers]) => [
            workspaceId,
            workspaceMembers.map((member) =>
              member.id === currentUser.id
                ? { ...member, profileStatus: previousStatus }
                : member
            ),
          ])
        )
      );
    }
  }

  async function handleLogout() {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Gagal logout:', getReadableError(error), error);
    } finally {
      window.location.replace('/login');
    }
  }

  function handleUpdateProfile(profile: { photoUrl?: string; bio: string }) {
    setCurrentUser((prev) =>
      prev
        ? {
            ...prev,
            photoUrl: profile.photoUrl,
            bio: profile.bio,
          }
        : prev
    );
    setMembersByWorkspace((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([workspaceId, workspaceMembers]) => [
          workspaceId,
          workspaceMembers.map((member) =>
            member.id === currentUserId ? { ...member, bio: profile.bio } : member
          ),
        ])
      )
    );
  }

  function handleAcceptInvite(notification: NotificationItem) {
    if (!notification.inviteWorkspaceName) return;
    const invite = incomingInvites.find((item) => item.id === notification.id);

    if (invite?.workspaceId && invite.invitedEmail) {
      setIncomingInvites((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, status: 'accepted' } : item
        )
      );
      setMembersByWorkspace((prev) => ({
        ...prev,
        [invite.workspaceId as string]: (prev[invite.workspaceId as string] ?? []).map(
          (member) =>
            member.email.toLowerCase() === invite.invitedEmail?.toLowerCase()
              ? {
                  ...member,
                  status: 'active',
                  profileStatus: 'online',
                  bio: 'Sudah menerima undangan workspace.',
                }
              : member
        ),
      }));
      setInviteMessage(`${invite.invitedEmail} menerima invite.`);
      return;
    }

    const workspaceId = `accepted-${notification.id}`;
    const firstRoomId = `${workspaceId}-diskusi-utama`;
    const nextWorkspace: Workspace = {
      id: workspaceId,
      name: notification.inviteWorkspaceName,
      shortName: makeInitials(notification.inviteWorkspaceName),
      description: `Workspace dari undangan ${notification.inviteCode ?? ''}.`,
      color: WORKSPACE_COLORS[workspaces.length % WORKSPACE_COLORS.length],
      inviteCode: notification.inviteCode ?? notification.id.toUpperCase(),
    };
    const firstRoom: Room = {
      id: firstRoomId,
      name: 'diskusi-utama',
      icon: 'message',
      description: `Ruang awal untuk ${notification.inviteWorkspaceName}.`,
    };

    setIncomingInvites((prev) =>
      prev.map((invite) =>
        invite.id === notification.id ? { ...invite, status: 'accepted' } : invite
      )
    );
    setWorkspaces((prev) =>
      prev.some((workspace) => workspace.id === workspaceId)
        ? prev
        : [...prev, nextWorkspace]
    );
    setRoomsByWorkspace((prev) => ({
      ...prev,
      [workspaceId]: prev[workspaceId] ?? [firstRoom],
    }));
    setMessagesByWorkspace((prev) => ({
      ...prev,
      [workspaceId]: prev[workspaceId] ?? { [firstRoomId]: [] },
    }));
    setMembersByWorkspace((prev) => ({
      ...prev,
      [workspaceId]: prev[workspaceId] ?? [
        {
          id: currentUserId || `${workspaceId}-me`,
          name: currentUserName,
          email: currentUserEmail,
          role: 'Member',
          status: 'active',
          avatar: currentUserAvatar,
          profileStatus: currentUserStatus,
          bio: currentUserBio,
        },
        {
          id: `${workspaceId}-inviter`,
          name: notification.title.split(' ')[0] || 'Pengundang',
          email: 'pengundang@workspace.local',
          role: 'Admin',
          status: 'active',
          avatar: 'bg-violet-600',
          profileStatus: 'online',
          bio: 'Mengundang kamu ke workspace ini.',
        },
      ],
    }));
    setActiveWorkspaceId(workspaceId);
    setActiveRoomId(firstRoomId);
    setDraftFile(null);
    setReplyToMessage(null);
  }

  function handleDeclineInvite(notification: NotificationItem) {
    const invite = incomingInvites.find((item) => item.id === notification.id);

    setIncomingInvites((prev) =>
      prev.map((invite) =>
        invite.id === notification.id ? { ...invite, status: 'declined' } : invite
      )
    );

    if (invite?.workspaceId && invite.invitedEmail) {
      setMembersByWorkspace((prev) => ({
        ...prev,
        [invite.workspaceId as string]: (prev[invite.workspaceId as string] ?? []).filter(
          (member) =>
            member.email.toLowerCase() !== invite.invitedEmail?.toLowerCase()
        ),
      }));
      setInviteMessage(`${invite.invitedEmail} menolak invite.`);
    }
  }

  function handleAcceptInviteById(inviteId: string) {
    const invite = incomingInvites.find((item) => item.id === inviteId);

    if (!invite) return;

    handleAcceptInvite({
      id: invite.id,
      kind: 'invite',
      title: `${invite.inviterName} mengundang kamu`,
      description: `Gabung ke ${invite.workspaceName}.`,
      time: 'Baru saja',
      inviteCode: invite.inviteCode,
      inviteWorkspaceName: invite.workspaceName,
      inviteStatus: invite.status,
    });
  }

  function handleDeclineInviteById(inviteId: string) {
    const invite = incomingInvites.find((item) => item.id === inviteId);

    if (!invite) return;

    handleDeclineInvite({
      id: invite.id,
      kind: 'invite',
      title: `${invite.inviterName} mengundang kamu`,
      description: `Gabung ke ${invite.workspaceName}.`,
      time: 'Baru saja',
      inviteCode: invite.inviteCode,
      inviteWorkspaceName: invite.workspaceName,
      inviteStatus: invite.status,
    });
  }

  async function handleSendMessage(text: string, file?: File) {
    if (!activeRoom || !currentUser) return;

    try {
      const accessToken = await getAccessToken();
      const { message } = file
        ? await apiFetch<CreateMessageResponse>(
            `/api/workspaces/channels/${activeRoom.id}/files`,
            {
              method: 'POST',
              accessToken,
              body: JSON.stringify({
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                fileSize: file.size,
                contentBase64: await readFileAsBase64(file),
                caption: text,
              }),
            }
          )
        : await apiFetch<CreateMessageResponse>(
            `/api/workspaces/channels/${activeRoom.id}/messages`,
            {
              method: 'POST',
              accessToken,
              body: JSON.stringify({
                content: text,
                type: 'text',
              }),
            }
          );

      const nextMessage = toMessage(message, currentUser);

      setMessagesByWorkspace((prev) => {
        const currentMessages = prev[activeWorkspaceId]?.[activeRoom.id] ?? [];

        if (currentMessages.some((item) => item.id === nextMessage.id)) {
          return prev;
        }

        return {
          ...prev,
          [activeWorkspaceId]: {
            ...(prev[activeWorkspaceId] ?? {}),
            [activeRoom.id]: [...currentMessages, nextMessage],
          },
        };
      });

      setReplyToMessage(null);
      setDraftFile(null);
    } catch (error) {
      console.error('Gagal mengirim pesan:', getReadableError(error), error);
    }
  }

  async function createChannelInBackend(trimmedName: string, description: string, currentRooms: Room[]) {
    const accessToken = await getAccessToken();
    const { channel } = await apiFetch<CreateChannelResponse>(
      `/api/workspaces/${activeWorkspaceId}/channels`,
      {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || `Ruang diskusi untuk ${trimmedName}.`,
        }),
      }
    );

    const newRoom = toRoom(channel);

    setRoomsByWorkspace((prev) => ({
      ...prev,
      [activeWorkspaceId]: [...currentRooms, newRoom],
    }));
    setMessagesByWorkspace((prev) => ({
      ...prev,
      [activeWorkspaceId]: {
        ...(prev[activeWorkspaceId] ?? {}),
        [newRoom.id]: [],
      },
    }));
    setActiveRoomId(newRoom.id);
    setShowChannelModal(false);
  }

  async function createWorkspaceInBackend(name: string, description: string) {
    if (!currentUser) return;

    const accessToken = await getAccessToken();
    const { workspace, channel } = await apiFetch<CreateWorkspaceResponse>('/api/workspaces', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({
        name,
        description,
      }),
    });

    const nextWorkspace = toWorkspace(workspace, workspaces.length);
    const firstRoom = toRoom(channel);

    setWorkspaces((prev) => [...prev, nextWorkspace]);
    setRoomsByWorkspace((prev) => ({
      ...prev,
      [workspace.id]: [firstRoom],
    }));
    setMessagesByWorkspace((prev) => ({
      ...prev,
      [workspace.id]: { [firstRoom.id]: [] },
    }));
    setMembersByWorkspace((prev) => ({
      ...prev,
      [workspace.id]: [
        {
          id: currentUser.id,
          name: currentUserName,
          email: currentUserEmail,
          role: 'Owner',
          status: 'active',
          avatar: currentUserAvatar,
          profileStatus: currentUserStatus,
          bio: currentUserBio,
        },
      ],
    }));
    setWorkspaceModal(null);
    setActiveWorkspaceId(workspace.id);
    setActiveRoomId(firstRoom.id);
  }

  function updateCurrentRoomMessages(updater: (messages: Message[]) => Message[]) {
    if (!activeRoom) return;

    setMessagesByWorkspace((prev) => ({
      ...prev,
      [activeWorkspaceId]: {
        ...(prev[activeWorkspaceId] ?? {}),
        [activeRoom.id]: updater(prev[activeWorkspaceId]?.[activeRoom.id] ?? []),
      },
    }));
  }

  async function handleTogglePin(messageId: Message['id']) {
    const targetMessage = messages.find((message) => message.id === messageId);
    if (!targetMessage) return;

    const nextPinned = !targetMessage.pinned;

    try {
      await apiFetch(`/api/workspaces/messages/${messageId}`, {
        method: 'PATCH',
        accessToken: await getAccessToken(),
        body: JSON.stringify({ pinned: nextPinned }),
      });

      updateCurrentRoomMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === messageId
            ? { ...message, pinned: nextPinned }
            : message
        )
      );
    } catch (error) {
      console.error('Gagal mengubah pin pesan:', getReadableError(error), error);
    }
  }

  async function handleDeleteMessage(messageId: Message['id']) {
    try {
      await apiFetch(`/api/workspaces/messages/${messageId}`, {
        method: 'DELETE',
        accessToken: await getAccessToken(),
      });

      updateCurrentRoomMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== messageId)
      );

      if (replyToMessage?.id === messageId) setReplyToMessage(null);
      if (editingMessage?.id === messageId) {
        setEditingMessage(null);
      }
    } catch (error) {
      console.error('Gagal menghapus pesan:', getReadableError(error), error);
    }
  }

  function handleStartEdit(message: Message) {
    setEditingMessage(message);
  }

  async function handleSaveEdit(messageToEdit: Message, text: string) {
    try {
      await apiFetch(`/api/workspaces/messages/${messageToEdit.id}`, {
        method: 'PATCH',
        accessToken: await getAccessToken(),
        body: JSON.stringify({ content: text }),
      });

      updateCurrentRoomMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === messageToEdit.id
            ? { ...message, text: text.trim() || undefined, edited: true }
            : message
        )
      );
      setEditingMessage(null);
    } catch (error) {
      console.error('Gagal mengedit pesan:', getReadableError(error), error);
    }
  }

  function handleMockDownload(message: Message) {
    if (message.fileUrl) {
      window.open(message.fileUrl, '_blank', 'noopener,noreferrer');
      setFileNotice(`${message.fileName} dibuka di tab baru.`);
      window.setTimeout(() => setFileNotice(''), 2200);
      return;
    }

    setFileNotice(`${message.fileName} belum memiliki URL download.`);
    window.setTimeout(() => setFileNotice(''), 2200);
  }

  async function handleUpdateWorkspace(
    updates: Pick<Workspace, 'name' | 'shortName' | 'description' | 'color'>
  ) {
    try {
      const { workspace } = await apiFetch<UpdateWorkspaceResponse>(
        `/api/workspaces/${activeWorkspaceId}`,
        {
          method: 'PATCH',
          accessToken: await getAccessToken(),
          body: JSON.stringify(updates),
        }
      );
      const nextWorkspace = toWorkspace(
        workspace,
        workspaces.findIndex((item) => item.id === activeWorkspaceId)
      );

      setWorkspaces((prev) =>
        prev.map((item) =>
          item.id === activeWorkspaceId
            ? { ...item, ...nextWorkspace, shortName: updates.shortName }
            : item
        )
      );
      setShowWorkspaceSettings(false);
    } catch (error) {
      console.error('Gagal mengubah workspace:', getReadableError(error), error);
    }
  }

  async function handleLeaveWorkspace() {
    try {
      const accessToken = await getAccessToken();
      await apiFetch(`/api/workspaces/${activeWorkspaceId}/leave`, {
        method: 'DELETE',
        accessToken,
      });

      const remainingWorkspaces = workspaces.filter(
        (workspace) => workspace.id !== activeWorkspaceId
      );

      if (remainingWorkspaces.length === 0 && currentUser) {
        await loadWorkspaceData(currentUser, accessToken);
        setShowWorkspaceSettings(false);
        return;
      }

      const nextWorkspaceId = remainingWorkspaces[0]?.id;
      const nextRoomId = nextWorkspaceId
        ? roomsByWorkspace[nextWorkspaceId]?.[0]?.id ?? ''
        : '';

      setWorkspaces(remainingWorkspaces);
      setActiveWorkspaceId(nextWorkspaceId ?? '');
      setActiveRoomId(nextRoomId);
      setDraftFile(null);
      setReplyToMessage(null);
      setSearchQuery('');
      setMessageFilter('all');
      setFileCategory('all');
      setSelectedFileMessage(null);
      setShowWorkspaceSettings(false);
      clearSummary();
    } catch (error) {
      console.error('Gagal keluar/menghapus workspace:', getReadableError(error), error);
    }
  }

  function handleCreateChannel(name: string, description: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const currentRooms = roomsByWorkspace[activeWorkspaceId] ?? [];

    createChannelInBackend(trimmedName, description, currentRooms).catch((error) => {
      console.error('Gagal membuat channel:', getReadableError(error), error);
    });
  }

  function updateCurrentWorkspaceRooms(updater: (rooms: Room[]) => Room[]) {
    setRoomsByWorkspace((prev) => ({
      ...prev,
      [activeWorkspaceId]: updater(prev[activeWorkspaceId] ?? []),
    }));
  }

  async function handleToggleFavoriteChannel(roomId: string) {
    const targetRoom = rooms.find((room) => room.id === roomId);
    if (!targetRoom) return;

    try {
      const { channel } = await apiFetch<UpdateChannelResponse>(
        `/api/workspaces/channels/${roomId}`,
        {
          method: 'PATCH',
          accessToken: await getAccessToken(),
          body: JSON.stringify({ favorite: !targetRoom.favorite }),
        }
      );

      const nextRoom = toRoom(channel);
      updateCurrentWorkspaceRooms((currentRooms) =>
        currentRooms.map((room) =>
          room.id === roomId ? { ...room, ...nextRoom } : room
        )
      );
    } catch (error) {
      console.error('Gagal mengubah favorit channel:', getReadableError(error), error);
    }
  }

  async function handleUpdateChannel(
    updates: Pick<Room, 'name' | 'description' | 'favorite'>
  ) {
    if (!activeRoom) return;

    try {
      const { channel } = await apiFetch<UpdateChannelResponse>(
        `/api/workspaces/channels/${activeRoom.id}`,
        {
          method: 'PATCH',
          accessToken: await getAccessToken(),
          body: JSON.stringify(updates),
        }
      );

      const nextRoom = toRoom(channel);
      updateCurrentWorkspaceRooms((currentRooms) =>
        currentRooms.map((room) =>
          room.id === activeRoom.id ? { ...room, ...nextRoom } : room
        )
      );
      setShowChannelSettings(false);
    } catch (error) {
      console.error('Gagal mengubah channel:', getReadableError(error), error);
    }
  }

  async function handleToggleArchiveChannel() {
    if (!activeRoom) return;

    const nextArchivedState = !activeRoom.archived;
    const nextActiveRoomId = nextArchivedState
      ? rooms.find((room) => room.id !== activeRoom.id && !room.archived)?.id ??
        activeRoom.id
      : activeRoom.id;

    try {
      const { channel } = await apiFetch<UpdateChannelResponse>(
        `/api/workspaces/channels/${activeRoom.id}`,
        {
          method: 'PATCH',
          accessToken: await getAccessToken(),
          body: JSON.stringify({
            archived: nextArchivedState,
            favorite: nextArchivedState ? false : activeRoom.favorite,
          }),
        }
      );

      const nextRoom = toRoom(channel);
      updateCurrentWorkspaceRooms((currentRooms) =>
        currentRooms.map((room) =>
          room.id === activeRoom.id ? { ...room, ...nextRoom } : room
        )
      );
      setActiveRoomId(nextActiveRoomId);
      setShowChannelSettings(false);
    } catch (error) {
      console.error('Gagal mengarsipkan channel:', getReadableError(error), error);
    }
  }

  function openDeleteChannelModal() {
    setDeleteConfirmRoomId(activeRoom?.id ?? '');
    setShowDeleteChannelModal(true);
  }

  async function handleConfirmDeleteChannel() {
    if (!deleteConfirmRoomId) return;

    try {
      await apiFetch(`/api/workspaces/channels/${deleteConfirmRoomId}`, {
        method: 'DELETE',
        accessToken: await getAccessToken(),
      });

      const remainingRooms = rooms.filter((room) => room.id !== deleteConfirmRoomId);
      const nextActiveRoomId =
        activeRoomId === deleteConfirmRoomId
          ? remainingRooms.find((room) => !room.archived)?.id ??
            remainingRooms[0]?.id ??
            ''
          : activeRoomId;

      setRoomsByWorkspace((prev) => ({
        ...prev,
        [activeWorkspaceId]: remainingRooms,
      }));

      setMessagesByWorkspace((prev) => {
        const nextWorkspaceMessages = { ...(prev[activeWorkspaceId] ?? {}) };
        delete nextWorkspaceMessages[deleteConfirmRoomId];

        return {
          ...prev,
          [activeWorkspaceId]: nextWorkspaceMessages,
        };
      });

      setActiveRoomId(nextActiveRoomId);
      setDraftFile(null);
      setDeleteConfirmRoomId('');
      setShowDeleteChannelModal(false);
      clearSummary();
    } catch (error) {
      console.error('Gagal menghapus channel:', getReadableError(error), error);
    }
  }

  async function handleInviteMember(emailInput: string, role: TeamMember['role']) {
    const email = emailInput.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail) {
      setInviteMessage('Masukkan alamat email yang valid.');
      return;
    }

    if (members.some((member) => member.email.toLowerCase() === email)) {
      setInviteMessage('User ini sudah ada di workspace ini.');
      return;
    }

    try {
      const accessToken = await getAccessToken();
      const { member } = await apiFetch<InviteMemberResponse>(
        `/api/workspaces/${activeWorkspaceId}/invite`,
        {
          method: 'POST',
          accessToken,
          body: JSON.stringify({
            email,
            role,
          }),
        }
      );

      const nextMember: TeamMember = {
        ...toMember(member, currentUser ?? {
          id: '',
          name: currentUserName,
          email: currentUserEmail,
          initial: currentUserInitial,
          avatar: currentUserAvatar,
          photoUrl: currentUserPhotoUrl,
          bio: currentUserBio,
          status: currentUserStatus,
        }),
        email,
        role,
        status: 'pending',
        profileStatus: 'offline',
        bio: 'Menunggu konfirmasi invite.',
      };
      const nextInvite: PendingInvitation = {
        id: `invite-${activeWorkspaceId}-${Date.now()}`,
        workspaceId: activeWorkspaceId,
        workspaceName: activeWorkspace.name,
        inviterName: currentUserName,
        invitedEmail: email,
        role,
        inviteCode: activeWorkspace.inviteCode,
        status: 'pending',
      };

      setMembersByWorkspace((prev) => {
        const currentMembers = prev[activeWorkspaceId] ?? [];
        const withoutDuplicate = currentMembers.filter(
          (item) => item.email.toLowerCase() !== email
        );

        return {
          ...prev,
          [activeWorkspaceId]: [...withoutDuplicate, nextMember],
        };
      });
      setIncomingInvites((prev) => [nextInvite, ...prev]);
      setInviteMessage(
        `Invite dikirim ke ${email}. Konfirmasi Gabung/Tolak muncul di notifikasi.`
      );
    } catch (error) {
      setInviteMessage(getReadableError(error));
    }
  }

  function handleCreateWorkspace(name: string, description: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    createWorkspaceInBackend(
      trimmedName,
      description.trim() || `Workspace untuk kolaborasi ${trimmedName}.`
    ).catch((error) => {
      console.error('Gagal membuat workspace:', getReadableError(error), error);
    });
  }

  async function handleJoinWorkspace(inviteCode: string) {
    const code = inviteCode.trim().toUpperCase();

    if (!code) {
      setWorkspaceFeedback('Masukkan kode invite terlebih dahulu.');
      return;
    }

    try {
      const accessToken = await getAccessToken();
      const { workspace, channel } = await apiFetch<JoinWorkspaceResponse>(
        `/api/workspaces/join/${code}`,
        {
          method: 'POST',
          accessToken,
        }
      );

      const nextWorkspace = toWorkspace(workspace, workspaces.length);
      const firstRoom = toRoom(channel);

      setWorkspaces((prev) => {
        if (prev.some((item) => item.id === nextWorkspace.id)) return prev;
        return [...prev, nextWorkspace];
      });
      setRoomsByWorkspace((prev) => ({
        ...prev,
        [workspace.id]: prev[workspace.id] ?? [firstRoom],
      }));
      setMessagesByWorkspace((prev) => ({
        ...prev,
        [workspace.id]: prev[workspace.id] ?? { [firstRoom.id]: [] },
      }));
      setMembersByWorkspace((prev) => ({
        ...prev,
        [workspace.id]: prev[workspace.id] ?? [
          {
            id: currentUser?.id ?? `${workspace.id}-me`,
            name: currentUserName,
            email: currentUserEmail,
            role: 'Member',
            status: 'active',
            avatar: currentUserAvatar,
            profileStatus: currentUserStatus,
            bio: currentUserBio,
          },
        ],
      }));
      setWorkspaceFeedback('');
      setWorkspaceModal(null);
      setActiveWorkspaceId(workspace.id);
      setActiveRoomId(firstRoom.id);
    } catch (error) {
      setWorkspaceFeedback(getReadableError(error));
    }
  }

  if (isAuthLoading || !activeWorkspace) {
    if (!isAuthLoading && workspaceError) {
      return (
        <div className="flex h-screen items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md rounded-xl border border-red-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-red-600">
              Gagal memuat workspace
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {workspaceError}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Coba lagi
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen items-center justify-center bg-white text-sm font-medium text-gray-500">
        <Loader2 size={18} className="mr-3 animate-spin text-indigo-600" />
        Memuat workspace...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 font-sans text-gray-800">
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onWorkspaceChange={switchWorkspace}
        onCreateWorkspace={() => {
          setWorkspaceFeedback('');
          setWorkspaceModal('create');
        }}
        onJoinWorkspace={() => {
          setWorkspaceFeedback('');
          setWorkspaceModal('join');
        }}
      />

      <Sidebar
        workspaceName={activeWorkspace.name}
        workspaceInitials={activeWorkspace.shortName}
        workspaceColor={activeWorkspace.color}
        currentUserName={currentUserName}
        currentUserInitial={currentUserInitial}
        currentUserStatus={currentUserStatus}
        memberCount={members.length}
        members={members}
        rooms={rooms}
        activeRoomId={activeRoomId}
        onRoomChange={(roomId) => {
          setActiveRoomId(roomId);
          setDraftFile(null);
          setReplyToMessage(null);
          setSearchQuery('');
          setMessageFilter('all');
          setFileCategory('all');
          setSelectedFileMessage(null);
          setRoomsByWorkspace((prev) => ({
            ...prev,
            [activeWorkspaceId]: (prev[activeWorkspaceId] ?? []).map((room) =>
              room.id === roomId ? { ...room, unread: 0 } : room
            ),
          }));
        }}
        onCreateChannel={() => setShowChannelModal(true)}
        onDeleteChannel={openDeleteChannelModal}
        onToggleFavoriteChannel={handleToggleFavoriteChannel}
        onStatusChange={handleStatusChange}
      />

      <div className="flex flex-1 flex-col bg-white">
        <WorkspaceHeader
          activeRoom={activeRoom}
          activeWorkspace={activeWorkspace}
          memberCount={members.length}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
          currentUserInitial={currentUserInitial}
          currentUserPhotoUrl={currentUserPhotoUrl}
          currentUserBio={currentUserBio}
          currentUserStatus={currentUserStatus}
          currentUserRole={currentMember?.role}
          notifications={headerNotifications}
          searchQuery={searchQuery}
          showFilePanel={showFilePanel}
          isSummarizing={isSummarizing}
          canSummarize={messages.length > 0}
          onSearchChange={setSearchQuery}
          onInvite={() => {
            setInviteMessage('');
            setShowInviteModal(true);
          }}
          onSummarize={() => summarize(messages)}
          onToggleFilePanel={() => setShowFilePanel((current) => !current)}
          onOpenChannelSettings={() => setShowChannelSettings(true)}
          onOpenSettings={() => setShowWorkspaceSettings(true)}
          onOpenProfile={() => setShowUserProfile(true)}
          onLogout={handleLogout}
          onAcceptInvite={handleAcceptInvite}
          onDeclineInvite={handleDeclineInvite}
        />

        <MessageFilterBar
          filter={messageFilter}
          visibleCount={filteredMessages.length}
          totalCount={messages.length}
          onFilterChange={setMessageFilter}
        />

        <div className="flex min-h-0 flex-1">
        <div
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden"
          {...dragHandlers}
        >
          {pinnedMessages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessageFilter('pinned')}
              className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100/70"
            >
              <div className="rounded-lg bg-white px-2 py-1 text-xs font-black text-amber-600 shadow-sm">
                PIN
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-700">
                  {pinnedMessages.length} pesan dipin di channel ini
                </p>
                <p className="truncate text-xs text-amber-600/80">
                  {getMessagePreview(pinnedMessages[0])}
                </p>
              </div>
            </button>
          )}

          <MessageList
            messages={filteredMessages}
            emptyTitle={
              searchQuery || messageFilter !== 'all'
                ? 'Tidak ada pesan yang cocok'
                : undefined
            }
            emptyDescription={
              searchQuery || messageFilter !== 'all'
                ? 'Coba ubah kata pencarian atau filter pesan.'
                : undefined
            }
            typingUser={typingUser}
            onReply={setReplyToMessage}
            onTogglePin={handleTogglePin}
            onEdit={handleStartEdit}
            onDelete={handleDeleteMessage}
          />

          <ChatInput
            onSendMessage={handleSendMessage}
            activeRoom={activeRoom?.name ?? 'channel ini'}
            draftFile={draftFile}
            onDraftFileChange={setDraftFile}
            replyTo={replyToMessage}
            onCancelReply={() => setReplyToMessage(null)}
          />

          {isDragging && (
            <div className="absolute inset-0 z-50 m-4 flex flex-col items-center justify-center rounded-2xl border-4 border-dashed border-blue-400 bg-white/90 backdrop-blur-sm">
              <div className="mb-4 rounded-full bg-blue-50 p-6 text-blue-600">
                <Sparkles size={48} strokeWidth={1.5} />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-800">
                Jatuhkan file di sini
              </h2>
              <p className="text-gray-500">
                Dokumen akan ditambahkan ke draft pesan di{' '}
                <span className="font-bold text-blue-600">
                  {activeRoom?.name ?? 'aktif'}
                </span>
              </p>
            </div>
          )}

          {showWorkspaceSettings && (
            <WorkspaceSettingsModal
              workspace={activeWorkspace}
              members={members}
              canLeave={true}
              onClose={() => setShowWorkspaceSettings(false)}
              onUpdate={handleUpdateWorkspace}
              onLeave={handleLeaveWorkspace}
            />
          )}

          {showUserProfile && (
            <UserProfileModal
              name={currentUserName}
              email={currentUserEmail}
              initial={currentUserInitial}
              photoUrl={currentUserPhotoUrl}
              bio={currentUserBio}
              status={currentUserStatus}
              onClose={() => setShowUserProfile(false)}
              onSave={handleUpdateProfile}
            />
          )}

          {showChannelSettings && activeRoom && (
            <ChannelSettingsModal
              room={activeRoom}
              messageCount={messages.length}
              fileCount={channelFiles.length}
              onClose={() => setShowChannelSettings(false)}
              onUpdate={handleUpdateChannel}
              onArchiveToggle={handleToggleArchiveChannel}
            />
          )}

          {editingMessage && (
            <EditMessageModal
              message={editingMessage}
              onClose={() => setEditingMessage(null)}
              onSave={handleSaveEdit}
            />
          )}

          {workspaceModal === 'create' && (
            <CreateWorkspaceModal
              onClose={() => setWorkspaceModal(null)}
              onCreate={handleCreateWorkspace}
            />
          )}

          {workspaceModal === 'join' && (
            <JoinWorkspaceModal
              feedback={workspaceFeedback}
              onClose={() => setWorkspaceModal(null)}
              onJoin={handleJoinWorkspace}
              onFeedbackClear={() => setWorkspaceFeedback('')}
            />
          )}

          {showChannelModal && (
            <CreateChannelModal
              workspaceName={activeWorkspace.name}
              onClose={() => setShowChannelModal(false)}
              onCreate={handleCreateChannel}
            />
          )}

          {showDeleteChannelModal && (
            <DeleteChannelModal
              activeRoom={activeRoom}
              workspace={activeWorkspace}
              onClose={() => {
                setShowDeleteChannelModal(false);
                setDeleteConfirmRoomId('');
              }}
              onConfirm={handleConfirmDeleteChannel}
            />
          )}

          {showInviteModal && (
            <InviteMemberModal
              workspace={activeWorkspace}
              members={members}
              invites={incomingInvites
                .filter((invite) => invite.workspaceId === activeWorkspaceId)
                .map((invite) => ({
                  id: invite.id,
                  email: invite.invitedEmail ?? 'user@workspace.local',
                  workspaceName: invite.workspaceName,
                  status: invite.status,
                }))}
              message={inviteMessage}
              onClose={() => setShowInviteModal(false)}
              onInvite={handleInviteMember}
              onAcceptInvite={handleAcceptInviteById}
              onDeclineInvite={handleDeclineInviteById}
              onMessageClear={() => setInviteMessage('')}
            />
          )}

          {(isSummarizing || summaryResult) && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
              <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 bg-indigo-50/50 px-6 py-4">
                  <div className="flex items-center space-x-2 text-indigo-700">
                    <Sparkles
                      size={20}
                      className={isSummarizing ? 'animate-pulse' : ''}
                    />
                    <h3 className="text-lg font-bold">Rangkuman Diskusi</h3>
                  </div>
                  <button
                    onClick={clearSummary}
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
                      onClick={clearSummary}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                    >
                      Tutup
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showFilePanel && (
          <FilePanel
            activeRoomName={activeRoom?.name}
            files={channelFiles}
            filteredFiles={filteredChannelFiles}
            category={fileCategory}
            notice={fileNotice}
            onCategoryChange={setFileCategory}
            onClose={() => setShowFilePanel(false)}
            onPreview={setSelectedFileMessage}
            onDownload={handleMockDownload}
          />
        )}

        {selectedFileMessage && (
          <FilePreviewModal
            file={selectedFileMessage}
            onClose={() => setSelectedFileMessage(null)}
            onDownload={handleMockDownload}
          />
        )}
        </div>
      </div>
    </div>
  );
}

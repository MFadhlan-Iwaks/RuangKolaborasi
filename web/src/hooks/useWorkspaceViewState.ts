'use client';

import { useMemo } from 'react';
import {
  FileCategory,
  Message,
  MessageFilter,
  NotificationItem,
  PendingInvitation,
  Room,
  TeamMember,
  Workspace,
} from '@/types';
import { getFileCategory, getMessagePreview } from '@/lib/workspaceUtils';

interface UseWorkspaceViewStateOptions {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  activeRoomId: string;
  roomsByWorkspace: Record<string, Room[]>;
  messagesByWorkspace: Record<string, Record<string, Message[]>>;
  membersByWorkspace: Record<string, TeamMember[]>;
  incomingInvites: PendingInvitation[];
  fileCategory: FileCategory;
  messageFilter: MessageFilter;
  searchQuery: string;
  currentUserName: string;
}

const EMPTY_MEMBERS: TeamMember[] = [];
const EMPTY_MESSAGES: Message[] = [];

export function useWorkspaceViewState({
  workspaces,
  activeWorkspaceId,
  activeRoomId,
  roomsByWorkspace,
  messagesByWorkspace,
  membersByWorkspace,
  incomingInvites,
  fileCategory,
  messageFilter,
  searchQuery,
  currentUserName,
}: UseWorkspaceViewStateOptions) {
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0];
  const rooms = roomsByWorkspace[activeWorkspaceId] ?? [];
  const members = membersByWorkspace[activeWorkspaceId] ?? EMPTY_MEMBERS;
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];
  const messages =
    messagesByWorkspace[activeWorkspaceId]?.[activeRoom?.id ?? ''] ??
    EMPTY_MESSAGES;
  const typingMemberName =
    members.find(
      (member) => member.status === 'active' && member.name !== currentUserName
    )?.name ?? '';
  const pinnedMessages = messages.filter((message) => message.pinned);
  const channelFiles = messages.filter((message) => message.type === 'file');
  const filteredChannelFiles = channelFiles.filter(
    (message) =>
      fileCategory === 'all' || getFileCategory(message.fileName) === fileCategory
  );
  const filteredMessages = messages.filter((message) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesFilter =
      messageFilter === 'all' ||
      (messageFilter === 'files' && message.type === 'file') ||
      (messageFilter === 'pinned' && message.pinned) ||
      (messageFilter === 'starred' && message.starred);

    if (!matchesFilter) return false;
    if (!query) return true;

    return [
      message.user,
      message.text,
      message.fileName,
      message.replyTo?.user,
      message.replyTo?.preview,
      message.forwardedFrom?.user,
      message.forwardedFrom?.preview,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(query));
  });

  const headerNotifications = useMemo<NotificationItem[]>(() => {
    if (!activeWorkspace) return [];

    const latestMessage = messages.at(-1);
    const latestFile = [...messages]
      .reverse()
      .find((message) => message.type === 'file');
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
        inviteMode: invite.invitedEmail ? ('outgoing' as const) : ('incoming' as const),
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

  return {
    activeWorkspace,
    rooms,
    members,
    activeRoom,
    messages,
    typingMemberName,
    pinnedMessages,
    channelFiles,
    filteredChannelFiles,
    filteredMessages,
    headerNotifications,
  };
}

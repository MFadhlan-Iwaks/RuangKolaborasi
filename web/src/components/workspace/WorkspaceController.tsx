// src/components/workspace/WorkspaceController.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CurrentUser,
  FileCategory,
  Message,
  MessageFilter,
  NotificationItem,
  PendingInvitation,
  Room,
  Status,
  TeamMember,
  ToastMessage,
  Workspace,
} from '@/types';
import WorkspaceSwitcher from '@/components/layout/WorkspaceSwitcher';
import Sidebar from '@/components/layout/Sidebar';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import WorkspaceChatArea from '@/components/workspace/WorkspaceChatArea';
import WorkspaceOverlays from '@/components/workspace/WorkspaceOverlays';
import WorkspaceSkeleton from '@/components/workspace/WorkspaceSkeleton';
import ToastStack from '@/components/ui/ToastStack';
import { useGemini } from '@/hooks/useGemini';
import { useDragDrop } from '@/hooks/useDragDrop';
import { useWorkspaceViewState } from '@/hooks/useWorkspaceViewState';
import {
  formatFileSize,
  makeInitials,
} from '@/lib/workspaceUtils';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { apiFetch } from '@/lib/apiClient';
import {
  BootstrapMessageRow,
  BootstrapResponse,
  CreateChannelResponse,
  CreateMessageResponse,
  CreateWorkspaceResponse,
  InviteMemberResponse,
  JoinWorkspaceResponse,
  UpdateChannelResponse,
  UpdateWorkspaceResponse,
  WORKSPACE_COLORS,
  ensureProfile,
  getAccessToken,
  getDisplayName,
  getReadableError,
  readFileAsBase64,
  toMember,
  toMessage,
  toRoom,
  toWorkspace,
} from '@/lib/workspaceApi';

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
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);
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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [busyActions, setBusyActions] = useState<Record<string, boolean>>({});
  const retryPayloadsRef = useRef<
    Record<string, { text: string; file?: File }>
  >({});

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

  const {
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
  } = useWorkspaceViewState({
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
  });

  function showToast(toast: Omit<ToastMessage, 'id'>) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setToasts((prev) => [...prev, { ...toast, id }].slice(-4));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  }

  function showActionError(title: string, error: unknown) {
    const readableError = getReadableError(error);

    console.error(title, readableError, error);
    showToast({
      type: 'error',
      title,
      description: readableError,
    });
  }

  async function runWithBusy(action: string, task: () => Promise<void>) {
    setBusyActions((prev) => ({ ...prev, [action]: true }));

    try {
      await task();
    } finally {
      setBusyActions((prev) => ({ ...prev, [action]: false }));
    }
  }

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

  useEffect(() => {
    function handleWorkspaceShortcuts(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const searchInput = document.getElementById('workspace-search') as
          | HTMLInputElement
          | null;
        searchInput?.focus();
        searchInput?.select();
        return;
      }

      if (event.key === 'Escape' && !isTypingTarget) {
        setShowWorkspaceSettings(false);
        setShowUserProfile(false);
        setShowChannelSettings(false);
        setShowChannelModal(false);
        setShowDeleteChannelModal(false);
        setShowInviteModal(false);
        setWorkspaceModal(null);
        setEditingMessage(null);
        setDeletingMessage(null);
        setSelectedFileMessage(null);
        clearSummary();
      }
    }

    window.addEventListener('keydown', handleWorkspaceShortcuts);
    return () => window.removeEventListener('keydown', handleWorkspaceShortcuts);
  }, [clearSummary]);

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
    if (!activeRoom) {
      showToast({
        type: 'info',
        title: 'Belum ada channel aktif',
        description: 'Buat atau pilih ruang diskusi terlebih dahulu.',
      });
      return;
    }

    if (activeRoom.archived) {
      showToast({
        type: 'info',
        title: 'Channel diarsipkan',
        description: 'Pulihkan channel sebelum mengirim file.',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileNotice('File terlalu besar. Maksimal 10 MB.');
      showToast({
        type: 'error',
        title: 'File terlalu besar',
        description: 'Ukuran file maksimal 10 MB.',
      });
      window.setTimeout(() => setFileNotice(''), 1800);
      return;
    }

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
      showActionError('Gagal mengubah status', error);
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
      showActionError('Gagal logout', error);
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
            member.id === currentUserId
              ? { ...member, bio: profile.bio, photoUrl: profile.photoUrl }
              : member
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
      showToast({
        type: 'success',
        title: 'Invite diterima',
        description: `${invite.invitedEmail} sekarang aktif di workspace.`,
      });
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
          photoUrl: currentUserPhotoUrl,
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
      showToast({
        type: 'info',
        title: 'Invite dibatalkan',
        description: `${invite.invitedEmail} dihapus dari daftar pending.`,
      });
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

    if (activeRoom.archived) {
      showToast({
        type: 'info',
        title: 'Channel diarsipkan',
        description: 'Pulihkan channel sebelum mengirim pesan.',
      });
      return;
    }

    const roomId = activeRoom.id;
    const workspaceId = activeWorkspaceId;
    const tempMessageId = `pending-${Date.now()}`;
    const replySnapshot = replyToMessage
      ? {
          user: replyToMessage.user,
          preview: replyToMessage.text ?? replyToMessage.fileName ?? 'Lampiran',
        }
      : undefined;
    const pendingMessage: Message = {
      id: tempMessageId,
      user: currentUserName,
      avatar: currentUserAvatar,
      time: 'Mengirim...',
      type: file ? 'file' : 'text',
      isMine: true,
      deliveryStatus: 'sending',
      text: text || undefined,
      fileName: file?.name,
      fileSize: file ? formatFileSize(file.size) : undefined,
      mimeType: file?.type,
      replyTo: replySnapshot,
    };
    retryPayloadsRef.current[tempMessageId] = { text, file };

    setMessagesByWorkspace((prev) => {
      const currentMessages = prev[workspaceId]?.[roomId] ?? [];

      return {
        ...prev,
        [workspaceId]: {
          ...(prev[workspaceId] ?? {}),
          [roomId]: [...currentMessages, pendingMessage],
        },
      };
    });

    setReplyToMessage(null);
    setDraftFile(null);

    try {
      setBusyActions((prev) => ({ ...prev, sendMessage: true }));
      const accessToken = await getAccessToken();
      const { message } = file
        ? await apiFetch<CreateMessageResponse>(
            `/api/workspaces/channels/${roomId}/files`,
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
            `/api/workspaces/channels/${roomId}/messages`,
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
        const currentMessages = prev[workspaceId]?.[roomId] ?? [];
        const withoutPending = currentMessages.filter(
          (item) => item.id !== tempMessageId
        );

        const nextMessages = withoutPending.some((item) => item.id === nextMessage.id)
          ? withoutPending
          : [...withoutPending, nextMessage];

        return {
          ...prev,
          [workspaceId]: {
            ...(prev[workspaceId] ?? {}),
            [roomId]: nextMessages,
          },
        };
      });
      delete retryPayloadsRef.current[tempMessageId];

      showToast({
        type: 'success',
        title: file ? 'File terkirim' : 'Pesan terkirim',
        description: file ? file.name : undefined,
      });
    } catch (error) {
      setMessagesByWorkspace((prev) => ({
        ...prev,
        [workspaceId]: {
          ...(prev[workspaceId] ?? {}),
          [roomId]: (prev[workspaceId]?.[roomId] ?? []).map((message) =>
            message.id === tempMessageId
              ? { ...message, time: 'Gagal', deliveryStatus: 'failed' }
              : message
          ),
        },
      }));
      showActionError(file ? 'Gagal mengirim file' : 'Gagal mengirim pesan', error);
    } finally {
      setBusyActions((prev) => ({ ...prev, sendMessage: false }));
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
      showToast({
        type: 'success',
        title: 'Channel dibuat',
        description: `#${newRoom.name} siap dipakai.`,
      });
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
          photoUrl: currentUserPhotoUrl,
          profileStatus: currentUserStatus,
          bio: currentUserBio,
        },
      ],
    }));
    setWorkspaceModal(null);
    setActiveWorkspaceId(workspace.id);
    setActiveRoomId(firstRoom.id);
    showToast({
      type: 'success',
      title: 'Grup dibuat',
      description: nextWorkspace.name,
    });
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
      showActionError('Gagal mengubah pin pesan', error);
    }
  }

  async function handleDeleteMessage(messageId: Message['id']) {
    if (typeof messageId === 'string' && messageId.startsWith('pending-')) {
      delete retryPayloadsRef.current[messageId];
      updateCurrentRoomMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== messageId)
      );
      setDeletingMessage(null);
      showToast({
        type: 'info',
        title: 'Pesan gagal dihapus',
      });
      return;
    }

    try {
      setBusyActions((prev) => ({ ...prev, deleteMessage: true }));
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
      if (deletingMessage?.id === messageId) {
        setDeletingMessage(null);
      }
      showToast({
        type: 'success',
        title: 'Pesan dihapus',
      });
    } catch (error) {
      showActionError('Gagal menghapus pesan', error);
    } finally {
      setBusyActions((prev) => ({ ...prev, deleteMessage: false }));
    }
  }

  function handleStartEdit(message: Message) {
    setEditingMessage(message);
  }

  async function handleSaveEdit(messageToEdit: Message, text: string) {
    try {
      setBusyActions((prev) => ({ ...prev, editMessage: true }));
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
      showToast({
        type: 'success',
        title: 'Pesan diperbarui',
      });
    } catch (error) {
      showActionError('Gagal mengedit pesan', error);
    } finally {
      setBusyActions((prev) => ({ ...prev, editMessage: false }));
    }
  }

  function handleRetryMessage(message: Message) {
    if (message.deliveryStatus !== 'failed') return;

    const retryPayload =
      typeof message.id === 'string'
        ? retryPayloadsRef.current[message.id]
        : undefined;
    const text = retryPayload?.text ?? message.text ?? '';
    const file = retryPayload?.file;

    if (!text.trim() && !file) {
      showToast({
        type: 'error',
        title: 'Tidak bisa kirim ulang',
        description: 'Payload pesan gagal sudah tidak tersedia.',
      });
      return;
    }

    if (typeof message.id === 'string') delete retryPayloadsRef.current[message.id];

    updateCurrentRoomMessages((currentMessages) =>
      currentMessages.filter((item) => item.id !== message.id)
    );
    void handleSendMessage(text, file);
  }

  function handleToggleReaction(messageId: Message['id'], emoji: string) {
    updateCurrentRoomMessages((currentMessages) =>
      currentMessages.map((message) => {
        if (message.id !== messageId) return message;

        const reactions = message.reactions ?? [];
        const existingReaction = reactions.find((reaction) => reaction.emoji === emoji);

        if (!existingReaction) {
          return {
            ...message,
            reactions: [...reactions, { emoji, count: 1, reacted: true }],
          };
        }

        const nextReaction = {
          ...existingReaction,
          count: existingReaction.reacted
            ? Math.max(0, existingReaction.count - 1)
            : existingReaction.count + 1,
          reacted: !existingReaction.reacted,
        };

        return {
          ...message,
          reactions: reactions
            .map((reaction) =>
              reaction.emoji === emoji ? nextReaction : reaction
            )
            .filter((reaction) => reaction.count > 0),
        };
      })
    );
  }

  async function handleCopyFileLink(message: Message) {
    if (!message.fileUrl) {
      showToast({
        type: 'info',
        title: 'Link belum tersedia',
        description: message.fileName,
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(message.fileUrl);
      showToast({
        type: 'success',
        title: 'Link file disalin',
        description: message.fileName,
      });
    } catch (error) {
      showActionError('Gagal menyalin link file', error);
    }
  }

  function handleMockDownload(message: Message) {
    if (message.fileUrl) {
      window.open(message.fileUrl, '_blank', 'noopener,noreferrer');
      setFileNotice(`${message.fileName} dibuka di tab baru.`);
      showToast({
        type: 'info',
        title: 'File dibuka',
        description: message.fileName,
      });
      window.setTimeout(() => setFileNotice(''), 2200);
      return;
    }

    setFileNotice(`${message.fileName} belum memiliki URL download.`);
    showToast({
      type: 'error',
      title: 'Download belum tersedia',
      description: message.fileName,
    });
    window.setTimeout(() => setFileNotice(''), 2200);
  }

  async function handleUpdateWorkspace(
    updates: Pick<Workspace, 'name' | 'shortName' | 'description' | 'color'>
  ) {
    try {
      setBusyActions((prev) => ({ ...prev, updateWorkspace: true }));
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
      showToast({
        type: 'success',
        title: 'Grup diperbarui',
        description: updates.name,
      });
    } catch (error) {
      showActionError('Gagal mengubah grup', error);
    } finally {
      setBusyActions((prev) => ({ ...prev, updateWorkspace: false }));
    }
  }

  async function handleLeaveWorkspace() {
    try {
      setBusyActions((prev) => ({ ...prev, leaveWorkspace: true }));
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
      showToast({
        type: 'info',
        title: 'Keluar dari grup',
      });
    } catch (error) {
      showActionError('Gagal keluar dari grup', error);
    } finally {
      setBusyActions((prev) => ({ ...prev, leaveWorkspace: false }));
    }
  }

  function handleCreateChannel(name: string, description: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const currentRooms = roomsByWorkspace[activeWorkspaceId] ?? [];

    void runWithBusy('createChannel', async () => {
      try {
        await createChannelInBackend(trimmedName, description, currentRooms);
      } catch (error) {
        showActionError('Gagal membuat channel', error);
      }
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
      showActionError('Gagal mengubah favorit channel', error);
    }
  }

  async function handleUpdateChannel(
    updates: Pick<Room, 'name' | 'description' | 'favorite'>
  ) {
    if (!activeRoom) return;

    try {
      setBusyActions((prev) => ({ ...prev, updateChannel: true }));
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
      showToast({
        type: 'success',
        title: 'Channel diperbarui',
        description: nextRoom.name,
      });
    } catch (error) {
      showActionError('Gagal mengubah channel', error);
    } finally {
      setBusyActions((prev) => ({ ...prev, updateChannel: false }));
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
      setBusyActions((prev) => ({ ...prev, archiveChannel: true }));
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
      showToast({
        type: 'info',
        title: nextArchivedState ? 'Channel diarsipkan' : 'Channel dipulihkan',
        description: activeRoom.name,
      });
    } catch (error) {
      showActionError('Gagal mengubah arsip channel', error);
    } finally {
      setBusyActions((prev) => ({ ...prev, archiveChannel: false }));
    }
  }

  async function handleRestoreChannel(roomId: string) {
    const targetRoom = rooms.find((room) => room.id === roomId);
    if (!targetRoom) return;

    try {
      const { channel } = await apiFetch<UpdateChannelResponse>(
        `/api/workspaces/channels/${roomId}`,
        {
          method: 'PATCH',
          accessToken: await getAccessToken(),
          body: JSON.stringify({
            archived: false,
          }),
        }
      );

      const nextRoom = toRoom(channel);
      updateCurrentWorkspaceRooms((currentRooms) =>
        currentRooms.map((room) =>
          room.id === roomId ? { ...room, ...nextRoom } : room
        )
      );
      setActiveRoomId(roomId);
      showToast({
        type: 'success',
        title: 'Channel dipulihkan',
        description: targetRoom.name,
      });
    } catch (error) {
      showActionError('Gagal memulihkan channel', error);
    }
  }

  function openDeleteChannelModal() {
    setDeleteConfirmRoomId(activeRoom?.id ?? '');
    setShowDeleteChannelModal(true);
  }

  async function handleConfirmDeleteChannel() {
    if (!deleteConfirmRoomId) return;

    try {
      setBusyActions((prev) => ({ ...prev, deleteChannel: true }));
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
      showToast({
        type: 'success',
        title: 'Ruang diskusi dihapus',
      });
    } catch (error) {
      showActionError('Gagal menghapus channel', error);
    } finally {
      setBusyActions((prev) => ({ ...prev, deleteChannel: false }));
    }
  }

  async function handleInviteMember(emailInput: string, role: TeamMember['role']) {
    const email = emailInput.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail) {
      setInviteMessage('Masukkan alamat email yang valid.');
      showToast({
        type: 'error',
        title: 'Email tidak valid',
        description: 'Masukkan alamat email yang benar.',
      });
      return;
    }

    if (members.some((member) => member.email.toLowerCase() === email)) {
      setInviteMessage('User ini sudah ada di workspace ini.');
      showToast({
        type: 'info',
        title: 'User sudah ada',
        description: email,
      });
      return;
    }

    try {
      setBusyActions((prev) => ({ ...prev, inviteMember: true }));
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
      showToast({
        type: 'success',
        title: 'Invite dikirim',
        description: email,
      });
    } catch (error) {
      setInviteMessage(getReadableError(error));
      showActionError('Gagal mengirim invite', error);
    } finally {
      setBusyActions((prev) => ({ ...prev, inviteMember: false }));
    }
  }

  function handleCreateWorkspace(name: string, description: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    void runWithBusy('createWorkspace', async () => {
      try {
        await createWorkspaceInBackend(
          trimmedName,
          description.trim() || `Workspace untuk kolaborasi ${trimmedName}.`
        );
      } catch (error) {
        showActionError('Gagal membuat grup', error);
      }
    });
  }

  async function handleJoinWorkspace(inviteCode: string) {
    const code = inviteCode.trim().toUpperCase();

    if (!code) {
      setWorkspaceFeedback('Masukkan kode invite terlebih dahulu.');
      showToast({
        type: 'error',
        title: 'Kode invite kosong',
        description: 'Masukkan kode invite terlebih dahulu.',
      });
      return;
    }

    try {
      setBusyActions((prev) => ({ ...prev, joinWorkspace: true }));
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
            photoUrl: currentUserPhotoUrl,
            profileStatus: currentUserStatus,
            bio: currentUserBio,
          },
        ],
      }));
      setWorkspaceFeedback('');
      setWorkspaceModal(null);
      setActiveWorkspaceId(workspace.id);
      setActiveRoomId(firstRoom.id);
      showToast({
        type: 'success',
        title: 'Berhasil join grup',
        description: nextWorkspace.name,
      });
    } catch (error) {
      setWorkspaceFeedback(getReadableError(error));
      showActionError('Gagal join grup', error);
    } finally {
      setBusyActions((prev) => ({ ...prev, joinWorkspace: false }));
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

    return <WorkspaceSkeleton />;
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
        currentUserPhotoUrl={currentUserPhotoUrl}
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
        onRestoreChannel={handleRestoreChannel}
        onStatusChange={handleStatusChange}
      />

      <div className="relative flex flex-1 flex-col bg-white">
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

        <WorkspaceChatArea
          activeRoom={activeRoom}
          messages={messages}
          filteredMessages={filteredMessages}
          pinnedMessages={pinnedMessages}
          channelFiles={channelFiles}
          filteredChannelFiles={filteredChannelFiles}
          messageFilter={messageFilter}
          searchQuery={searchQuery}
          typingUser={typingUser}
          draftFile={draftFile}
          replyToMessage={replyToMessage}
          showFilePanel={showFilePanel}
          fileCategory={fileCategory}
          fileNotice={fileNotice}
          selectedFileMessage={selectedFileMessage}
          isDragging={isDragging}
          isSending={!!busyActions.sendMessage}
          dragHandlers={dragHandlers}
          onClearSearch={() => {
            setSearchQuery('');
            setMessageFilter('all');
          }}
          onOpenFilePanel={() => setShowFilePanel(true)}
          onFilterChange={setMessageFilter}
          onSendMessage={handleSendMessage}
          onDraftFileChange={setDraftFile}
          onCancelReply={() => setReplyToMessage(null)}
          onReply={setReplyToMessage}
          onTogglePin={handleTogglePin}
          onEdit={handleStartEdit}
          onDelete={(messageId) => {
            const targetMessage = messages.find((message) => message.id === messageId);
            if (targetMessage) setDeletingMessage(targetMessage);
          }}
          onRetryMessage={handleRetryMessage}
          onToggleReaction={handleToggleReaction}
          onFileCategoryChange={setFileCategory}
          onCloseFilePanel={() => setShowFilePanel(false)}
          onPreviewFile={setSelectedFileMessage}
          onDownloadFile={handleMockDownload}
          onCopyFileLink={handleCopyFileLink}
          onCreateChannel={() => setShowChannelModal(true)}
        />

        <WorkspaceOverlays
          activeWorkspace={activeWorkspace}
          activeWorkspaceId={activeWorkspaceId}
          activeRoom={activeRoom}
          members={members}
          messages={messages}
          channelFileCount={channelFiles.length}
          showWorkspaceSettings={showWorkspaceSettings}
          showUserProfile={showUserProfile}
          showChannelSettings={showChannelSettings}
          showChannelModal={showChannelModal}
          showDeleteChannelModal={showDeleteChannelModal}
          showInviteModal={showInviteModal}
          workspaceModal={workspaceModal}
          editingMessage={editingMessage}
          deletingMessage={deletingMessage}
          incomingInvites={incomingInvites}
          inviteMessage={inviteMessage}
          workspaceFeedback={workspaceFeedback}
          isSummarizing={isSummarizing}
          summaryResult={summaryResult}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
          currentUserInitial={currentUserInitial}
          currentUserPhotoUrl={currentUserPhotoUrl}
          currentUserBio={currentUserBio}
          currentUserStatus={currentUserStatus}
          busyActions={busyActions}
          onCloseWorkspaceSettings={() => setShowWorkspaceSettings(false)}
          onUpdateWorkspace={handleUpdateWorkspace}
          onLeaveWorkspace={handleLeaveWorkspace}
          onCloseUserProfile={() => setShowUserProfile(false)}
          onSaveProfile={handleUpdateProfile}
          onCloseChannelSettings={() => setShowChannelSettings(false)}
          onUpdateChannel={handleUpdateChannel}
          onArchiveToggle={handleToggleArchiveChannel}
          onCloseEditMessage={() => setEditingMessage(null)}
          onSaveEditMessage={handleSaveEdit}
          onCloseDeleteMessage={() => setDeletingMessage(null)}
          onConfirmDeleteMessage={handleDeleteMessage}
          onCloseWorkspaceModal={() => setWorkspaceModal(null)}
          onCreateWorkspace={handleCreateWorkspace}
          onJoinWorkspace={handleJoinWorkspace}
          onFeedbackClear={() => setWorkspaceFeedback('')}
          onCloseChannelModal={() => setShowChannelModal(false)}
          onCreateChannel={handleCreateChannel}
          onCloseDeleteChannelModal={() => {
            setShowDeleteChannelModal(false);
            setDeleteConfirmRoomId('');
          }}
          onConfirmDeleteChannel={handleConfirmDeleteChannel}
          onCloseInviteModal={() => setShowInviteModal(false)}
          onInviteMember={handleInviteMember}
          onAcceptInvite={handleAcceptInviteById}
          onDeclineInvite={handleDeclineInviteById}
          onInviteMessageClear={() => setInviteMessage('')}
          onCloseSummary={clearSummary}
        />
        <ToastStack
          items={toasts}
          onDismiss={(id) =>
            setToasts((current) => current.filter((toast) => toast.id !== id))
          }
        />
      </div>
    </div>
  );
}

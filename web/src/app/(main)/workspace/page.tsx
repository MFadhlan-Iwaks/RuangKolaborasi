// src/app/(main)/workspace/page.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import { FileCategory, Message, MessageFilter, Room, TeamMember, Workspace } from '@/types';
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
import {
  INITIAL_MEMBERS_BY_WORKSPACE,
  INITIAL_MESSAGES_BY_WORKSPACE,
  INITIAL_ROOMS_BY_WORKSPACE,
  INITIAL_WORKSPACES,
} from '@/data/workspaceMockData';
import { useGemini } from '@/hooks/useGemini';
import { useDragDrop } from '@/hooks/useDragDrop';
import {
  getFileCategory,
  getMessagePreview,
  makeInitials,
  makeJoinedWorkspace,
  makeSlug,
} from '@/lib/workspaceUtils';
const EMPTY_MEMBERS: TeamMember[] = [];

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('tugas-besar-pabp');
  const [activeRoomId, setActiveRoomId] = useState('diskusi-utama');
  const [roomsByWorkspace, setRoomsByWorkspace] = useState<Record<string, Room[]>>(
    INITIAL_ROOMS_BY_WORKSPACE
  );
  const [messagesByWorkspace, setMessagesByWorkspace] = useState<
    Record<string, Record<string, Message[]>>
  >(INITIAL_MESSAGES_BY_WORKSPACE);
  const [membersByWorkspace, setMembersByWorkspace] = useState<
    Record<string, TeamMember[]>
  >(INITIAL_MEMBERS_BY_WORKSPACE);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showDeleteChannelModal, setShowDeleteChannelModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [workspaceModal, setWorkspaceModal] = useState<'create' | 'join' | null>(
    null
  );
  const [inviteMessage, setInviteMessage] = useState('');
  const [workspaceFeedback, setWorkspaceFeedback] = useState('');
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

  const { summarize, isSummarizing, summaryResult, clearSummary } = useGemini();
  const { isDragging, dragHandlers } = useDragDrop({ onFileDrop: handleFileDrop });

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    INITIAL_WORKSPACES[0];
  const rooms = roomsByWorkspace[activeWorkspaceId] ?? [];
  const members = membersByWorkspace[activeWorkspaceId] ?? EMPTY_MEMBERS;
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];
  const messages =
    messagesByWorkspace[activeWorkspaceId]?.[activeRoom?.id ?? ''] ?? [];
  const typingMemberName =
    members.find((member) => member.status === 'active' && member.name !== 'Fadhlan')
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

  function handleSendMessage(text: string, file?: File) {
    if (!activeRoom) return;

    const newMessage: Message = {
      id: Date.now(),
      user: 'Fadhlan (Kamu)',
      avatar: 'bg-indigo-600',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: file ? 'file' : 'text',
      text: text || undefined,
      fileName: file?.name,
      fileSize: file ? `${(file.size / 1024).toFixed(2)} KB` : undefined,
      replyTo: replyToMessage
        ? {
            user: replyToMessage.user,
            preview: getMessagePreview(replyToMessage),
          }
        : undefined,
    };

    setMessagesByWorkspace((prev) => ({
      ...prev,
      [activeWorkspaceId]: {
        ...(prev[activeWorkspaceId] ?? {}),
        [activeRoom.id]: [
          ...(prev[activeWorkspaceId]?.[activeRoom.id] ?? []),
          newMessage,
        ],
      },
    }));
    setReplyToMessage(null);
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

  function handleTogglePin(messageId: number) {
    updateCurrentRoomMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? { ...message, pinned: !message.pinned }
          : message
      )
    );
  }

  function handleDeleteMessage(messageId: number) {
    updateCurrentRoomMessages((currentMessages) =>
      currentMessages.filter((message) => message.id !== messageId)
    );

    if (replyToMessage?.id === messageId) setReplyToMessage(null);
    if (editingMessage?.id === messageId) {
      setEditingMessage(null);
    }
  }

  function handleStartEdit(message: Message) {
    setEditingMessage(message);
  }

  function handleSaveEdit(messageToEdit: Message, text: string) {
    updateCurrentRoomMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageToEdit.id
          ? { ...message, text: text.trim() || undefined, edited: true }
          : message
      )
    );
    setEditingMessage(null);
  }

  function handleMockDownload(message: Message) {
    setFileNotice(`${message.fileName} siap diunduh (simulasi frontend).`);
    window.setTimeout(() => setFileNotice(''), 2200);
  }

  function handleUpdateWorkspace(
    updates: Pick<Workspace, 'name' | 'shortName' | 'description' | 'color'>
  ) {
    setWorkspaces((prev) =>
      prev.map((workspace) =>
        workspace.id === activeWorkspaceId
          ? { ...workspace, ...updates }
          : workspace
      )
    );
    setShowWorkspaceSettings(false);
  }

  function handleLeaveWorkspace() {
    if (workspaces.length <= 1) return;

    const remainingWorkspaces = workspaces.filter(
      (workspace) => workspace.id !== activeWorkspaceId
    );
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
  }

  function handleCreateChannel(name: string, description: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const currentRooms = roomsByWorkspace[activeWorkspaceId] ?? [];
    const baseId = makeSlug(trimmedName) || `channel-${Date.now()}`;
    const id = currentRooms.some((room) => room.id === baseId)
      ? `${baseId}-${Date.now().toString().slice(-4)}`
      : baseId;

    const newRoom: Room = {
      id,
      name: trimmedName,
      icon: 'folder',
      description: description.trim() || `Ruang diskusi untuk ${trimmedName}.`,
    };

    setRoomsByWorkspace((prev) => ({
      ...prev,
      [activeWorkspaceId]: [...currentRooms, newRoom],
    }));
    setMessagesByWorkspace((prev) => ({
      ...prev,
      [activeWorkspaceId]: {
        ...(prev[activeWorkspaceId] ?? {}),
        [id]: [],
      },
    }));
    setActiveRoomId(id);
    setShowChannelModal(false);
  }

  function updateCurrentWorkspaceRooms(updater: (rooms: Room[]) => Room[]) {
    setRoomsByWorkspace((prev) => ({
      ...prev,
      [activeWorkspaceId]: updater(prev[activeWorkspaceId] ?? []),
    }));
  }

  function handleToggleFavoriteChannel(roomId: string) {
    updateCurrentWorkspaceRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === roomId ? { ...room, favorite: !room.favorite } : room
      )
    );
  }

  function handleUpdateChannel(
    updates: Pick<Room, 'name' | 'description' | 'favorite'>
  ) {
    if (!activeRoom) return;

    updateCurrentWorkspaceRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === activeRoom.id ? { ...room, ...updates } : room
      )
    );
    setShowChannelSettings(false);
  }

  function handleToggleArchiveChannel() {
    if (!activeRoom) return;

    const nextArchivedState = !activeRoom.archived;
    const nextActiveRoomId = nextArchivedState
      ? rooms.find((room) => room.id !== activeRoom.id && !room.archived)?.id ??
        activeRoom.id
      : activeRoom.id;

    updateCurrentWorkspaceRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === activeRoom.id
          ? {
              ...room,
              archived: nextArchivedState,
              favorite: nextArchivedState ? false : room.favorite,
            }
          : room
      )
    );
    setActiveRoomId(nextActiveRoomId);
    setShowChannelSettings(false);
  }

  function openDeleteChannelModal() {
    setDeleteConfirmRoomId(activeRoom?.id ?? '');
    setShowDeleteChannelModal(true);
  }

  function handleConfirmDeleteChannel() {
    if (!deleteConfirmRoomId) return;

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
  }

  function handleInviteMember(emailInput: string, role: TeamMember['role']) {
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

    const name = email.split('@')[0].replace(/[._-]+/g, ' ');
    const displayName = name.replace(/\b\w/g, (char) => char.toUpperCase());

    setMembersByWorkspace((prev) => ({
      ...prev,
      [activeWorkspaceId]: [
        ...(prev[activeWorkspaceId] ?? []),
        {
          id: `${activeWorkspaceId}-${email}-${Date.now()}`,
          name: displayName,
          email,
          role,
          status: 'pending',
          avatar: 'bg-fuchsia-500',
        },
      ],
    }));
    setInviteMessage(`Undangan untuk ${email} berhasil dibuat.`);
  }

  function handleCreateWorkspace(name: string, description: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const baseId = makeSlug(trimmedName) || `workspace-${Date.now()}`;
    const id = workspaces.some((workspace) => workspace.id === baseId)
      ? `${baseId}-${Date.now().toString().slice(-4)}`
      : baseId;
    const firstRoomId = 'diskusi-umum';
    const newWorkspace: Workspace = {
      id,
      name: trimmedName,
      shortName: makeInitials(trimmedName),
      description:
        description.trim() || `Workspace untuk kolaborasi ${trimmedName}.`,
      color: 'bg-teal-600',
      inviteCode: `${makeInitials(trimmedName)}-${Date.now().toString().slice(-4)}`,
    };

    setWorkspaces((prev) => [...prev, newWorkspace]);
    setRoomsByWorkspace((prev) => ({
      ...prev,
      [id]: [
        {
          id: firstRoomId,
          name: 'Diskusi Umum',
          icon: 'message',
          description: 'Ruang awal untuk koordinasi grup.',
        },
      ],
    }));
    setMessagesByWorkspace((prev) => ({
      ...prev,
      [id]: { [firstRoomId]: [] },
    }));
    setMembersByWorkspace((prev) => ({
      ...prev,
      [id]: [
        {
          id: `${id}-owner`,
          name: 'Fadhlan',
          email: 'fadhlan@kampus.ac.id',
          role: 'Owner',
          status: 'active',
          avatar: 'bg-indigo-600',
        },
      ],
    }));
    setWorkspaceModal(null);
    setActiveWorkspaceId(id);
    setActiveRoomId(firstRoomId);
  }

  function handleJoinWorkspace(inviteCode: string) {
    const code = inviteCode.trim().toUpperCase();

    if (!code) {
      setWorkspaceFeedback('Masukkan kode invite terlebih dahulu.');
      return;
    }

    const existingWorkspace = workspaces.find(
      (workspace) => workspace.inviteCode.toUpperCase() === code
    );

    if (existingWorkspace) {
      switchWorkspace(existingWorkspace.id);
      setWorkspaceFeedback('Kamu sudah tergabung di grup ini.');
      return;
    }

    const joinedWorkspace = makeJoinedWorkspace(code);
    const firstRoomId = 'diskusi-umum';

    setWorkspaces((prev) => [...prev, joinedWorkspace]);
    setRoomsByWorkspace((prev) => ({
      ...prev,
      [joinedWorkspace.id]: [
        {
          id: firstRoomId,
          name: 'Diskusi Umum',
          icon: 'message',
          description: 'Ruang awal dari grup yang baru diikuti.',
        },
      ],
    }));
    setMessagesByWorkspace((prev) => ({
      ...prev,
      [joinedWorkspace.id]: {
        [firstRoomId]: [
          {
            id: Date.now(),
            user: 'Sistem',
            avatar: 'bg-slate-500',
            time: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            type: 'text',
            text: `Kamu bergabung memakai kode invite ${code}.`,
          },
        ],
      },
    }));
    setMembersByWorkspace((prev) => ({
      ...prev,
      [joinedWorkspace.id]: [
        {
          id: `${joinedWorkspace.id}-me`,
          name: 'Fadhlan',
          email: 'fadhlan@kampus.ac.id',
          role: 'Member',
          status: 'active',
          avatar: 'bg-indigo-600',
        },
      ],
    }));
    setWorkspaceFeedback('');
    setWorkspaceModal(null);
    setActiveWorkspaceId(joinedWorkspace.id);
    setActiveRoomId(firstRoomId);
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
      />

      <div className="flex flex-1 flex-col bg-white">
        <WorkspaceHeader
          activeRoom={activeRoom}
          activeWorkspace={activeWorkspace}
          memberCount={members.length}
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
              canLeave={workspaces.length > 1}
              onClose={() => setShowWorkspaceSettings(false)}
              onUpdate={handleUpdateWorkspace}
              onLeave={handleLeaveWorkspace}
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
              message={inviteMessage}
              onClose={() => setShowInviteModal(false)}
              onInvite={handleInviteMember}
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

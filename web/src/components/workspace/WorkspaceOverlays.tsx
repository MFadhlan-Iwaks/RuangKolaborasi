'use client';

import { Message, PendingInvitation, Room, TeamMember, Workspace } from '@/types';
import DeleteMessageModal from '@/components/chat/DeleteMessageModal';
import EditMessageModal from '@/components/chat/EditMessageModal';
import ChannelSettingsModal from '@/components/workspace/ChannelSettingsModal';
import { CreateChannelModal, DeleteChannelModal } from '@/components/workspace/ChannelModals';
import InviteMemberModal from '@/components/workspace/InviteMemberModal';
import SummaryModal from '@/components/workspace/SummaryModal';
import UserProfileModal from '@/components/workspace/UserProfileModal';
import { CreateWorkspaceModal, JoinWorkspaceModal } from '@/components/workspace/WorkspaceAccessModals';
import WorkspaceSettingsModal from '@/components/workspace/WorkspaceSettingsModal';
import { Status } from '@/types';

interface WorkspaceOverlaysProps {
  activeWorkspace: Workspace;
  activeWorkspaceId: string;
  activeRoom?: Room;
  members: TeamMember[];
  messages: Message[];
  channelFileCount: number;
  showWorkspaceSettings: boolean;
  showUserProfile: boolean;
  showChannelSettings: boolean;
  showChannelModal: boolean;
  showDeleteChannelModal: boolean;
  showInviteModal: boolean;
  workspaceModal: 'create' | 'join' | null;
  editingMessage: Message | null;
  deletingMessage: Message | null;
  incomingInvites: PendingInvitation[];
  inviteMessage: string;
  workspaceFeedback: string;
  isSummarizing: boolean;
  summaryResult: string;
  currentUserName: string;
  currentUserEmail: string;
  currentUserInitial: string;
  currentUserPhotoUrl?: string;
  currentUserBio: string;
  currentUserStatus: Status;
  busyActions?: Record<string, boolean>;
  onCloseWorkspaceSettings: () => void;
  onUpdateWorkspace: (updates: Pick<Workspace, 'name' | 'shortName' | 'description' | 'color'>) => void;
  onLeaveWorkspace: () => void;
  onCloseUserProfile: () => void;
  onSaveProfile: (profile: { photoUrl?: string; bio: string }) => void;
  onCloseChannelSettings: () => void;
  onUpdateChannel: (updates: Pick<Room, 'name' | 'description' | 'favorite'>) => void;
  onArchiveToggle: () => void;
  onCloseEditMessage: () => void;
  onSaveEditMessage: (message: Message, text: string) => void;
  onCloseDeleteMessage: () => void;
  onConfirmDeleteMessage: (messageId: Message['id']) => void;
  onCloseWorkspaceModal: () => void;
  onCreateWorkspace: (name: string, description: string) => void;
  onJoinWorkspace: (code: string) => void;
  onFeedbackClear: () => void;
  onCloseChannelModal: () => void;
  onCreateChannel: (name: string, description: string) => void;
  onCloseDeleteChannelModal: () => void;
  onConfirmDeleteChannel: () => void;
  onCloseInviteModal: () => void;
  onInviteMember: (email: string, role: TeamMember['role']) => void;
  onAcceptInvite: (inviteId: string) => void;
  onDeclineInvite: (inviteId: string) => void;
  onInviteMessageClear: () => void;
  onCloseSummary: () => void;
}

export default function WorkspaceOverlays({
  activeWorkspace,
  activeWorkspaceId,
  activeRoom,
  members,
  messages,
  channelFileCount,
  showWorkspaceSettings,
  showUserProfile,
  showChannelSettings,
  showChannelModal,
  showDeleteChannelModal,
  showInviteModal,
  workspaceModal,
  editingMessage,
  deletingMessage,
  incomingInvites,
  inviteMessage,
  workspaceFeedback,
  isSummarizing,
  summaryResult,
  currentUserName,
  currentUserEmail,
  currentUserInitial,
  currentUserPhotoUrl,
  currentUserBio,
  currentUserStatus,
  busyActions = {},
  onCloseWorkspaceSettings,
  onUpdateWorkspace,
  onLeaveWorkspace,
  onCloseUserProfile,
  onSaveProfile,
  onCloseChannelSettings,
  onUpdateChannel,
  onArchiveToggle,
  onCloseEditMessage,
  onSaveEditMessage,
  onCloseDeleteMessage,
  onConfirmDeleteMessage,
  onCloseWorkspaceModal,
  onCreateWorkspace,
  onJoinWorkspace,
  onFeedbackClear,
  onCloseChannelModal,
  onCreateChannel,
  onCloseDeleteChannelModal,
  onConfirmDeleteChannel,
  onCloseInviteModal,
  onInviteMember,
  onAcceptInvite,
  onDeclineInvite,
  onInviteMessageClear,
  onCloseSummary,
}: WorkspaceOverlaysProps) {
  return (
    <>
      {showWorkspaceSettings && (
        <WorkspaceSettingsModal
          workspace={activeWorkspace}
          members={members}
          canLeave={true}
          isSaving={!!busyActions.updateWorkspace}
          isLeaving={!!busyActions.leaveWorkspace}
          onClose={onCloseWorkspaceSettings}
          onUpdate={onUpdateWorkspace}
          onLeave={onLeaveWorkspace}
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
          onClose={onCloseUserProfile}
          onSave={onSaveProfile}
        />
      )}

      {showChannelSettings && activeRoom && (
        <ChannelSettingsModal
          room={activeRoom}
          messageCount={messages.length}
          fileCount={channelFileCount}
          isSaving={!!busyActions.updateChannel}
          isArchiving={!!busyActions.archiveChannel}
          onClose={onCloseChannelSettings}
          onUpdate={onUpdateChannel}
          onArchiveToggle={onArchiveToggle}
        />
      )}

      {editingMessage && (
        <EditMessageModal
          message={editingMessage}
          isSaving={!!busyActions.editMessage}
          onClose={onCloseEditMessage}
          onSave={onSaveEditMessage}
        />
      )}

      {deletingMessage && (
        <DeleteMessageModal
          message={deletingMessage}
          isDeleting={!!busyActions.deleteMessage}
          onClose={onCloseDeleteMessage}
          onConfirm={onConfirmDeleteMessage}
        />
      )}

      {workspaceModal === 'create' && (
        <CreateWorkspaceModal
          onClose={onCloseWorkspaceModal}
          onCreate={onCreateWorkspace}
          isCreating={!!busyActions.createWorkspace}
        />
      )}

      {workspaceModal === 'join' && (
        <JoinWorkspaceModal
          feedback={workspaceFeedback}
          onClose={onCloseWorkspaceModal}
          onJoin={onJoinWorkspace}
          onFeedbackClear={onFeedbackClear}
          isJoining={!!busyActions.joinWorkspace}
        />
      )}

      {showChannelModal && (
        <CreateChannelModal
          workspaceName={activeWorkspace.name}
          onClose={onCloseChannelModal}
          onCreate={onCreateChannel}
          isCreating={!!busyActions.createChannel}
        />
      )}

      {showDeleteChannelModal && (
        <DeleteChannelModal
          activeRoom={activeRoom}
          workspace={activeWorkspace}
          isDeleting={!!busyActions.deleteChannel}
          onClose={onCloseDeleteChannelModal}
          onConfirm={onConfirmDeleteChannel}
        />
      )}

      {showInviteModal && (
        <InviteMemberModal
          workspace={activeWorkspace}
          members={members}
          invites={incomingInvites
            .filter((invite) => !invite.invitedEmail || invite.workspaceId === activeWorkspaceId)
            .map((invite) => ({
              id: invite.id,
              email: invite.invitedEmail ?? 'user@workspace.local',
              workspaceName: invite.workspaceName,
              status: invite.status,
              direction: invite.invitedEmail
                ? 'outgoing'
                : 'incoming',
            }))}
          message={inviteMessage}
          isInviting={!!busyActions.inviteMember}
          onClose={onCloseInviteModal}
          onInvite={onInviteMember}
          onAcceptInvite={onAcceptInvite}
          onDeclineInvite={onDeclineInvite}
          onMessageClear={onInviteMessageClear}
        />
      )}

      {(isSummarizing || summaryResult) && (
        <SummaryModal
          isSummarizing={isSummarizing}
          summaryResult={summaryResult}
          onClose={onCloseSummary}
        />
      )}
    </>
  );
}

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { supabaseAdmin } = require('../config/supabase');
const crypto = require('crypto');

const router = express.Router();
const STORAGE_BUCKET = 'workspace-files';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_FILE_BYTES / 3) * 4 + 16;
const MAX_WORKSPACE_PHOTO_URL_CHARS = 3_000_000;
const ADMIN_ROLES = ['owner', 'admin'];
const ALLOWED_MIME_PREFIXES = ['image/', 'text/', 'audio/', 'video/'];
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/json',
  'application/xml',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/octet-stream'
]);
const PROFILE_SELECT = 'id, full_name, username, avatar_url, bio, status';
const MESSAGE_SELECT = `
  id,
  channel_id,
  sender_id,
  content,
  type,
  file_id,
  pinned,
  edited,
  reply_to_message_id,
  reply_snapshot,
  forwarded_from_message_id,
  forwarded_snapshot,
  created_at,
  profiles:sender_id(full_name, username, avatar_url)
`;
const INVITE_SELECT = `
  id,
  workspace_id,
  inviter_id,
  invited_user_id,
  invited_email,
  role,
  status,
  created_at,
  workspaces:workspace_id(id, name, invite_code),
  inviter:profiles!workspace_invites_inviter_id_fkey(id, full_name, username, avatar_url),
  invited:profiles!workspace_invites_invited_user_id_fkey(id, full_name, username, avatar_url)
`;

function getDisplayName(user) {
  const metadata = user.user_metadata || {};
  return (
    metadata.username ||
    metadata.full_name ||
    metadata.name ||
    user.email?.split('@')[0] ||
    'Pengguna'
  );
}

async function ensureProfile(user) {
  const metadata = user.user_metadata || {};
  const { data: existingProfile, error: existingError } = await supabaseAdmin
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', user.id)
    .maybeSingle();

  if (existingError) {
    existingError.status = 500;
    throw existingError;
  }

  const fullName = getDisplayName(user);
  const username = metadata.username || user.email?.split('@')[0] || user.id;
  const payload = {
    id: user.id,
    full_name: existingProfile?.full_name || fullName,
    username: existingProfile?.username || username
  };

  if (existingProfile?.avatar_url || metadata.avatar_url) {
    payload.avatar_url = existingProfile?.avatar_url || metadata.avatar_url;
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(payload, {
      onConflict: 'id'
    })
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  return data;
}

async function ensureDefaultWorkspace(user) {
  const profile = await ensureProfile(user);

  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from('workspaces')
    .insert({
      name: `${profile.full_name || profile.username || 'Pengguna'}'s Workspace`,
      description: 'Workspace awal untuk mulai berdiskusi.',
      short_name: 'WS',
      color: 'bg-blue-600',
      invite_code: await createUniqueInviteCode(),
      owner_id: user.id
    })
    .select('id, name, description, short_name, color, photo_url, invite_code, owner_id, created_at')
    .single();

  if (workspaceError) {
    workspaceError.status = 500;
    throw workspaceError;
  }

  const { error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .upsert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner'
    }, {
      onConflict: 'workspace_id,user_id'
    });

  if (memberError) {
    memberError.status = 500;
    throw memberError;
  }

  await ensureDefaultChannel(workspace.id, user.id);

  return workspace;
}

async function ensureDefaultChannel(workspaceId, userId) {
  const { data: existingChannel, error: existingError } = await supabaseAdmin
    .from('channels')
    .select('id, workspace_id, name, description, favorite, archived, created_by, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    existingError.status = 500;
    throw existingError;
  }

  if (existingChannel) return existingChannel;

  const { data, error } = await supabaseAdmin
    .from('channels')
    .insert({
      workspace_id: workspaceId,
      name: 'Diskusi Umum',
      description: 'Ruang awal untuk koordinasi tim.',
      created_by: userId
    })
    .select('id, workspace_id, name, description, created_by, created_at')
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  return data;
}

async function assertWorkspaceMember(workspaceId, userId) {
  const { data, error } = await supabaseAdmin
    .from('workspace_members')
    .select('id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    error.status = 500;
    throw error;
  }

  if (!data) {
    const forbidden = new Error('You are not a member of this workspace');
    forbidden.status = 403;
    throw forbidden;
  }

  return data;
}

async function assertWorkspaceRole(workspaceId, userId, allowedRoles) {
  const member = await assertWorkspaceMember(workspaceId, userId);

  if (!allowedRoles.includes(member.role)) {
    const forbidden = new Error('You do not have permission to perform this action');
    forbidden.status = 403;
    throw forbidden;
  }

  return member;
}

function normalizeRole(role) {
  const normalized = String(role || 'member').toLowerCase();
  return ['owner', 'admin', 'member'].includes(normalized) ? normalized : 'member';
}

function toApiRole(role) {
  return role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Member';
}

function toDbRole(role) {
  const normalized = String(role || 'member').toLowerCase();
  return normalized === 'owner' || normalized === 'admin' ? normalized : 'member';
}

function assertAssignableInviteRole(requesterRole, requestedRole) {
  if (requestedRole === 'owner') {
    const error = new Error('Owner role cannot be assigned through invites');
    error.status = 400;
    throw error;
  }

  if (requestedRole === 'admin' && requesterRole !== 'owner') {
    const error = new Error('Only workspace owners can invite admins');
    error.status = 403;
    throw error;
  }
}

function publicProfileName(profile, fallback = 'Pengguna') {
  return profile?.username || profile?.full_name || fallback;
}

function mapInvite(invite, direction) {
  return {
    id: invite.id,
    workspaceId: invite.workspace_id,
    workspaceName: invite.workspaces?.name || 'Workspace',
    inviterName: publicProfileName(invite.inviter, 'Pengundang'),
    invitedEmail: direction === 'outgoing' ? invite.invited_email : undefined,
    role: toApiRole(invite.role),
    inviteCode: direction === 'incoming' ? invite.workspaces?.invite_code || '' : '',
    status: invite.status,
    direction
  };
}

function buildPendingMemberFromInvite(invite, invitedUser) {
  return {
    id: invitedUser?.id || invite.id,
    workspace_id: invite.workspace_id,
    role: invite.role,
    full_name: invitedUser ? getDisplayName(invitedUser) : invite.invited_email.split('@')[0],
    email: invite.invited_email,
    avatar_url: invitedUser?.user_metadata?.avatar_url || null,
    bio: null,
    profile_status: 'offline',
    invite_status: invite.status
  };
}

function generateInviteCode() {
  return `RK-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

function normalizeInviteCode(inviteCode) {
  return String(inviteCode || '').trim().toUpperCase();
}

function validateInviteCode(inviteCode) {
  if (!/^[A-Z0-9-]{8,32}$/.test(inviteCode)) {
    const error = new Error('Invalid invite code');
    error.status = 400;
    throw error;
  }
}

async function createUniqueInviteCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const { data, error } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('invite_code', inviteCode)
      .maybeSingle();

    if (error) {
      error.status = 500;
      throw error;
    }

    if (!data) return inviteCode;
  }

  const error = new Error('Unable to generate invite code');
  error.status = 500;
  throw error;
}

function safeStorageName(fileName) {
  return String(fileName || 'file')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'file';
}

async function findUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  let page = 1;

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100
    });

    if (error) {
      error.status = 500;
      throw error;
    }

    const found = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (found) return found;
    if (data.users.length < 100) return null;
    page += 1;
  }

  return null;
}

function isAllowedMimeType(mimeType) {
  const normalized = String(mimeType || '').toLowerCase();
  return ALLOWED_MIME_TYPES.has(normalized) ||
    ALLOWED_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function normalizeWorkspacePhotoUrl(body) {
  if (Object.prototype.hasOwnProperty.call(body, 'photoUrl')) {
    return normalizePhotoUrlValue(body.photoUrl);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'photo_url')) {
    return normalizePhotoUrlValue(body.photo_url);
  }

  return undefined;
}

function normalizePhotoUrlValue(value) {
  if (value === null) return null;

  if (typeof value !== 'string') {
    const error = new Error('photoUrl must be a string or null');
    error.status = 400;
    error.code = 'INVALID_WORKSPACE_PHOTO';
    throw error;
  }

  const photoUrl = value.trim();

  if (!photoUrl) return null;

  if (photoUrl.length > MAX_WORKSPACE_PHOTO_URL_CHARS) {
    const error = new Error('Foto grup terlalu besar. Gunakan gambar yang lebih kecil.');
    error.status = 413;
    error.code = 'WORKSPACE_PHOTO_TOO_LARGE';
    throw error;
  }

  if (!photoUrl.startsWith('data:image/') && !/^https?:\/\//i.test(photoUrl)) {
    const error = new Error('Format foto grup tidak didukung.');
    error.status = 400;
    error.code = 'INVALID_WORKSPACE_PHOTO';
    throw error;
  }

  return photoUrl;
}

function normalizeEmoji(emoji) {
  const normalized = String(emoji || '').trim();

  if (!normalized || normalized.length > 16) {
    const error = new Error('Emoji tidak valid.');
    error.status = 400;
    error.code = 'INVALID_REACTION';
    throw error;
  }

  return normalized;
}

function buildMessageSnapshot(message, fallbackName = 'Anggota') {
  return {
    user:
      message.sender_name ||
      message.profiles?.username ||
      message.profiles?.full_name ||
      fallbackName,
    preview: message.content || message.file?.file_name || 'Lampiran'
  };
}

function normalizeClientSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;

  const user = String(snapshot.user || '').trim().slice(0, 80);
  const preview = String(snapshot.preview || '').trim().slice(0, 180);

  if (!user && !preview) return null;

  return {
    user: user || 'Anggota',
    preview: preview || 'Lampiran'
  };
}

async function getWorkspaceInvitesForUser(user) {
  const email = String(user.email || '').trim().toLowerCase();
  const incomingOr = email
    ? `invited_user_id.eq.${user.id},invited_email.eq.${email}`
    : `invited_user_id.eq.${user.id}`;

  const { data: incomingRows, error: incomingError } = await supabaseAdmin
    .from('workspace_invites')
    .select(INVITE_SELECT)
    .or(incomingOr)
    .order('created_at', { ascending: false });

  if (incomingError) {
    incomingError.status = 500;
    throw incomingError;
  }

  const { data: outgoingRows, error: outgoingError } = await supabaseAdmin
    .from('workspace_invites')
    .select(INVITE_SELECT)
    .eq('inviter_id', user.id)
    .order('created_at', { ascending: false });

  if (outgoingError) {
    outgoingError.status = 500;
    throw outgoingError;
  }

  return {
    incomingInvites: (incomingRows || []).map((invite) => mapInvite(invite, 'incoming')),
    outgoingInvites: (outgoingRows || []).map((invite) => mapInvite(invite, 'outgoing'))
  };
}

async function getChannelWithMembership(channelId, userId) {
  const { data: channel, error } = await supabaseAdmin
    .from('channels')
    .select('id, workspace_id, name, description')
    .eq('id', channelId)
    .maybeSingle();

  if (error) {
    error.status = 500;
    throw error;
  }

  if (!channel) {
    const notFound = new Error('Channel not found');
    notFound.status = 404;
    throw notFound;
  }

  await assertWorkspaceMember(channel.workspace_id, userId);

  return channel;
}

async function getMessageWithMembership(messageId, userId) {
  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .select(`
      id,
      channel_id,
      sender_id,
      content,
      type,
      file_id,
      pinned,
      edited,
      reply_to_message_id,
      reply_snapshot,
      forwarded_from_message_id,
      forwarded_snapshot,
      created_at,
      channels!inner(id, workspace_id),
      profiles:sender_id(full_name, username, avatar_url)
    `)
    .eq('id', messageId)
    .maybeSingle();

  if (error) {
    error.status = 500;
    throw error;
  }

  if (!message) {
    const notFound = new Error('Message not found');
    notFound.status = 404;
    throw notFound;
  }

  await assertWorkspaceMember(message.channels.workspace_id, userId);

  return message;
}

async function buildMessageInsertMetadata(channel, userId, body) {
  const metadata = {};

  if (body.replyToMessageId) {
    const replyMessage = await getMessageWithMembership(body.replyToMessageId, userId);

    if (replyMessage.channel_id !== channel.id) {
      const error = new Error('Pesan yang dibalas harus berada di channel yang sama.');
      error.status = 400;
      error.code = 'INVALID_REPLY_TARGET';
      throw error;
    }

    metadata.reply_to_message_id = replyMessage.id;
    metadata.reply_snapshot =
      normalizeClientSnapshot(body.replyTo) ||
      buildMessageSnapshot(replyMessage);
  }

  if (body.forwardedFromMessageId) {
    const forwardedMessage = await getMessageWithMembership(body.forwardedFromMessageId, userId);

    if (forwardedMessage.channels.workspace_id !== channel.workspace_id) {
      const error = new Error('Pesan hanya bisa diteruskan dalam workspace yang sama.');
      error.status = 400;
      error.code = 'INVALID_FORWARD_TARGET';
      throw error;
    }

    metadata.forwarded_from_message_id = forwardedMessage.id;
    metadata.forwarded_snapshot =
      normalizeClientSnapshot(body.forwardedFrom) ||
      buildMessageSnapshot(forwardedMessage);
  }

  return metadata;
}

async function createSignedFileUrl(file) {
  if (!file?.storage_path) return null;

  const { data, error } = await supabaseAdmin.storage
    .from(file.bucket_name || STORAGE_BUCKET)
    .createSignedUrl(file.storage_path, 60 * 60);

  if (error) return null;

  return data.signedUrl;
}

async function mapMessageWithFile(message, currentUser, userState = null) {
  let file = null;

  if (message.file_id) {
    const { data } = await supabaseAdmin
      .from('files')
      .select('id, bucket_name, storage_path, file_name, mime_type, file_size')
      .eq('id', message.file_id)
      .maybeSingle();

    if (data) {
      file = {
        ...data,
        signed_url: await createSignedFileUrl(data)
      };
    }
  }

  return {
    id: message.id,
    channel_id: message.channel_id,
    sender_id: message.sender_id,
    sender_name:
      message.profiles?.username ||
      message.profiles?.full_name ||
      (message.sender_id === currentUser.id ? getDisplayName(currentUser) : 'Anggota'),
    sender_avatar_url: message.profiles?.avatar_url || null,
    content: message.content,
    type: message.type,
    pinned: message.pinned || false,
    edited: message.edited || false,
    starred: !!userState?.starred,
    reply_to_message_id: message.reply_to_message_id || null,
    reply_snapshot: message.reply_snapshot || null,
    forwarded_from_message_id: message.forwarded_from_message_id || null,
    forwarded_snapshot: message.forwarded_snapshot || null,
    reactions: await getMessageReactions(message.id, currentUser.id),
    created_at: message.created_at,
    file
  };
}

async function getMessageUserState(messageId, userId) {
  const { data, error } = await supabaseAdmin
    .from('message_user_states')
    .select('hidden, starred')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return null;

  return data;
}

async function getMessageReactions(messageId, currentUserId) {
  const { data, error } = await supabaseAdmin
    .from('message_reactions')
    .select('emoji, user_id')
    .eq('message_id', messageId);

  if (error) return [];

  const grouped = new Map();

  for (const reaction of data || []) {
    const current = grouped.get(reaction.emoji) || {
      emoji: reaction.emoji,
      count: 0,
      reacted: false
    };

    current.count += 1;
    if (reaction.user_id === currentUserId) current.reacted = true;
    grouped.set(reaction.emoji, current);
  }

  return [...grouped.values()];
}

async function buildBootstrapPayload(user) {
  await ensureProfile(user);

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id);

  if (membershipError) {
    membershipError.status = 500;
    throw membershipError;
  }

  const membershipRolesByWorkspace = Object.fromEntries(
    (memberships || []).map((membership) => [membership.workspace_id, membership.role])
  );
  let workspaceIds = (memberships || []).map((membership) => membership.workspace_id);

  if (workspaceIds.length === 0) {
    const workspace = await ensureDefaultWorkspace(user);
    membershipRolesByWorkspace[workspace.id] = 'owner';
    workspaceIds = [workspace.id];
  }

  const { data: workspaces, error: workspaceError } = await supabaseAdmin
    .from('workspaces')
    .select('id, name, description, short_name, color, photo_url, invite_code, owner_id, created_at')
    .in('id', workspaceIds)
    .order('created_at', { ascending: true });

  if (workspaceError) {
    workspaceError.status = 500;
    throw workspaceError;
  }

  const roomsByWorkspace = {};
  const messagesByWorkspace = {};
  const membersByWorkspace = {};
  const responseWorkspaces = (workspaces || []).map((workspace) => (
    ADMIN_ROLES.includes(membershipRolesByWorkspace[workspace.id])
      ? workspace
      : { ...workspace, invite_code: null }
  ));

  for (const workspace of responseWorkspaces) {
    const { data: members, error: membersError } = await supabaseAdmin
      .from('workspace_members')
      .select('id, workspace_id, user_id, role, profiles:user_id(id, full_name, username, avatar_url, bio, status)')
      .eq('workspace_id', workspace.id);

    if (membersError) {
      membersError.status = 500;
      throw membersError;
    }

    membersByWorkspace[workspace.id] = (members || []).map((member) => ({
      id: member.user_id,
      workspace_id: member.workspace_id,
      role: member.role,
      full_name: member.profiles?.username || member.profiles?.full_name || 'Anggota',
      username: member.profiles?.username || null,
      email: member.user_id === user.id ? user.email : null,
      avatar_url: member.profiles?.avatar_url || null,
      bio: member.profiles?.bio || null,
      profile_status: member.profiles?.status || 'online'
    }));

    const { data: channels, error: channelsError } = await supabaseAdmin
      .from('channels')
      .select('id, workspace_id, name, description, favorite, archived, created_at')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: true });

    if (channelsError) {
      channelsError.status = 500;
      throw channelsError;
    }

    let nextChannels = channels || [];

    if (nextChannels.length === 0) {
      const createdChannel = await ensureDefaultChannel(workspace.id, user.id);
      nextChannels = [createdChannel];
    }

    roomsByWorkspace[workspace.id] = nextChannels;
    messagesByWorkspace[workspace.id] = {};

    for (const channel of nextChannels) {
      const { data: messages, error: messagesError } = await supabaseAdmin
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        messagesError.status = 500;
        throw messagesError;
      }

      const messageIds = (messages || []).map((message) => message.id);
      let userStatesByMessageId = {};

      if (messageIds.length > 0) {
        const { data: userStates, error: userStatesError } = await supabaseAdmin
          .from('message_user_states')
          .select('message_id, hidden, starred')
          .eq('user_id', user.id)
          .in('message_id', messageIds);

        if (userStatesError) {
          userStatesError.status = 500;
          throw userStatesError;
        }

        userStatesByMessageId = Object.fromEntries(
          (userStates || []).map((state) => [state.message_id, state])
        );
      }

      messagesByWorkspace[workspace.id][channel.id] = await Promise.all(
        (messages || [])
          .filter((message) => !userStatesByMessageId[message.id]?.hidden)
          .map((message) =>
            mapMessageWithFile(message, user, userStatesByMessageId[message.id])
          )
      );
    }
  }

  return {
    workspaces: responseWorkspaces,
    roomsByWorkspace,
    messagesByWorkspace,
    membersByWorkspace,
    ...(await getWorkspaceInvitesForUser(user))
  };
}

router.get('/bootstrap', requireAuth, asyncHandler(async (req, res) => {
  const payload = await buildBootstrapPayload(req.user);
  res.json(payload);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  const photoUrl = normalizeWorkspacePhotoUrl(req.body);

  if (!name) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'name is required'
    });
  }

  await ensureProfile(req.user);

  const { data: workspace, error } = await supabaseAdmin
    .from('workspaces')
    .insert({
      name,
      description: description || `Workspace untuk kolaborasi ${name}.`,
      short_name: req.body.shortName || null,
      color: req.body.color || 'bg-blue-600',
      photo_url: photoUrl || null,
      invite_code: await createUniqueInviteCode(),
      owner_id: req.user.id
    })
    .select('id, name, description, short_name, color, photo_url, invite_code, owner_id, created_at')
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  await supabaseAdmin
    .from('workspace_members')
    .upsert({
      workspace_id: workspace.id,
      user_id: req.user.id,
      role: 'owner'
    }, {
      onConflict: 'workspace_id,user_id'
    });

  const channel = await ensureDefaultChannel(workspace.id, req.user.id);

  res.status(201).json({
    workspace,
    channel
  });
}));

router.patch('/:workspaceId', requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = req.params.workspaceId;
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  const shortName = req.body.shortName ? String(req.body.shortName).trim().slice(0, 3).toUpperCase() : null;
  const color = req.body.color ? String(req.body.color).trim() : null;
  const photoUrl = normalizeWorkspacePhotoUrl(req.body);

  await assertWorkspaceRole(workspaceId, req.user.id, ADMIN_ROLES);

  const updates = {};
  if (name) updates.name = name;
  if (description || req.body.description === '') updates.description = description;
  if (shortName) updates.short_name = shortName;
  if (color) updates.color = color;
  if (photoUrl !== undefined) updates.photo_url = photoUrl || null;

  const { data: workspace, error } = await supabaseAdmin
    .from('workspaces')
    .update(updates)
    .eq('id', workspaceId)
    .select('id, name, description, short_name, color, photo_url, invite_code, owner_id, created_at')
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.json({ workspace });
}));

router.delete('/:workspaceId/leave', requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = req.params.workspaceId;
  const member = await assertWorkspaceMember(workspaceId, req.user.id);

  if (member.role === 'owner') {
    const { error } = await supabaseAdmin
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)
      .eq('owner_id', req.user.id);

    if (error) {
      error.status = 500;
      throw error;
    }

    return res.json({ action: 'deleted' });
  }

  const { error } = await supabaseAdmin
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', req.user.id);

  if (error) {
    error.status = 500;
    throw error;
  }

  return res.json({ action: 'left' });
}));

router.post('/:workspaceId/channels', requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = req.params.workspaceId;
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();

  if (!name) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'name is required'
    });
  }

  await assertWorkspaceRole(workspaceId, req.user.id, ADMIN_ROLES);

  const { data: channel, error } = await supabaseAdmin
    .from('channels')
    .insert({
      workspace_id: workspaceId,
      name,
      description: description || `Ruang diskusi untuk ${name}.`,
      created_by: req.user.id
    })
    .select('id, workspace_id, name, description, favorite, archived, created_at')
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.status(201).json({
    channel
  });
}));

router.patch('/channels/:channelId', requireAuth, asyncHandler(async (req, res) => {
  const channel = await getChannelWithMembership(req.params.channelId, req.user.id);
  const updates = {};

  await assertWorkspaceRole(channel.workspace_id, req.user.id, ADMIN_ROLES);

  if (typeof req.body.name === 'string' && req.body.name.trim()) {
    updates.name = req.body.name.trim();
  }

  if (typeof req.body.description === 'string') {
    updates.description = req.body.description.trim();
  }

  if (typeof req.body.favorite === 'boolean') {
    updates.favorite = req.body.favorite;
  }

  if (typeof req.body.archived === 'boolean') {
    updates.archived = req.body.archived;
  }

  const { data, error } = await supabaseAdmin
    .from('channels')
    .update(updates)
    .eq('id', channel.id)
    .select('id, workspace_id, name, description, favorite, archived, created_at')
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.json({ channel: data });
}));

router.delete('/channels/:channelId', requireAuth, asyncHandler(async (req, res) => {
  const channel = await getChannelWithMembership(req.params.channelId, req.user.id);

  await assertWorkspaceRole(channel.workspace_id, req.user.id, ADMIN_ROLES);

  const { error } = await supabaseAdmin
    .from('channels')
    .delete()
    .eq('id', channel.id);

  if (error) {
    error.status = 500;
    throw error;
  }

  res.json({ deleted: true });
}));

router.get('/invites', requireAuth, asyncHandler(async (req, res) => {
  const payload = await getWorkspaceInvitesForUser(req.user);
  const workspaceId = String(req.query.workspaceId || '').trim();

  if (workspaceId) {
    payload.outgoingInvites = payload.outgoingInvites.filter(
      (invite) => invite.workspaceId === workspaceId
    );
  }

  res.json(payload);
}));

router.post('/invites/:inviteId/accept', requireAuth, asyncHandler(async (req, res) => {
  const inviteId = req.params.inviteId;
  const email = String(req.user.email || '').trim().toLowerCase();

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('workspace_invites')
    .select(INVITE_SELECT)
    .eq('id', inviteId)
    .eq('status', 'pending')
    .maybeSingle();

  if (inviteError) {
    inviteError.status = 500;
    throw inviteError;
  }

  if (!invite) {
    return res.status(404).json({
      code: 'INVITE_NOT_FOUND',
      message: 'Invite tidak ditemukan atau sudah diproses.'
    });
  }

  const isRecipient =
    invite.invited_user_id === req.user.id ||
    invite.invited_email.toLowerCase() === email;

  if (!isRecipient) {
    return res.status(403).json({
      code: 'INVITE_FORBIDDEN',
      message: 'Invite ini bukan untuk akun kamu.'
    });
  }

  await ensureProfile(req.user);

  const { error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .upsert({
      workspace_id: invite.workspace_id,
      user_id: req.user.id,
      role: invite.role
    }, {
      onConflict: 'workspace_id,user_id'
    });

  if (memberError) {
    memberError.status = 500;
    throw memberError;
  }

  const { data: updatedInvite, error: updateError } = await supabaseAdmin
    .from('workspace_invites')
    .update({
      status: 'accepted',
      invited_user_id: req.user.id
    })
    .eq('id', invite.id)
    .select(INVITE_SELECT)
    .single();

  if (updateError) {
    updateError.status = 500;
    throw updateError;
  }

  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from('workspaces')
    .select('id, name, description, short_name, color, photo_url, invite_code, owner_id, created_at')
    .eq('id', invite.workspace_id)
    .single();

  if (workspaceError) {
    workspaceError.status = 500;
    throw workspaceError;
  }

  const channel = await ensureDefaultChannel(workspace.id, workspace.owner_id);

  res.json({
    invite: mapInvite(updatedInvite, 'incoming'),
    workspace: {
      ...workspace,
      invite_code: null
    },
    channel
  });
}));

router.post('/invites/:inviteId/decline', requireAuth, asyncHandler(async (req, res) => {
  const inviteId = req.params.inviteId;
  const email = String(req.user.email || '').trim().toLowerCase();

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('workspace_invites')
    .select(INVITE_SELECT)
    .eq('id', inviteId)
    .eq('status', 'pending')
    .maybeSingle();

  if (inviteError) {
    inviteError.status = 500;
    throw inviteError;
  }

  if (!invite) {
    return res.status(404).json({
      code: 'INVITE_NOT_FOUND',
      message: 'Invite tidak ditemukan atau sudah diproses.'
    });
  }

  const isRecipient =
    invite.invited_user_id === req.user.id ||
    invite.invited_email.toLowerCase() === email;

  if (!isRecipient) {
    return res.status(403).json({
      code: 'INVITE_FORBIDDEN',
      message: 'Invite ini bukan untuk akun kamu.'
    });
  }

  const { data: updatedInvite, error: updateError } = await supabaseAdmin
    .from('workspace_invites')
    .update({ status: 'declined' })
    .eq('id', invite.id)
    .select(INVITE_SELECT)
    .single();

  if (updateError) {
    updateError.status = 500;
    throw updateError;
  }

  res.json({
    invite: mapInvite(updatedInvite, 'incoming')
  });
}));

router.delete('/invites/:inviteId', requireAuth, asyncHandler(async (req, res) => {
  const inviteId = req.params.inviteId;

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('workspace_invites')
    .select('id, workspace_id, inviter_id, status')
    .eq('id', inviteId)
    .eq('status', 'pending')
    .maybeSingle();

  if (inviteError) {
    inviteError.status = 500;
    throw inviteError;
  }

  if (!invite) {
    return res.status(404).json({
      code: 'INVITE_NOT_FOUND',
      message: 'Invite tidak ditemukan atau sudah diproses.'
    });
  }

  const isSender = invite.inviter_id === req.user.id;
  if (!isSender) {
    await assertWorkspaceRole(invite.workspace_id, req.user.id, ADMIN_ROLES);
  }

  const { error: deleteError } = await supabaseAdmin
    .from('workspace_invites')
    .delete()
    .eq('id', invite.id);

  if (deleteError) {
    deleteError.status = 500;
    throw deleteError;
  }

  res.json({
    deleted: true,
    inviteId: invite.id
  });
}));

router.post('/:workspaceId/invite', requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = req.params.workspaceId;
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = toDbRole(req.body.role);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Valid email is required'
    });
  }

  const requester = await assertWorkspaceRole(workspaceId, req.user.id, ADMIN_ROLES);
  assertAssignableInviteRole(requester.role, role);

  const invitedUser = await findUserByEmail(email);
  let invitedProfile = null;

  if (!invitedUser) {
    invitedProfile = null;
  } else {
    invitedProfile = await ensureProfile(invitedUser);
  }

  const { data: existingInvite, error: existingInviteError } = await supabaseAdmin
    .from('workspace_invites')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('invited_email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingInviteError) {
    existingInviteError.status = 500;
    throw existingInviteError;
  }

  if (existingInvite) {
    return res.status(409).json({
      code: 'INVITE_ALREADY_EXISTS',
      message: 'Invite sudah pernah dikirim.'
    });
  }

  if (invitedUser) {
    const { data: existingMember, error: existingMemberError } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', invitedUser.id)
      .maybeSingle();

    if (existingMemberError) {
      existingMemberError.status = 500;
      throw existingMemberError;
    }

    if (existingMember) {
      return res.status(409).json({
        code: 'USER_ALREADY_MEMBER',
        message: 'User ini sudah menjadi anggota workspace.'
      });
    }
  }

  const { data: invite, error } = await supabaseAdmin
    .from('workspace_invites')
    .insert({
      workspace_id: workspaceId,
      inviter_id: req.user.id,
      invited_user_id: invitedUser?.id || null,
      invited_email: email,
      role
    })
    .select(INVITE_SELECT)
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.status(201).json({
    invite: mapInvite(invite, 'outgoing'),
    member: buildPendingMemberFromInvite(invite, invitedUser),
    invitedProfile
  });
}));

router.post('/join/:inviteCode', requireAuth, asyncHandler(async (req, res) => {
  const inviteCode = normalizeInviteCode(req.params.inviteCode);

  if (!inviteCode) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'inviteCode is required'
    });
  }

  validateInviteCode(inviteCode);

  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from('workspaces')
    .select('id, name, description, short_name, color, photo_url, invite_code, owner_id, created_at')
    .eq('invite_code', inviteCode)
    .maybeSingle();

  if (workspaceError) {
    workspaceError.status = 500;
    throw workspaceError;
  }

  if (!workspace) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Kode invite tidak ditemukan'
    });
  }

  await ensureProfile(req.user);

  const { error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .upsert({
      workspace_id: workspace.id,
      user_id: req.user.id,
      role: 'member'
    }, {
      onConflict: 'workspace_id,user_id'
    });

  if (memberError) {
    memberError.status = 500;
    throw memberError;
  }

  const channel = await ensureDefaultChannel(workspace.id, workspace.owner_id);

  res.json({
    workspace: {
      ...workspace,
      invite_code: null
    },
    channel
  });
}));

router.post('/channels/:channelId/messages', requireAuth, asyncHandler(async (req, res) => {
  const channel = await getChannelWithMembership(req.params.channelId, req.user.id);
  const content = String(req.body.content || '').trim();
  const type = req.body.type || 'text';
  const metadata = await buildMessageInsertMetadata(channel, req.user.id, req.body);

  if (!content) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'content is required'
    });
  }

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      channel_id: channel.id,
      sender_id: req.user.id,
      content,
      type,
      ...metadata
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.status(201).json({
    message: await mapMessageWithFile(message, req.user)
  });
}));

router.patch('/messages/:messageId', requireAuth, asyncHandler(async (req, res) => {
  const message = await getMessageWithMembership(req.params.messageId, req.user.id);
  const updates = {};

  if (typeof req.body.content === 'string') {
    if (message.sender_id !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only sender can edit message content'
      });
    }

    updates.content = req.body.content.trim() || null;
    updates.edited = true;
  }

  if (typeof req.body.pinned === 'boolean') {
    updates.pinned = req.body.pinned;
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .update(updates)
    .eq('id', message.id)
    .select(MESSAGE_SELECT)
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.json({
    message: await mapMessageWithFile(data, req.user)
  });
}));

router.post('/messages/:messageId/forward', requireAuth, asyncHandler(async (req, res) => {
  const sourceMessage = await getMessageWithMembership(req.params.messageId, req.user.id);
  const targetChannelId = String(req.body.channelId || req.body.targetChannelId || '').trim();

  if (!targetChannelId) {
    return res.status(400).json({
      code: 'TARGET_CHANNEL_REQUIRED',
      message: 'Channel tujuan wajib diisi.'
    });
  }

  const targetChannel = await getChannelWithMembership(targetChannelId, req.user.id);

  if (targetChannel.workspace_id !== sourceMessage.channels.workspace_id) {
    return res.status(400).json({
      code: 'INVALID_FORWARD_TARGET',
      message: 'Pesan hanya bisa diteruskan dalam workspace yang sama.'
    });
  }

  const content = typeof req.body.content === 'string'
    ? req.body.content.trim()
    : sourceMessage.content;
  let copiedFile = null;
  let copiedStoragePath = null;
  let copiedBucketName = STORAGE_BUCKET;

  if (sourceMessage.file_id) {
    const { data: sourceFile, error: sourceFileError } = await supabaseAdmin
      .from('files')
      .select('id, bucket_name, storage_path, file_name, mime_type, file_size')
      .eq('id', sourceMessage.file_id)
      .maybeSingle();

    if (sourceFileError) {
      sourceFileError.status = 500;
      throw sourceFileError;
    }

    if (sourceFile) {
      copiedBucketName = sourceFile.bucket_name || STORAGE_BUCKET;
      copiedStoragePath = `${targetChannel.workspace_id}/${targetChannel.id}/${Date.now()}-forward-${safeStorageName(sourceFile.file_name)}`;

      const { error: copyError } = await supabaseAdmin.storage
        .from(copiedBucketName)
        .copy(sourceFile.storage_path, copiedStoragePath);

      if (copyError) {
        copyError.status = 500;
        throw copyError;
      }

      const { data: file, error: fileError } = await supabaseAdmin
        .from('files')
        .insert({
          workspace_id: targetChannel.workspace_id,
          channel_id: targetChannel.id,
          uploaded_by: req.user.id,
          bucket_name: copiedBucketName,
          storage_path: copiedStoragePath,
          file_name: sourceFile.file_name,
          mime_type: sourceFile.mime_type,
          file_size: sourceFile.file_size
        })
        .select('id, bucket_name, storage_path, file_name, mime_type, file_size')
        .single();

      if (fileError) {
        await supabaseAdmin.storage
          .from(copiedBucketName)
          .remove([copiedStoragePath]);

        fileError.status = 500;
        throw fileError;
      }

      copiedFile = file;
    }
  }

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      channel_id: targetChannel.id,
      sender_id: req.user.id,
      content: content || (copiedFile ? null : 'Pesan diteruskan'),
      type: copiedFile ? sourceMessage.type : 'text',
      file_id: copiedFile?.id || null,
      forwarded_from_message_id: sourceMessage.id,
      forwarded_snapshot:
        normalizeClientSnapshot(req.body.forwardedFrom) ||
        buildMessageSnapshot({ ...sourceMessage, file: copiedFile })
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error) {
    if (copiedFile && copiedStoragePath) {
      await supabaseAdmin.storage
        .from(copiedBucketName)
        .remove([copiedStoragePath]);

      await supabaseAdmin
        .from('files')
        .delete()
        .eq('id', copiedFile.id);
    }

    error.status = 500;
    throw error;
  }

  res.status(201).json({
    message: await mapMessageWithFile(message, req.user)
  });
}));

router.post('/messages/:messageId/reactions', requireAuth, asyncHandler(async (req, res) => {
  const message = await getMessageWithMembership(req.params.messageId, req.user.id);
  const emoji = normalizeEmoji(req.body.emoji);

  const { data: existingReaction, error: existingError } = await supabaseAdmin
    .from('message_reactions')
    .select('message_id')
    .eq('message_id', message.id)
    .eq('user_id', req.user.id)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existingError) {
    existingError.status = 500;
    throw existingError;
  }

  if (existingReaction) {
    const { error } = await supabaseAdmin
      .from('message_reactions')
      .delete()
      .eq('message_id', message.id)
      .eq('user_id', req.user.id)
      .eq('emoji', emoji);

    if (error) {
      error.status = 500;
      throw error;
    }
  } else {
    const { error } = await supabaseAdmin
      .from('message_reactions')
      .insert({
        message_id: message.id,
        user_id: req.user.id,
        emoji
      });

    if (error) {
      error.status = 500;
      throw error;
    }
  }

  res.json({
    messageId: message.id,
    reactions: await getMessageReactions(message.id, req.user.id)
  });
}));

router.patch('/messages/:messageId/user-state', requireAuth, asyncHandler(async (req, res) => {
  const message = await getMessageWithMembership(req.params.messageId, req.user.id);
  const existingState = await getMessageUserState(message.id, req.user.id);
  const nextState = {
    hidden: existingState?.hidden || false,
    starred: existingState?.starred || false
  };

  if (typeof req.body.hidden === 'boolean') {
    nextState.hidden = req.body.hidden;
  }

  if (typeof req.body.starred === 'boolean') {
    nextState.starred = req.body.starred;
  }

  if (!nextState.hidden && !nextState.starred) {
    const { error } = await supabaseAdmin
      .from('message_user_states')
      .delete()
      .eq('message_id', message.id)
      .eq('user_id', req.user.id);

    if (error) {
      error.status = 500;
      throw error;
    }

    return res.json({
      messageId: message.id,
      state: {
        hidden: false,
        starred: false
      }
    });
  }

  const { data, error } = await supabaseAdmin
    .from('message_user_states')
    .upsert({
      message_id: message.id,
      user_id: req.user.id,
      hidden: nextState.hidden,
      starred: nextState.starred
    }, {
      onConflict: 'message_id,user_id'
    })
    .select('message_id, hidden, starred')
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.json({
    messageId: data.message_id,
    state: {
      hidden: data.hidden,
      starred: data.starred
    }
  });
}));

router.delete('/messages/:messageId', requireAuth, asyncHandler(async (req, res) => {
  const message = await getMessageWithMembership(req.params.messageId, req.user.id);

  if (message.sender_id !== req.user.id) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Only sender can delete their own message'
    });
  }

  if (message.file_id) {
    const { data: file, error: fileLookupError } = await supabaseAdmin
      .from('files')
      .select('id, bucket_name, storage_path')
      .eq('id', message.file_id)
      .maybeSingle();

    if (fileLookupError) {
      fileLookupError.status = 500;
      throw fileLookupError;
    }

    if (file) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(file.bucket_name || STORAGE_BUCKET)
        .remove([file.storage_path]);

      if (storageError) {
        storageError.status = 500;
        throw storageError;
      }

      const { error: fileDeleteError } = await supabaseAdmin
        .from('files')
        .delete()
        .eq('id', file.id);

      if (fileDeleteError) {
        fileDeleteError.status = 500;
        throw fileDeleteError;
      }
    }

    const { error: messageDeleteError } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', message.id);

    if (messageDeleteError) {
      messageDeleteError.status = 500;
      throw messageDeleteError;
    }
  } else {
    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', message.id);

    if (error) {
      error.status = 500;
      throw error;
    }
  }

  res.json({ deleted: true });
}));

router.post('/channels/:channelId/files', requireAuth, asyncHandler(async (req, res) => {
  const channel = await getChannelWithMembership(req.params.channelId, req.user.id);
  const fileName = safeStorageName(req.body.fileName);
  const originalFileName = String(req.body.fileName || fileName);
  const mimeType = String(req.body.mimeType || 'application/octet-stream');
  const fileSize = Number(req.body.fileSize || 0);
  const contentBase64 = String(req.body.contentBase64 || '');
  const caption = String(req.body.caption || '').trim();
  const metadata = await buildMessageInsertMetadata(channel, req.user.id, req.body);

  if (!contentBase64) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'contentBase64 is required'
    });
  }

  if (!isAllowedMimeType(mimeType)) {
    return res.status(415).json({
      code: 'UNSUPPORTED_FILE_TYPE',
      message: 'Tipe file tidak didukung.'
    });
  }

  if (contentBase64.length > MAX_BASE64_CHARS) {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: `File maksimal ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB`
    });
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(contentBase64)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'contentBase64 is not valid base64'
    });
  }

  if (fileSize && (!Number.isFinite(fileSize) || fileSize < 0 || fileSize > MAX_FILE_BYTES)) {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: `File maksimal ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB`
    });
  }

  const buffer = Buffer.from(contentBase64, 'base64');

  if (buffer.length > MAX_FILE_BYTES) {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: `File maksimal ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB`
    });
  }

  const storagePath = `${channel.workspace_id}/${channel.id}/${Date.now()}-${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false
    });

  if (uploadError) {
    uploadError.status = 500;
    throw uploadError;
  }

  const { data: file, error: fileError } = await supabaseAdmin
    .from('files')
    .insert({
      workspace_id: channel.workspace_id,
      channel_id: channel.id,
      uploaded_by: req.user.id,
      bucket_name: STORAGE_BUCKET,
      storage_path: storagePath,
      file_name: originalFileName,
      mime_type: mimeType,
      file_size: fileSize || buffer.length
    })
    .select('id, bucket_name, storage_path, file_name, mime_type, file_size')
    .single();

  if (fileError) {
    await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    fileError.status = 500;
    throw fileError;
  }

  const messageType = mimeType.startsWith('image/') ? 'image' : 'file';
  const { data: message, error: messageError } = await supabaseAdmin
    .from('messages')
    .insert({
      channel_id: channel.id,
      sender_id: req.user.id,
      content: caption || null,
      type: messageType,
      file_id: file.id,
      ...metadata
    })
    .select(MESSAGE_SELECT)
    .single();

  if (messageError) {
    await supabaseAdmin.storage
      .from(file.bucket_name || STORAGE_BUCKET)
      .remove([file.storage_path]);

    await supabaseAdmin
      .from('files')
      .delete()
      .eq('id', file.id);

    messageError.status = 500;
    throw messageError;
  }

  res.status(201).json({
    message: await mapMessageWithFile(message, req.user)
  });
}));

module.exports = router;

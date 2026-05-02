const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();
const STORAGE_BUCKET = 'workspace-files';

function getDisplayName(user) {
  const metadata = user.user_metadata || {};
  return (
    metadata.full_name ||
    metadata.name ||
    metadata.username ||
    user.email?.split('@')[0] ||
    'Pengguna'
  );
}

async function ensureProfile(user) {
  const metadata = user.user_metadata || {};
  const fullName = getDisplayName(user);
  const username = metadata.username || user.email?.split('@')[0] || user.id;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: fullName,
      username,
      avatar_url: metadata.avatar_url || null
    }, {
      onConflict: 'id'
    })
    .select('id, full_name, username, avatar_url, status')
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
      owner_id: user.id
    })
    .select('id, name, description, short_name, color, owner_id, created_at')
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

function normalizeRole(role) {
  const normalized = String(role || 'member').toLowerCase();
  return ['owner', 'admin', 'member'].includes(normalized) ? normalized : 'member';
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
    .select('id, channel_id, sender_id, content, type, file_id, created_at, channels!inner(id, workspace_id)')
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

async function createSignedFileUrl(file) {
  if (!file?.storage_path) return null;

  const { data, error } = await supabaseAdmin.storage
    .from(file.bucket_name || STORAGE_BUCKET)
    .createSignedUrl(file.storage_path, 60 * 60);

  if (error) return null;

  return data.signedUrl;
}

async function mapMessageWithFile(message, currentUser) {
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
      message.profiles?.full_name ||
      message.profiles?.username ||
      (message.sender_id === currentUser.id ? getDisplayName(currentUser) : 'Anggota'),
    content: message.content,
    type: message.type,
    pinned: message.pinned || false,
    edited: message.edited || false,
    created_at: message.created_at,
    file
  };
}

async function buildBootstrapPayload(user) {
  await ensureProfile(user);

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id);

  if (membershipError) {
    membershipError.status = 500;
    throw membershipError;
  }

  let workspaceIds = (memberships || []).map((membership) => membership.workspace_id);

  if (workspaceIds.length === 0) {
    const workspace = await ensureDefaultWorkspace(user);
    workspaceIds = [workspace.id];
  }

  const { data: workspaces, error: workspaceError } = await supabaseAdmin
    .from('workspaces')
    .select('id, name, description, short_name, color, owner_id, created_at')
    .in('id', workspaceIds)
    .order('created_at', { ascending: true });

  if (workspaceError) {
    workspaceError.status = 500;
    throw workspaceError;
  }

  const roomsByWorkspace = {};
  const messagesByWorkspace = {};
  const membersByWorkspace = {};

  for (const workspace of workspaces || []) {
    const { data: members, error: membersError } = await supabaseAdmin
      .from('workspace_members')
      .select('id, workspace_id, user_id, role, profiles:user_id(id, full_name, username, avatar_url, status)')
      .eq('workspace_id', workspace.id);

    if (membersError) {
      membersError.status = 500;
      throw membersError;
    }

    membersByWorkspace[workspace.id] = (members || []).map((member) => ({
      id: member.user_id,
      workspace_id: member.workspace_id,
      role: member.role,
      full_name: member.profiles?.full_name || member.profiles?.username || 'Anggota',
      email: member.user_id === user.id ? user.email : null,
      avatar_url: member.profiles?.avatar_url || null,
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
        .select('id, channel_id, sender_id, content, type, file_id, pinned, edited, created_at, profiles:sender_id(full_name, username, avatar_url)')
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        messagesError.status = 500;
        throw messagesError;
      }

      messagesByWorkspace[workspace.id][channel.id] = await Promise.all(
        (messages || []).map((message) => mapMessageWithFile(message, user))
      );
    }
  }

  return {
    workspaces: workspaces || [],
    roomsByWorkspace,
    messagesByWorkspace,
    membersByWorkspace
  };
}

router.get('/bootstrap', requireAuth, asyncHandler(async (req, res) => {
  const payload = await buildBootstrapPayload(req.user);
  res.json(payload);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();

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
      owner_id: req.user.id
    })
    .select('id, name, description, short_name, color, owner_id, created_at')
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

  await assertWorkspaceMember(workspaceId, req.user.id);

  const updates = {};
  if (name) updates.name = name;
  if (description || req.body.description === '') updates.description = description;
  if (shortName) updates.short_name = shortName;
  if (color) updates.color = color;

  const { data: workspace, error } = await supabaseAdmin
    .from('workspaces')
    .update(updates)
    .eq('id', workspaceId)
    .select('id, name, description, short_name, color, owner_id, created_at')
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

  await assertWorkspaceMember(workspaceId, req.user.id);

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

router.post('/:workspaceId/invite', requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = req.params.workspaceId;
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = normalizeRole(req.body.role);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Valid email is required'
    });
  }

  await assertWorkspaceMember(workspaceId, req.user.id);

  const invitedUser = await findUserByEmail(email);

  if (!invitedUser) {
    return res.status(404).json({
      error: 'User Not Found',
      message: 'User belum terdaftar. Minta temanmu register dulu, lalu invite ulang.'
    });
  }

  await ensureProfile(invitedUser);

  const { data: membership, error } = await supabaseAdmin
    .from('workspace_members')
    .upsert({
      workspace_id: workspaceId,
      user_id: invitedUser.id,
      role
    }, {
      onConflict: 'workspace_id,user_id'
    })
    .select('id, workspace_id, user_id, role')
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.status(201).json({
    member: {
      id: membership.user_id,
      workspace_id: membership.workspace_id,
      role: membership.role,
      full_name: getDisplayName(invitedUser),
      email: invitedUser.email,
      avatar_url: invitedUser.user_metadata?.avatar_url || null,
      profile_status: invitedUser.user_metadata?.status || 'online'
    }
  });
}));

router.post('/join/:inviteCode', requireAuth, asyncHandler(async (req, res) => {
  const inviteCode = String(req.params.inviteCode || '').trim().toLowerCase();

  if (!inviteCode) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'inviteCode is required'
    });
  }

  const { data: workspaces, error: workspaceError } = await supabaseAdmin
    .from('workspaces')
    .select('id, name, description, owner_id, created_at');

  if (workspaceError) {
    workspaceError.status = 500;
    throw workspaceError;
  }

  const workspace = (workspaces || []).find((item) =>
    item.id.toLowerCase().startsWith(inviteCode)
  );

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
    workspace,
    channel
  });
}));

router.post('/channels/:channelId/messages', requireAuth, asyncHandler(async (req, res) => {
  const channel = await getChannelWithMembership(req.params.channelId, req.user.id);
  const content = String(req.body.content || '').trim();
  const type = req.body.type || 'text';

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
      type
    })
    .select('id, channel_id, sender_id, content, type, file_id, pinned, edited, created_at')
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.status(201).json({
    message: {
      ...message,
      sender_name: getDisplayName(req.user)
    }
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
    .select('id, channel_id, sender_id, content, type, file_id, pinned, edited, created_at')
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.json({
    message: await mapMessageWithFile(data, req.user)
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
    const { data: file } = await supabaseAdmin
      .from('files')
      .select('id, bucket_name, storage_path')
      .eq('id', message.file_id)
      .maybeSingle();

    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', message.id);

    if (file) {
      await supabaseAdmin.storage
        .from(file.bucket_name || STORAGE_BUCKET)
        .remove([file.storage_path]);

      await supabaseAdmin
        .from('files')
        .delete()
        .eq('id', file.id);
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

  if (!contentBase64) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'contentBase64 is required'
    });
  }

  const buffer = Buffer.from(contentBase64, 'base64');
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
      file_id: file.id
    })
    .select('id, channel_id, sender_id, content, type, file_id, pinned, edited, created_at')
    .single();

  if (messageError) {
    messageError.status = 500;
    throw messageError;
  }

  res.status(201).json({
    message: await mapMessageWithFile(
      {
        ...message,
        profiles: {
          full_name: getDisplayName(req.user),
          username: req.user.user_metadata?.username || null
        }
      },
      req.user
    )
  });
}));

module.exports = router;

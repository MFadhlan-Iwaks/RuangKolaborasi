const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { supabaseAdmin } = require('../config/supabase');
const { polishMessage, summarizeDiscussion } = require('../services/gemini.service');
const { getChannelForMember } = require('../services/workspace.service');

const router = express.Router();

function requireString(value, fieldName, maxLength) {
  if (typeof value !== 'string' || value.trim() === '') {
    const error = new Error(`${fieldName} is required`);
    error.status = 400;
    throw error;
  }

  const trimmed = value.trim();

  if (maxLength && trimmed.length > maxLength) {
    const error = new Error(`${fieldName} must be at most ${maxLength} characters`);
    error.status = 400;
    throw error;
  }

  return trimmed;
}

function normalizeManualMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    const error = new Error('messages must be a non-empty array');
    error.status = 400;
    throw error;
  }

  return messages.slice(0, 100).map((message) => ({
    senderName: typeof message.senderName === 'string' ? message.senderName : 'Pengguna',
    content: typeof message.content === 'string' ? message.content : '',
    type: typeof message.type === 'string' ? message.type : 'text'
  }));
}

async function getChannelMessages(channelId, limit) {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select(`
      id,
      content,
      type,
      created_at,
      sender:profiles!messages_sender_id_fkey (
        full_name,
        username
      )
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    error.status = 500;
    throw error;
  }

  return (data || []).reverse().map((message) => ({
    id: message.id,
    content: message.content,
    type: message.type,
    senderName: message.sender?.full_name || message.sender?.username || 'Pengguna',
    createdAt: message.created_at
  }));
}

router.post('/polish-message', requireAuth, asyncHandler(async (req, res) => {
  const text = requireString(req.body.text, 'text', 4000);
  const polishedText = await polishMessage(text);

  res.json({
    polishedText
  });
}));

router.post('/summarize', requireAuth, asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.body.limit || 50), 100);
  let normalizedMessages;
  let channel = null;

  if (req.body.channelId) {
    const channelId = requireString(req.body.channelId, 'channelId');
    channel = await getChannelForMember(channelId, req.user.id);
    normalizedMessages = await getChannelMessages(channel.id, limit);
  } else {
    normalizedMessages = normalizeManualMessages(req.body.messages);
  }

  if (normalizedMessages.length === 0) {
    const error = new Error('No messages available to summarize');
    error.status = 400;
    throw error;
  }

  const summary = await summarizeDiscussion(normalizedMessages);

  if (channel) {
    await supabaseAdmin
      .from('summaries')
      .insert({
        workspace_id: channel.workspace_id,
        channel_id: channel.id,
        requested_by: req.user.id,
        summary_text: summary
      });
  }

  res.json({
    summary
  });
}));

module.exports = router;

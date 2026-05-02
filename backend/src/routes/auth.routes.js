const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, username, avatar_url, status, created_at, updated_at')
    .eq('id', req.user.id)
    .maybeSingle();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      metadata: req.user.user_metadata
    },
    profile
  });
}));

router.post('/ensure-profile', requireAuth, asyncHandler(async (req, res) => {
  const metadata = req.user.user_metadata || {};
  const fullName =
    req.body.fullName ||
    metadata.full_name ||
    metadata.name ||
    req.user.email?.split('@')[0] ||
    'Pengguna';
  const username =
    req.body.username ||
    metadata.username ||
    req.user.email?.split('@')[0] ||
    req.user.id;

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: req.user.id,
      full_name: fullName,
      username,
      avatar_url: metadata.avatar_url || null
    }, {
      onConflict: 'id'
    })
    .select('id, full_name, username, avatar_url, status, created_at, updated_at')
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.json({
    profile
  });
}));

router.patch('/status', requireAuth, asyncHandler(async (req, res) => {
  const status = String(req.body.status || '').trim();

  if (!['online', 'idle', 'dnd', 'offline'].includes(status)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid status'
    });
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update({ status })
    .eq('id', req.user.id)
    .select('id, full_name, username, avatar_url, status, created_at, updated_at')
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.json({
    profile
  });
}));

module.exports = router;

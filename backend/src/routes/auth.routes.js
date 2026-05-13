const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();
const PROFILE_SELECT = 'id, full_name, username, avatar_url, bio, status, created_at, updated_at';
const MAX_AVATAR_URL_LENGTH = 3_000_000;
const ALLOWED_PROFILE_STATUSES = new Set(['online', 'idle', 'dnd', 'offline']);

function trimOptionalString(value, maxLength) {
  if (typeof value !== 'string') return undefined;
  return value.trim().slice(0, maxLength);
}

function normalizeAvatarUrl(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();

  if (trimmed.length > MAX_AVATAR_URL_LENGTH) {
    const error = new Error('Ukuran foto profil terlalu besar.');
    error.status = 413;
    error.code = 'AVATAR_TOO_LARGE';
    throw error;
  }

  return trimmed;
}

function normalizeProfileStatus(value) {
  const status = String(value || '').trim();
  return ALLOWED_PROFILE_STATUSES.has(status) ? status : undefined;
}

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select(PROFILE_SELECT)
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
  const { data: existingProfile, error: existingError } = await supabaseAdmin
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', req.user.id)
    .maybeSingle();

  if (existingError) {
    existingError.status = 500;
    throw existingError;
  }

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
  const payload = {
    id: req.user.id,
    full_name: existingProfile?.full_name || fullName,
    username: existingProfile?.username || username
  };
  const status = normalizeProfileStatus(req.body.status);

  if (status) {
    payload.status = status;
  }

  if (existingProfile?.avatar_url || metadata.avatar_url || req.body.avatarUrl) {
    payload.avatar_url = existingProfile?.avatar_url || metadata.avatar_url || req.body.avatarUrl;
  }

  const { data: profile, error } = await supabaseAdmin
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

  res.json({
    profile
  });
}));

router.patch('/profile', requireAuth, asyncHandler(async (req, res) => {
  const updates = {};
  const fullName = trimOptionalString(req.body.fullName ?? req.body.name, 80);
  const username = trimOptionalString(req.body.username, 40);
  const bio = trimOptionalString(req.body.bio, 160);
  const avatarUrl = normalizeAvatarUrl(req.body.avatarUrl ?? req.body.photoUrl);

  if (fullName !== undefined) updates.full_name = fullName || null;
  if (username !== undefined) {
    if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) {
      return res.status(400).json({
        code: 'INVALID_USERNAME',
        message: 'Username harus 3-40 karakter dan hanya boleh memakai huruf, angka, titik, underscore, atau strip.'
      });
    }

    updates.username = username;
  }
  if (bio !== undefined) updates.bio = bio || null;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl || null;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      code: 'EMPTY_PROFILE_UPDATE',
      message: 'Tidak ada data profil yang diubah.'
    });
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    error.status = 500;
    throw error;
  }

  res.json({ profile });
}));

router.patch('/status', requireAuth, asyncHandler(async (req, res) => {
  const status = String(req.body.status || '').trim();

  if (!ALLOWED_PROFILE_STATUSES.has(status)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid status'
    });
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update({ status })
    .eq('id', req.user.id)
    .select(PROFILE_SELECT)
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

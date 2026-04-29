const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, username, avatar_url, created_at, updated_at')
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

module.exports = router;

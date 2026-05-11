const express = require('express');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();

router.get('/', async (req, res) => {
  let supabaseStatus = 'unknown';
  try {
    const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);
    supabaseStatus = error ? `error: ${error.message}` : 'ok';
  } catch (err) {
    supabaseStatus = `exception: ${err.message}`;
  }

  res.json({
    status: 'ok',
    service: 'ruangkolaborasi-backend',
    supabase: supabaseStatus,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

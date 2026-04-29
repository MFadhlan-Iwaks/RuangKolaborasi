const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env');

const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = {
  supabaseAdmin
};

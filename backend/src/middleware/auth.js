const { supabaseAdmin } = require('../config/supabase');

function getBearerToken(req) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim();
}

async function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization Bearer token'
    });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }

  req.user = data.user;
  req.accessToken = token;

  return next();
}

module.exports = {
  requireAuth
};

require('dotenv').config();

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY'
];

function getEnv(name, fallback = undefined) {
  const value = process.env[name] || fallback;

  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function validateEnv() {
  const missing = requiredEnv.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = {
  env: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 5000),
    corsOrigin: process.env.CORS_ORIGIN || '*',
    supabaseUrl: getEnv('SUPABASE_URL'),
    supabaseSecretKey: getEnv('SUPABASE_SECRET_KEY'),
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  },
  validateEnv
};

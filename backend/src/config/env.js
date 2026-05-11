const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY'
];

function getEnv(name, fallback = undefined) {
  const raw = process.env[name] || fallback;
  if (raw === undefined || raw === null) return '';
  const value = String(raw).trim();
  if (value === '') return '';
  return value;
}

function validateEnv() {
  const missing = requiredEnv.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.warn(`Warning: Missing environment variables (development): ${missing.join(', ')}`);
  }

  console.log('--- Environment Configuration ---');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT || 5000);
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL || '(not set)');
  console.log('SUPABASE_SECRET_KEY:', process.env.SUPABASE_SECRET_KEY ? `${process.env.SUPABASE_SECRET_KEY.substring(0, 10)}...` : 'MISSING');
  console.log('---------------------------------');
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

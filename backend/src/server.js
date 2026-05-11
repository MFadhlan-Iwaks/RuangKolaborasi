const { createApp } = require('./app');
const { env, validateEnv } = require('./config/env');

validateEnv();

const app = createApp();

const host = '0.0.0.0';
app.listen(env.port, host, () => {
  console.log(`RuangKolaborasi backend running on http://${host}:${env.port}`);
  console.log(`Local network access: http://localhost:${env.port}`);
});

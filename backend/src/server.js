const { createApp } = require('./app');
const { env, validateEnv } = require('./config/env');

validateEnv();

const app = createApp();

app.listen(env.port, () => {
  console.log(`RuangKolaborasi backend running on port ${env.port}`);
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { env } = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const aiRoutes = require('./routes/ai.routes');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: env.corsOrigin === '*' ? '*' : env.corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: env.corsOrigin !== '*'
  }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/ai', aiRoutes);

  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.originalUrl} does not exist`
    });
  });

  app.use((err, req, res, next) => {
    console.error(err);

    res.status(err.status || 500).json({
      error: err.name || 'Internal Server Error',
      message: env.nodeEnv === 'production' ? 'Unexpected server error' : err.message
    });
  });

  return app;
}

module.exports = {
  createApp
};

/**
 * app.js — Express application factory (no server.listen, no Socket.io).
 * Imported by server.js (production) and by tests via Supertest.
 */
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';

export function createApp(io = null) {
  const app = express();

  // Attach Socket.io instance when provided (production only)
  if (io) {
    app.set('io', io);
    app.use((req, _res, next) => {
      req.io = io;
      next();
    });
  } else {
    // Stub so game routes don't crash when io.to() is called in tests
    const ioStub = { to: () => ({ emit: () => {} }) };
    app.set('io', ioStub);
    app.use((req, _res, next) => {
      req.io = ioStub;
      next();
    });
  }

  app.use(cors());
  app.use(express.json());

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: 'Too many requests, please try again later.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: 'Too many authentication attempts, please try again later.' },
  });

  const gameLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: 'Too many game actions, slow down!' },
  });

  app.use('/api/', globalLimiter);

  // Routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/game', gameLimiter, gameRoutes);

  // Root
  app.get('/', (_req, res) => {
    res.json({ message: 'Scramble Game API Server', status: 'running' });
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  return app;
}

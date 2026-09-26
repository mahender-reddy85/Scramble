import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';

export function createApp(io = null) {
  const app = express();

  if (io) {
    app.set('io', io);
    app.use((req, _res, next) => {
      req.io = io;
      next();
    });
  } else {
    const ioStub = { to: () => ({ emit: () => {} }) };
    app.set('io', ioStub);
    app.use((req, _res, next) => {
      req.io = ioStub;
      next();
    });
  }

  const corsOptions = {
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json());

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: 'Too many requests, please try again later.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: 'Too many authentication attempts, please try again later.' },
  });

  const gameLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: 'Too many game actions, slow down!' },
  });

  app.use('/api/', globalLimiter);
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/game', gameLimiter, gameRoutes);

  app.get('/', (_req, res) => {
    res.json({ message: 'Scramble Game API Server', status: 'running' });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  return app;
}

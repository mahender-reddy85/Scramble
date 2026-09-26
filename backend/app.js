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

  const clientUrl = process.env.CLIENT_URL;
  const allowedOrigins = [
    'http://localhost:5173',
    'https://scramble-eta.vercel.app',
    ...(clientUrl ? [clientUrl] : [])
  ];

  function isOriginAllowed(origin) {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
    if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
    return false;
  }

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  const corsOptions = {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };

  app.use(cors(corsOptions));
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

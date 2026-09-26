export function isOriginAllowed(origin) {
  if (!origin) return true;

  const clientUrl = process.env.CLIENT_URL;
  if (clientUrl) {
    const normalizedClientUrl = clientUrl.replace(/\/$/, '');
    if (origin === normalizedClientUrl) {
      return true;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    if (origin === 'http://localhost:5173') {
      return true;
    }
  }

  return false;
}

export const corsOptions = {
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

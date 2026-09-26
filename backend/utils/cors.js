const defaultOrigins = [
  'https://scramble-eta.vercel.app',
  'http://localhost:5173'
];

export function isOriginAllowed(origin) {
  if (!origin) return true;

  const normalizedOrigin = origin.trim().replace(/\/+$/, '');

  const clientUrl = process.env.CLIENT_URL;
  if (clientUrl) {
    const configuredUrls = clientUrl
      .split(',')
      .map(u => u.trim().replace(/\/+$/, ''))
      .filter(Boolean);

    if (configuredUrls.includes(normalizedOrigin)) {
      return true;
    }
  }

  if (defaultOrigins.includes(normalizedOrigin)) {
    return true;
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

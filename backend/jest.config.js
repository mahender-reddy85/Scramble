
export default {
  testEnvironment: 'node',

  transform: {},

  testMatch: ['**/tests/**/*.test.js'],

  testTimeout: 10000,

  verbose: true,

  testEnvironmentOptions: {
    env: { NODE_ENV: 'test' },
  },

  collectCoverageFrom: [
    'routes/**/*.js',
    'app.js',
    '!**/node_modules/**',
  ],
};

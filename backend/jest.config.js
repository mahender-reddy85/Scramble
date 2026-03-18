/**
 * Jest configuration for ESM (the project uses "type": "module").
 * Tests are run with the Node experimental VM modules flag — see
 * the "test" script in package.json.
 */
export default {
  testEnvironment: 'node',
  // Transform nothing — let Node handle ESM natively
  transform: {},
  // Where to look for tests
  testMatch: ['**/tests/**/*.test.js'],
  // How long a single test suite can run (ms)
  testTimeout: 10000,
  // Show each individual test result
  verbose: true,
  // Ensure rate limiters and other NODE_ENV guards behave correctly
  testEnvironmentOptions: {
    env: { NODE_ENV: 'test' },
  },
  // Collect coverage from source files only (not node_modules / tests)
  collectCoverageFrom: [
    'routes/**/*.js',
    'app.js',
    '!**/node_modules/**',
  ],
};

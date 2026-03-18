/**
 * __mocks__/db.js
 *
 * Manual mock for the pg pool used by all route handlers.
 * Jest automatically picks this up when any module does `import pool from '../db.js'`
 * because the mock file lives alongside db.js inside __mocks__/.
 *
 * Each test file controls what pool.query() resolves to via:
 *   pool.query.mockResolvedValueOnce({ rows: [...] });
 */
import { jest } from '@jest/globals';

const pool = {
  query: jest.fn(),
  end: jest.fn().mockResolvedValue(undefined),
};

export default pool;

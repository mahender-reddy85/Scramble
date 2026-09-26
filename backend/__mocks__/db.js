import { jest } from '@jest/globals';

const pool = {
  query: jest.fn(),
  end: jest.fn().mockResolvedValue(undefined),
};

export default pool;

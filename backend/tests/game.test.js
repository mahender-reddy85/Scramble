/**
 * tests/game.test.js
 * Game API — word bank, room creation / joining, leaderboard, health check.
 */
import { jest } from '@jest/globals';

// ── Mock the database BEFORE importing the app ────────────────────────────────
jest.unstable_mockModule('../db.js', async () => {
  const { default: pool } = await import('../__mocks__/db.js');
  return { default: pool };
});

const { default: pool } = await import('../__mocks__/db.js');
const { createApp } = await import('../app.js');
const { default: request } = await import('supertest');
const { default: jwt } = await import('jsonwebtoken');

// ── Helpers ───────────────────────────────────────────────────────────────────
let app;
let authToken;
const TEST_USER = { id: 'user-test-1', username: 'player1' };

beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  app = createApp();
  authToken = jwt.sign(TEST_USER, process.env.JWT_SECRET, { expiresIn: '1h' });
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── /api/health ───────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns status OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body).toHaveProperty('timestamp');
  });
});

// ── /api/game/words/:difficulty ───────────────────────────────────────────────
describe('GET /api/game/words/:difficulty', () => {
  it('returns word list for easy difficulty', async () => {
    const res = await request(app).get('/api/game/words/easy');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.words)).toBe(true);
    expect(res.body.words.length).toBeGreaterThan(0);
    expect(res.body.words[0]).toHaveProperty('word');
    expect(res.body.words[0]).toHaveProperty('hint');
  });

  it('returns word list for medium difficulty', async () => {
    const res = await request(app).get('/api/game/words/medium');
    expect(res.statusCode).toBe(200);
    expect(res.body.words.length).toBeGreaterThan(0);
  });

  it('returns word list for hard difficulty', async () => {
    const res = await request(app).get('/api/game/words/hard');
    expect(res.statusCode).toBe(200);
    expect(res.body.words.length).toBeGreaterThan(0);
  });

  it('returns 400 for invalid difficulty', async () => {
    const res = await request(app).get('/api/game/words/impossible');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid difficulty');
  });
});

// ── /api/game/leaderboard ─────────────────────────────────────────────────────
describe('GET /api/game/leaderboard', () => {
  it('returns leaderboard array', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { username: 'player1', total_score: 500, games_played: 10, games_won: 6 },
        { username: 'player2', total_score: 350, games_played: 8, games_won: 3 },
      ],
    });

    const res = await request(app)
      .get('/api/game/leaderboard')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.leaderboard)).toBe(true);
    expect(res.body.leaderboard[0].username).toBe('player1');
  });
});

// ── /api/game/rooms ───────────────────────────────────────────────────────────
describe('GET /api/game/rooms', () => {
  it('returns available waiting rooms', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 'room-1', room_code: '1234', difficulty: 'easy', status: 'waiting', player_count: '1' },
      ],
    });

    const res = await request(app)
      .get('/api/game/rooms')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.rooms)).toBe(true);
  });
});

describe('POST /api/game/rooms', () => {
  it('creates a room and returns roomId + roomCode', async () => {
    // 1) room code uniqueness check — not taken
    pool.query
      .mockResolvedValueOnce({ rows: [] })   // SELECT id FROM game_rooms (code check)
      .mockResolvedValueOnce({ rows: [] });  // INSERT INTO game_rooms

    const res = await request(app)
      .post('/api/game/rooms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ difficulty: 'easy' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('roomId');
    expect(res.body).toHaveProperty('roomCode');
    expect(res.body.roomCode).toMatch(/^\d{4}$/);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/game/rooms')
      .send({ difficulty: 'easy' });

    expect(res.statusCode).toBe(401);
  });
});

// ── /api/game/rooms/:roomId/join ──────────────────────────────────────────────
describe('POST /api/game/rooms/:roomId/join', () => {
  it('returns 404 when room does not exist or is not waiting', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // room not found

    const res = await request(app)
      .post('/api/game/rooms/nonexistent-room/join')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ playerName: 'player1' });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Room not found or not available');
  });

  it('returns 400 when room is already full', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'room-1', status: 'waiting' }] }) // room exists
      .mockResolvedValueOnce({ rows: [{ count: '2' }] });                     // 2 participants

    const res = await request(app)
      .post('/api/game/rooms/room-1/join')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ playerName: 'player1' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Room is full');
  });

  it('returns 400 when user already joined the room', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'room-1', status: 'waiting' }] }) // room exists
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })                      // 1 participant
      .mockResolvedValueOnce({ rows: [{ id: 'p-1' }] });                      // already joined

    const res = await request(app)
      .post('/api/game/rooms/room-1/join')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ playerName: 'player1' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Already joined this room');
  });
});

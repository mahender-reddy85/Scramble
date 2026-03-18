/**
 * tests/auth.test.js
 * Auth API — register, login, /me, and input-validation tests.
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

// ── Test setup ────────────────────────────────────────────────────────────────
let app;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  app = createApp();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── /api/auth/register ────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('registers a new user successfully', async () => {
    // No existing user found → empty rows
    pool.query
      .mockResolvedValueOnce({ rows: [] })       // SELECT id FROM users (duplicate check)
      .mockResolvedValueOnce({ rows: [] });       // INSERT INTO users

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ username: 'testuser' });
  });

  it('returns 400 when user already exists', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('User already exists');
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', email: 'not-an-email', password: 'password123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 400 when password is too short (< 6 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', email: 'test@example.com', password: '123' });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when username is too short (< 3 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', email: 'test@example.com', password: 'password123' });

    expect(res.statusCode).toBe(400);
  });
});

// ── /api/auth/login ───────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    // bcryptjs hashes "password123" — pre-generate for the mock
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.default.hash('password123', 10);

    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'user-1', username: 'testuser', password_hash: hash }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe('testuser');
  });

  it('returns 400 for wrong password', async () => {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.default.hash('correctpassword', 10);

    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'user-1', username: 'testuser', password_hash: hash }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid password');
  });

  it('returns 400 when user does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('User not found');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad-email', password: 'password123' });

    expect(res.statusCode).toBe(400);
  });
});

// ── /api/auth/me ──────────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('returns the user when given a valid JWT', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { id: 'user-1', username: 'testuser' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'user-1', username: 'testuser', avatar_url: null }],
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.username).toBe('testuser');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for a tampered / invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.invalid');
    expect(res.statusCode).toBe(403);
  });
});

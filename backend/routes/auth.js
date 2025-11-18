import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../db.js';

const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('username').isLength({ min: 3 }).trim()
], async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, username } = req.body;

  try {
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = `${Date.now()}`;

    // Insert user
    await pool.query(
      'INSERT INTO users (id, email, password_hash, username) VALUES ($1, $2, $3, $4)',
      [userId, email, hashedPassword, username]
    );

    // Insert profile
    await pool.query(
      'INSERT INTO profiles (id, username) VALUES ($1, $2)',
      [userId, username]
    );

    // Generate token
    const token = jwt.sign(
      { id: userId, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ token, user: { id: userId, username } });

  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: 'Server error' });
  }
});


// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const users = await pool.query(
      'SELECT id, username, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (users.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = users.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ token, user: { id: user.id, username: user.username } });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: 'Server error' });
  }
});


// Get current user
router.get('/me', async (req, res) => {

  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, username, avatar_url FROM profiles WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    return res.json({ user: result.rows[0] });

  } catch (err) {
    console.error(err);
    return res.status(403).json({ error: "Invalid token" });
  }
});

export default router;

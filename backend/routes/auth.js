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
  body('username').isLength({ min: 3 }).trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, username } = req.body;

  try {
    // Check if user exists
    const [existing] = await pool.execute(
      'SELECT id FROM profiles WHERE id = ? OR username = ?',
      [email, username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (simplified - in real app, you'd have a users table)
    await pool.execute(
      'INSERT INTO profiles (id, username) VALUES (?, ?)',
      [email, username]
    );

    // Generate token
    const token = jwt.sign({ id: email, username }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({ token, user: { id: email, username } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
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
    // In a real app, you'd check against a users table with passwords
    // For now, we'll just check if the profile exists
    const [users] = await pool.execute(
      'SELECT id, username FROM profiles WHERE id = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Generate token (simplified auth)
    const token = jwt.sign(
      { id: users[0].id, username: users[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: users[0] });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await pool.execute(
      'SELECT id, username, avatar_url FROM profiles WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
});

export default router;

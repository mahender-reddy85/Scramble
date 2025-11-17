import express from 'express';
import pool from '../db.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT * FROM leaderboard_stats
      ORDER BY total_score DESC
      LIMIT 50
    `);
    res.json({ leaderboard: rows });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get game rooms
router.get('/rooms', optionalAuth, async (req, res) => {
  try {
    const [rooms] = await pool.execute(`
      SELECT gr.*, p.username as creator_name,
             COUNT(gp.id) as player_count
      FROM game_rooms gr
      LEFT JOIN profiles p ON gr.created_by = p.id
      LEFT JOIN game_participants gp ON gr.id = gp.room_id
      WHERE gr.status = 'waiting'
      GROUP BY gr.id, p.username
      ORDER BY gr.created_at DESC
    `);
    res.json({ rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create game room
router.post('/rooms', authenticateToken, async (req, res) => {
  const { difficulty } = req.body;
  const userId = req.user.id;

  try {
    // Generate unique room code
    let roomCode;
    let exists = true;
    while (exists) {
      roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const [check] = await pool.execute(
        'SELECT id FROM game_rooms WHERE room_code = ?',
        [roomCode]
      );
      exists = check.length > 0;
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pool.execute(
      'INSERT INTO game_rooms (id, room_code, created_by, difficulty) VALUES (?, ?, ?, ?)',
      [roomId, roomCode, userId, difficulty]
    );

    res.status(201).json({ roomId, roomCode });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join game room
router.post('/rooms/:roomId/join', authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const { playerName } = req.body;
  const userId = req.user.id;

  try {
    // Check if room exists and is waiting
    const [rooms] = await pool.execute(
      'SELECT * FROM game_rooms WHERE id = ? AND status = "waiting"',
      [roomId]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Room not found or not available' });
    }

    // Check if user is already in the room
    const [existing] = await pool.execute(
      'SELECT id FROM game_participants WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already joined this room' });
    }

    // Join room
    const participantId = `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await pool.execute(
      'INSERT INTO game_participants (id, room_id, user_id, player_name) VALUES (?, ?, ?, ?)',
      [participantId, roomId, userId, playerName]
    );

    res.json({ participantId });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update ready status
router.patch('/rooms/:roomId/ready', authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const { isReady } = req.body;
  const userId = req.user.id;

  try {
    await pool.execute(
      'UPDATE game_participants SET is_ready = ? WHERE room_id = ? AND user_id = ?',
      [isReady, roomId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update ready status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start game
router.post('/rooms/:roomId/start', authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    // Check if user is the creator
    const [rooms] = await pool.execute(
      'SELECT created_by FROM game_rooms WHERE id = ?',
      [roomId]
    );

    if (rooms.length === 0 || rooms[0].created_by !== userId) {
      return res.status(403).json({ error: 'Only room creator can start the game' });
    }

    // Check if all players are ready
    const [participants] = await pool.execute(
      'SELECT COUNT(*) as total, SUM(is_ready) as ready FROM game_participants WHERE room_id = ?',
      [roomId]
    );

    if (participants[0].total !== participants[0].ready) {
      return res.status(400).json({ error: 'All players must be ready' });
    }

    // Start game
    await pool.execute(
      'UPDATE game_rooms SET status = "active", started_at = NOW() WHERE id = ?',
      [roomId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit answer
router.post('/rooms/:roomId/answer', authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const { word, isCorrect, points } = req.body;
  const userId = req.user.id;

  try {
    // Record the event
    await pool.execute(
      'INSERT INTO game_events (room_id, user_id, event_type, current_word, is_correct, points_earned) VALUES (?, ?, "answer_submitted", ?, ?, ?)',
      [roomId, userId, word, isCorrect, points]
    );

    // Update score if correct
    if (isCorrect) {
      await pool.execute(
        'UPDATE game_participants SET score = score + ?, current_streak = current_streak + 1 WHERE room_id = ? AND user_id = ?',
        [points, roomId, userId]
      );
    } else {
      await pool.execute(
        'UPDATE game_participants SET current_streak = 0 WHERE room_id = ? AND user_id = ?',
        [roomId, userId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get room details
router.get('/rooms/:roomId', optionalAuth, async (req, res) => {
  const { roomId } = req.params;

  try {
    const [rooms] = await pool.execute(`
      SELECT gr.*, p.username as creator_name
      FROM game_rooms gr
      LEFT JOIN profiles p ON gr.created_by = p.id
      WHERE gr.id = ?
    `, [roomId]);

    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const [participants] = await pool.execute(`
      SELECT gp.*, p.username, p.avatar_url
      FROM game_participants gp
      LEFT JOIN profiles p ON gp.user_id = p.id
      WHERE gp.room_id = ?
      ORDER BY gp.joined_at
    `, [roomId]);

    res.json({
      room: rooms[0],
      participants
    });
  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

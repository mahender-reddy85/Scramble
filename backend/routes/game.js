import express from 'express';
import pool from '../db.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import crypto from 'crypto';
import { wordBanks, scrambleWord } from '../utils/wordBanks.js';

const router = express.Router();

// Get words by difficulty
router.get('/words/:difficulty', async (req, res) => {
  const { difficulty } = req.params;

  if (!wordBanks[difficulty]) {
    return res.status(400).json({ error: 'Invalid difficulty' });
  }

  res.json({ words: wordBanks[difficulty] });
});

// Get game rooms
router.get('/rooms', optionalAuth, async (req, res) => {
  try {
    const rooms = await pool.query(`
      SELECT gr.*, p.username as creator_name,
             COUNT(gp.id) as player_count
      FROM game_rooms gr
      LEFT JOIN users p ON gr.created_by = p.id
      LEFT JOIN game_participants gp ON gr.id = gp.room_id
      WHERE gr.status = 'waiting'
      GROUP BY gr.id, p.username
      ORDER BY gr.created_at DESC
    `);
    res.json({ rooms: rooms.rows });
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
    // Generate unique 4-digit numeric room code
    let roomCode;
    let exists = true;
    while (exists) {
      roomCode = Math.floor(1000 + Math.random() * 9000).toString();
      const check = await pool.query(
        'SELECT id FROM game_rooms WHERE room_code = $1',
        [roomCode]
      );
      exists = check.rows.length > 0;
    }

    const roomId = crypto.randomUUID();

    await pool.query(
      'INSERT INTO game_rooms (id, room_code, created_by, difficulty) VALUES ($1, $2, $3, $4)',
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
    const rooms = await pool.query(
      'SELECT * FROM game_rooms WHERE id = $1 AND status = $2',
      [roomId, 'waiting']
    );

    if (rooms.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found or not available' });
    }

    // Check current participant count
    const participantCount = await pool.query(
      'SELECT COUNT(*) as count FROM game_participants WHERE room_id = $1',
      [roomId]
    );

    if (participantCount.rows[0].count >= 2) {
      return res.status(400).json({ error: 'Room is full' });
    }

    // Check if user is already in the room
    const existing = await pool.query(
      'SELECT id FROM game_participants WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already joined this room' });
    }

    // Join room
    const participantId = crypto.randomUUID();
    await pool.query(
      'INSERT INTO game_participants (id, room_id, user_id, player_name) VALUES ($1, $2, $3, $4)',
      [participantId, roomId, userId, playerName]
    );

    // Get updated participants and broadcast to room
    const updatedParticipants = await pool.query(`
      SELECT gp.id, gp.player_name, gp.is_ready, gp.user_id
      FROM game_participants gp
      WHERE gp.room_id = $1
      ORDER BY gp.joined_at
    `, [roomId]);

    const io = req.app.get('io');
    io.to(roomId).emit('participantsUpdated', updatedParticipants.rows);

    res.json({ participantId });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update ready status
router.patch('/rooms/:roomId/ready', authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const { is_ready } = req.body;
  const userId = req.user.id;

  try {
    await pool.query(
      'UPDATE game_participants SET is_ready = $1 WHERE room_id = $2 AND user_id = $3',
      [is_ready, roomId, userId]
    );

    // Get updated participants and broadcast to room
    const updatedParticipants = await pool.query(`
      SELECT gp.id, gp.player_name, gp.is_ready, gp.user_id
      FROM game_participants gp
      WHERE gp.room_id = $1
      ORDER BY gp.joined_at
    `, [roomId]);

    const io = req.app.get('io');
    io.to(roomId).emit('participantsUpdated', updatedParticipants.rows);

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
    const rooms = await pool.query(
      'SELECT created_by FROM game_rooms WHERE id = $1',
      [roomId]
    );

    if (rooms.rows.length === 0 || rooms.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Only room creator can start the game' });
    }

    // Check if all players are ready
    const participants = await pool.query(`
      SELECT COUNT(*)::int AS total,
             COALESCE(SUM(CASE WHEN is_ready = TRUE THEN 1 ELSE 0 END), 0)::int AS ready
      FROM game_participants
      WHERE room_id = $1
    `, [roomId]);

    if (participants.rows[0].total !== participants.rows[0].ready || participants.rows[0].total < 2) {
      return res.status(400).json({ error: 'All players must be ready and at least 2 players required' });
    }

    // Start game
    await pool.query(
      'UPDATE game_rooms SET status = $1, started_at = NOW() WHERE id = $2',
      ['active', roomId]
    );

    // Get room difficulty
    const roomData = await pool.query(
      'SELECT difficulty FROM game_rooms WHERE id = $1',
      [roomId]
    );

    const difficulty = roomData.rows[0]?.difficulty || 'easy';

    // Send response immediately
    res.json({ success: true });

    // Emit countdown and first word via socket.io (non-blocking)
    const io = req.app.get('io');

    // Send initial "get ready" event
    io.to(roomId).emit('gameStarting');

    // Send countdown: 3, 2, 1
    setTimeout(() => {
      io.to(roomId).emit('countdown', { countdown: 3 });
    }, 100);

    setTimeout(() => {
      io.to(roomId).emit('countdown', { countdown: 2 });
    }, 1100);

    setTimeout(() => {
      io.to(roomId).emit('countdown', { countdown: 1 });
    }, 2100);

    // Send first word after countdown finishes
    setTimeout(() => {
      const words = wordBanks[difficulty] || wordBanks.easy;
      const randomIndex = Math.floor(Math.random() * words.length);
      const wordItem = words[randomIndex];
      const scrambled = scrambleWord(wordItem.word);

      io.to(roomId).emit('newWord', {
        word: wordItem.word,
        hint: wordItem.hint,
        scrambled: scrambled,
        round: 1
      });
    }, 3100);
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
    await pool.query(
      'INSERT INTO game_events (room_id, user_id, event_type, current_word, is_correct, points_earned) VALUES ($1, $2, $3, $4, $5, $6)',
      [roomId, userId, 'answer_submitted', word, isCorrect, points]
    );

    // Update score if correct
    if (isCorrect) {
      await pool.query(
        'UPDATE game_participants SET score = score + $1, current_streak = current_streak + 1 WHERE room_id = $2 AND user_id = $3',
        [points, roomId, userId]
      );
    } else {
      await pool.query(
        'UPDATE game_participants SET current_streak = 0 WHERE room_id = $1 AND user_id = $2',
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
    const rooms = await pool.query(`
      SELECT gr.*, p.username as creator_name
      FROM game_rooms gr
      LEFT JOIN users p ON gr.created_by = p.id
      WHERE gr.id = $1
    `, [roomId]);

    if (rooms.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const participants = await pool.query(`
      SELECT gp.id, COALESCE(gp.player_name, p.username) as player_name, gp.is_ready, gp.user_id
      FROM game_participants gp
      LEFT JOIN users p ON gp.user_id = p.id
      WHERE gp.room_id = $1
      ORDER BY gp.joined_at
    `, [roomId]);

    res.json({
      room: rooms.rows[0],
      participants: participants.rows
    });
  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get participants for a room
router.get('/participants/:roomId', optionalAuth, async (req, res) => {
  const { roomId } = req.params;

  try {
    const participants = await pool.query(`
      SELECT gp.*, p.username, p.avatar_url
      FROM game_participants gp
      LEFT JOIN users p ON gp.user_id = p.id
      WHERE gp.room_id = $1
      ORDER BY gp.score DESC
    `, [roomId]);

    res.json(participants.rows);
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update participant
router.put('/participants/:participantId', authenticateToken, async (req, res) => {
  const { participantId } = req.params;
  const { score, current_streak } = req.body;

  try {
    await pool.query(
      'UPDATE game_participants SET score = $1, current_streak = $2 WHERE id = $3',
      [score, current_streak, participantId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update participant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Log game event
router.post('/events', authenticateToken, async (req, res) => {
  const { 
    roomId, room_id, 
    userId, user_id, 
    word, current_word, 
    isCorrect, is_correct, 
    points, points_earned,
    event_type
  } = req.body;

  const real_room_id = roomId || room_id;
  const real_user_id = userId || user_id;
  const real_wordBuffer = word || current_word;
  const real_is_correct = isCorrect !== undefined ? isCorrect : is_correct;
  const real_points = points !== undefined ? points : points_earned;
  const real_event_type = event_type || 'answer_submitted';

  const eventId = crypto.randomUUID();

  try {
    await pool.query(
      `INSERT INTO game_events (id, room_id, user_id, event_type, current_word, is_correct, points_earned)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [eventId, real_room_id, real_user_id, real_event_type, real_wordBuffer, real_is_correct, real_points]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Log event error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/rooms/:roomId', authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const { status, finished_at } = req.body;

  try {
    await pool.query(
      'UPDATE game_rooms SET status = $1, finished_at = $2 WHERE id = $3',
      [status, finished_at, roomId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update room status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

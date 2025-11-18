import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import pool from './db.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:8080", // Vite dev server
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Scramble Game API Server', status: 'running' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io for real-time multiplayer
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', async (data) => {
    const { roomId, userId, playerName } = data;

    try {
      socket.join(roomId);

      // Get room info
      const roomData = await pool.query(`
        SELECT gr.*, COUNT(gp.id) as player_count
        FROM game_rooms gr
        LEFT JOIN game_participants gp ON gr.id = gp.room_id
        WHERE gr.id = $1
        GROUP BY gr.id
      `, [roomId]);

      if (roomData.rows.length === 0) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Get participants
      const participants = await pool.query(`
        SELECT gp.*, p.username
        FROM game_participants gp
        LEFT JOIN profiles p ON gp.user_id = p.id
        WHERE gp.room_id = $1
        ORDER BY gp.joined_at
      `, [roomId]);

      socket.emit('room-joined', {
        room: roomData.rows[0],
        participants: participants.rows
      });

      // Notify others
      socket.to(roomId).emit('participant-joined', {
        userId,
        playerName,
        participants: participants.rows
      });

    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('start-game', async (data) => {
    const { roomId } = data;

    try {
      // Update room status
      await pool.query(
        'UPDATE game_rooms SET status = $1, started_at = NOW() WHERE id = $2',
        ['active', roomId]
      );

      // Notify all players in room
      io.to(roomId).emit('game-started', {
        message: 'Game has started!',
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Start game error:', error);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  socket.on('submit-answer', async (data) => {
    const { roomId, userId, word, isCorrect, points } = data;

    try {
      // Record the event
      await pool.query(
        'INSERT INTO game_events (room_id, user_id, event_type, current_word, is_correct, points_earned) VALUES ($1, $2, $3, $4, $5, $6)',
        [roomId, userId, 'answer_submitted', word, isCorrect, points]
      );

      // Update score
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

      // Get updated scores
      const participants = await pool.query(`
        SELECT gp.*, p.username
        FROM game_participants gp
        LEFT JOIN profiles p ON gp.user_id = p.id
        WHERE gp.room_id = $1
        ORDER BY gp.score DESC
      `, [roomId]);

      // Notify all players
      io.to(roomId).emit('answer-submitted', {
        userId,
        word,
        isCorrect,
        points,
        participants: participants.rows
      });

    } catch (error) {
      console.error('Submit answer error:', error);
      socket.emit('error', { message: 'Failed to submit answer' });
    }
  });

  socket.on('leave-room', (data) => {
    const { roomId, userId } = data;
    socket.leave(roomId);
    socket.to(roomId).emit('participant-left', { userId });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

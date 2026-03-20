import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from './db.js';
import { createApp } from './app.js';
import { wordBanks, scrambleWord } from './utils/wordBanks.js';

dotenv.config();

const io = new Server(http.createServer(), {
  cors: {
    origin: ["http://localhost:8080", "https://scramble-eta.vercel.app"],
    methods: ["GET", "POST"]
  }
});

const app = createApp(io);
const server = http.createServer(app);

// Re-attach io to the real http server
io.attach(server);

// Root and health routes are registered inside createApp()

// Socket.io for real-time multiplayer
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', async (data) => {
    const { roomId, userId, playerName, token } = data;

    // Verify token
    if (!token) {
      socket.emit('error', { message: 'No token provided' });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.id !== userId) {
        socket.emit('error', { message: 'Invalid token' });
        return;
      }

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
        SELECT gp.id, gp.player_name, gp.is_ready, gp.user_id
        FROM game_participants gp
        WHERE gp.room_id = $1
        ORDER BY gp.joined_at
      `, [roomId]);

      // Emit current participants to the joining user
      socket.emit('participantsUpdated', participants.rows);

      // Notify others with updated participants
      socket.to(roomId).emit('participant-joined', {
        userId,
        playerName,
        participants: participants.rows
      });

      // Check if game is active and sync current state
      if (roomData.rows[0].status === 'active') {
        const currentRound = await pool.query('SELECT current_round FROM game_rooms WHERE id = $1', [roomId]);
        socket.emit('game-sync', {
          currentRound: currentRound.rows[0]?.current_round || 0,
          participants: participants.rows
        });
      }

    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
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
        SELECT gp.*, p.username as player_name
        FROM game_participants gp
        LEFT JOIN users p ON gp.user_id = p.id
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

      // Check if we need to send next word (after a delay)
      setTimeout(async () => {
        try {
          // Get current round
          const roomData = await pool.query('SELECT current_round, difficulty FROM game_rooms WHERE id = $1', [roomId]);
          const currentRound = roomData.rows[0]?.current_round || 0;
          const difficulty = roomData.rows[0]?.difficulty || 'easy';

          if (currentRound < 10) { // Assuming 10 rounds max
            // Select next word
            const words = wordBanks[difficulty];
            const randomIndex = Math.floor(Math.random() * words.length);
            const wordItem = words[randomIndex];
            const scrambled = scrambleWord(wordItem.word);

            // Update round
            await pool.query('UPDATE game_rooms SET current_round = current_round + 1 WHERE id = $1', [roomId]);

            // Send next word to all players
            io.to(roomId).emit('newWord', {
              word: wordItem.word,
              hint: wordItem.hint,
              scrambled: scrambled,
              round: currentRound + 1
            });
          } else {
            // Game ended
            const winner = participants.rows[0];
            io.to(roomId).emit('gameEnded', { winner });
          }
        } catch (error) {
          console.error('Error sending next word:', error);
        }
      }, 2500); // Delay before next word

    } catch (error) {
      console.error('Submit answer error:', error);
      socket.emit('error', { message: 'Failed to submit answer' });
    }
  });

  socket.on('toggle-ready', async (data) => {
    const { roomId, userId, is_ready } = data;

    try {
      // Update ready status in database
      await pool.query(
        'UPDATE game_participants SET is_ready = $1 WHERE room_id = $2 AND user_id = $3',
        [is_ready, roomId, userId]
      );

      // Get updated participants with COALESCE for player_name
      const participants = await pool.query(`
        SELECT gp.id, COALESCE(gp.player_name, p.username) as player_name, gp.is_ready, gp.user_id
        FROM game_participants gp
        LEFT JOIN users p ON gp.user_id = p.id
        WHERE gp.room_id = $1
        ORDER BY gp.joined_at
      `, [roomId]);

      // Notify all players in room
      io.to(roomId).emit('participantsUpdated', participants.rows);

    } catch (error) {
      console.error('Toggle ready error:', error);
      socket.emit('error', { message: 'Failed to update ready status' });
    }
  });

const playerFinishedStatus = new Map(); // RoomId -> Map(UserId -> Boolean)

socket.on('player-finished', async (data) => {
    const { roomId, userId } = data;

    try {
      // Record completion in memory (resilient to DB failure)
      if (!playerFinishedStatus.has(roomId)) {
        playerFinishedStatus.set(roomId, new Map());
      }
      playerFinishedStatus.get(roomId).set(userId, true);

      // Record completion in database (still attempted)
      try {
        await pool.query(
          'UPDATE game_participants SET rounds_completed = 10 WHERE room_id = $1 AND user_id = $2',
          [roomId, userId]
        );
      } catch (dbErr) {
        console.error('DB update rounds_completed failed, falling back to memory:', dbErr.message);
      }

      // Check consensus
      const roomPlayers = await pool.query(
        'SELECT user_id FROM game_participants WHERE room_id = $1',
        [roomId]
      );

      const finishedInRoom = playerFinishedStatus.get(roomId);
      const allDone = roomPlayers.rows.every(p => finishedInRoom.get(p.user_id));
      
      if (allDone) {
        const participants = await pool.query(`
          SELECT gp.*, p.username as player_name
          FROM game_participants gp
          LEFT JOIN users p ON gp.user_id = p.id
          WHERE gp.room_id = $1
          ORDER BY gp.score DESC
        `, [roomId]);

        const winner = participants.rows[0];
        
        try {
          await pool.query(
            'UPDATE game_rooms SET status = $1, finished_at = NOW() WHERE id = $2',
            ['finished', roomId]
          );
        } catch (dbErr) { console.error('Failed to update room status:', dbErr.message); }

        io.to(roomId).emit('game-ended', { winner, participants: participants.rows });
        playerFinishedStatus.delete(roomId); // Clean up
      } else {
        socket.emit('waiting-for-others');
        socket.to(roomId).emit('player-waiting', { userId });
      }
    } catch (error) {
      console.error('Player finished error:', error);
      // Even if logic fails, let's at least tell the user they are waiting
      socket.emit('waiting-for-others');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

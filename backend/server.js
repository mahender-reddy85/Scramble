import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import pool from './db.js';
import { createApp } from './app.js';
import { wordBanks, scrambleWord } from './utils/wordBanks.js';
import { GAME_CONFIG } from './utils/gameConfig.js';
import { getRoomState, setRoomState, deleteRoomState } from './utils/roomState.js';

dotenv.config();

const server = http.createServer();
const clientUrl = process.env.CLIENT_URL;
const allowedOrigins = [
  'http://localhost:5173',
  'https://scramble-eta.vercel.app',
  ...(clientUrl ? [clientUrl] : [])
];

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const app = createApp(io);
server.on('request', app);

async function endGame(roomId, socketIo) {
  try {
    const participants = await pool.query(`
      SELECT gp.*, p.username as player_name
      FROM game_participants gp
      LEFT JOIN users p ON gp.user_id = p.id
      WHERE gp.room_id = $1
      ORDER BY gp.score DESC
    `, [roomId]);

    if (participants.rows.length === 0) return;

    const winner = participants.rows[0];

    try {
      await pool.query(
        'UPDATE game_rooms SET status = $1, finished_at = NOW() WHERE id = $2',
        ['finished', roomId]
      );
    } catch (dbErr) {
      console.error('Failed to update room status:', dbErr.message);
    }

    socketIo.to(roomId).emit('game-ended', { winner, participants: participants.rows });
    socketIo.to(roomId).emit('gameEnded', { winner, participants: participants.rows });
    deleteRoomState(roomId);
  } catch (err) {
    console.error('End game logic failure:', err);
  }
}

export async function sendNewWord(roomId, socketIo) {
  try {
    const roomData = await pool.query('SELECT current_round, difficulty FROM game_rooms WHERE id = $1', [roomId]);
    if (roomData.rows.length === 0) return;

    const difficulty = roomData.rows[0].difficulty || 'easy';
    const currentRound = roomData.rows[0].current_round || 0;
    const nextRound = currentRound + 1;

    if (nextRound > GAME_CONFIG.rounds) {
      await endGame(roomId, socketIo);
      return;
    }

    const words = wordBanks[difficulty] || wordBanks.easy;
    const randomIndex = Math.floor(Math.random() * words.length);
    const wordItem = words[randomIndex];
    const scrambled = scrambleWord(wordItem.word);

    await pool.query('UPDATE game_rooms SET current_round = $1 WHERE id = $2', [nextRound, roomId]);

    const state = setRoomState(roomId, {
      currentWord: wordItem.word,
      currentHint: wordItem.hint,
      currentRound: nextRound,
      locked: false
    });

    socketIo.to(roomId).emit('newWord', {
      word: wordItem.word,
      hint: wordItem.hint,
      scrambled: scrambled,
      round: nextRound,
      totalRounds: GAME_CONFIG.rounds
    });

    if (state.roundTimer) {
      clearTimeout(state.roundTimer);
    }

    state.roundTimer = setTimeout(async () => {
      try {
        const currentState = getRoomState(roomId);
        if (currentState.currentRound === nextRound && !currentState.locked) {
          currentState.locked = true;
          socketIo.to(roomId).emit('round-timeout', {
            word: currentState.currentWord,
            round: nextRound
          });

          setTimeout(async () => {
            await sendNewWord(roomId, socketIo);
          }, 2500);
        }
      } catch (err) {
        console.error('Round timer error:', err);
      }
    }, (GAME_CONFIG.roundTime + 4) * 1000);
  } catch (error) {
    console.error('sendNewWord error:', error);
  }
}

io.sendNewWord = (roomId) => sendNewWord(roomId, io);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', async (data) => {
    const { roomId, userId, playerName, token } = data;

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
      socket.userId = decoded.id;

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

      const participants = await pool.query(`
        SELECT
          gp.id,
          COALESCE(gp.player_name, p.username) AS player_name,
          gp.user_id,
          gp.score,
          gp.current_streak,
          gp.is_ready
        FROM game_participants gp
        LEFT JOIN users p ON gp.user_id = p.id
        WHERE gp.room_id = $1
        ORDER BY gp.score DESC, gp.joined_at ASC
      `, [roomId]);

      socket.emit('participantsUpdated', participants.rows);

      socket.to(roomId).emit('participant-joined', {
        userId,
        playerName,
        participants: participants.rows
      });

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
    const { roomId, word, timeRemaining } = data;
    const userId = socket.userId;
    const roomState = getRoomState(roomId);
    const currentWord = roomState.currentWord;
    const isCorrect = currentWord && word && (word.toUpperCase() === currentWord.toUpperCase());

    try {
      const roomData = await pool.query('SELECT current_round, difficulty FROM game_rooms WHERE id = $1', [roomId]);
      if (roomData.rows.length === 0) return;

      const difficulty = roomData.rows[0].difficulty || 'easy';
      const currentRound = roomData.rows[0].current_round || 0;
      let pointsToAward = 0;

      if (isCorrect) {
        const participantQuery = await pool.query('SELECT current_streak FROM game_participants WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
        const current_streak = participantQuery.rows[0]?.current_streak || 0;
        const basePoints = GAME_CONFIG.basePoints[difficulty] || 5;
        const newStreak = current_streak + 1;
        const streakBonus = newStreak * GAME_CONFIG.streakBonusMultiplier;
        const timeBonus = Number(timeRemaining) || 0;
        pointsToAward = Math.floor(basePoints + streakBonus + timeBonus);
      }

      await pool.query(
        'INSERT INTO game_events (room_id, user_id, event_type, current_word, is_correct, points_earned) VALUES ($1, $2, $3, $4, $5, $6)',
        [roomId, userId, 'answer_submitted', word, isCorrect, pointsToAward]
      );

      if (isCorrect) {
        await pool.query(
          'UPDATE game_participants SET score = score + $1, current_streak = current_streak + 1 WHERE room_id = $2 AND user_id = $3',
          [pointsToAward, roomId, userId]
        );
      } else {
        await pool.query(
          'UPDATE game_participants SET current_streak = 0 WHERE room_id = $1 AND user_id = $2',
          [roomId, userId]
        );
      }

      const participants = await pool.query(`
        SELECT gp.*, COALESCE(gp.player_name, p.username) as player_name
        FROM game_participants gp
        LEFT JOIN users p ON gp.user_id = p.id
        WHERE gp.room_id = $1
        ORDER BY gp.score DESC
      `, [roomId]);

      io.to(roomId).emit('answer-submitted', {
        userId,
        word,
        isCorrect,
        points: pointsToAward,
        participants: participants.rows
      });

      if (isCorrect) {
        if (roomState.locked) return;
        roomState.locked = true;

        if (roomState.roundTimer) {
          clearTimeout(roomState.roundTimer);
          roomState.roundTimer = null;
        }

        setTimeout(async () => {
          await sendNewWord(roomId, io);
        }, 2500);
      }
    } catch (error) {
      console.error('Submit answer error:', error);
      socket.emit('error', { message: 'Failed to submit answer' });
    }
  });

  socket.on('toggle-ready', async (data) => {
    const { roomId, userId, is_ready } = data;

    try {
      await pool.query(
        'UPDATE game_participants SET is_ready = $1 WHERE room_id = $2 AND user_id = $3',
        [is_ready, roomId, userId]
      );

      const participants = await pool.query(`
        SELECT gp.id, COALESCE(gp.player_name, p.username) as player_name, gp.is_ready, gp.user_id
        FROM game_participants gp
        LEFT JOIN users p ON gp.user_id = p.id
        WHERE gp.room_id = $1
        ORDER BY gp.joined_at
      `, [roomId]);

      io.to(roomId).emit('participantsUpdated', participants.rows);
    } catch (error) {
      console.error('Toggle ready error:', error);
      socket.emit('error', { message: 'Failed to update ready status' });
    }
  });

  socket.on('player-finished', async (data) => {
    const { roomId, userId } = data;

    try {
      const roomState = getRoomState(roomId);
      roomState.finishedPlayers.add(String(userId).toLowerCase());

      try {
        await pool.query(
          'UPDATE game_participants SET rounds_completed = $1 WHERE room_id = $2 AND user_id = $3',
          [GAME_CONFIG.rounds, roomId, userId]
        );
      } catch (dbErr) {
        console.error('DB update rounds_completed failed, falling back to memory:', dbErr.message);
      }

      const roomPlayers = await pool.query(
        'SELECT user_id FROM game_participants WHERE room_id = $1',
        [roomId]
      );

      const participantUserIds = roomPlayers.rows.map(p => String(p.user_id).toLowerCase());
      const allDone = participantUserIds.length > 0 && participantUserIds.every(id => roomState.finishedPlayers.has(id));

      if (allDone) {
        await endGame(roomId, io);
      } else {
        socket.emit('waiting-for-others');
        socket.to(roomId).emit('player-waiting', { userId });

        if (!roomState.endTimeoutSet) {
          roomState.endTimeoutSet = true;
          setTimeout(async () => {
            const current = getRoomState(roomId);
            if (current) {
              await endGame(roomId, io);
            }
          }, 15000);
        }
      }
    } catch (error) {
      console.error('Player finished error:', error);
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

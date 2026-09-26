import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import pool from './db.js';
import { createApp } from './app.js';
import { wordBanks, scrambleWord } from './utils/wordBanks.js';
import { GAME_CONFIG } from './utils/gameConfig.js';
import { getRoomState, setRoomState, deleteRoomState } from './utils/roomState.js';
import { isOriginAllowed } from './utils/cors.js';

dotenv.config();

const server = http.createServer();

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
    deleteRoomState(roomId);
  } catch (err) {
    console.error('End game logic failure:', err);
  }
}

async function ensureSchema() {
  try {
    await pool.query('ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1;');
  } catch (err) {
    console.warn('DB schema check note:', err.message);
  }
}
ensureSchema();

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
        userId: decoded.id,
        playerName,
        participants: participants.rows
      });

      if (roomData.rows[0].status === 'active') {
        const roomState = getRoomState(roomId);
        socket.emit('game-sync', {
          currentRound: roomState.currentRound || 1,
          participants: participants.rows
        });
      }
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('submit-answer', async (data) => {
    let userId = socket.userId;
    if (!userId && data?.token) {
      try {
        const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
        userId = decoded.id;
        socket.userId = userId;
      } catch (err) {
        console.warn('Fallback token verification failed:', err.message);
      }
    }
    if (!userId && data?.userId) {
      userId = data.userId;
      socket.userId = userId;
    }
    if (!userId) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }

    const { roomId, word } = data;
    const roomState = getRoomState(roomId);
    const currentWord = roomState.currentWord;
    const isCorrect = Boolean(
      currentWord &&
      word &&
      (word.trim().toUpperCase() === currentWord.trim().toUpperCase())
    );

    try {
      const roomData = await pool.query('SELECT difficulty FROM game_rooms WHERE id = $1', [roomId]);
      if (roomData.rows.length === 0) return;

      const difficulty = roomData.rows[0].difficulty || 'easy';
      const currentRound = roomState.currentRound || 1;
      let pointsToAward = 0;

      if (isCorrect) {
        let current_streak = 0;
        try {
          const participantQuery = await pool.query('SELECT current_streak FROM game_participants WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
          current_streak = participantQuery.rows[0]?.current_streak || 0;
        } catch {}

        const basePoints = GAME_CONFIG.basePoints[difficulty] || 5;
        const newStreak = current_streak + 1;
        const streakBonus = newStreak * GAME_CONFIG.streakBonusMultiplier;

        let timeBonus = 0;
        if (roomState.roundStartedAt) {
          const elapsedSeconds = Math.floor((Date.now() - roomState.roundStartedAt) / 1000);
          timeBonus = Math.max(0, Math.min(GAME_CONFIG.roundTime, GAME_CONFIG.roundTime - elapsedSeconds));
        }

        pointsToAward = Math.floor(basePoints + streakBonus + timeBonus);
      }

      try {
        await pool.query(
          'INSERT INTO game_events (room_id, user_id, event_type, current_word, is_correct, points_earned) VALUES ($1, $2, $3, $4, $5, $6)',
          [roomId, userId, 'answer_submitted', word, isCorrect, pointsToAward]
        );
      } catch (eventErr) {
        console.warn('Game event recording note:', eventErr.message);
      }

      if (isCorrect) {
        try {
          await pool.query(
            'UPDATE game_participants SET score = score + $1, current_streak = current_streak + 1 WHERE room_id = $2 AND user_id = $3',
            [pointsToAward, roomId, userId]
          );
        } catch {}
      } else {
        try {
          await pool.query(
            'UPDATE game_participants SET current_streak = 0 WHERE room_id = $1 AND user_id = $2',
            [roomId, userId]
          );
        } catch {}
      }

      let participantsList = [];
      try {
        const participants = await pool.query(`
          SELECT gp.*, COALESCE(gp.player_name, p.username) as player_name
          FROM game_participants gp
          LEFT JOIN users p ON gp.user_id = p.id
          WHERE gp.room_id = $1
          ORDER BY gp.score DESC
        `, [roomId]);
        participantsList = participants.rows;
      } catch {}

      io.to(roomId).emit('answer-submitted', {
        userId,
        word,
        isCorrect,
        points: pointsToAward,
        participants: participantsList
      });

      if (isCorrect) {
        if (roomState.locked) return;
        roomState.locked = true;

        setTimeout(async () => {
          try {
            if (currentRound < GAME_CONFIG.rounds) {
              const words = wordBanks[difficulty] || wordBanks.easy;
              const randomIndex = Math.floor(Math.random() * words.length);
              const wordItem = words[randomIndex];
              const scrambled = scrambleWord(wordItem.word);
              const nextRound = currentRound + 1;

              try {
                await pool.query('UPDATE game_rooms SET current_round = $1 WHERE id = $2', [nextRound, roomId]);
              } catch {}

              setRoomState(roomId, {
                currentWord: wordItem.word,
                currentHint: wordItem.hint,
                currentRound: nextRound,
                locked: false,
                roundStartedAt: Date.now()
              });

              io.to(roomId).emit('newWord', {
                scrambled: scrambled,
                hint: wordItem.hint,
                length: wordItem.word.length,
                round: nextRound
              });
            } else {
              const winner = participantsList[0];
              io.to(roomId).emit('gameEnded', { winner, participants: participantsList });
              roomState.locked = false;
            }
          } catch (error) {
            console.error('Error sending next word:', error);
            roomState.locked = false;
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Submit answer error:', error);
      socket.emit('error', { message: 'Failed to submit answer' });
    }
  });

  socket.on('round-timeout', async (data) => {
    const { roomId } = data;
    const roomState = getRoomState(roomId);
    if (roomState.locked) return;
    roomState.locked = true;

    try {
      const roomData = await pool.query('SELECT difficulty FROM game_rooms WHERE id = $1', [roomId]);
      if (roomData.rows.length === 0) {
        roomState.locked = false;
        return;
      }

      const difficulty = roomData.rows[0].difficulty || 'easy';
      const currentRound = roomState.currentRound || 1;

      if (currentRound < GAME_CONFIG.rounds) {
        const words = wordBanks[difficulty] || wordBanks.easy;
        const randomIndex = Math.floor(Math.random() * words.length);
        const wordItem = words[randomIndex];
        const scrambled = scrambleWord(wordItem.word);
        const nextRound = currentRound + 1;

        try {
          await pool.query('UPDATE game_rooms SET current_round = $1 WHERE id = $2', [nextRound, roomId]);
        } catch {}

        setRoomState(roomId, {
          currentWord: wordItem.word,
          currentHint: wordItem.hint,
          currentRound: nextRound,
          locked: false,
          roundStartedAt: Date.now()
        });

        io.to(roomId).emit('newWord', {
          scrambled: scrambled,
          hint: wordItem.hint,
          length: wordItem.word.length,
          round: nextRound
        });
      } else {
        await endGame(roomId, io);
        roomState.locked = false;
      }
    } catch (error) {
      console.error('Error handling round timeout:', error);
      roomState.locked = false;
    }
  });

  socket.on('toggle-ready', async (data) => {
    let userId = socket.userId;
    if (!userId && data?.token) {
      try {
        const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
        userId = decoded.id;
        socket.userId = userId;
      } catch {}
    }
    if (!userId && data?.userId) {
      userId = data.userId;
    }
    if (!userId) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    const { roomId, is_ready } = data;

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
    let userId = socket.userId;
    if (!userId && data?.token) {
      try {
        const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
        userId = decoded.id;
        socket.userId = userId;
      } catch {}
    }
    if (!userId && data?.userId) {
      userId = data.userId;
    }
    if (!userId) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    const { roomId } = data;

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

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


io.attach(server);




const rooms = new Map();

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
    
    // Server validates correctness
    const currentWord = global.roomCurrentWords.get(roomId);
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
        
        const basePoints = difficulty === 'hard' ? 10 : (difficulty === 'medium' ? 8 : 5);
        const newStreak = current_streak + 1;
        const streakBonus = newStreak * 3;
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
        if (roomLocks.get(roomId)) return;
        roomLocks.set(roomId, true);
        
        setTimeout(async () => {
          try {
            if (currentRound < 10) { 
              const words = wordBanks[difficulty];
              const randomIndex = Math.floor(Math.random() * words.length);
              const wordItem = words[randomIndex];
              const scrambled = scrambleWord(wordItem.word);

              await pool.query('UPDATE game_rooms SET current_round = current_round + 1 WHERE id = $1', [roomId]);

              global.roomCurrentWords.set(roomId, wordItem.word);
              io.to(roomId).emit('newWord', {
                word: wordItem.word,
                hint: wordItem.hint,
                scrambled: scrambled,
                round: currentRound + 1
              });
            } else {
              const winner = participants.rows[0];
              io.to(roomId).emit('gameEnded', { winner });
            }
            roomLocks.delete(roomId);
          } catch (error) {
            console.error('Error sending next word:', error);
            roomLocks.delete(roomId);
          }
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

const roomLocks = new Map();
global.roomCurrentWords = new Map();
const playerFinishedStatus = new Map(); 

socket.on('player-finished', async (data) => {
    const { roomId, userId } = data;

    try {

      if (!playerFinishedStatus.has(roomId)) {
        playerFinishedStatus.set(roomId, new Map());
      }
      playerFinishedStatus.get(roomId).set(userId, true);


      try {
        await pool.query(
          'UPDATE game_participants SET rounds_completed = 10 WHERE room_id = $1 AND user_id = $2',
          [roomId, userId]
        );
      } catch (dbErr) {
        console.error('DB update rounds_completed failed, falling back to memory:', dbErr.message);
      }


      const roomPlayers = await pool.query(
        'SELECT user_id FROM game_participants WHERE room_id = $1',
        [roomId]
      );

      const finishedInRoom = playerFinishedStatus.get(roomId);
      const finishedUserIds = Array.from(finishedInRoom.keys()).map(id => String(id).toLowerCase());
      const participantUserIds = roomPlayers.rows.map(p => String(p.user_id).toLowerCase());
      

      const allDone = participantUserIds.length > 0 && participantUserIds.every(id => finishedUserIds.includes(id));
      
      console.log(`Room ${roomId}: Participants [${participantUserIds}], Finished [${finishedUserIds}]. allDone: ${allDone}`);
      
      if (allDone) {
        await endGame(roomId, io);
      } else {
        socket.emit('waiting-for-others');
        socket.to(roomId).emit('player-waiting', { userId });
        

        if (!finishedInRoom.get('end_timeout_set')) {
          finishedInRoom.set('end_timeout_set', true);
          setTimeout(async () => {

             const status = playerFinishedStatus.get(roomId);
             if (status) {
                console.log(`Room ${roomId}: Safety timeout reached. Ending game for all.`);
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

async function endGame(roomId, io) {
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
     } catch (dbErr) { console.error('Failed to update room status:', dbErr.message); }

     io.to(roomId).emit('game-ended', { winner, participants: participants.rows });
     playerFinishedStatus.delete(roomId);
  } catch (err) {
    console.error('End game logic failure:', err);
  }
}

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

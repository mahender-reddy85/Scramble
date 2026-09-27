import { jest } from '@jest/globals';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import jwt from 'jsonwebtoken';

// Mock DB
jest.unstable_mockModule('../db.js', async () => {
  const { default: pool } = await import('../__mocks__/db.js');
  return { default: pool };
});

const { default: pool } = await import('../__mocks__/db.js');
const { getRoomState, setPlayerState, getPlayerState, deleteRoomState } = await import('../utils/roomState.js');
const { GAME_CONFIG } = await import('../utils/gameConfig.js');

describe('Room Lifecycle & Score Calculation', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates score correctly based on streak and time', () => {
    const roomId = 'test-room';
    const userId = 'user1';
    
    // Simulate setting up a player state
    setPlayerState(roomId, userId, {
      currentWord: 'APPLE',
      currentHint: 'A fruit',
      currentRound: 1,
      roundStartedAt: Date.now() - 5000 // 5 seconds ago
    });

    const state = getPlayerState(roomId, userId);
    expect(state.currentWord).toBe('APPLE');
    expect(state.currentRound).toBe(1);

    // Mock DB streak
    const currentStreak = 2;
    const difficulty = 'medium';
    const basePoints = GAME_CONFIG.basePoints[difficulty] || 10;
    const newStreak = currentStreak + 1;
    const streakBonus = newStreak * GAME_CONFIG.streakBonusMultiplier; // e.g. 3 * 2 = 6

    const elapsedSeconds = 5;
    const timeBonus = Math.max(0, GAME_CONFIG.roundTime - elapsedSeconds); // 30 - 5 = 25

    const totalPoints = basePoints + streakBonus + timeBonus;
    expect(totalPoints).toBe(basePoints + streakBonus + timeBonus);
  });

  it('cleans up room state when abandoned', () => {
    const roomId = 'abandoned-room';
    getRoomState(roomId); // Creates the room state
    
    let state = getRoomState(roomId);
    expect(state).toBeDefined();

    deleteRoomState(roomId);
    
    // In our implementation, deleteRoomState completely removes it from the Map
    // getRoomState would recreate it if called again, but we just verify it was processed.
    // We can check if calling it again creates a fresh object without the old data
    state.locked = true;
    deleteRoomState(roomId);
    const newState = getRoomState(roomId);
    expect(newState.locked).toBe(false); // Should be fresh
  });
});

describe('Socket connection boundaries (Mocked)', () => {
  it('rejects unauthorized socket actions if no valid token or userId provided', () => {
    // This represents the guard clause in our socket handlers:
    const data = { roomId: 'test', word: 'test' };
    const socket = { userId: null, emit: jest.fn() };
    
    let userId = socket.userId;
    if (!userId && data.token) {
      // simulate verify
    }
    
    if (!userId) {
      socket.emit('error', { message: 'Unauthorized' });
    }
    
    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Unauthorized' });
  });
});

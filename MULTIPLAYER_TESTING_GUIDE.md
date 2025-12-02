# Testing Guide - Multiplayer Game Start

## Setup

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

Expected output:
```
Server running on port 3001
```

### Terminal 2 - Frontend  
```bash
npm run dev
```

Expected output:
```
Local:    http://localhost:8080/
```

---

## Test Scenario: Starting Multiplayer Game

### Step 1: Open Two Browser Windows
- **Browser 1**: `http://localhost:8080` (Player 1 - Host)
- **Browser 2**: `http://localhost:8080` (Player 2 - Participant)

### Step 2: Create Game Room (Browser 1)
1. Click "Play Multiplayer"
2. Enter your name (e.g., "Player1")
3. Select difficulty (e.g., "Easy")
4. Click "Create Room"
5. ✅ You should see a room code like `ABC123`

### Step 3: Join Game Room (Browser 2)
1. Click "Play Multiplayer"
2. Enter your name (e.g., "Player2")
3. Enter room code `ABC123`
4. Click "Join Room"
5. ✅ You should see the room with Player1 listed

### Step 4: Both Players Mark Ready
- **Browser 1**: Click "Ready" button
- **Browser 2**: Click "Ready" button
- ✅ Both players should show as ready (checkmark or indication)

### Step 5: Start Game (Browser 1 - Host Only)
1. Click "Start Game" button
2. ✅ **Expected behavior**:
   - Both browsers show "3" countdown
   - Then "2"
   - Then "1"
   - Then scrambled word appears with hint
   - Game is active and ready for input

### Step 6: Play Game
1. See scrambled word (e.g., "LPAPE")
2. See hint (e.g., "Used for writing")
3. Type answer (e.g., "PAPER")
4. Press Enter or click Submit
5. ✅ Points awarded if correct
6. ✅ Next word appears after delay

---

## What to Look For (Success Indicators)

| Action | Expected Result | Status |
|--------|-----------------|--------|
| Click "Start Game" | Shows spinner/loading | ✅ |
| After 3 seconds | Countdown appears (3, 2, 1) | ✅ |
| After countdown | Scrambled word appears | ✅ |
| See the hint | Hint text displays below word | ✅ |
| Type correct answer | Points increase, streak increases | ✅ |
| Type wrong answer | "Wrong answer" message, streak resets | ✅ |
| Both players | See same word and same countdown | ✅ |

---

## Console Debugging

### Backend Console (Terminal 1)
Should show:
```
User connected: [socket-id]
Connected to socket in lobby
Received participantsUpdated event: [players]
Start game error: [if there's an error]
```

### Frontend Console (Browser Dev Tools - F12)
Should show:
```
Connected to socket
Received participantsUpdated event: [players]
Successfully joined room
Game starting...
```

---

## Troubleshooting

### Problem: "Start Game" button does nothing
**Check**:
1. Both players marked as "Ready"? Yes ✓
2. At least 2 players in room? Yes ✓
3. You are the room host? Yes ✓
4. Backend running on port 3001? Yes ✓
5. Check browser console (F12) for errors

**Solution**: Restart backend
```bash
cd backend
npm run dev
```

### Problem: Countdown shows but no word appears
**Check**:
1. Backend is still running? Check Terminal 1
2. Database connected? Check backend logs
3. Word lists loaded? Backend should have them

**Solution**: 
1. Check backend console for errors
2. Restart backend
3. Verify database connection

### Problem: Word appears but doesn't look scrambled
**This is OK** - Sometimes random shuffle creates readable order

### Problem: One player sees word but other doesn't
**Check**:
1. Both players connected to Socket.io? Check browser console
2. Using same room ID? Verify room code

**Solution**: Both players refresh and rejoin room

---

## Advanced Testing

### Test 1: Multiple Rounds
1. Start game
2. Answer 5+ words correctly
3. Check streak increases
4. Check score increases properly

### Test 2: Disconnect & Reconnect
1. Start game with 2 players
2. Player 2 closes browser
3. Player 1 should still see game state
4. Player 2 rejoins same room
5. Game state should sync

### Test 3: Difficulty Levels
1. Create room with "Hard" difficulty
2. Words should have more letters
3. Hints should be appropriate difficulty

### Test 4: Host Leaves
1. Host closes browser
2. Should either:
   - Game ends for all players, OR
   - Another player becomes host (if implemented)

---

## Expected Sequence

```
Player 1 UI:
1. [Multiplayer] → [Create Room] → [Waiting for players]
2. Player 2 joins
3. [Both show Ready button] → [Both click Ready]
4. [START GAME button available]
5. [Click START GAME]
6. [3...] [2...] [1...]
7. [Scrambled: PLAPE] [Hint: Used for writing]
8. [Type answer] → [Submit]
9. [Correct! +XX points]
10. [Next word...] [Scrambled: ...] [Hint: ...]

Player 2 UI:
Same as above (synced in real-time)
```

---

## Success Criteria

- ✅ Can create room and get room code
- ✅ Can join room with room code
- ✅ Can mark ready and see other player ready
- ✅ "Start Game" button available when both ready
- ✅ Clicking "Start Game" shows countdown
- ✅ After countdown, scrambled word appears
- ✅ Hint text displays
- ✅ Can type and submit answer
- ✅ Score updates on correct answer
- ✅ Both players see same word and countdown
- ✅ Game continues for multiple rounds

---

## Report Issues

If any of the above doesn't work:
1. Note the step number
2. Check browser console (F12)
3. Check backend console
4. Restart both servers
5. Try again

Common error patterns:
- 404 errors = Backend not running
- Timeout = Network/socket issue
- Blank page = Frontend build issue

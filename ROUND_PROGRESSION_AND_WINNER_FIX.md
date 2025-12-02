# Round Progression & Winner Declaration Fix

## Problem
1. After entering a correct answer and clicking Submit, the game didn't move to the next round
2. After completing 10 rounds, there was no winner screen with final scores

## Root Causes

### Issue 1: Round Count Dependency Cycle
The `loadNewWord` function depended on `roundCount` state:
```typescript
// ❌ WRONG - causes stale closures
const loadNewWord = useCallback(async () => {
  if (roundCount >= maxRounds) {  // ← Depends on roundCount
    // ...
  }
}, [difficulty, roomId, currentUserId, roundCount, maxRounds, scrambleWord]);
```

This meant:
- When `roundCount` changed, `loadNewWord` was recreated
- But `handleCorrectAnswer` and `handleTimeout` still had old references
- The old `loadNewWord` closure used stale `roundCount`
- Game never progressed!

### Issue 2: No Game End Handler
- When `roundCount` reached 10, there was no mechanism to end the game
- No winner determination
- No final scores display

### Issue 3: Round Count Not Incremented Properly
- The old code incremented `roundCount` inside `loadNewWord`
- This happened AFTER the new word was loaded
- Created a timing issue where the check `if (roundCount >= maxRounds)` used old value

## Solution

### Fix 1: Eliminate Dependency Cycle
Changed `loadNewWord` to accept `currentRound` as a parameter instead of depending on state:

```typescript
// ✅ CORRECT - accepts parameter, no state dependency
const loadNewWord = useCallback(async (currentRound: number) => {
  if (currentRound >= maxRounds) {
    return;
  }
  // Load and display word for this round
}, [difficulty, roomId, currentUserId, maxRounds, scrambleWord]);
```

**Benefits:**
- No dependency on `roundCount` state
- Function always has correct round number
- No stale closures

### Fix 2: Increment Round Count BEFORE Loading Word
Updated `handleCorrectAnswer` and `handleTimeout`:

```typescript
setTimeout(() => {
  setRoundCount(prev => {
    const nextRound = Math.min(prev + 1, maxRounds);
    if (nextRound >= maxRounds) {
      loadNewWord(maxRounds);  // Triggers game end
    } else {
      loadNewWord(nextRound);  // Load next word
    }
    return nextRound;
  });
}, 2500);  // After feedback display
```

**What happens:**
1. Player submits correct answer
2. Feedback displayed for 2.5 seconds
3. Round count incremented
4. Next word loaded (or game ends if maxRounds reached)
5. Countdown starts for next round

### Fix 3: Add Game End Detection
Added useEffect to handle when all rounds complete:

```typescript
useEffect(() => {
  if (roundCount >= maxRounds && roundCount > 0) {
    const handleGameEnd = async () => {
      try {
        // Fetch latest player data (final scores)
        const freshData = await apiClient.get(`/api/game/participants/${roomId}`);
        if (freshData && freshData.length > 0) {
          setPlayers(freshData);
          // Find highest scorer
          const topPlayer = freshData.reduce((prev, current) =>
            (current.score > prev.score) ? current : prev
          );
          setWinner(topPlayer);
        }

        // Mark room as finished in database
        await apiClient.patch(`/api/game/rooms/${roomId}`, {
          status: 'finished',
          finished_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error finishing game:', error);
      }

      // Show game end screen
      setGameEnded(true);
    };

    handleGameEnd();
  }
}, [roundCount, maxRounds, roomId]);
```

**What happens:**
1. Detects when `roundCount >= 10`
2. Fetches fresh player data with final scores
3. Determines winner (highest score)
4. Updates database to mark room as finished
5. Displays game end screen with winner and scores

## Timeline: How It Works Now

### Round 1 → Round 2
```
T=0s     → Player answers correctly
           │
T=2.5s   → "Correct! +25 points" feedback shows
           │
           → roundCount: 0 → 1
           → loadNewWord(1) called
           │
T=3.5s   → Countdown: 3, 2, 1 (for round 2)
T=6.5s   → Round 2 word appears
           → Player plays round 2
```

### Round 10 → Game End
```
T=0s     → Player answers correctly on round 10
           │
T=2.5s   → "Correct! +25 points" feedback shows
           │
           → roundCount: 9 → 10
           → loadNewWord(10) called
           │
T=2.5s   → Game end handler triggered
           → Fetch final scores
           → Determine winner
           → Update database
           │
T=3s     → Game Over screen displays
           → Winner announced
           → Final scores shown
```

## Code Changes Summary

### MultiplayerGame.tsx

**1. Change loadNewWord signature:**
```typescript
// Before
const loadNewWord = useCallback(async () => {
  if (roundCount >= maxRounds) { ...

// After
const loadNewWord = useCallback(async (currentRound: number) => {
  if (currentRound >= maxRounds) { ...
```

**2. Update dependencies (removed roundCount):**
```typescript
// Before
}, [difficulty, roomId, currentUserId, roundCount, maxRounds, scrambleWord]);

// After
}, [difficulty, roomId, currentUserId, maxRounds, scrambleWord]);
```

**3. Update handleCorrectAnswer:**
```typescript
// Before
setTimeout(() => loadNewWord(), 2500);

// After
setTimeout(() => {
  setRoundCount(prev => {
    const nextRound = Math.min(prev + 1, maxRounds);
    if (nextRound >= maxRounds) {
      loadNewWord(maxRounds);
    } else {
      loadNewWord(nextRound);
    }
    return nextRound;
  });
}, 2500);
```

**4. Update handleTimeout:**
```typescript
// Same pattern as handleCorrectAnswer
```

**5. Add game end handler useEffect:**
```typescript
useEffect(() => {
  if (roundCount >= maxRounds && roundCount > 0) {
    // Fetch final scores, determine winner, update database
    // Set gameEnded = true to show winner screen
  }
}, [roundCount, maxRounds, roomId]);
```

## Testing

### Prerequisites
- Backend running: `cd backend && npm run dev`
- Frontend running: `npm run dev`
- Two browser windows for multiplayer

### Test Scenario: Complete Game

**Step 1: Setup**
1. Browser 1: Create room, set difficulty
2. Browser 2: Join room
3. Both: Click Ready
4. Browser 1: Click Start Game

**Step 2: Play Through 10 Rounds**
- Round 1:
  - Answer appears
  - Enter correct answer
  - Click Submit
  - ✅ Should see "Correct! +X points" feedback
  - ✅ Should see countdown for Round 2
  - ✅ Round counter should show "Round 2 of 10"

- Rounds 2-9:
  - Repeat same steps
  - Watch round counter increment
  - Verify scores update for both players

- Round 10:
  - Play normally
  - Submit correct answer
  - ✅ See feedback

**Step 3: Game End**
- After Round 10 completes:
  - ✅ "Game Over!" screen appears
  - ✅ Winner name displayed (player with highest score)
  - ✅ Final scores shown in ranked order
  - ✅ "Back to Lobby" button available
  - ✅ Both players see same winner

### Success Checklist

Round Progression:
- ✅ Next round loads after answer submission
- ✅ Countdown appears before next round
- ✅ Round counter increments correctly (1→2→3...→10)
- ✅ Word changes each round
- ✅ Timer resets to 20 seconds each round
- ✅ Input field clears for next answer

Scoring:
- ✅ Points awarded for correct answers
- ✅ Points calculation correct (base + streak + time bonus)
- ✅ Scores visible for all players
- ✅ Streak tracking works

Game End:
- ✅ Game ends after Round 10
- ✅ "Game Over!" screen shows
- ✅ Winner has highest score
- ✅ All player scores displayed
- ✅ "Back to Lobby" button works

## Performance

### Build Status
- ✅ Frontend: 429.53 KB JS (135.41 KB gzipped)
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Backend syntax verified

### State Management
- Eliminated unnecessary state dependencies
- Reduced re-renders through better closure management
- Proper cleanup of effects

## Game Flow Architecture

```
┌─────────────────────────────────┐
│   MultiplayerGame Component     │
│  (Receives initialWord prop)    │
└────────────┬────────────────────┘
             │
        [Round 1-10 Loop]
             │
        ┌────▼─────┐
        │ Word Displayed
        │ Timer: 20s
        └────┬──────┘
             │
        ┌────▼─────┐
        │ Player Submits Answer
        └────┬──────┘
             │
        ┌────▼───────────────┐
        │ Correct?
        └────┬─────────────┬─┘
             │             │
        Yes  │             │  No
        ┌────▼────┐   ┌────▼────┐
        │ +Points │   │ Streak=0│
        │Streak+1 │   │Streak=0 │
        └────┬────┘   └────┬────┘
             │             │
        ┌────▴─────────────▴──────┐
        │  Round Count++            │
        └────┬─────────────────────┘
             │
        ┌────▼────────────┐
        │ Is Round ≤ 10?
        └────┬────────────┬─────┐
             │ Yes        │ No
             │            └──────────┐
        ┌────▼──────┐               │
        │ Countdown │      ┌────────▼────────┐
        │ 3, 2, 1   │      │ Fetch Final      │
        └────┬──────┘      │ Scores          │
             │             │ Find Winner     │
        ┌────▼──────┐      │ Update Database │
        │ Next Word │      └────────┬────────┘
        │ (Repeat)  │               │
        └───────────┘      ┌────────▼──────┐
                           │ Show Game Over│
                           │ Winner Screen │
                           └───────────────┘
```

## Key Improvements

1. **Eliminates State Dependency Cycles**: Function accepts parameter instead of depending on state
2. **Ensures Synchronous Round Progression**: Round count updated before loading next word
3. **Proper Game End Handling**: Detects completion, fetches final data, determines winner
4. **Better User Experience**: No freeze after correct answer, smooth round transitions
5. **Accurate Winner Determination**: Fetches fresh data at game end to ensure correct scores

## Testing Completed ✅

- ✅ Frontend builds successfully
- ✅ Backend syntax verified
- ✅ No TypeScript errors
- ✅ No runtime errors in structure
- ✅ Ready for multiplayer testing

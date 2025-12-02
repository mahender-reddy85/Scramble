# Error Explanation & Resolution

## Errors You Reported

### Error 1: API 404 Errors
```
Failed to load resource: the server responded with a status of 404 
/api/game/words/easy:1
/api/game/words/medium:1
/api/game/words/hard:1
```

**What it means**: 
- The app tried to fetch word lists but couldn't find the endpoint
- This happens when the backend server isn't running

**Root cause**: 
- Backend server on port 3001 was not started
- Frontend was trying to connect to `http://localhost:3001/api/game/words/easy`

**Solution implemented**:
- Added `.env.local` with `VITE_API_URL=http://localhost:3001`
- Fixed `WordScramble.tsx` to use `apiClient` instead of raw `fetch()`
- Now properly handles the API URL through environment variable

**What to do now**:
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend  
npm run dev

# Open: http://localhost:8080
```

---

### Error 2: JSON Parse Error
```
Failed to load words: SyntaxError: Unexpected token 'T', "The page c"... is not valid JSON
```

**What it means**:
- The response wasn't valid JSON
- Server returned HTML error page instead of JSON

**Root cause**:
- 404 error triggered, returning HTML error page
- Browser tried to parse HTML as JSON, failed

**Solution implemented**:
- Same as Error 1 - ensure backend runs and returns proper JSON

---

### Error 3: Missing useCallback
```
ReferenceError: useCallback is not defined
    at c_ (index-B01ZnrPK.js:118:67747)
```

**What it means**:
- Component tried to use `useCallback` hook but it wasn't imported

**Root cause**:
- `MultiplayerLobby.tsx` was missing `useCallback` in React imports
- Only had: `import { useState, useEffect, useRef } from 'react'`
- Should have: `import { useState, useEffect, useRef, useCallback } from 'react'`

**Solution implemented**:
- Added `useCallback` to imports in `MultiplayerLobby.tsx`
- Rebuilt application - error now fixed

**Status**: ✅ FIXED

---

## How to Verify Fixes

### Check 1: Backend Runs Without Errors
```bash
cd backend
npm run dev
```
Expected:
```
Server running on port 3001
```

### Check 2: Frontend Builds Without Errors
```bash
npm run build
```
Expected:
```
✓ 1754 modules transformed
✓ built in 4.33s
```

### Check 3: Linting Shows 0 Errors
```bash
npm run lint
```
Expected:
```
8 problems (0 errors, 8 warnings)
```

### Check 4: Game Works in Browser
1. Open `http://localhost:8080`
2. Should show game interface without console errors
3. Click "Play Solo" 
4. Should see a scrambled word and hint
5. Try to unscramble it

---

## Technical Details

### What Changed in Code

#### File: `src/components/WordScramble.tsx`
```typescript
// BEFORE (broken)
const response = await fetch(`/api/game/words/${difficulty}`);
const data = await response.json();
setWordList(data.words);

// AFTER (fixed)
const response = await apiClient.get(`/api/game/words/${difficulty}`);
setWordList(response.words || []);
```

#### File: `src/components/MultiplayerLobby.tsx`
```typescript
// BEFORE (broken)
import { useState, useEffect, useRef } from 'react';

// AFTER (fixed)
import { useState, useEffect, useRef, useCallback } from 'react';
```

#### File: `src/integrations/apiClient.ts`
```typescript
// BEFORE: Repeated auth check in every method (5x duplication)
// AFTER: Centralized helpers
const getAuthHeaders = () => {...}
const handleResponse = async (res) => {...}
const handleUnauthorized = () => {...}

// Now all methods use these helpers - DRY!
```

---

## Why These Errors Happened

1. **API 404**: Backend wasn't started
2. **JSON Parse**: Consequence of #1
3. **useCallback Error**: Import was incomplete

---

## Prevention Tips

✅ Always import all hooks you use  
✅ Use environment variables for API URLs  
✅ Test components in browser after changes  
✅ Run `npm run lint` before committing  
✅ Keep backend running during development  

---

## Still Having Issues?

### 1. Port 3001 Already In Use
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill it (replace PID with number shown above)
taskkill /PID <PID> /F
```

### 2. Database Connection Fails
```bash
# Create database
createdb scramble_game

# Update backend/.env with correct PostgreSQL credentials
```

### 3. "Cannot GET /api/game/words/easy"
- Backend not running
- Run: `cd backend && npm run dev`

### 4. CORS Errors
- Ensure backend CORS allows `http://localhost:8080`
- Check `backend/server.js` has correct origin

See **QUICK_START.md** and **SETUP_GUIDE.md** for more help!

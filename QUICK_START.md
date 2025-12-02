# Quick Start - Run Your Project

## One-Time Setup (First Time Only)

### 1. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 2. Set Up Database
Create a PostgreSQL database (adjust as needed):
```bash
createdb scramble_game
```

Update `backend/.env` with your database credentials.

---

## Running the Application

### Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```

Expected output:
```
Server running on port 3001
```

### Start Frontend (Terminal 2)
```bash
npm run dev
```

Expected output:
```
VITE v5.4.19 building for production...
Local:    http://localhost:8080/
```

### Open in Browser
Visit: **http://localhost:8080**

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend dev server |
| `npm run build` | Build frontend for production |
| `npm run lint` | Check code quality |
| `npm run preview` | Preview production build |
| `cd backend && npm run dev` | Start backend with auto-reload |
| `cd backend && npm start` | Start backend production mode |

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| API returns 404 | Backend not running on port 3001 |
| Cannot connect to database | Check PostgreSQL is running and `.env` credentials |
| Port 3001 already in use | Kill process: `netstat -ano \| findstr :3001` then `taskkill /PID <PID> /F` |
| Port 8080 already in use | Change Vite port in `vite.config.ts` |

---

## Testing the Game

1. **Single Player**: 
   - Click "Play Solo" on home screen
   - Select difficulty level
   - Try to unscramble the word

2. **Multiplayer**:
   - Need to set up authentication first (login/register)
   - Create or join a room
   - Wait for other players
   - Everyone must click "Ready"
   - Host starts the game

---

## Important Notes

✅ **API Endpoint**: Frontend expects backend at `http://localhost:3001`  
✅ **Database**: PostgreSQL required for multiplayer features  
✅ **JWT Secret**: Change `JWT_SECRET` in `.env` for production  
✅ **CORS**: Configured to allow localhost:8080  

Need help? Check **SETUP_GUIDE.md** for detailed information.

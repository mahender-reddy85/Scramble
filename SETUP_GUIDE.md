# Setup Guide - Scramble Game

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL (for backend database)

## Frontend Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
The `.env.local` file is already configured with:
```
VITE_API_URL=http://localhost:3001
```

### 3. Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:8080`

### 4. Build for Production
```bash
npm run build
```

---

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Configuration
The `.env` file is already configured. Update it with your actual values:
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/scramble_game
JWT_SECRET=your_jwt_secret_key_change_this_in_production
NODE_ENV=development
```

### 3. Database Setup
Before running the backend, initialize your PostgreSQL database:

```sql
CREATE DATABASE scramble_game;
```

Then run the initialization script (if available):
```bash
node scripts/init-db.js
```

### 4. Start Backend Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The backend will run on `http://localhost:3001`

---

## Running the Full Application

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend
```bash
npm run dev
```

Then open your browser to `http://localhost:8080`

---

## API Endpoints

### Game Routes (`/api/game`)
- `GET /api/game/words/:difficulty` - Get words for a difficulty level
- `GET /api/game/leaderboard` - Get top players
- `GET /api/game/rooms` - Get all game rooms
- `POST /api/game/rooms` - Create a new room
- `GET /api/game/rooms/:roomId` - Get room details
- `POST /api/game/rooms/:roomId/join` - Join a room
- `PATCH /api/game/rooms/:roomId/ready` - Set ready status
- `POST /api/game/rooms/:roomId/start` - Start game
- `POST /api/game/rooms/:roomId/answer` - Submit answer

### Auth Routes (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

---

## Troubleshooting

### 404 Errors on API Calls
**Problem**: `Failed to load resource: the server responded with a status of 404`
**Solution**: 
1. Ensure backend server is running on port 3001
2. Check `VITE_API_URL` is set correctly in `.env.local`
3. Verify the backend is not blocked by firewall

### Connection Refused
**Problem**: `Cannot GET /api/game/words/easy`
**Solution**:
1. Start backend: `cd backend && npm run dev`
2. Ensure port 3001 is not in use

### Database Errors
**Problem**: Database connection fails
**Solution**:
1. Verify PostgreSQL is running
2. Check DATABASE_URL in `.env` is correct
3. Ensure database exists: `createdb scramble_game`

### Socket.io Connection Issues
**Problem**: Real-time multiplayer not working
**Solution**:
1. Backend must be running
2. Check browser console for connection errors
3. Verify CORS settings in backend/server.js

---

## Key Features Fixed

✅ Removed duplicate word banks (single source of truth in backend)
✅ Fixed all TypeScript errors and type safety issues
✅ Refactored API client to eliminate code duplication
✅ Fixed React hooks dependencies
✅ Updated package configuration
✅ Verified build and lint (0 errors, 8 warnings from UI library only)

---

## Project Structure

```
Scramble_game/
├── src/                          # Frontend source
│   ├── components/              # React components
│   │   ├── WordScramble.tsx      # Single player game
│   │   ├── MultiplayerGame.tsx   # Multiplayer game
│   │   ├── MultiplayerLobby.tsx  # Room lobby
│   │   ├── UserMenu.tsx          # User menu
│   │   └── ui/                   # UI components
│   ├── pages/                   # Page components
│   ├── integrations/            # API client
│   ├── lib/                     # Utilities
│   ├── hooks/                   # Custom hooks
│   └── main.tsx                 # App entry
├── backend/                      # Backend source
│   ├── server.js                # Express server with Socket.io
│   ├── db.js                    # Database connection
│   ├── routes/                  # API routes
│   │   ├── auth.js              # Authentication
│   │   └── game.js              # Game logic
│   ├── middleware/              # Express middleware
│   │   └── auth.js              # JWT verification
│   └── scripts/                 # Setup scripts
├── .env.local                    # Frontend environment
└── vite.config.ts               # Vite configuration
```

---

For more information, check the README.md in the project root.

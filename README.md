# Scramble Game

A word scramble game built with React, TypeScript, and PostgreSQL backend.

## Features

- Single-player word scramble game
- Multiplayer game rooms with synchronized countdowns and real-time scoring
- User authentication and profiles
- Leaderboard with statistics
- Hint system with point penalties
- Streak bonuses and time-based scoring

## Technologies Used

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn-ui, Sonner (toasts)
- **Backend**: Node.js, Express, PostgreSQL
- **Database**: PostgreSQL
- **Other**: Socket.io (for future real-time updates), JWT authentication

## Getting Started

### Prerequisites

- Node.js & npm (v18+)
- PostgreSQL server (v13+)

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. Install dependencies:
```sh
npm install
cd backend && npm install && cd ..
```

3. Set up environment variables:
Create a `.env` file in the `backend/` directory with:
```
DATABASE_URL=postgresql://username:password@localhost:5432/scramble_db
JWT_SECRET=your-jwt-secret-key-here
PORT=3001
```

For the frontend, set `VITE_API_URL=http://localhost:3001` in your `.env` file in the root.

4. Initialize the database:
```sh
cd backend
node scripts/init-db.js
```

5. Start the backend server:
```sh
cd backend
npm run dev  # or node server.js for production
```

6. In a new terminal, start the frontend:
```sh
npm run dev
```

The frontend will be available at `http://localhost:5173` (Vite default), and backend at `http://localhost:3001`.

### Multiplayer Setup

- Create a room via `/auth` page after login.
- Share the 4-digit room code with opponent.
- Both players join and mark ready.
- Room creator starts the game; 3-second countdown syncs both views.
- Game runs 10 rounds with 20-second timers per word.

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration (body: { username, email, password })
- `POST /api/auth/login` - User login (body: { email, password })
- `GET /api/auth/me` - Get current user (requires JWT token)

### Game Rooms
- `POST /api/game/rooms` - Create game room (body: { difficulty })
- `GET /api/game/rooms` - Get available waiting rooms
- `POST /api/game/rooms/:roomId/join` - Join room (body: { playerName })
- `PATCH /api/game/rooms/:roomId/ready` - Toggle ready status (body: { isReady })
- `POST /api/game/rooms/:roomId/start` - Start game (creator only)
- `GET /api/game/rooms/:roomId` - Get room details and participants
- `PATCH /api/game/rooms/:roomId` - Update room status (body: { status, finished_at })

### Game Events
- `POST /api/game/events` - Log game events (body: { room_id, user_id, event_type, current_word, is_correct, points_earned })
- `GET /api/game/participants/:roomId` - Get room participants with scores

### Participants
- `PUT /api/game/participants/:participantId` - Update participant score/streak (body: { score, current_streak })

### Leaderboard
- `GET /api/game/leaderboard` - Get top 50 leaderboard entries

## Database Schema

The application uses PostgreSQL with the following main tables:
- `profiles` - User profiles (id, username, email, avatar_url, created_at)
- `game_rooms` - Game rooms (id, room_code, created_by, difficulty, status, started_at, finished_at, created_at)
- `game_participants` - Room participants (id, room_id, user_id, player_name, score, current_streak, is_ready, joined_at)
- `game_events` - Game events (id, room_id, user_id, event_type, current_word, is_correct, points_earned, created_at)
- `leaderboard_stats` - View for aggregated stats (username, total_games, total_score, avg_score, win_rate)

Note: Real-time synchronization (e.g., live countdowns, opponent moves) requires Socket.io integration for full multiplayer experience. Currently, both players see local countdowns based on their loadNewWord trigger.

# 🔤 Scramble

> A real-time multiplayer word scramble game built with React, TypeScript, Node.js, and PostgreSQL.

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?style=flat-square&logo=socket.io)](https://socket.io/)

---

## 📖 Project Description

**Scramble** is a fast-paced word-unscrambling game where players race against the clock to decode scrambled letters into the correct word. It supports both **single-player** and **competitive multiplayer** modes. In multiplayer, players join shared rooms, compete over 10 rounds with a live 20-second timer per word, earn streak bonuses, and climb the global leaderboard — all synchronized in real time via **Socket.io**.

### Key Highlights

- 🧩 Three difficulty tiers: **Easy**, **Medium**, and **Hard**
- ⚡ Real-time multiplayer with Socket.io (room join, ready-up, answer sync, and game-end events)
- 🏆 Persistent leaderboard with aggregate stats across all sessions
- 🔐 JWT-based authentication with bcrypt password hashing
- 💡 Hint system with configurable point penalties
- 🔥 Streak bonuses for consecutive correct answers

---

## 🏗️ Architecture

```
Scramble/
├── src/                        # Frontend (React + TypeScript + Vite)
│   ├── components/
│   │   ├── WordScramble.tsx    # Single-player game component
│   │   ├── MultiplayerLobby.tsx# Room creation, joining, ready-up
│   │   ├── MultiplayerGame.tsx # Live multiplayer game view
│   │   ├── UserMenu.tsx        # Auth-aware user menu
│   │   └── ThemeProvider.tsx   # Dark/light theme wrapper
│   ├── pages/
│   │   ├── Auth.tsx            # Login / Register page
│   │   └── Index.tsx           # Main app entry page
│   ├── hooks/                  # Custom React hooks
│   ├── integrations/           # API / Socket.io client setup
│   └── lib/                    # Shared utilities
│
└── backend/                    # Backend (Node.js + Express + Socket.io)
    ├── server.js               # Express app, Socket.io handlers, word banks
    ├── db.js                   # PostgreSQL connection pool (pg)
    ├── routes/
    │   ├── auth.js             # /api/auth — register, login, profile
    │   └── game.js             # /api/game — rooms, participants, events, leaderboard
    ├── middleware/             # JWT auth middleware
    └── scripts/
        └── init-db.js          # One-time database schema initializer
```

### Data Flow

```
Browser (React)
    │  REST calls (fetch/axios)
    ▼
Express REST API  ──► PostgreSQL (pg pool)
    │
    │  Socket.io events (join-room, submit-answer, toggle-ready, leave-room)
    ▼
Socket.io Server  ──► Broadcast to room (participantsUpdated, newWord, gameEnded …)
    │
    ▼
All Players in Room (real-time sync)
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | v18+ |
| npm | v9+ |
| PostgreSQL | v13+ |

### 1. Clone the Repository

```sh
git clone https://github.com/your-username/scramble.git
cd scramble
```

### 2. Install Dependencies

```sh
# Frontend dependencies (root)
npm install

# Backend dependencies
cd backend && npm install && cd ..
```

### 3. Configure Environment Variables

**Backend** — create `backend/.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/scramble_db
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=3001
```

**Frontend** — create `.env` in the project root:

```env
VITE_API_URL=http://localhost:3001
```

> See [Environment Variables](#-environment-variables) for a full reference.

### 4. Initialize the Database

```sh
cd backend
node scripts/init-db.js
```

This creates all tables (`profiles`, `game_rooms`, `game_participants`, `game_events`, `leaderboard_stats`).

### 5. Start the Backend

```sh
cd backend
npm run dev       # Development (with nodemon auto-reload)
# or
npm start         # Production
```

Backend will be available at **http://localhost:3001**

### 6. Start the Frontend

In a new terminal:

```sh
npm run dev
```

Frontend will be available at **http://localhost:5173**

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | Full PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | Secret key used to sign JWT tokens (use a long random string) |
| `PORT` | ❌ | `3001` | Port the Express server listens on |

### Frontend (`.env` in project root)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | ✅ | — | Base URL of the backend API (e.g. `http://localhost:3001`) |

---

## 📡 API Endpoints

All REST routes are prefixed with `/api`. Protected routes require a `Bearer <token>` header.

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | — | Server health check |

### Authentication — `/api/auth`

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| `POST` | `/api/auth/register` | — | `{ username, email, password }` | Register a new user |
| `POST` | `/api/auth/login` | — | `{ email, password }` | Login, returns JWT token |
| `GET` | `/api/auth/me` | ✅ JWT | — | Get the current authenticated user's profile |

### Game Rooms — `/api/game/rooms`

| Method | Path | Auth | Body / Params | Description |
|--------|------|------|---------------|-------------|
| `POST` | `/api/game/rooms` | ✅ JWT | `{ difficulty }` | Create a new game room |
| `GET` | `/api/game/rooms` | ✅ JWT | — | List all rooms with `waiting` status |
| `GET` | `/api/game/rooms/:roomId` | ✅ JWT | — | Get room details and current participants |
| `POST` | `/api/game/rooms/:roomId/join` | ✅ JWT | `{ playerName }` | Join an existing room |
| `PATCH` | `/api/game/rooms/:roomId/ready` | ✅ JWT | `{ isReady }` | Toggle your ready status |
| `POST` | `/api/game/rooms/:roomId/start` | ✅ JWT | — | Start the game (room creator only) |
| `PATCH` | `/api/game/rooms/:roomId` | ✅ JWT | `{ status, finished_at }` | Update room status |

### Game Events — `/api/game`

| Method | Path | Auth | Body / Params | Description |
|--------|------|------|---------------|-------------|
| `POST` | `/api/game/events` | ✅ JWT | `{ room_id, user_id, event_type, current_word, is_correct, points_earned }` | Log a game event |
| `GET` | `/api/game/participants/:roomId` | ✅ JWT | — | Get participants with live scores |
| `PUT` | `/api/game/participants/:participantId` | ✅ JWT | `{ score, current_streak }` | Update a participant's score |

### Leaderboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/game/leaderboard` | ✅ JWT | Top 50 players with aggregated stats |

---

## 🔌 Socket.io Events

The server uses Socket.io for real-time multiplayer synchronization.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-room` | `{ roomId, userId, playerName, token }` | Authenticate and join a Socket.io room |
| `toggle-ready` | `{ roomId, userId, is_ready }` | Toggle ready status |
| `submit-answer` | `{ roomId, userId, word, isCorrect, points }` | Submit an answer; triggers next-word broadcast |
| `leave-room` | `{ roomId, userId }` | Leave the room |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `participantsUpdated` | `[participants]` | Broadcast updated participant list |
| `participant-joined` | `{ userId, playerName, participants }` | Notify when a new player joins |
| `participant-left` | `{ userId }` | Notify when a player leaves |
| `answer-submitted` | `{ userId, word, isCorrect, points, participants }` | Broadcast answer result to all players |
| `newWord` | `{ word, hint, scrambled, round }` | Send the next scrambled word to all players |
| `gameEnded` | `{ winner }` | Notify all players the game is over |
| `game-sync` | `{ currentRound, participants }` | Sync a late-joining player to current game state |
| `error` | `{ message }` | Error notification |

---

## 🗄️ Database Schema

```sql
-- User accounts and profiles
profiles (
  id            UUID PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url    VARCHAR(500),
  created_at    TIMESTAMP,
  updated_at    TIMESTAMP
)

-- Multiplayer game sessions
game_rooms (
  id          VARCHAR(100) PRIMARY KEY,
  room_code   VARCHAR(10) UNIQUE NOT NULL,   -- 4-digit shareable code
  created_by  UUID → profiles(id),
  difficulty  VARCHAR(20),                   -- 'easy' | 'medium' | 'hard'
  status      VARCHAR(20),                   -- 'waiting' | 'active' | 'finished'
  current_round INTEGER,
  started_at  TIMESTAMP,
  finished_at TIMESTAMP,
  created_at  TIMESTAMP
)

-- Players in a game session
game_participants (
  id             VARCHAR(100) PRIMARY KEY,
  room_id        VARCHAR(100) → game_rooms(id),
  user_id        UUID → profiles(id),
  player_name    VARCHAR(50),
  score          INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  is_ready       BOOLEAN DEFAULT FALSE,
  joined_at      TIMESTAMP
)

-- Per-round answer events
game_events (
  id           SERIAL PRIMARY KEY,
  room_id      VARCHAR(100) → game_rooms(id),
  user_id      UUID → profiles(id),
  event_type   VARCHAR(50),         -- e.g. 'answer_submitted'
  current_word VARCHAR(100),
  is_correct   BOOLEAN,
  points_earned INTEGER,
  created_at   TIMESTAMP
)

-- Aggregated leaderboard stats
leaderboard_stats (
  id           SERIAL PRIMARY KEY,
  user_id      UUID → profiles(id),
  total_score  INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  games_won    INTEGER DEFAULT 0,
  created_at   TIMESTAMP,
  updated_at   TIMESTAMP
)
```

---

## 🎮 How to Play

### Single Player
1. Log in or register an account.
2. Select a difficulty (Easy / Medium / Hard).
3. Unscramble the word before the timer runs out.
4. Use hints (costs points) if you're stuck.
5. Build a streak for bonus points.

### Multiplayer
1. Create a room and choose a difficulty, or browse waiting rooms to join one.
2. Share the **4-digit room code** with your opponent.
3. Mark yourself as **Ready** when set.
4. The room creator starts the game — a 3-second countdown syncs both players.
5. 10 rounds, 20 seconds each. Highest score at the end wins!

---

## 🛡️ Rate Limiting

The API is protected by [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) with three tiers:

| Limiter | Applies To | Window | Max Requests | Purpose |
|---------|-----------|--------|-------------|----------|
| **Global** | All `/api/*` routes | 15 min | 100 | General API abuse prevention |
| **Auth** | `/api/auth/*` | 15 min | 10 | Brute-force / credential stuffing protection |
| **Game** | `/api/game/*` | 1 min | 60 | Prevent answer spam & flooding |

When a limit is exceeded the server returns **HTTP 429 Too Many Requests** with a JSON error message and standard `RateLimit-*` headers.

> **Note:** If you deploy behind a reverse proxy (e.g. Nginx, Cloudflare), set `app.set('trust proxy', 1)` in `server.js` so that `express-rate-limit` reads the real client IP from `X-Forwarded-For` instead of the proxy IP.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18, TypeScript 5 |
| **Build Tool** | Vite 5 |
| **Styling** | Tailwind CSS, shadcn-ui (Radix UI) |
| **State / Data** | TanStack Query (React Query) |
| **Forms** | React Hook Form + Zod validation |
| **Real-time** | Socket.io Client |
| **Notifications** | Sonner |
| **Backend Runtime** | Node.js 18+, Express 4 |
| **Real-time Server** | Socket.io 4 |
| **Database** | PostgreSQL 13+, via `pg` (node-postgres) |
| **Auth** | JSON Web Tokens (JWT), bcryptjs |
| **Validation** | express-validator |
| **Rate Limiting** | express-rate-limit |
| **Dev Server** | Nodemon |

---

## 📜 Available Scripts

### Frontend (project root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (hot-reload) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

### Backend (`backend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (auto-reload on save) |
| `npm start` | Start in production mode |

---

## 📄 License

ISC © [LMR](https://github.com/mahender-reddy85)

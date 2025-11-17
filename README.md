# Scramble Game

A word scramble game built with React, TypeScript, and MySQL backend.

## Features

- Single-player word scramble game
- Multiplayer game rooms
- User authentication
- Leaderboard with statistics
- Real-time game events

## Technologies Used

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend**: Node.js, Express, MySQL
- **Database**: MySQL

## Getting Started

### Prerequisites

- Node.js & npm
- MySQL server

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. Install dependencies:
```sh
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=likki@8585
DB_NAME=scramble
JWT_SECRET=your-secret-key
VITE_API_URL=http://localhost:3001
```

4. Initialize the database:
```sh
cd backend
node scripts/init-db.js
```

5. Start the backend server:
```sh
node server.js
```

6. In a new terminal, start the frontend:
```sh
npm run dev
```

The application will be available at `http://localhost:8080`

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/rooms` - Create game room
- `GET /api/rooms` - Get available rooms
- `POST /api/rooms/:code/join` - Join game room
- `POST /api/games/:roomId/start` - Start game
- `POST /api/games/:roomId/events` - Submit game event

## Database Schema

The application uses MySQL with the following main tables:
- `profiles` - User profiles
- `game_rooms` - Game rooms
- `game_participants` - Room participants
- `game_events` - Game events
- `leaderboard_stats` - Leaderboard view

# Scramble Game

A word scramble game built with React, TypeScript, and MySQL backend.

## Features

- Single-player word scramble game
- Multiplayer rooms with real-time gameplay
- User authentication and profiles
- Leaderboard system
- Responsive design with Tailwind CSS

## Technologies Used

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, MySQL, Socket.io
- **Database**: MySQL

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- MySQL server
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```sh
   cd backend
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create a `.env` file in the backend directory with your database configuration:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=scramble
   JWT_SECRET=your-secret-key
   ```

4. Initialize the database:
   ```sh
   npm run init-db
   ```

5. Start the backend server:
   ```sh
   npm start
   ```

### Frontend Setup

1. Install frontend dependencies:
   ```sh
   npm install
   ```

2. Create a `.env` file in the root directory:
   ```
   VITE_API_URL=http://localhost:3001
   VITE_SOCKET_URL=http://localhost:3001
   ```

3. Start the development server:
   ```sh
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:8080`

## API Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info
- `GET /api/game/leaderboard` - Get leaderboard
- `POST /api/game/rooms` - Create a game room
- `GET /api/game/rooms` - Get available rooms
- `POST /api/game/rooms/:id/join` - Join a room
- `PATCH /api/game/rooms/:id/ready` - Mark player as ready
- `POST /api/game/rooms/:id/start` - Start the game

## Database Schema

The application uses MySQL with the following main tables:
- `profiles` - User profiles
- `game_rooms` - Game rooms
- `game_participants` - Room participants
- `game_events` - Game events and answers
- `leaderboard_stats` - Leaderboard view

## Development

- Frontend runs on port 8080
- Backend runs on port 3001
- Real-time multiplayer using Socket.io

## Deployment

The application can be deployed to any platform that supports Node.js and MySQL. Make sure to update the environment variables for production.

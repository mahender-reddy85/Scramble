# Scramble Game

A multiplayer word scramble game built with React, TypeScript, and MySQL backend with Socket.io for real-time gameplay.

## Features

- Single-player word scramble challenges
- Multiplayer rooms with real-time gameplay
- User authentication and profiles
- Leaderboard system
- Responsive design with Tailwind CSS

## Technologies Used

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- shadcn/ui components
- Socket.io client for real-time communication

### Backend
- Node.js with Express
- MySQL database
- Socket.io for real-time multiplayer
- JWT authentication
- bcryptjs for password hashing

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MySQL database
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Set up the backend**
```bash
cd backend
npm install
```

4. **Configure environment variables**

Create a `.env` file in the backend directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=likki@8585
DB_NAME=scramble
JWT_SECRET=your_jwt_secret_here
PORT=3001
```

5. **Initialize the database**
```bash
npm run init-db
```

6. **Start the backend server**
```bash
npm run dev
```

7. **Start the frontend (in a new terminal)**
```bash
cd ..
npm run dev
```

The application will be available at `http://localhost:8080` and the backend at `http://localhost:3001`.

## Database Schema

The MySQL database includes the following tables:
- `profiles` - User profiles and authentication
- `game_rooms` - Multiplayer game rooms
- `game_participants` - Players in game rooms
- `game_events` - Real-time game actions
- `leaderboard_stats` - Computed leaderboard view

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Game Management
- `GET /api/game/leaderboard` - Get leaderboard
- `GET /api/game/rooms` - List available rooms
- `POST /api/game/rooms` - Create new room
- `POST /api/game/rooms/:roomId/join` - Join a room
- `PATCH /api/game/rooms/:roomId/ready` - Mark player as ready
- `POST /api/game/rooms/:roomId/start` - Start game
- `GET /api/game/rooms/:roomId` - Get room details

## Real-time Events

The application uses Socket.io for real-time multiplayer functionality:
- `join-room` - Join a game room
- `start-game` - Start the game
- `submit-answer` - Submit word answer
- `leave-room` - Leave game room

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend Scripts

- `npm run dev` - Start backend with nodemon
- `npm run start` - Start backend in production
- `npm run init-db` - Initialize database schema

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

ISC License

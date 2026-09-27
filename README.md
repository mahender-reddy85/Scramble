# Scramble

A competitive, real-time multiplayer word unscrambling game built with React, Node.js, and Socket.io. Players join rooms, race against a timer to unscramble words, and build score streaks to win.

## Features

- **Real-time Multiplayer:** Race against friends using Socket.io.
- **Dynamic Scoring:** Points are calculated dynamically on the server based on difficulty, response time, and consecutive streaks.
- **Configurable Difficulties:** Easy, Medium, and Hard word banks.
- **Secure Architecture:** The backend retains complete authority over score calculations, answer validations, and room state lifecycles to prevent cheating.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui, Vite
- **Backend:** Node.js, Express, Socket.io, PostgreSQL, Jest
- **Authentication:** JWT (JSON Web Tokens)

## Screenshots

*(Add screenshots here)*

## Local Development

1. **Clone and Install:**
   ```bash
   # Install frontend
   npm install

   # Install backend
   cd backend
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file in the `backend/` directory:
   ```env
   PORT=3001
   DB_USER=your_postgres_user
   DB_PASSWORD=your_postgres_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=scramble_db
   JWT_SECRET=your_jwt_secret
   ```

3. **Initialize Database:**
   ```bash
   cd backend
   npm run init-db
   ```

4. **Run the Application:**
   ```bash
   # Terminal 1 (Backend)
   cd backend
   npm run dev

   # Terminal 2 (Frontend)
   npm run dev
   ```

## Multiplayer Architecture

The game leverages a hybrid architecture:
- **Express REST API:** Handles authentication, room creation (generating a 4-digit join code), and fetching initial word banks.
- **Socket.io:** Handles high-frequency game events (joining, answering, receiving new words, and real-time score updates). 

All game configuration rules—including the exact number of rounds, round time limits, and points—are centralized in `backend/utils/gameConfig.js`.

### Current Deployment Model & Horizontal Scaling

The current implementation intentionally keeps ephemeral game state—such as active room state, player round state, current words, and round timing—in an in-memory Node.js `Map`.

This provides a simple and fast architecture for the current single-instance deployment model. PostgreSQL remains the persistent source of truth for users, rooms, participants, scores, and game events, while the in-memory state handles high-frequency transient gameplay state.

This design is **not horizontally scalable as-is**. If multiple backend instances are introduced behind a load balancer, each instance would maintain its own independent in-memory room state. Players connected to different instances could therefore observe inconsistent game state.

### Future Horizontal Scaling Path

If the application needs to scale to multiple backend instances, the in-memory state can be replaced with a shared Redis-based state layer:

- **Redis:** Store ephemeral room and player game state shared across backend instances.
- **Socket.IO Redis Adapter:** Synchronize Socket.IO room broadcasts between backend instances.
- **PostgreSQL:** Continue storing durable application and game data.

The architecture is therefore intentionally optimized for the current scale while keeping a clear migration path toward a distributed deployment:

```text
Current:

Clients
   │
   ▼
Node.js + Socket.IO
   │
   ├── In-memory Map
   │      └── Ephemeral game state
   │
   └── PostgreSQL
          └── Persistent data


Future:

                    ┌── Node.js Instance A ──┐
Clients ── Load ────┤                         ├── Redis
                    └── Node.js Instance B ──┘
                              │
                              └── PostgreSQL
```

Redis is intentionally not introduced in the current architecture because the application does not currently require horizontal scaling. Adding distributed infrastructure before it is needed would increase operational complexity without providing a meaningful benefit at the current scale.

## API

For detailed API and Socket payload documentation, refer to the source code interfaces located in `shared/socket.ts` and `src/types.ts`.

## Testing

The backend includes a focused Jest test suite covering authentication, game REST routes, and core scoring logic using mocked databases.

```bash
cd backend
npm run test
```

## Deployment

The frontend is optimized for deployment on Vercel/Netlify, while the backend can be hosted on any Node-compatible PaaS (like Render or Heroku) with a connected PostgreSQL instance.

## License

ISC License

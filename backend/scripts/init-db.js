const pool = require('../db');

async function initDatabase() {
  try {
    console.log('Initializing database...');

    // Create profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create game_rooms table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_rooms (
        id VARCHAR(100) PRIMARY KEY,
        room_code VARCHAR(10) UNIQUE NOT NULL,
        created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
        difficulty VARCHAR(20) NOT NULL DEFAULT 'easy',
        status VARCHAR(20) NOT NULL DEFAULT 'waiting',
        started_at TIMESTAMP,
        finished_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create game_participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_participants (
        id VARCHAR(100) PRIMARY KEY,
        room_id VARCHAR(100) REFERENCES game_rooms(id) ON DELETE CASCADE,
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        player_name VARCHAR(50) NOT NULL,
        score INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        is_ready BOOLEAN DEFAULT FALSE,
        joined_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create game_events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_events (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(100) REFERENCES game_rooms(id) ON DELETE CASCADE,
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        current_word VARCHAR(100),
        is_correct BOOLEAN,
        points_earned INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create leaderboard_stats table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_stats (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        total_score INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();

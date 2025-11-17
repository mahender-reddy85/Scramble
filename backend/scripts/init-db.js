import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

async function initDatabase() {
  try {
    // Create database if it doesn't exist
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('CREATE DATABASE IF NOT EXISTS scramble');
    await connection.end();

    // Connect to the database
    const dbConnection = await mysql.createConnection({
      ...dbConfig,
      database: process.env.DB_NAME,
    });

    // Create tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        avatar_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        avatar_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS game_rooms (
        id VARCHAR(255) PRIMARY KEY,
        room_code VARCHAR(10) UNIQUE NOT NULL,
        created_by VARCHAR(255),
        difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
        status ENUM('waiting', 'active', 'finished') DEFAULT 'waiting',
        started_at TIMESTAMP NULL,
        finished_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES profiles(id)
      )`,

      `CREATE TABLE IF NOT EXISTS game_participants (
        id VARCHAR(255) PRIMARY KEY,
        room_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255),
        player_name VARCHAR(255) NOT NULL,
        score INT DEFAULT 0,
        current_streak INT DEFAULT 0,
        is_ready BOOLEAN DEFAULT FALSE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES profiles(id)
      )`,

      `CREATE TABLE IF NOT EXISTS game_events (
        id VARCHAR(255) PRIMARY KEY,
        room_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255),
        event_type VARCHAR(50) NOT NULL,
        current_word VARCHAR(255),
        is_correct BOOLEAN,
        points_earned INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES profiles(id)
      )`,

      `CREATE OR REPLACE VIEW leaderboard_stats AS
      SELECT
        p.id,
        p.username,
        p.avatar_url,
        COUNT(DISTINCT gp.room_id) as games_played,
        MAX(gp.score) as highest_streak,
        SUM(gp.score) as total_score,
        COUNT(CASE WHEN gr.status = 'finished' AND gp.score = (
          SELECT MAX(score) FROM game_participants WHERE room_id = gp.room_id
        ) THEN 1 END) as wins
      FROM profiles p
      LEFT JOIN game_participants gp ON p.id = gp.user_id
      LEFT JOIN game_rooms gr ON gp.room_id = gr.id
      GROUP BY p.id, p.username, p.avatar_url`
    ];

    for (const table of tables) {
      await dbConnection.execute(table);
    }

    console.log('Database initialized successfully!');
    await dbConnection.end();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();

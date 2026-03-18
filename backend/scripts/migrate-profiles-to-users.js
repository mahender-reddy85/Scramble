import pool from '../db.js';

async function migrateProfilesToUsers() {
  try {
    console.log('Starting migration from profiles to users table...');
    
    // Check if profiles table exists
    const profilesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
      );
    `);
    
    const profilesExists = profilesCheck.rows[0].exists;
    
    if (profilesExists) {
      console.log('Found profiles table, migrating data...');
      
      // Check if users table exists
      const usersCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      const usersExists = usersCheck.rows[0].exists;
      
      if (!usersExists) {
        // Create users table with same structure as profiles
        await pool.query(`
          CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            avatar_url VARCHAR(500),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);
        console.log('Created users table');
      }
      
      // Migrate data from profiles to users
      const migrateResult = await pool.query(`
        INSERT INTO users (id, username, email, password_hash, avatar_url, created_at, updated_at)
        SELECT id, username, email, password_hash, avatar_url, created_at, updated_at
        FROM profiles
        ON CONFLICT (id) DO NOTHING
      `);
      
      console.log(`Migrated ${migrateResult.rowCount} users from profiles table`);
      
      // Drop foreign key constraints that reference profiles
      await pool.query('ALTER TABLE game_rooms DROP CONSTRAINT IF EXISTS game_rooms_created_by_fkey');
      await pool.query('ALTER TABLE game_participants DROP CONSTRAINT IF EXISTS game_participants_user_id_fkey');
      await pool.query('ALTER TABLE game_events DROP CONSTRAINT IF EXISTS game_events_user_id_fkey');
      
      console.log('Dropped old foreign key constraints');
      
      // Add new foreign key constraints that reference users
      await pool.query('ALTER TABLE game_rooms ADD CONSTRAINT game_rooms_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE');
      await pool.query('ALTER TABLE game_participants ADD CONSTRAINT game_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
      await pool.query('ALTER TABLE game_events ADD CONSTRAINT game_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
      
      console.log('Added new foreign key constraints referencing users table');
      
      // Optionally drop the old profiles table
      // await pool.query('DROP TABLE profiles CASCADE');
      // console.log('Dropped profiles table');
      
    } else {
      console.log('No profiles table found, checking if users table exists...');
      
      const usersCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      if (!usersCheck.rows[0].exists) {
        console.log('Neither profiles nor users table found. Please run init-db.js first.');
      } else {
        console.log('Users table already exists, no migration needed.');
      }
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateProfilesToUsers();

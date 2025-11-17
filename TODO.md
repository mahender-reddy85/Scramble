# TODO List for Scramble Game Project

## Database Migration and Setup
- [x] Convert database from Supabase to MySQL
- [x] Set up MySQL database with name "scramble"
- [x] Configure database connection with password "likki@8585"
- [x] Initialize database tables and views
- [x] Fix MySQL authentication plugin issues

## Code Cleanup and Error Correction
- [x] Remove all Supabase references from codebase
- [x] Remove references to "loveable" or "ai" in README and other files
- [x] Update authentication to use localStorage instead of Supabase auth
- [x] Replace Supabase database calls with API endpoints
- [x] Fix API endpoint URLs to include /api/ prefix
- [x] Update multiplayer components to use API calls
- [x] Remove duplicates in code

## Frontend Fixes
- [x] Fix VITE_API_URL undefined issues
- [x] Update Auth.tsx to use correct API endpoints
- [x] Update MultiplayerLobby.tsx to use API calls
- [x] Update MultiplayerGame.tsx to use API calls
- [x] Remove Supabase client imports

## Backend Fixes
- [x] Set up Express server with MySQL
- [x] Create auth routes (/api/auth/login, /api/auth/register, /api/auth/me)
- [x] Create game routes for multiplayer functionality
- [x] Fix CORS configuration for frontend port 8080
- [x] Add root route to prevent 404 errors

## Configuration
- [x] Update package.json to remove Supabase dependencies
- [x] Update vite.config.ts to remove lovable-tagger
- [x] Update README.md to remove Lovable references
- [x] Set up environment variables for database and API

## Testing and Verification
- [ ] Test authentication flow (login/register)
- [ ] Test multiplayer game creation and joining
- [ ] Test game events and scoring
- [ ] Verify database operations work correctly
- [ ] Check for any remaining errors or duplicates

## Deployment
- [ ] Ensure all services start correctly
- [ ] Verify frontend and backend communication
- [ ] Test full game flow end-to-end

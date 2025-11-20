# TODO: Fix 401 Unauthorized Error in Multiplayer Lobby

## Steps to Complete
- [ ] Update token retrieval in `src/components/MultiplayerLobby.tsx` to use `'token'` instead of `'auth_token'`
- [ ] Modify create room logic: send only `{ difficulty }` and handle response `{ roomId, roomCode }`
- [ ] Fix join room logic: fetch rooms list, find room by code to get roomId, then join with `/api/game/rooms/${roomId}/join` sending `{ playerName }`
- [ ] Update response handling for join (returns `{ participantId }`)
- [ ] Test the multiplayer lobby by logging in and attempting to create/join a room

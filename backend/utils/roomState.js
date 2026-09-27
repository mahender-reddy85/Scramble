const rooms = new Map();

export function getRoomState(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      players: new Map(), 
      locked: false,
      finishedPlayers: new Set()
    });
  }
  return rooms.get(roomId);
}

export function getPlayerState(roomId, userId) {
  const roomState = getRoomState(roomId);
  if (!roomState.players.has(userId)) {
    roomState.players.set(userId, {
      currentWord: '',
      currentHint: '',
      currentRound: 1,
      roundStartedAt: null,
      finished: false
    });
  }
  return roomState.players.get(userId);
}

export function setPlayerState(roomId, userId, data) {
  const playerState = getPlayerState(roomId, userId);
  Object.assign(playerState, data);
  return playerState;
}

export function setRoomState(roomId, data) {
  const current = getRoomState(roomId);
  Object.assign(current, data);
  return current;
}

export function deleteRoomState(roomId) {
  rooms.delete(roomId);
}

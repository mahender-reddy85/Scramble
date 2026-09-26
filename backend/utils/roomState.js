const rooms = new Map();

export function getRoomState(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      currentWord: '',
      currentHint: '',
      currentRound: 1,
      locked: false,
      roundTimer: null,
      finishedPlayers: new Set()
    });
  }
  return rooms.get(roomId);
}

export function setRoomState(roomId, data) {
  const current = getRoomState(roomId);
  Object.assign(current, data);
  return current;
}

export function deleteRoomState(roomId) {
  if (rooms.has(roomId)) {
    const state = rooms.get(roomId);
    if (state.roundTimer) {
      clearTimeout(state.roundTimer);
    }
    rooms.delete(roomId);
  }
}

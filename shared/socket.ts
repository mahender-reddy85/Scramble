export interface JoinRoomPayload {
  roomId: string;
  userId: string;
  playerName: string;
  token: string;
}

export interface SubmitAnswerPayload {
  roomId: string;
  userId: string;
  word: string;
}

export interface ToggleReadyPayload {
  roomId: string;
  userId: string;
}

export interface LeaveRoomPayload {
  roomId: string;
  userId: string;
}

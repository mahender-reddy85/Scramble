export type Difficulty = "easy" | "medium" | "hard";

export interface Player {
  id: string;
  user_id: string;
  player_name: string;
  score: number;
  current_streak: number;
  is_ready: boolean;
}

export interface Room {
  id: string;
  roomCode: string;
  difficulty: Difficulty;
  status: "waiting" | "playing" | "finished";
}

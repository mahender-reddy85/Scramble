export interface Player {
  id: string;
  user_id: string;
  player_name: string;
  score: number;
  current_streak: number;
  is_ready: boolean;
}

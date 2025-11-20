import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/apiClient';
import MultiplayerGame from './MultiplayerGame';

interface MultiplayerLobbyProps {
  onStartGame: (roomId: string) => void;
  onBack: () => void;
}

interface Player {
  id: string;
  player_name: string;
  is_ready: boolean;
  user_id: string;
}

export default function MultiplayerLobby({ onStartGame, onBack }: MultiplayerLobbyProps) {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Decode token to get user ID (simplified)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.id || payload.user?.id || 'anonymous');
      } catch (error) {
        console.error('Error decoding token:', error);
        setCurrentUserId('anonymous');
      }
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const loadPlayers = async () => {
      try {
        const response = await apiClient.get(`/api/game/rooms/${roomId}`);
        setPlayers(response.participants || []);
      } catch (error) {
        console.error('Error loading players:', error);
      }
    };

    loadPlayers();

    // For now, we'll poll for updates since we don't have real-time
    const interval = setInterval(loadPlayers, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [roomId]);

  const generateRoomCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsCreating(true);
    const newRoomCode = generateRoomCode();

    try {
      const response = await apiClient.post('/api/game/rooms', {
        room_code: newRoomCode,
        difficulty,
        player_name: playerName
      });

      setRoomId(response.room.id);
      setRoomCode(newRoomCode);
      setIsHost(true);
      toast.success(`Room ${newRoomCode} created!`);
    } catch (error: unknown) {
      console.error('Error creating room:', error);
      const message = error instanceof Error ? error.message : 'Failed to create room';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    setIsJoining(true);

    try {
      const response = await apiClient.post('/api/game/rooms/join', {
        room_code: roomCode,
        player_name: playerName
      });

      setRoomId(response.room.id);
      setDifficulty(response.room.difficulty as 'easy' | 'medium' | 'hard');
      toast.success(`Joined room ${roomCode}!`);
    } catch (error: unknown) {
      console.error('Error joining room:', error);
      const message = error instanceof Error ? error.message : 'Failed to join room';
      toast.error(message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleToggleReady = async () => {
    if (!roomId) return;

    const currentPlayer = players.find(p => p.user_id === currentUserId);
    if (!currentPlayer) return;

    try {
      await apiClient.patch(`/api/game/rooms/${roomId}/ready`, {
        participant_id: currentPlayer.id,
        is_ready: !isReady
      });
      setIsReady(!isReady);
    } catch (error: unknown) {
      console.error('Error updating ready status:', error);
      const message = error instanceof Error ? error.message : 'Failed to update ready status';
      toast.error(message);
    }
  };

  const handleStartGame = async () => {
    if (!roomId || !isHost) return;

    const allReady = players.every(p => p.is_ready || p.user_id === currentUserId);
    if (!allReady) {
      toast.error('All players must be ready');
      return;
    }

    if (players.length < 2) {
      toast.error('Need at least 2 players to start');
      return;
    }

    try {
      await apiClient.post(`/game/rooms/${roomId}/start`);
      setGameStarted(true);
    } catch (error: unknown) {
      console.error('Error starting game:', error);
      const message = error instanceof Error ? error.message : 'Failed to start game';
      toast.error(message);
    }
  };

  if (gameStarted && roomId) {
    return (
      <MultiplayerGame 
        roomId={roomId} 
        difficulty={difficulty}
        onExit={() => {
          setGameStarted(false);
          setRoomId(null);
          setPlayers([]);
          setIsReady(false);
          setIsHost(false);
          setRoomCode('');
        }}
      />
    );
  }

  if (roomId) {
    return (
      <div className="w-full max-w-[540px] bg-card rounded-2xl border border-border shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Room: {roomCode}</h2>
          <p className="text-muted-foreground">Difficulty: {difficulty}</p>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Players ({players.length})</h3>
          {players.map((player) => (
            <div 
              key={player.id}
              className={`flex justify-between items-center p-4 rounded-xl border ${
                player.user_id === currentUserId 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-muted border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{player.player_name}</span>
                {player.user_id === currentUserId && <span className="text-xs text-muted-foreground">(You)</span>}
              </div>
              {player.is_ready && <span className="text-green-500">✓ Ready</span>}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          {isHost ? (
            <Button
              onClick={handleStartGame}
              className="flex-1 rounded-xl"
              disabled={players.length < 2}
            >
              Start Game
            </Button>
          ) : (
            <Button
              onClick={handleToggleReady}
              variant={isReady ? 'secondary' : 'default'}
              className="flex-1 rounded-xl"
            >
              {isReady ? 'Not Ready' : 'Ready'}
            </Button>
          )}
          <Button
            onClick={() => {
              setRoomId(null);
              setPlayers([]);
              setIsReady(false);
              setIsHost(false);
              setRoomCode('');
            }}
            variant="outline"
            className="flex-1 rounded-xl"
          >
            Leave Room
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-[540px] bg-card rounded-2xl border border-border shadow-lg p-8 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Multiplayer Lobby</h2>
        <p className="text-muted-foreground">Create or join a room to play with friends</p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground">Select Difficulty:</label>
        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as const).map((level) => (
            <Button
              key={level}
              variant={difficulty === level ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDifficulty(level)}
              className="capitalize rounded-full flex-1"
            >
              {level}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          className="rounded-xl"
        />
        
        <div className="space-y-3">
          <Button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full rounded-xl"
          >
            {isCreating ? 'Creating...' : 'Create Room'}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          
          <Input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="Enter 4-digit code"
            className="rounded-xl"
            maxLength={4}
          />
          
          <Button
            onClick={handleJoinRoom}
            disabled={isJoining}
            variant="outline"
            className="w-full rounded-xl"
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </Button>
        </div>
      </div>

      <Button
        onClick={onBack}
        variant="ghost"
        className="w-full rounded-xl"
      >
        Back
      </Button>
    </Card>
  );
}

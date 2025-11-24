import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/apiClient';
import io from 'socket.io-client';
import MultiplayerGame from './MultiplayerGame';

interface MultiplayerLobbyProps {
  onBack: () => void;
}

interface Player {
  id: string;
  player_name: string;
  is_ready: boolean;
  user_id: string;
}

export default function MultiplayerLobby({ onBack }: MultiplayerLobbyProps) {
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
  const [creatorName, setCreatorName] = useState<string>('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
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
    if (!roomId || !currentUserId) return;

    const token = localStorage.getItem('token');
    socketRef.current = io('http://localhost:3001', {
      query: { roomId, userId: currentUserId }
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to socket in lobby');
      // Join the socket room
      socketRef.current.emit('join-room', {
        roomId,
        userId: currentUserId,
        playerName,
        token
      });
    });

    socketRef.current.on('participantsUpdated', (updatedPlayers: Player[]) => {
      console.log('Received participantsUpdated event:', updatedPlayers);
      setPlayers(updatedPlayers);
      // Update local ready status if it changed
      const currentPlayer = updatedPlayers.find(p => p.user_id === currentUserId);
      if (currentPlayer) {
        setIsReady(currentPlayer.is_ready);
      }
    });

    socketRef.current.on('countdown', (data: { countdown: number }) => {
      setCountdown(data.countdown);
    });

    socketRef.current.on('newWord', () => {
      setGameStarted(true);
      setCountdown(null);
    });

    socketRef.current.on('participant-joined', (data: { participants: Player[] }) => {
      console.log('Received participant-joined event:', data);
      setPlayers(data.participants);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId, currentUserId]);

  const loadRoomData = async () => {
    if (!roomId) return;
    try {
      const response = await apiClient.get(`/api/game/rooms/${roomId}`);
      setPlayers(response.participants || []);
      setCreatorName(response.room.creator_name || 'Unknown');
    } catch (error) {
      console.error('Error loading room data:', error);
      toast.error('Failed to load room data. Please refresh the page.');
    }
  };

  useEffect(() => {
    loadRoomData();
  }, [roomId]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsCreating(true);

    try {
      const response = await apiClient.post('/api/game/rooms', {
        difficulty
      });

      const { roomId, roomCode } = response;

      await apiClient.post(`/api/game/rooms/${roomId}/join`, {
        playerName
      });

      setRoomId(roomId);
      setRoomCode(roomCode);
      setIsHost(true);
      toast.success(`Room ${roomCode} created!`);
    } catch (error: unknown) {
      console.error('Error creating room:', error);
      const message = error instanceof Error && (error as any).response?.data?.error
        ? (error as any).response.data.error
        : error instanceof Error ? error.message : 'Failed to create room. Please check your connection and try again.';
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
      const roomsResponse = await apiClient.get('/api/game/rooms');
      const room = roomsResponse.rooms.find((r) => r.room_code === roomCode);

      if (!room) {
        toast.error('Room not found');
        return;
      }

      await apiClient.post(`/api/game/rooms/${room.id}/join`, {
        playerName
      });

      setRoomId(room.id);
      setDifficulty(room.difficulty as 'easy' | 'medium' | 'hard');
      toast.success(`Joined room ${roomCode}!`);
    } catch (error: unknown) {
      console.error('Error joining room:', error);
      const message = error instanceof Error && (error as any).response?.data?.error
        ? (error as any).response.data.error
        : error instanceof Error ? error.message : 'Failed to join room. Please check the room code and try again.';
      toast.error(message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleToggleReady = async () => {
    if (!roomId || !socketRef.current) return;

    const newReadyStatus = !isReady;

    socketRef.current.emit('toggle-ready', {
      roomId,
      userId: currentUserId,
      is_ready: newReadyStatus
    });
    toast.success(newReadyStatus ? 'You are now ready!' : 'You are no longer ready!');
  };

  const handleStartGame = async () => {
    if (!roomId || !isHost) return;

    const allReady = players.every(p => p.is_ready);
    if (!allReady) {
      toast.error('All players must be ready');
      return;
    }

    if (players.length < 2) {
      toast.error('Need at least 2 players to start');
      return;
    }

    try {
      await apiClient.post(`/api/game/rooms/${roomId}/start`);
      toast.success('Game starting...');
    } catch (error: unknown) {
      console.error('Error starting game:', error);
      const message = error instanceof Error && (error as any).response?.data?.error
        ? (error as any).response.data.error
        : error instanceof Error ? error.message : 'Failed to start game. Please try again.';
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
          setCountdown(null);
        }}
      />
    );
  }

  if (roomId) {
    return (
      <div className="w-full max-w-[540px] bg-card rounded-2xl border border-border shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Room: {roomCode}</h2>
          <p className="text-muted-foreground">Created by: {creatorName}</p>
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
              <div className="flex items-center gap-2">
                {player.is_ready && <span className="text-green-500">✓ Ready</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Countdown Overlay */}
        {countdown !== null && countdown > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="text-8xl font-bold text-white mb-4">{countdown}</div>
              <div className="text-2xl text-white/80">Get Ready!</div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleToggleReady}
            variant={isReady ? 'secondary' : 'default'}
            className="flex-1 rounded-xl"
            disabled={countdown !== null && countdown > 0}
          >
            {isReady ? 'Not Ready' : 'Ready'}
          </Button>
          {isHost && (
            <Button
              onClick={handleStartGame}
              className="flex-1 rounded-xl"
              disabled={players.length < 2 || !players.every(p => p.is_ready) || countdown !== null && countdown > 0}
            >
              Start Game
            </Button>
          )}
          <Button
            onClick={() => {
              setRoomId(null);
              setPlayers([]);
              setIsReady(false);
              setIsHost(false);
              setRoomCode('');
              setCountdown(null);
            }}
            variant="outline"
            className="flex-1 rounded-xl"
            disabled={countdown !== null && countdown > 0}
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
            placeholder="Enter 4-digit room code"
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

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/apiClient';
import { Socket } from 'socket.io-client';
import { Player } from '@/types';

interface MultiplayerGameProps {
  roomId: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  initialWord?: { hint: string; scrambled: string; length?: number } | null;
  onExit: () => void;
  socket: Socket | null;
}

export default function MultiplayerGame({ roomId, initialWord, onExit, socket }: MultiplayerGameProps) {
  const [scrambledWord, setScrambledWord] = useState('');
  const [currentHint, setCurrentHint] = useState('');
  const [timeLeft, setTimeLeft] = useState(20);
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [gameEnded, setGameEnded] = useState(false);
  const [waitingForOthers, setWaitingForOthers] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [roundCount, setRoundCount] = useState(1);
  const maxRounds = 10;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const playerNameRef = useRef<string>('');

  const loadPlayers = useCallback(async () => {
    try {
      const data = await apiClient.get(`/api/game/participants/${roomId}`);
      setPlayers(data || []);
    } catch {
      setPlayers([]);
    }
  }, [roomId]);

  const playSound = useCallback((type: 'correct' | 'wrong' | 'warning') => {
    const soundEnabled = localStorage.getItem('sound-enabled') !== 'false';
    if (!soundEnabled) return;

    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'correct') {
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } else if (type === 'wrong') {
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      oscillator.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } else if (type === 'warning') {
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
  }, []);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const token = localStorage.getItem('token');
    let userId = 'anonymous';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.id || payload.user?.id || 'anonymous';
        setCurrentUserId(userId);
      } catch {
        setCurrentUserId('anonymous');
      }
    }

    if (roomId && socket) {
      socketRef.current = socket;

      const handleNewWord = (data: { hint?: string; scrambled?: string; length?: number; round?: number }) => {
        if (data.scrambled) setScrambledWord(data.scrambled);
        if (data.hint) setCurrentHint(data.hint);
        setAnswer('');
        setFeedback({ message: '', type: '' });
        setTimeLeft(20);
        setShowCountdown(true);
        setCountdown(3);
        setShowHint(false);
        setHintUsed(false);
        if (data.round) setRoundCount(data.round);
      };

      const handleAnswerSubmitted = (data: { participants?: Player[]; userId?: string; isCorrect?: boolean; points?: number }) => {
        if (data.participants) setPlayers(data.participants);
        if (data.userId === userId) {
          if (data.isCorrect) {
            playSound('correct');
            stopTimer();
            setFeedback({ message: `Correct! +${data.points} points`, type: 'success' });
          } else {
            playSound('wrong');
            setFeedback({ message: 'Wrong answer, try again!', type: 'error' });
            setAnswer('');
            setTimeout(() => {
              setFeedback({ message: '', type: '' });
              inputRef.current?.focus();
            }, 2000);
          }
        }
      };

      const handleWaitingForOthers = () => {
        setWaitingForOthers(true);
      };

      const handleGameEnded = (data: { winner: Player; participants: Player[] }) => {
        setWinner(data.winner);
        setPlayers(data.participants);
        setGameEnded(true);
        setWaitingForOthers(false);
      };

      const handleParticipantsUpdated = (updatedPlayers: Player[]) => {
        setPlayers(
          updatedPlayers.map((player) => ({
            ...player,
            score: Number(player.score) || 0,
            current_streak: Number(player.current_streak) || 0,
          }))
        );
      };

      socket.on('newWord', handleNewWord);
      socket.on('answer-submitted', handleAnswerSubmitted);
      socket.on('waiting-for-others', handleWaitingForOthers);
      socket.on('game-ended', handleGameEnded);
      socket.on('gameEnded', handleGameEnded);
      socket.on('participantsUpdated', handleParticipantsUpdated);

      if (socket.connected) {
        socket.emit('join-room', {
          roomId,
          userId,
          playerName: playerNameRef.current,
          token
        });
      } else {
        socket.once('connect', () => {
          socket.emit('join-room', {
            roomId,
            userId,
            playerName: playerNameRef.current,
            token
          });
        });
      }

      loadPlayers();

      return () => {
        socket.off('newWord', handleNewWord);
        socket.off('answer-submitted', handleAnswerSubmitted);
        socket.off('waiting-for-others', handleWaitingForOthers);
        socket.off('game-ended', handleGameEnded);
        socket.off('gameEnded', handleGameEnded);
        socket.off('participantsUpdated', handleParticipantsUpdated);
        audioContextRef.current?.close();
      };
    }

    return () => {
      audioContextRef.current?.close();
    };
  }, [roomId, socket, loadPlayers, playSound, stopTimer]);

  useEffect(() => {
    if (initialWord) {
      setScrambledWord(initialWord.scrambled);
      setCurrentHint(initialWord.hint);
      setTimeLeft(20);
      setIsActive(true);
      setShowCountdown(true);
      setCountdown(3);
    }
  }, [initialWord]);

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    if (showCountdown && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setShowCountdown(false);
            setIsActive(true);
            setTimeLeft(20);
            inputRef.current?.focus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownInterval);
  }, [showCountdown, countdown]);

  useEffect(() => {
    if (roundCount > maxRounds && roundCount > 0) {
      if (socketRef.current) {
        socketRef.current.emit('player-finished', {
          roomId
        });
      }
    }
  }, [roundCount, maxRounds, roomId]);

  const handleTimeout = useCallback(() => {
    stopTimer();
    toast.error("Time's up for this round!", {
      position: 'bottom-right',
      duration: 3000,
    });
  }, [stopTimer]);

  const checkAnswer = useCallback(() => {
    if (!isActive) return;

    const userAnswer = answer.trim().toUpperCase();
    if (!userAnswer) {
      setFeedback({ message: 'Please enter an answer', type: 'error' });
      setTimeout(() => setFeedback({ message: '', type: '' }), 2000);
      return;
    }

    if (socketRef.current) {
      socketRef.current.emit('submit-answer', {
        roomId,
        word: userAnswer
      });
    }
  }, [isActive, answer, roomId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkAnswer();
    }
  };

  const toggleHint = () => {
    if (!hintUsed && !showHint) {
      setHintUsed(true);
      setShowHint(true);
      toast.info('Hint revealed!');
    }
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === 6) playSound('warning');
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleTimeout();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, timeLeft, handleTimeout, playSound]);

  const timerPercentage = (timeLeft / 20) * 100;
  const isLowTime = timeLeft <= 5;

  if (waitingForOthers) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="w-full max-w-[540px] bg-card rounded-2xl border border-border shadow-lg p-8 flex flex-col items-center justify-center space-y-6">
          <div className="text-4xl font-bold text-foreground text-center">Round 10 Complete!</div>
          <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xl text-center text-muted-foreground font-medium">
            Your friend is still playing...<br />
            Wait for the final results.
          </p>
          <div className="flex flex-col w-full bg-muted rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-center text-foreground">Current Standings</h3>
            {players.map((player) => (
              <div key={player.id} className="flex justify-between items-center text-foreground">
                <span>{player.player_name}</span>
                <span className="font-bold">{player.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (gameEnded && winner) {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const topScore = sortedPlayers[0]?.score || 0;
    const winners = sortedPlayers.filter(p => p.score === topScore);
    const isTie = winners.length > 1;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="w-full max-w-[540px] bg-card rounded-2xl border border-border shadow-lg p-8 space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl sm:text-5xl font-bold text-foreground">Game Over!</h1>
            <div className="text-xl sm:text-2xl font-semibold text-primary">
              {isTie ? "It's a Tie!" : (winners[0].user_id === currentUserId ? "You Won!" : `${winners[0].player_name} Wins!`)}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-center text-foreground">Final Scores</h3>
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`flex justify-between items-center p-4 rounded-xl border ${
                  player.user_id === currentUserId
                    ? 'bg-primary/10 border-primary'
                    : 'bg-muted border-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">#{index + 1}</span>
                  <span className="text-foreground">{player.player_name}</span>
                </div>
                <div className="text-xl font-bold text-foreground">{player.score}</div>
              </div>
            ))}
          </div>

          <Button onClick={onExit} className="w-full rounded-xl text-lg py-6 font-semibold">
            Back to Lobby
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="w-full max-w-[540px] bg-card rounded-2xl border border-border shadow-lg p-4 sm:p-8 space-y-6 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onExit}
          className="absolute top-2 left-2 sm:top-4 sm:left-4 rounded-full"
          title="Exit to lobby"
        >
          ✕
        </Button>

        <div className="text-center space-y-2 pt-4 sm:pt-0">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">Multiplayer Game</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Round {Math.min(roundCount, maxRounds)} of {maxRounds}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4">
          {players.map((player) => (
            <div
              key={player.id}
              className={`flex justify-between items-center p-2.5 sm:p-3 rounded-xl border transition-all duration-300 ${
                player.user_id === currentUserId
                  ? 'bg-primary/15 border-primary shadow-sm ring-1 ring-primary/20'
                  : 'bg-muted/50 border-border opacity-90'
              }`}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className={`font-bold text-sm sm:text-base text-foreground truncate ${player.user_id === currentUserId ? 'max-w-[100px]' : 'max-w-[120px]'}`}>{player.player_name}</span>
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground">Streak: {player.current_streak}</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground tabular-nums select-none">{player.score}</div>
            </div>
          ))}
        </div>

        {showCountdown ? (
          <div className="flex flex-col items-center justify-center space-y-4 p-8">
            <div className="text-6xl font-bold text-primary animate-bounce">
              {countdown}
            </div>
            <p className="text-xl text-muted-foreground">Get Ready!</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time Remaining</span>
                <span className={`font-semibold ${isLowTime ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
                  {timeLeft}s
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isLowTime ? 'bg-destructive' : 'bg-primary'
                  }`}
                  style={{ width: `${timerPercentage}%` }}
                />
              </div>
            </div>

            <div className="bg-muted rounded-xl border border-border p-4 sm:p-8 text-center space-y-3">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-normal sm:tracking-widest break-all">
                {scrambledWord}
              </div>
              <div className="flex items-center justify-center gap-2">
                {showHint && (
                  <div className="text-sm text-muted-foreground italic">{currentHint}</div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleHint}
                  className="rounded-full"
                  title="Show hint"
                  disabled={!isActive}
                >
                  💡
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer..."
                  className="flex-1 rounded-xl text-lg"
                  autoComplete="off"
                  disabled={!isActive}
                />
                <Button
                  onClick={checkAnswer}
                  disabled={!isActive}
                  className="px-6 rounded-xl font-semibold"
                >
                  Submit
                </Button>
              </div>
            </div>
          </>
        )}

        {feedback.message && (
          <div
            className={`text-center py-3 px-4 rounded-xl font-semibold ${
              feedback.type === 'success'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30'
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
}

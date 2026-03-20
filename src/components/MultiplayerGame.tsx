import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/apiClient';
import io from 'socket.io-client';

interface WordItem {
  word: string;
  hint: string;
}

interface Player {
  id: string;
  player_name: string;
  score: number;
  current_streak: number;
  user_id: string;
}

interface MultiplayerGameProps {
  roomId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  initialWord?: { word: string; hint: string; scrambled: string } | null;
  onExit: () => void;
}

export default function MultiplayerGame({ roomId, difficulty, initialWord, onExit }: MultiplayerGameProps) {
  const [currentWord, setCurrentWord] = useState('');
  const [scrambledWord, setScrambledWord] = useState('');
  const [currentHint, setCurrentHint] = useState('');
  const [timeLeft, setTimeLeft] = useState(20);
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [gameEnded, setGameEnded] = useState(false);
  const [waitingForOthers, setWaitingForOthers] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [roundCount, setRoundCount] = useState(0);
  const maxRounds = 10;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isSendingNewWordEventRef = useRef(false);
  const isSendingAnswerEventRef = useRef(false);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const playerNameRef = useRef<string>('');

  useEffect(() => {
    // Audio Context
    audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // User ID
    const token = localStorage.getItem('token');
    let userId = 'anonymous';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.id || payload.user?.id || 'anonymous';
        setCurrentUserId(userId);
      } catch (error) {
        console.error('Error decoding token:', error);
        setCurrentUserId('anonymous');
      }
    }

    // Socket Setup
    if (roomId) {
      socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
        query: { roomId, userId }
      });

      socketRef.current.on('connect', () => {
        socketRef.current?.emit('join-room', {
          roomId,
          userId,
          playerName: playerNameRef.current,
          token
        });
      });

      socketRef.current.on('waiting-for-others', () => {
        setWaitingForOthers(true);
      });

      socketRef.current.on('game-ended', (data: { winner: Player, participants: Player[] }) => {
        setWinner(data.winner);
        setPlayers(data.participants);
        setGameEnded(true);
        setWaitingForOthers(false);
      });

      socketRef.current.on('participantsUpdated', (updatedPlayers: Player[]) => {
        setPlayers(updatedPlayers);
      });

      // Also load initial player state via REST to ensure we have data immediately
      loadPlayers();
    }

    return () => {
      audioContextRef.current?.close();
      socketRef.current?.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    // Set initial word if provided from parent
    if (initialWord) {
      setCurrentWord(initialWord.word);
      setScrambledWord(initialWord.scrambled);
      setCurrentHint(initialWord.hint);
      setIsActive(true);
      setGameStarted(true);
      inputRef.current?.focus();
      // If this is the first word, start round 1 so UI shows correct round and scoreboard
      setRoundCount(prev => prev === 0 ? 1 : prev);
    }
  }, [initialWord]);

  const playSound = useCallback((type: 'correct' | 'wrong' | 'warning') => {
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

  const scrambleWord = useCallback((word: string): string => {
    const scramble = (str: string): string => {
      const letters = str.split('');
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
      }
      const scrambled = letters.join('');
      return scrambled === str ? scramble(str) : scrambled;
    };
    return scramble(word);
  }, []);

  const loadPlayers = useCallback(async () => {
    try {
      const data = await apiClient.get(`/api/game/participants/${roomId}`);
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  }, [roomId]);

  // Load players on mount / when room is set so scoreboard shows immediately
  useEffect(() => {
    if (roomId) {
      loadPlayers();
    }
  }, [roomId, loadPlayers]);

  const updatePlayerScore = useCallback(async (points: number, newStreak: number) => {
    const currentPlayer = players.find(p => p.user_id === currentUserId);
    if (!currentPlayer) return;

    const newScore = currentPlayer.score + points;

    try {
      await apiClient.put(`/api/game/participants/${currentPlayer.id}`, {
        score: newScore,
        current_streak: newStreak
      });
      // Update local state immediately after backend update
      setPlayers(prev => prev.map(p => p.id === currentPlayer.id ? { ...p, score: newScore, current_streak: newStreak } : p));
    } catch (error) {
      console.error('Error updating score:', error);
    }
  }, [currentUserId, players]);

  const loadNewWord = useCallback(async (currentRound: number) => {
      if (currentRound > maxRounds) {
        return;
      }

      try {
        const freshData = await apiClient.get(`/api/game/participants/${roomId}`);
        if (freshData && freshData.length > 0) {
          setPlayers(freshData);
        }
      } catch (error) {
        console.error('Error loading players:', error);
      }

      try {
        const response = await apiClient.get(`/api/game/words/${difficulty}`);
        const words = response.words;
        const randomIndex = Math.floor(Math.random() * words.length);
        const wordItem = words[randomIndex];

        const newScrambled = scrambleWord(wordItem.word);

        setCurrentWord(wordItem.word);
        setScrambledWord(newScrambled);
        setCurrentHint(wordItem.hint);
        setAnswer('');
        setFeedback({ message: '', type: '' });
        setTimeLeft(20);
        setShowCountdown(true);
        setCountdown(3);
        setIsActive(false);
        setShowHint(false);
        setHintUsed(false);

        // Log event
        if (isSendingNewWordEventRef.current) return;
        isSendingNewWordEventRef.current = true;
        try {
          await apiClient.post('/api/game/events', {
            room_id: roomId,
            user_id: currentUserId,
            event_type: 'new_word',
            current_word: wordItem.word
          });
          isSendingNewWordEventRef.current = false;
        } catch (error) {
          console.error('Error logging event:', error);
          console.error("Event send failed once, stopping retries");
          isSendingNewWordEventRef.current = false;
          return;
        }
      } catch (error) {
        console.error('Error loading words:', error);
      }
    }, [difficulty, roomId, currentUserId, maxRounds, scrambleWord]);

  // Countdown effect
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

  // Handle game end when all rounds are complete
  useEffect(() => {
    if (roundCount > maxRounds && roundCount > 0) {
      const handlePlayerFinished = async () => {
        try {
          // Tell server this player is done
          if (socketRef.current) {
            socketRef.current.emit('player-finished', {
              roomId,
              userId: currentUserId
            });
          }
        } catch (error) {
          console.error('Error in handlePlayerFinished:', error);
        }
      };

      handlePlayerFinished();
    }
  }, [roundCount, maxRounds, roomId, currentUserId]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
  }, []);

  const handleTimeout = useCallback(() => {
    stopTimer();
    toast.error(`Time's up! The correct word was: ${currentWord}`, {
      position: 'bottom-right',
      duration: 4000,
    });
    
    const currentPlayer = players.find(p => p.user_id === currentUserId);
    if (currentPlayer) {
      updatePlayerScore(0, 0);
    }
    
     setTimeout(() => {
       setRoundCount(prev => {
         const nextRound = prev + 1;
         if (nextRound <= maxRounds) {
           loadNewWord(nextRound);
         }
         return nextRound;
       });
     }, 3000);
   }, [currentWord, stopTimer, loadNewWord, currentUserId, players, updatePlayerScore, maxRounds]);

  const getBasePoints = useCallback(() => {
    // Ensure difficulty is a string and handle case normalization
    const diff = String(difficulty || 'easy').toLowerCase();
    const pointsMap: Record<string, number> = { easy: 5, medium: 8, hard: 10 };
    return pointsMap[diff] || 5;
  }, [difficulty]);

  const handleCorrectAnswer = useCallback(async () => {
    stopTimer();
    playSound('correct');
    
    const currentPlayer = players.find(p => p.user_id === currentUserId);
    if (!currentPlayer) return;

    const basePoints = Number(getBasePoints()) || 5;
    const current_s = Number(currentPlayer.current_streak);
    const validCurrentStreak = isNaN(current_s) ? 0 : current_s;
    const newStreak = validCurrentStreak + 1;
    const streakBonus = newStreak * 3;
    const timeVal = Number(timeLeft);
    const timeBonus = isNaN(timeVal) ? 0 : timeVal;
    
    // Final defensive sum - Absolute protection against NaN
    let totalPoints = Number(basePoints + streakBonus + timeBonus);
    if (isNaN(totalPoints)) totalPoints = 10;
    
    // Convert to regular integers for the UI
    totalPoints = Math.floor(totalPoints);
    
    await updatePlayerScore(totalPoints, newStreak);
    setFeedback({ message: `Correct! +${totalPoints} points`, type: 'success' });

    // Log event
    if (isSendingAnswerEventRef.current) return;
    isSendingAnswerEventRef.current = true;
    try {
      await apiClient.post('/api/game/events', {
        roomId: roomId,
        userId: currentUserId,
        event_type: 'answer',
        word: currentWord,
        isCorrect: true,
        points: totalPoints
      });
      isSendingAnswerEventRef.current = false;
    } catch (error) {
      console.error('Error logging event:', error);
      console.error("Event send failed once, stopping retries");
      isSendingAnswerEventRef.current = false;
      return;
    }
   
     setTimeout(() => {
       setRoundCount(prev => {
         const nextRound = prev + 1;
         if (nextRound <= maxRounds) {
           loadNewWord(nextRound);
         }
         return nextRound;
       });
     }, 2500);
   }, [stopTimer, getBasePoints, timeLeft, loadNewWord, playSound, currentUserId, players, updatePlayerScore, roomId, currentWord, maxRounds]);

  const handleWrongAnswer = useCallback(async () => {
    playSound('wrong');
    
    const currentPlayer = players.find(p => p.user_id === currentUserId);
    if (currentPlayer) {
      await updatePlayerScore(0, 0);
    }

    setFeedback({ message: 'Wrong answer, try again!', type: 'error' });
    setAnswer('');

    // Log event
    if (isSendingAnswerEventRef.current) return;
    isSendingAnswerEventRef.current = true;
    try {
      await apiClient.post('/api/game/events', {
        roomId: roomId,
        userId: currentUserId,
        word: currentWord,
        isCorrect: false,
        points: 0
      });
      isSendingAnswerEventRef.current = false;
    } catch (error) {
      console.error('Error logging event:', error);
      console.error("Event send failed once, stopping retries");
      isSendingAnswerEventRef.current = false;
      return;
    }

    setTimeout(() => {
      setFeedback({ message: '', type: '' });
      inputRef.current?.focus();
    }, 2500);
  }, [playSound, currentUserId, players, updatePlayerScore, roomId, currentWord]);

  const checkAnswer = useCallback(() => {
    if (!isActive) return;
    
    const userAnswer = answer.trim().toUpperCase();
    if (!userAnswer) {
      setFeedback({ message: 'Please enter an answer', type: 'error' });
      setTimeout(() => setFeedback({ message: '', type: '' }), 2000);
      return;
    }
    
    if (userAnswer === currentWord) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
  }, [isActive, answer, currentWord, handleCorrectAnswer, handleWrongAnswer]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkAnswer();
    }
  };

  const toggleHint = async () => {
    if (!hintUsed && !showHint) {
      setHintUsed(true);
      const penalty = Math.floor(getBasePoints() * 0.3);
      
      const currentPlayer = players.find(p => p.user_id === currentUserId);
      if (currentPlayer) {
        // Don't await here to prevent UI blocking
        updatePlayerScore(-penalty, currentPlayer.current_streak).catch(console.error);
      }

      toast.warning(`Hint used! -${penalty} points`, {
        position: 'bottom-right',
        duration: 2000,
      });
    }
    setShowHint(!showHint);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      if (timeLeft === 5) {
        playSound('warning');
      }
      
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            return 0;
          }
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

  const currentPlayer = players.find(p => p.user_id === currentUserId);

  if (waitingForOthers) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="w-full max-w-[540px] bg-card rounded-2xl border border-border shadow-lg p-8 flex flex-col items-center justify-center space-y-6">
          <div className="text-4xl font-bold text-foreground text-center">Round 10 Complete!</div>
          <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
        {/* Exit Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onExit}
          className="absolute top-2 left-2 sm:top-4 sm:left-4 rounded-full"
          title="Exit to lobby"
        >
          ✕
        </Button>

        {/* Header */}
        <div className="text-center space-y-2 pt-4 sm:pt-0">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">Multiplayer Game</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Round {Math.min(roundCount, maxRounds)} of {maxRounds}</p>
        </div>

        {/* Players Scoreboard */}
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
          /* Countdown Display */
          <div className="flex flex-col items-center justify-center space-y-4 p-8">
            <div className="text-6xl font-bold text-primary animate-bounce">
              {countdown}
            </div>
            <p className="text-xl text-muted-foreground">Get Ready!</p>
          </div>
        ) : (
          <>
            {/* Timer */}
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

            {/* Word Display */}
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
                  title="Show hint (costs points)"
                  disabled={!isActive}
                >
                  💡
                </Button>
              </div>
            </div>

            {/* Input Section */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
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

        {/* Feedback */}
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

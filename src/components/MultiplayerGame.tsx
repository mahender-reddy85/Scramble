import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { apiClient, SOCKET_URL } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface WordItem {
  word: string;
  hint: string;
}

const wordBanks: Record<string, WordItem[]> = {
  easy: [
    { word: 'APPLE', hint: 'A common fruit' },
    { word: 'HOUSE', hint: 'A place to live' },
    { word: 'WATER', hint: 'Essential for life' },
    { word: 'MUSIC', hint: 'Sound that entertains' },
    { word: 'LIGHT', hint: 'Opposite of dark' },
    { word: 'HAPPY', hint: 'A positive emotion' },
    { word: 'PHONE', hint: 'Communication device' },
    { word: 'CHAIR', hint: 'Furniture to sit on' },
    { word: 'PAPER', hint: 'Used for writing' },
    { word: 'CLOUD', hint: 'Floats in the sky' },
  ],
  medium: [
    { word: 'BUTTERFLY', hint: 'Colorful insect' },
    { word: 'COMPUTER', hint: 'Electronic device' },
    { word: 'MOUNTAIN', hint: 'High landform' },
    { word: 'HOSPITAL', hint: 'Medical facility' },
    { word: 'ELEPHANT', hint: 'Large mammal' },
    { word: 'CALENDAR', hint: 'Tracks dates' },
    { word: 'QUESTION', hint: 'Seeks an answer' },
    { word: 'TREASURE', hint: 'Valuable items' },
    { word: 'KEYBOARD', hint: 'Input device' },
    { word: 'LANGUAGE', hint: 'Form of communication' },
  ],
  hard: [
    { word: 'ACHIEVEMENT', hint: 'Accomplishment' },
    { word: 'PSYCHOLOGY', hint: 'Study of mind' },
    { word: 'PHILOSOPHY', hint: 'Study of wisdom' },
    { word: 'ATMOSPHERE', hint: 'Layer of gases' },
    { word: 'TECHNOLOGY', hint: 'Modern innovation' },
    { word: 'INCREDIBLE', hint: 'Hard to believe' },
    { word: 'THROUGHOUT', hint: 'From start to end' },
    { word: 'VOCABULARY', hint: 'Collection of words' },
    { word: 'MYSTERIOUS', hint: 'Full of mystery' },
    { word: 'BENEFICIAL', hint: 'Providing advantage' },
  ]
};

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
  onExit: () => void;
}

export default function MultiplayerGame({ roomId, difficulty, onExit }: MultiplayerGameProps) {
  const navigate = useNavigate();
  const [currentWord, setCurrentWord] = useState('');
  const [scrambledWord, setScrambledWord] = useState('');
  const [currentHint, setCurrentHint] = useState('');
  const [timeLeft, setTimeLeft] = useState(15);
  const [isActive, setIsActive] = useState(false);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [roundCount, setRoundCount] = useState(0);
  const maxRounds = 10;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.id || payload.user?.id || 'anonymous');
      } catch (error) {
        console.error('Error decoding token:', error);
        setCurrentUserId('anonymous');
      }
    }

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

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

  const scrambleWord = (word: string): string => {
    const letters = word.split('');
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    const scrambled = letters.join('');
    return scrambled === word ? scrambleWord(word) : scrambled;
  };

  const loadPlayers = useCallback(async () => {
    try {
      const data = await apiClient.get(`/game/participants/${roomId}`);
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  }, [roomId]);

  const updatePlayerScore = useCallback(async (points: number, newStreak: number) => {
    const currentPlayer = players.find(p => p.user_id === currentUserId);
    if (!currentPlayer) return;

    const newScore = currentPlayer.score + points;

    try {
      await apiClient.put(`/game/participants/${currentPlayer.id}`, {
        score: newScore,
        current_streak: newStreak
      });
    } catch (error) {
      console.error('Error updating score:', error);
    }
  }, [currentUserId, players]);

  const loadNewWord = useCallback(async () => {
    if (roundCount >= maxRounds) {
      setGameEnded(true);
      const topPlayer = players.reduce((prev, current) =>
        (current.score > prev.score) ? current : prev
      );
      setWinner(topPlayer);

      try {
        await apiClient.patch(`/game/rooms/${roomId}`, {
          status: 'finished',
          finished_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating room status:', error);
      }

      return;
    }

    const words = wordBanks[difficulty];
    const randomIndex = Math.floor(Math.random() * words.length);
    const wordItem = words[randomIndex];

    const newScrambled = scrambleWord(wordItem.word);

    setCurrentWord(wordItem.word);
    setScrambledWord(newScrambled);
    setCurrentHint(wordItem.hint);
    setAnswer('');
    setFeedback({ message: '', type: '' });
    setTimeLeft(15);
    setIsActive(true);
    setShowHint(false);
    setHintUsed(false);
    setRoundCount(prev => prev + 1);

    // Log event
    try {
      await apiClient.post('/game/events', {
        room_id: roomId,
        user_id: currentUserId,
        event_type: 'new_word',
        current_word: wordItem.word
      });
    } catch (error) {
      console.error('Error logging event:', error);
    }

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [difficulty, roomId, currentUserId, roundCount, players, maxRounds, scrambleWord, inputRef]);

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
    
    setTimeout(() => loadNewWord(), 2000);
  }, [currentWord, stopTimer, loadNewWord, currentUserId, players, updatePlayerScore]);

  const getBasePoints = useCallback(() => {
    const pointsMap = { easy: 5, medium: 8, hard: 10 };
    return pointsMap[difficulty];
  }, [difficulty]);

  const handleCorrectAnswer = useCallback(async () => {
    stopTimer();
    playSound('correct');
    
    const currentPlayer = players.find(p => p.user_id === currentUserId);
    if (!currentPlayer) return;

    const basePoints = getBasePoints();
    const newStreak = currentPlayer.current_streak + 1;
    const streakBonus = newStreak * 3;
    const timeBonus = timeLeft;
    const totalPoints = basePoints + streakBonus + timeBonus;
    
    await updatePlayerScore(totalPoints, newStreak);
    setFeedback({ message: `Correct! +${totalPoints} points`, type: 'success' });

    // Log event
    try {
      await apiClient.post('/game/events', {
        room_id: roomId,
        user_id: currentUserId,
        event_type: 'answer',
        current_word: currentWord,
        is_correct: true,
        points_earned: totalPoints
      });
    } catch (error) {
      console.error('Error logging event:', error);
    }
    
    setTimeout(() => loadNewWord(), 1500);
  }, [stopTimer, getBasePoints, timeLeft, loadNewWord, playSound, currentUserId, players, updatePlayerScore, roomId, currentWord]);

  const handleWrongAnswer = useCallback(async () => {
    playSound('wrong');
    
    const currentPlayer = players.find(p => p.user_id === currentUserId);
    if (currentPlayer) {
      await updatePlayerScore(0, 0);
    }

    setFeedback({ message: 'Wrong answer, try again!', type: 'error' });
    setAnswer('');

    // Log event
    try {
      await apiClient.post('/game/events', {
        room_id: roomId,
        user_id: currentUserId,
        event_type: 'answer',
        current_word: currentWord,
        is_correct: false,
        points_earned: 0
      });
    } catch (error) {
      console.error('Error logging event:', error);
    }

    setTimeout(() => {
      setFeedback({ message: '', type: '' });
      inputRef.current?.focus();
    }, 2000);
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
        await updatePlayerScore(-penalty, currentPlayer.current_streak);
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

  // Setup realtime channel
  useEffect(() => {
    loadPlayers();

    // Note: Realtime functionality needs to be implemented via backend
    // For now, we'll use polling or implement socket connection later

    // Start first round
    setTimeout(() => loadNewWord(), 1000);
  }, [roomId, loadPlayers, loadNewWord]);

  const timerPercentage = (timeLeft / 15) * 100;
  const isLowTime = timeLeft <= 5;

  const currentPlayer = players.find(p => p.user_id === currentUserId);

  if (gameEnded && winner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="w-full max-w-[540px] bg-card rounded-2xl border border-border shadow-lg p-8 space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-foreground">🏆 Game Over!</h1>
            <div className="text-2xl font-semibold text-primary">
              {winner.user_id === currentUserId ? "You Won!" : `${winner.player_name} Wins!`}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-center text-foreground">Final Scores</h3>
            {players.map((player, index) => (
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
                  {player.user_id === currentUserId && <span className="text-xs text-muted-foreground">(You)</span>}
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
      <div className="w-full max-w-[540px] bg-card rounded-2xl border border-border shadow-lg p-8 space-y-6 relative">
        {/* Exit Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onExit}
          className="absolute top-4 left-4 rounded-full"
          title="Exit to lobby"
        >
          ✕
        </Button>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Multiplayer Game</h1>
          <p className="text-muted-foreground">Round {roundCount} of {maxRounds}</p>
        </div>

        {/* Players */}
        <div className="space-y-2">
          {players.map((player) => (
            <div 
              key={player.id}
              className={`flex justify-between items-center p-3 rounded-xl border ${
                player.user_id === currentUserId 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-muted border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{player.player_name}</span>
                {player.user_id === currentUserId && <span className="text-xs text-muted-foreground">(You)</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Streak: {player.current_streak}</span>
                <span className="text-xl font-bold text-foreground">{player.score}</span>
              </div>
            </div>
          ))}
        </div>

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
        <div className="bg-muted rounded-xl border border-border p-8 text-center space-y-3">
          <div className="text-5xl font-bold text-foreground tracking-widest">
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

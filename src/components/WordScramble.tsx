import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import MultiplayerLobby from './MultiplayerLobby';
import UserMenu from './UserMenu';
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
    { word: 'SMILE', hint: 'Facial expression' },
    { word: 'PLANT', hint: 'Grows in soil' },
    { word: 'BREAD', hint: 'Common food' },
    { word: 'OCEAN', hint: 'Large body of water' },
    { word: 'DREAM', hint: 'Happens during sleep' }
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
    { word: 'SANDWICH', hint: 'Popular meal' },
    { word: 'BIRTHDAY', hint: 'Annual celebration' },
    { word: 'UNIVERSE', hint: 'Everything that exists' },
    { word: 'BUILDING', hint: 'Structure with walls' },
    { word: 'PLATFORM', hint: 'Raised surface' }
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
    { word: 'RESTAURANT', hint: 'Place to eat out' },
    { word: 'CHAMPIONSHIP', hint: 'Top competition' },
    { word: 'RESPONSIBILITY', hint: 'Duty or obligation' },
    { word: 'SIGNIFICANCE', hint: 'Importance or meaning' },
    { word: 'ENTREPRENEUR', hint: 'Business starter' }
  ]
};

export default function WordScramble() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [currentWord, setCurrentWord] = useState('');
  const [scrambledWord, setScrambledWord] = useState('');
  const [currentHint, setCurrentHint] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isActive, setIsActive] = useState(false);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [isDark, setIsDark] = useState(false);
  const [showStart, setShowStart] = useState(true);
  const [showGameStarted, setShowGameStarted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [gameMode, setGameMode] = useState<'single' | 'multi'>('single');
  const [showMultiplayerLobby, setShowMultiplayerLobby] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    // Check authentication status
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Play sound effect
  const playSound = useCallback((type: 'correct' | 'wrong' | 'warning') => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'correct') {
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
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

  const loadNewWord = useCallback(() => {
    const words = wordBanks[difficulty];
    const randomIndex = Math.floor(Math.random() * words.length);
    const wordItem = words[randomIndex];
    
    setCurrentWord(wordItem.word);
    setScrambledWord(scrambleWord(wordItem.word));
    setCurrentHint(wordItem.hint);
    setAnswer('');
    setFeedback({ message: '', type: '' });
    setTimeLeft(15);
    setIsActive(true);
    setShowHint(false);
    setHintUsed(false);
    
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [difficulty]);

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
    setStreak(0);
    loadNewWord();
  }, [currentWord, stopTimer, loadNewWord]);

  const getBasePoints = useCallback(() => {
    const pointsMap = { easy: 5, medium: 8, hard: 10 };
    return pointsMap[difficulty];
  }, [difficulty]);

  const handleCorrectAnswer = useCallback(() => {
    stopTimer();
    playSound('correct');
    const basePoints = getBasePoints();
    const newStreak = streak + 1;
    const streakBonus = newStreak * 3;
    const timeBonus = timeLeft;
    const totalPoints = basePoints + streakBonus + timeBonus;
    
    setScore(prev => prev + totalPoints);
    setStreak(newStreak);
    setFeedback({ message: `Correct! +${totalPoints} points`, type: 'success' });
    
    setTimeout(() => loadNewWord(), 1000);
  }, [stopTimer, getBasePoints, streak, timeLeft, loadNewWord, playSound]);

  const handleWrongAnswer = useCallback(() => {
    playSound('wrong');
    setStreak(0);
    setFeedback({ message: 'Wrong answer, try again!', type: 'error' });
    setAnswer('');
    setTimeout(() => {
      setFeedback({ message: '', type: '' });
      inputRef.current?.focus();
    }, 2000);
  }, [playSound]);

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

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      // Play warning sound when time is low
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

  const handleStartGame = () => {
    if (gameMode === 'multi') {
      if (!isAuthenticated) {
        toast.error('Please log in to play multiplayer');
        navigate('/auth');
        return;
      }
      setShowMultiplayerLobby(true);
    } else {
      setShowStart(false);
      setShowGameStarted(true);
    }
  };

  const handleStartRound = () => {
    setShowGameStarted(false);
    setTimeout(() => loadNewWord(), 100);
  };

  const toggleHint = () => {
    if (!hintUsed && !showHint) {
      setHintUsed(true);
      setScore(prev => prev - 3);
      toast.warning(`Hint used! -3 points`, {
        position: 'bottom-right',
        duration: 2000,
      });
    }
    setShowHint(!showHint);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const timerPercentage = (timeLeft / 15) * 100;
  const isLowTime = timeLeft <= 5;

  return (
    <div className="min-h-screen bg-background relative">
      <UserMenu />
      <div className="flex items-center justify-center min-h-screen p-5">
        {showMultiplayerLobby ? (
          <MultiplayerLobby
            onStartGame={(roomId) => {
              console.log('Starting multiplayer game with room:', roomId);
              toast.info('Multiplayer coming soon!');
            }}
            onBack={() => {
              setShowMultiplayerLobby(false);
              setShowStart(true);
            }}
          />
        ) : showStart ? (
          <div className="w-full max-w-[540px] bg-card rounded-2xl border border-border shadow-lg p-8 space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-5xl font-bold text-foreground tracking-tight">Word Scramble</h1>
              <p className="text-xl text-muted-foreground">Challenge your word-solving abilities!</p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-center">Choose Game Mode:</h3>
              <div className="flex gap-3">
                <Button
                  variant={gameMode === 'single' ? 'default' : 'outline'}
                  className="flex-1 rounded-xl"
                  onClick={() => setGameMode('single')}
                >
                  Single Player
                </Button>
                <Button
                  variant={gameMode === 'multi' ? 'default' : 'outline'}
                  className="flex-1 rounded-xl"
                  onClick={() => setGameMode('multi')}
                >
                  Multiplayer
                </Button>
              </div>
            </div>

            <div className="space-y-4 text-muted-foreground">
              <div className="bg-muted rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-foreground">🎯 How to Play:</h3>
                <ul className="space-y-1 text-sm list-disc list-inside">
                  <li>Unscramble the letters to form the correct word</li>
                  <li>You have 15 seconds for each word</li>
                  <li>Earn points based on difficulty and speed</li>
                  <li>Build streaks for bonus points</li>
                </ul>
              </div>

              <div className="bg-muted rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-foreground">🏆 Scoring:</h3>
                <ul className="space-y-1 text-sm list-disc list-inside">
                  <li>Easy: 5 points</li>
                  <li>Medium: 8 points</li>
                  <li>Hard: 10 points</li>
                  <li>Streak Bonus: +3 points per streak</li>
                  <li>Time Bonus: +1 point per second remaining</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={handleStartGame}
              className="w-full rounded-xl text-lg py-6 font-semibold"
            >
              Start Game
            </Button>
          </div>
        ) : showGameStarted ? (
          <div className="w-full max-w-[540px] bg-card rounded-2xl border border-border shadow-lg p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-foreground tracking-tight">Word Scramble</h1>
              <p className="text-muted-foreground">Ready to play?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-xl border border-border p-4 text-center">
                <div className="text-sm text-muted-foreground mb-1">Score</div>
                <div className="text-3xl font-bold text-foreground">{score}</div>
              </div>
              <div className="bg-muted rounded-xl border border-border p-4 text-center">
                <div className="text-sm text-muted-foreground mb-1">Streak</div>
                <div className="text-3xl font-bold text-foreground">{streak}</div>
              </div>
            </div>

            <Button
              onClick={handleStartRound}
              className="w-full rounded-xl text-lg py-6 font-semibold"
            >
              Start Round
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-[540px] bg-card rounded-2xl border border-border shadow-lg p-8 space-y-6 relative">
          {/* Exit Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              stopTimer();
              setShowStart(true);
              setScore(0);
              setStreak(0);
            }}
            className="absolute top-4 left-4 rounded-full"
            title="Exit to menu"
          >
            ✕
          </Button>

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">Word Scramble</h1>
            <p className="text-muted-foreground">Unscramble the word before time runs out</p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="rounded-full"
            >
              {isDark ? '☀️' : '🌙'}
            </Button>
            <div className="flex gap-2 items-center">
              {(['easy', 'medium', 'hard'] as const).map((level) => (
                <Button
                  key={level}
                  variant={difficulty === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setDifficulty(level);
                    stopTimer();
                    loadNewWord();
                  }}
                  className="capitalize rounded-full"
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-xl border border-border p-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">Score</div>
              <div className="text-3xl font-bold text-foreground">{score}</div>
            </div>
            <div className="bg-muted rounded-xl border border-border p-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">Streak</div>
              <div className="text-3xl font-bold text-foreground">{streak}</div>
            </div>
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
            <Button
              variant="outline"
              onClick={() => {
                stopTimer();
                loadNewWord();
              }}
              className="w-full rounded-xl"
            >
              New Word
            </Button>
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
        )}
      </div>
    </div>
  );
}

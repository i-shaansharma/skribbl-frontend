// ==========================================
// src/app/room/[id]/page.tsx
// PURPOSE: THE GAME ROOM (Premium Minimal UI) - ENHANCED
// ==========================================

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { socket } from '@/lib/socket';
import { Users, Volume2, VolumeX, SkipForward, Crown, Award } from 'lucide-react';

type AvatarIconKey = 'cat'|'dog'|'fox'|'bear'|'panda'|'rabbit'|'frog'|'owl'|'penguin'|'koala'|'tiger'|'lion'|'monkey'|'duck'|'alien';
type AvatarColor = 'rose'|'orange'|'amber'|'lime'|'emerald'|'cyan'|'sky'|'violet'|'fuchsia'|'zinc';
const AVATAR_BORDER: Record<AvatarColor, string> = {rose:'#7f1d1d',orange:'#7c2d12',amber:'#78350f',lime:'#365314',emerald:'#14532d',cyan:'#164e63',sky:'#0c4a6e',violet:'#4c1d95',fuchsia:'#701a75',zinc:'#3f3f46'};
const AVATAR_TEXT: Record<AvatarColor, string> = {rose:'#fca5a5',orange:'#fdba74',amber:'#fcd34d',lime:'#bef264',emerald:'#6ee7b7',cyan:'#67e8f9',sky:'#7dd3fc',violet:'#c4b5fd',fuchsia:'#f0abfc',zinc:'#d4d4d8'};
function Avatar({ icon, color, size = 24, ring, className, name }: { icon?: AvatarIconKey | string; color?: AvatarColor | string; size?: number; ring?: boolean; className?: string; name?: string }) {
  const initial = (name ?? icon ?? '?').charAt(0).toUpperCase();
  const border = color ? (AVATAR_BORDER[color as AvatarColor] ?? '#3f3f46') : '#3f3f46';
  const text = color ? (AVATAR_TEXT[color as AvatarColor] ?? '#d4d4d8') : '#d4d4d8';
  const fontSize = size * 0.42;
  const dim = size + 8;
  return (
    <span
      title={name}
      className={className}
      style={{
        width: dim, height: dim, borderRadius: '50%',
        background: '#0a0a0a',
        border: `1px solid ${border}`,
        boxShadow: ring ? `0 0 0 2px #0a0a0a, 0 0 0 3.5px ${border}` : 'none',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        color: text,
        fontSize,
        fontWeight: 600,
        fontFamily: 'var(--font-geist-mono), monospace',
        letterSpacing: '-0.02em',
      }}
    >
      {initial}
    </span>
  );
}

export default function GameRoomScreen() {
  const params = useParams();
  const roomId = params.id as string;
  const searchParams = useSearchParams();
  const playerName = searchParams.get('name') || 'Player';
  const myAvatarIcon = (searchParams.get('avatarIcon') || undefined) as AvatarIconKey | undefined;
  const myAvatarColor = (searchParams.get('avatarColor') || undefined) as AvatarColor | undefined;

  // Game state
  const [players, setPlayers] = useState<any[]>([]);
  const [messages, setMessages] = useState<{name: string, text: string, type: 'chat'|'system'|'close'}[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [timer, setTimer] = useState(0);
  const [wordToDraw, setWordToDraw] = useState('');
  const [wordHint, setWordHint] = useState(''); // populated by optional 'word_hint' server event
  const [phase, setPhase] = useState('Lobby'); // 'Lobby', 'WordSelection', 'ActiveDrawing', 'RoundReveal', 'GameOver'
  const [currentDrawerId, setCurrentDrawerId] = useState('');

  const [wordChoices, setWordChoices] = useState<string[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<{id: number, emoji: string, x: number, y: number}[]>([]);
  const reactionCounter = useRef(0);
  const [gameOverData, setGameOverData] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [showPlayers, setShowPlayers] = useState(false);
  const [muted, setMuted] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [skipVotes, setSkipVotes] = useState<{ votes: number; needed: number } | null>(null);
  const [hasVotedSkip, setHasVotedSkip] = useState(false);
  const [confetti, setConfetti] = useState<{id: number, left: number, color: string, delay: number}[]>([]);
  const confettiCounter = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasHistory = useRef<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#09090b');
  const [brushSize, setBrushSize] = useState(5);
  const lastPos = useRef<{x: number, y: number} | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState('');
  const [disconnected, setDisconnected] = useState(false);
  const [phaseTransition, setPhaseTransition] = useState(false);
  const [maxDrawTime, setMaxDrawTime] = useState(80);

  const launchConfetti = useCallback((count = 60) => {
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4'];
    const pieces = Array.from({ length: count }).map(() => ({
      id: confettiCounter.current++,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.4,
    }));
    setConfetti(prev => [...prev, ...pieces]);
    setTimeout(() => {
      const ids = new Set(pieces.map(p => p.id));
      setConfetti(prev => prev.filter(p => !ids.has(p.id)));
    }, 3200);
  }, []);

  useEffect(() => {
    const triggerJoin = () => {
    if (!roomId || !playerName) return;
    setDisconnected(false);
    socket.emit('join_room', { 
    roomId: roomId.trim(), 
    playerName: playerName.trim(), 
    avatarIcon: myAvatarIcon, 
    avatarColor: myAvatarColor
    }, (response: any) => {
        if (response && !response.success) { setToast(response.message); setTimeout(() => setToast(''), 3000); }
    });
};

if (socket.connected) {
    triggerJoin();
} else {
    socket.connect();
}
socket.on('connect', triggerJoin);


   socket.on('update_players', (playersList) => setPlayers(playersList));
socket.on('disconnect', () => setDisconnected(true));

    // Canvas events
    socket.on('draw_data', (stroke) => {
        drawLineOnCanvas(stroke.x0, stroke.y0, stroke.x1, stroke.y1, stroke.color, stroke.size);
    });

    socket.on('canvas_clear', () => clearLocalCanvas());

    socket.on('undo_canvas', (canvasState) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas && canvasState) {
            const img = new Image();
            img.src = canvasState;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
        }
    });

    // Game events
    socket.on('round_start', (data) => {
        setPhaseTransition(true);
        setTimeout(() => setPhaseTransition(false), 300);
        setPhase(data.phase);
        setCurrentDrawerId(data.drawerId);
        clearLocalCanvas();
        setWordChoices([]);
        setWordHint('');
        setSkipVotes(null);
        setHasVotedSkip(false);
        if (data.currentRound) setCurrentRound(data.currentRound);
        if (data.totalRounds) setTotalRounds(data.totalRounds);

        if (socket.id !== data.drawerId) {
             setWordToDraw('Waiting for drawer...');
             setMessages(prev => [...prev, { name: 'System', text: 'Drawer is choosing a word…', type: 'system' }]);
        }
    });

    socket.on('word_choices', (data) => setWordChoices(data.words));

    socket.on('word_chosen', (data) => {
        setPhaseTransition(true);
        setTimeout(() => setPhaseTransition(false), 300);
        setPhase('ActiveDrawing');
        setTimer(data.drawTime);
        setMaxDrawTime(data.drawTime);
        if (socket.id !== data.drawerId) {
             setWordToDraw('_ '.repeat(data.wordLength));
             setWordHint('');
             setMessages(prev => [...prev, { name: 'System', text: 'New round · start guessing', type: 'system' }]);
        } else {
             setMessages(prev => [...prev, { name: 'System', text: 'Draw your word!', type: 'system' }]);
        }
    });

    socket.on('your_word', (data) => {
        setWordToDraw(data.word);
        setMessages(prev => [...prev, { name: 'System', text: `Draw: ${data.word}`, type: 'system' }]);
    });

    // Optional: server may periodically reveal letters, e.g. { hint: "_ a _ _ o" }.
    // Falls back to underscores if the server never emits this event.
    socket.on('word_hint', (data: { hint: string }) => {
    setWordHint(data.hint);
    });

    socket.on('timer_tick', (data) => {
        setTimer(data.timeLeft);
        if (data.timeLeft <= 10 && data.timeLeft > 0) playTick();
    });

    socket.on('round_end', (data) => {
        setPhaseTransition(true);
        setTimeout(() => setPhaseTransition(false), 300);
        setPhase('RoundReveal');
        setWordToDraw(data.word);
        setWordHint('');
        setMessages(prev => [...prev, { name: 'System', text: `The word was "${data.word}"`, type: 'system' }]);
        setPlayers(prevPlayers => data.scores.map((s: any) => {
             const player = prevPlayers.find((p: any) => p.connectionId === s.id);
             return { ...player, totalPoints: s.score, displayName: player?.displayName || 'Player' };
        }));
    });

    socket.on('game_over', (data) => {
        setPhaseTransition(true);
        setTimeout(() => setPhaseTransition(false), 300);
        setPhase('GameOver');
        setGameOverData(data);
        launchConfetti(80);
    });

    socket.on('chat_message', (data) => {
    setMessages(prev => [...prev, { name: data.playerName, text: data.text, type: data.type || 'chat' }]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
});

    socket.on('reaction', (data) => {
        const id = reactionCounter.current++;
        const x = 20 + Math.random() * 60;
        const y = 20 + Math.random() * 60;
        setFloatingReactions(prev => [...prev, { id, emoji: data.emoji, x, y }]);
        setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 2000);
    });

    socket.on('guess_result', (data) => {
        if (data.correct) {
            playCorrect();
            launchConfetti(24);
            setMessages(prev => [...prev, { name: 'System', text: `${data.playerName} guessed it · +${data.points} pts`, type: 'system' }]);
        } else if (data.close) {
            // Server can optionally flag near-misses (off-by-a-letter etc.)
            setMessages(prev => [...prev, { name: 'System', text: `${data.playerName} is close…`, type: 'close' }]);
        }
    });

    // Optional: lightweight "is typing" presence. No-op if server never relays it.
    socket.on('player_typing', (data: { name: string }) => {
        setTypingUsers(prev => prev.includes(data.name) ? prev : [...prev, data.name]);
        setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== data.name)), 2500);
    });

    // Optional: vote-to-skip tally + resolution.
    socket.on('skip_vote_update', (data: { votes: number; needed: number }) => setSkipVotes(data));
    socket.on('word_skipped', () => {
        setSkipVotes(null);
        setHasVotedSkip(false);
        setMessages(prev => [...prev, { name: 'System', text: 'The word was skipped by vote', type: 'system' }]);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setCurrentGuess('');
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        socket.off('connect', triggerJoin);
        socket.off('disconnect');
        setDisconnected(false);
        socket.off('update_players');
        socket.off('draw_data');
        socket.off('canvas_clear');
        socket.off('undo_canvas');
        socket.off('round_start');
        socket.off('word_choices');
        socket.off('word_chosen');
        socket.off('your_word');
        socket.off('word_hint');
        socket.off('timer_tick');
        socket.off('round_end');
        socket.off('game_over');
        socket.off('chat_message');
        socket.off('reaction');
        socket.off('guess_result');
        socket.off('player_typing');
        socket.off('skip_vote_update');
        socket.off('word_skipped');
    };
  }, [roomId, playerName, myAvatarIcon, myAvatarColor, launchConfetti]);

  // Subtle grid background
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawGrid = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gridSize = 60;

      ctx.strokeStyle = 'rgba(80, 80, 90, 0.25)';
      ctx.lineWidth = 0.6;

      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };

    drawGrid();
    window.addEventListener('resize', drawGrid);
    return () => window.removeEventListener('resize', drawGrid);
  }, []);

  // Drawing logic
  const clearLocalCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          canvasHistory.current = [];
      }
  };

  const drawLineOnCanvas = (x0: number, y0: number, x1: number, y1: number, color: string, size: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.closePath();
  };

      const getCoordinates = (e: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX = e.clientX;
      let clientY = e.clientY;

      if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      }

      return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
      };
  };

  const startDrawing = (e: any) => {
      if (socket.id !== currentDrawerId || phase !== 'ActiveDrawing') return;
      const coords = getCoordinates(e);
      if (!coords) return;

      setIsDrawing(true);
      lastPos.current = coords;
  };

  const draw = (e: any) => {
      if (!isDrawing || !lastPos.current || socket.id !== currentDrawerId) return;
      const coords = getCoordinates(e);
      if (!coords) return;

      drawLineOnCanvas(lastPos.current.x, lastPos.current.y, coords.x, coords.y, color, brushSize);

      socket.emit('draw_data', {
          roomId,
          stroke: { x0: lastPos.current.x, y0: lastPos.current.y, x1: coords.x, y1: coords.y, color, size: brushSize }
      });

      lastPos.current = coords;
  };

  const stopDrawing = () => {
      if (isDrawing) {
          setIsDrawing(false);
          lastPos.current = null;

          const canvas = canvasRef.current;
          if (canvas) {
              // Keep max 20 history states to prevent memory bloat
              if (canvasHistory.current.length >= 20) {
                  canvasHistory.current.shift();
              }
              canvasHistory.current.push(canvas.toDataURL());
          }
      }
  };

  const handleUndoClick = () => {
      if (canvasHistory.current.length > 0) {
          canvasHistory.current.pop();

          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (!ctx || !canvas) return;

          if (canvasHistory.current.length > 0) {
              const previousState = canvasHistory.current[canvasHistory.current.length - 1];
              const img = new Image();
              img.src = previousState;
              img.onload = () => {
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0);
              };
              socket.emit('undo_canvas', { roomId, canvasState: previousState });
          } else {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              socket.emit('canvas_clear', { roomId });
          }
      }
  };

  const handleClearCanvasClick = () => {
      clearLocalCanvas();
      socket.emit('canvas_clear', { roomId });
  };

  const handleStartGame = () => {
      socket.emit('start_game', { roomId });
  };

  const sendReaction = (emoji: string) => {
      const id = reactionCounter.current++;
      const x = 20 + Math.random() * 60;
      const y = 20 + Math.random() * 60;
      setFloatingReactions(prev => [...prev, { id, emoji, x, y }]);
      socket.emit('reaction', { roomId, emoji });
      setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 2000);
  };

  const submitGuess = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentGuess.trim()) return;
      socket.emit('guess', { roomId, text: currentGuess });
      setCurrentGuess('');
  };

  const handleGuessChange = (value: string) => {
      setCurrentGuess(value);
      // Lightweight typing presence — harmless if the server doesn't relay it.
      socket.emit('typing', { roomId, name: playerName });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
    setTypingUsers(prev => prev.filter(n => n !== playerName));
}, 1200);
  };

  const handleVoteSkip = () => {
      if (hasVotedSkip) return;
      setHasVotedSkip(true);
      socket.emit('vote_skip_word', { roomId });
  };

  const playTick = () => {
      if (muted) return;
      try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.06, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.08);
      } catch {}
  };

  const playCorrect = () => {
      if (muted) return;
      try {
          const ctx = new AudioContext();
          [523, 659, 784].forEach((freq, i) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = freq;
              const t = ctx.currentTime + i * 0.1;
              gain.gain.setValueAtTime(0.05, t);
              gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
              osc.start(t);
              osc.stop(t + 0.15);
          });
      } catch {}
  };

  const isMyTurn = !!socket.id && socket.id === currentDrawerId;
  const timerProgress = phase === 'ActiveDrawing' ? (timer / maxDrawTime) * 100 : 0;

  const getPlayerAvatar = (p: any) => ({
      icon: p?.avatarIcon as AvatarIconKey | undefined,
      color: p?.avatarColor as AvatarColor | undefined,
      name: p?.displayName as string | undefined,
  });

  const displayWord = phase === 'ActiveDrawing' && !isMyTurn
      ? (wordHint || wordToDraw)
      : wordToDraw;

  // Podium order: 2nd - 1st - 3rd, like a real podium.
  const podium = gameOverData?.leaderboard
      ? [gameOverData.leaderboard[1], gameOverData.leaderboard[0], gameOverData.leaderboard[2]].filter(Boolean)
      : [];
  const rest = gameOverData?.leaderboard ? gameOverData.leaderboard.slice(3) : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-400 flex flex-col p-3 md:p-4 font-sans relative overflow-hidden">

      {/* Grid Background */}
      <canvas ref={bgCanvasRef} className="pointer-events-none absolute inset-0 w-full h-full z-0" />

      {/* Noise Texture */}
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.03]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}
      />

      {/* Top subtle gradient glow - MATCHES LOBBY */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] z-[1]"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(63, 63, 70, 0.12) 0%, transparent 70%)' }} />

      {/* Bottom fade - MATCHES LOBBY */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-48 z-[1]"
        style={{ background: 'linear-gradient(to top, #0a0a0a 20%, transparent)' }} />

      {/* Confetti */}
      {confetti.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {confetti.map(p => (
            <span
              key={p.id}
              className="confetti-piece absolute top-[-5%] block w-2 h-2.5 rounded-[1px]"
              style={{ left: `${p.left}%`, backgroundColor: p.color, animationDelay: `${p.delay}s` }}
            />
          ))}
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#111113] border border-zinc-800/60 text-zinc-300 text-[11px] font-medium px-4 py-2.5 rounded-[8px] pointer-events-none animate-in shadow-lg shadow-black/20">
          {toast}
        </div>
      )}

      {disconnected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#111113] border border-red-900/50 text-red-400 text-[11px] font-medium px-4 py-2.5 rounded-[8px] flex items-center gap-2.5 shadow-lg shadow-black/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Reconnecting…
        </div>
      )}

      {/* Phase Transition Overlay */}
      {phaseTransition && (
        <div className="fixed inset-0 bg-[#0a0a0a]/80 z-40 pointer-events-none transition-opacity duration-300" />
      )}

      {/* Mobile Players Toggle */}
      <button
        onClick={() => setShowPlayers(!showPlayers)}
        className="lg:hidden fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full bg-[#111113] border border-zinc-800/60 flex items-center justify-center text-zinc-400 shadow-lg shadow-black/30"
      >
        <Users className="w-5 h-5" />
      </button>

      {/* Mobile Players Drawer */}
      {showPlayers && (
        <div className="lg:hidden fixed inset-0 z-20 flex justify-end" onClick={() => setShowPlayers(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-72 bg-[#111113] border-l border-zinc-800/60 p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-medium tracking-[0.12em] uppercase text-zinc-600">Players</h3>
              <button onClick={() => setShowPlayers(false)} className="text-zinc-600 hover:text-zinc-400">✕</button>
            </div>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={i} className={`flex justify-between items-center px-3 py-2.5 rounded-[8px] border transition-all ${p.connectionId === currentDrawerId ? 'bg-zinc-900/80 border-zinc-700/60' : 'bg-zinc-950/40 border-zinc-800/40'}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar {...getPlayerAvatar(p)} name={p.displayName} size={28} ring={p.connectionId === currentDrawerId} />
                    <div className="min-w-0">
                      <span className="font-medium text-zinc-300 text-[12px] block truncate">{p.displayName}</span>
                      {p.connectionId === currentDrawerId && (
                        <span className="text-[9px] text-zinc-600 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-zinc-500 animate-pulse" />
                          Drawing
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-zinc-600 font-mono">
                    {phase === 'Lobby' ? '—' : p.totalPoints}
                  </span>
                </div>
              ))}
            </div>
            {phase === 'Lobby' && (
              <div className="mt-6">
                {players.length < 2 && (
                  <p className="text-[10px] text-zinc-700 text-center mb-3">Need at least 2 players</p>
                )}
                <button
                  onClick={handleStartGame}
                  disabled={players.length < 2}
                  className="w-full bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed py-2.5 rounded-[8px] font-medium text-[13px] transition-colors"
                >
                  Start game
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="relative z-10 grid grid-cols-3 items-center bg-[#111113] border border-zinc-800/60 px-4 md:px-5 py-3 rounded-[10px] mb-3 md:mb-4 w-full">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />

        {/* Left: Room Info */}
        <div className="text-left overflow-hidden">
          <span className="text-zinc-600 text-[9px] font-medium tracking-[0.12em] uppercase block mb-1">
            Room
          </span>

          <div className="flex items-center gap-2">
            <span className="font-medium text-[13px] text-zinc-400 font-mono tracking-wider">
              {roomId}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                setToast('Room ID copied');
                setTimeout(() => setToast(''), 2000);
              }}
              className="text-[9px] text-zinc-600 border border-zinc-800/60 hover:border-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded-[4px] transition-colors"
            >
              copy
            </button>
            <button
              onClick={() => setMuted(m => !m)}
              title={muted ? 'Unmute sounds' : 'Mute sounds'}
              className="text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              {muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
          </div>

          <div className="text-[9px] text-zinc-600 mt-1 font-mono flex items-center gap-1.5">
            {currentRound > 0 ? `Round ${currentRound} / ${totalRounds}` : 'Lobby'}
            {phase === 'ActiveDrawing' && <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />}
          </div>
        </div>

        {/* Center: Word */}
        <div className="text-center flex justify-center items-center overflow-hidden px-1 md:px-2">
          <span className="text-lg md:text-2xl tracking-[0.2em] text-zinc-300 font-mono font-medium truncate max-w-full">
            {phase === 'ActiveDrawing' && !isMyTurn
              ? displayWord.trim().split(' ').map((seg, i) => (
                  <span key={i} className="inline-block mx-0.5">{seg}</span>
                ))
              : displayWord || '· · · · · ·'
            }
          </span>
        </div>

        {/* Right: Timer */}
        <div className="text-right overflow-hidden">
          <span className="text-zinc-600 text-[9px] font-medium tracking-[0.12em] uppercase block mb-1">Time</span>
          <span className={`font-medium text-xl md:text-2xl font-mono block tabular-nums transition-colors ${timer <= 10 && timer > 0 ? 'text-red-500' : 'text-zinc-300'}`}>
            {timer > 0 ? `${timer}s` : '—'}
          </span>
        </div>
      </div>

      {/* Mobile Start Game Button */}
      {phase === 'Lobby' && players.length >= 2 && (
        <div className="lg:hidden relative z-10 mb-3">
          <button
            onClick={handleStartGame}
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-white py-3 rounded-[10px] font-medium text-[13px] transition-colors"
          >
            Start game
          </button>
        </div>
      )}

      {/* Mobile waiting message */}
      {phase === 'Lobby' && players.length < 2 && (
        <div className="lg:hidden relative z-10 mb-3 py-2.5 text-center">
          <p className="text-[11px] text-zinc-600">Need at least 2 players to start</p>
        </div>
      )}

      {/* Timer Progress Bar */}
      {phase === 'ActiveDrawing' && (
        <div className="relative z-10 w-full h-0.5 bg-zinc-900 rounded-full mb-3 md:mb-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear rounded-full ${timer <= 10 ? 'bg-red-500' : 'bg-zinc-600'}`}
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 gap-3 md:gap-4 z-10 w-full max-w-[1600px] mx-auto relative">

        {/* Canvas Section */}
        <div className="order-1 lg:order-2 flex-1 flex flex-col items-center justify-start w-full lg:min-w-[800px]">

          {/* Word Selection Modal */}
          {phase === 'WordSelection' && (
            <div className="w-full max-w-[800px] aspect-[4/3] flex flex-col items-center justify-center bg-[#111113] rounded-[12px] p-4 mb-2 border border-zinc-800/60 animate-in shadow-xl shadow-black/30">
              {isMyTurn ? (
                <div className="bg-[#0a0a0a] p-8 rounded-[12px] border border-zinc-800/60 text-center w-full max-w-sm">
                  <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />
                  <p className="text-zinc-600 text-[9px] font-medium tracking-[0.15em] uppercase mb-2">Your turn to draw</p>
                  <h2 className="text-lg font-medium text-zinc-200 mb-6">Pick a word</h2>
                  <div className="flex flex-col gap-2">
                    {wordChoices.map((w, i) => (
                      <button
                        key={w}
                        onClick={() => socket.emit('choose_word', { roomId, word: w })}
                        className="bg-zinc-900/80 border border-zinc-800/60 hover:border-zinc-600 hover:bg-zinc-800/80 px-5 py-3.5 rounded-[8px] font-medium text-[13px] text-zinc-300 transition-all tracking-wide hover:-translate-y-[0.5px] active:translate-y-0"
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <p className="text-zinc-700 mt-5 text-[9px] tracking-[0.12em] uppercase font-medium">Auto-selecting in {timer}s</p>
                </div>
              ) : (
                <div className="text-center">
                  <Avatar {...getPlayerAvatar(players.find(p => p.connectionId === currentDrawerId))} name={players.find(p => p.connectionId === currentDrawerId)?.displayName} size={40} className="mx-auto mb-4" />
                  <p className="text-zinc-600 text-[9px] font-medium tracking-[0.12em] uppercase mb-2">Please wait</p>
                  <p className="text-zinc-400 text-[13px] font-medium">Drawer is choosing a word…</p>
                </div>
              )}
            </div>
          )}

          {/* Game Over Modal — podium style */}
          {phase === 'GameOver' && gameOverData && (
            <div className="w-full max-w-[800px] aspect-[4/3] flex flex-col items-center justify-center bg-[#111113] rounded-[12px] p-6 md:p-8 mb-2 border border-zinc-800/60 animate-in shadow-xl shadow-black/30 overflow-y-auto">
              <p className="text-zinc-600 text-[9px] font-medium tracking-[0.15em] uppercase mb-1">Game over</p>
              <h1 className="text-2xl md:text-3xl font-medium text-zinc-100 mb-8 tracking-tight">Final standings</h1>

              {/* Podium */}
              <div className="flex items-end justify-center gap-3 md:gap-4 w-full max-w-md mb-8">
                {podium.map((p: any, idx: number) => {
                  const rank = p === gameOverData.leaderboard[0] ? 1 : p === gameOverData.leaderboard[1] ? 2 : 3;
                  const heights: Record<number, string> = { 1: 'h-32 md:h-36', 2: 'h-24 md:h-28', 3: 'h-16 md:h-20' };
                  const ringColor: Record<number, string> = { 1: '#f59e0b', 2: '#a1a1aa', 3: '#b45309' };
                  return (
                    <div key={p.name + idx} className="flex flex-col items-center w-1/3">
                      {rank === 1 && <Crown className="w-5 h-5 text-amber-400 mb-1.5" fill="currentColor" />}
                      <Avatar
                        icon={p.avatarIcon}
                        color={p.avatarColor}
                        name={p.name}
                        size={rank === 1 ? 52 : 42}
                        ring
                        className="mb-2 podium-pop"
                      />
                      <span className={`text-[12px] font-medium truncate max-w-full mb-0.5 ${rank === 1 ? 'text-zinc-100' : 'text-zinc-300'}`}>{p.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono mb-2">{p.score} pts</span>
                      <div
                        className={`w-full rounded-t-[8px] border border-zinc-800/60 podium-rise flex items-end justify-center pb-2 ${heights[rank]}`}
                        style={{ backgroundColor: `${ringColor[rank]}1a`, animationDelay: `${(3 - rank) * 0.12}s` }}
                      >
                        <span className="text-[18px] font-medium font-mono" style={{ color: ringColor[rank] }}>#{rank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {rest.length > 0 && (
                <div className="bg-[#0a0a0a] rounded-[12px] w-full max-w-sm border border-zinc-800/60 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-1.5">
                    <Award className="w-3 h-3 text-zinc-600" />
                    <span className="text-[9px] font-medium tracking-[0.12em] uppercase text-zinc-600">Rest of the field</span>
                  </div>
                  <div className="p-2.5 space-y-1 max-h-[30vh] overflow-y-auto custom-scrollbar">
                    {rest.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between items-center px-3 py-2.5 rounded-[8px] border bg-zinc-950/40 border-zinc-800/40">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-medium text-zinc-600 font-mono w-5">#{i + 4}</span>
                          <Avatar icon={p.avatarIcon} color={p.avatarColor} name={p.name} size={22} />
                          <span className="text-[13px] font-medium truncate text-zinc-300">{p.name}</span>
                        </div>
                        <span className="text-[11px] font-medium text-zinc-500 font-mono">{p.score} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => window.location.href = '/'}
                className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-[8px] border border-zinc-700/60 bg-zinc-900/80 text-zinc-300 hover:text-white hover:border-zinc-500 text-[12px] font-medium transition-all hover:-translate-y-[0.5px]"
              >
                ← Play again
              </button>
            </div>
          )}

          {/* Canvas */}
          <div className={`relative w-full max-w-[800px] ${phase === 'GameOver' || phase === 'WordSelection' ? 'hidden' : ''}`}>
            {/* Floating Reactions */}
            {floatingReactions.map(r => (
              <div
                key={r.id}
                className="reaction-float absolute text-2xl pointer-events-none z-10"
                style={{ left: `${r.x}%`, top: `${r.y}%` }}
              >
                {r.emoji}
              </div>
            ))}

            <div className={`w-full aspect-[4/3] bg-white rounded-[12px] overflow-hidden border transition-all duration-300 ${isMyTurn && phase === 'ActiveDrawing' ? 'border-zinc-500 cursor-crosshair shadow-2xl shadow-black/60 ring-1 ring-zinc-500/20' : 'border-zinc-800/80 cursor-not-allowed shadow-xl shadow-black/40'} relative`}>
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className={`w-full h-full bg-white touch-none ${isMyTurn && phase === 'ActiveDrawing' ? 'drawing-active' : ''}`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                onTouchCancel={stopDrawing}
              />
              {!isMyTurn && phase === 'ActiveDrawing' && (
                <div className="absolute inset-0 bg-transparent pointer-events-none" />
              )}
            </div>
          </div>

          {/* Reaction Bar + Vote Skip */}
          {!isMyTurn && phase === 'ActiveDrawing' && (
            <div className="mt-2.5 w-full max-w-[800px] flex items-center justify-center gap-2">
              {['👍', '😱', '😂', '🔥'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-lg px-3.5 py-2 bg-[#111113] border border-zinc-800/60 rounded-[8px] hover:border-zinc-600 hover:bg-zinc-900/80 transition-all active:scale-90 hover:-translate-y-[0.5px]"
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={handleVoteSkip}
                disabled={hasVotedSkip}
                title="Vote to skip this word"
                className="flex items-center gap-1.5 text-[10px] font-medium px-3.5 py-2 bg-[#111113] border border-zinc-800/60 rounded-[8px] hover:border-zinc-600 hover:bg-zinc-900/80 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-500 hover:text-zinc-200"
              >
                <SkipForward className="w-3.5 h-3.5" />
                {skipVotes ? `Skip (${skipVotes.votes}/${skipVotes.needed})` : 'Skip'}
              </button>
            </div>
          )}

          {/* Canvas Controls */}
          <div className={`mt-2.5 w-full max-w-[800px] flex flex-wrap items-center gap-2.5 md:gap-3 bg-[#111113] px-4 py-2.5 rounded-[10px] border border-zinc-800/60 transition-all duration-200 ${isMyTurn && phase === 'ActiveDrawing' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

            {/* Colors */}
            <div className="flex gap-1.5 md:gap-2.5 flex-wrap justify-center">
              {[
                { color: '#09090b', label: 'Black' },
                { color: '#ef4444', label: 'Red' },
                { color: '#3b82f6', label: 'Blue' },
                { color: '#22c55e', label: 'Green' },
                { color: '#eab308', label: 'Yellow' },
                { color: '#f97316', label: 'Orange' },
                { color: '#8b5cf6', label: 'Purple' },
                { color: '#ffffff', label: 'Eraser' },
              ].map(({ color: c, label }) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  title={label}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${c === '#ffffff' ? 'border border-zinc-500' : 'border border-zinc-700/50'} ${color === c ? 'ring-2 ring-offset-2 ring-offset-[#111113] ring-zinc-400 scale-110' : ''}`}
                />
              ))}
            </div>

            <div className="w-px h-6 bg-zinc-800/60 mx-0.5 hidden md:block" />

            {/* Brush Size */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-600 uppercase tracking-[0.1em] hidden md:block font-medium">Size</span>
              <input
                type="range"
                min={2}
                max={24}
                step={1}
                value={brushSize}
                onChange={e => setBrushSize(Number(e.target.value))}
                className="w-16 md:w-20 accent-zinc-500 cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500 font-mono w-4 tabular-nums">{brushSize}</span>
            </div>

            <div className="w-px h-6 bg-zinc-800/60 mx-0.5 hidden md:block" />

            {/* Tools */}
            <div className="flex gap-1.5 md:gap-2 mt-1 md:mt-0 w-full md:w-auto justify-center">
              <button onClick={handleUndoClick} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 border border-zinc-800/60 hover:border-zinc-600 px-3 py-1.5 rounded-[6px] text-[10px] font-medium tracking-[0.05em] transition-all hover:bg-zinc-900/80">
                <span className="text-[11px]">↩</span><span className="uppercase hidden sm:inline">Undo</span>
              </button>
              <button onClick={handleClearCanvasClick} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 border border-zinc-800/60 hover:border-zinc-600 px-3 py-1.5 rounded-[6px] text-[10px] font-medium tracking-[0.05em] transition-all hover:bg-zinc-900/80">
                <span className="text-[11px]">⌫</span><span className="uppercase hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <div className="order-2 lg:order-3 w-full lg:w-64 h-[20vh] lg:h-full bg-[#111113] rounded-[10px] flex flex-col border border-zinc-800/60 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800/60 flex items-center justify-between">
            <span className="text-[9px] font-medium tracking-[0.12em] uppercase text-zinc-600">Chat</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-medium text-zinc-700 font-mono">{players.length}</span>
            </div>
          </div>
          <div className="flex-1 p-2.5 overflow-y-auto space-y-1.5 custom-scrollbar">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-[11px] leading-relaxed ${
                  msg.type === 'system' ? 'bg-zinc-900/60 border border-zinc-800/40 text-zinc-500 px-2.5 py-1.5 rounded-[6px]'
                  : msg.type === 'close' ? 'bg-amber-950/30 border border-amber-900/40 text-amber-400 px-2.5 py-1.5 rounded-[6px]'
                  : 'text-zinc-400'
                }`}
              >
                {msg.type === 'chat' && <span className="font-medium text-zinc-300">{msg.name} </span>}
                {msg.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {typingUsers.length > 0 && (
            <div className="px-3 pb-1 flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className="flex gap-0.5">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </span>
              {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing
            </div>
          )}
          <form onSubmit={submitGuess} className="p-2.5 border-t border-zinc-800/60 flex gap-2">
            <input
              type="text"
              value={currentGuess}
              onChange={(e) => handleGuessChange(e.target.value)}
              disabled={isMyTurn && phase === 'ActiveDrawing'}
              placeholder={isMyTurn && phase === 'ActiveDrawing' ? "You're drawing…" : "Guess…"}
              className="flex-1 px-3 py-2 bg-zinc-900/80 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-800/60 rounded-[7px] focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/30 transition-all text-[12px] text-zinc-300 placeholder-zinc-700"
            />
            <button type="submit" disabled={isMyTurn && phase === 'ActiveDrawing'} className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700/60 rounded-[7px] px-3 text-zinc-400 hover:text-zinc-200 transition-all text-sm">↑</button>
          </form>
        </div>

        {/* Players Section - Desktop */}
        <div className="hidden lg:flex order-3 lg:order-1 w-full lg:w-64 lg:max-h-none bg-[#111113] border border-zinc-800/60 rounded-[10px] p-4 flex-col overflow-hidden">
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />
          <h3 className="font-medium text-zinc-600 mb-3 border-b border-zinc-800/60 pb-2.5 tracking-[0.12em] uppercase text-[9px]">Players</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {players.length === 0 && (
              <div className="flex flex-col gap-1.5 py-4">
                <p className="text-zinc-600 text-[11px] font-medium text-center">No players yet</p>
                <p className="text-zinc-700 text-[9px] text-center">Share the room ID to invite friends</p>
              </div>
            )}
            {players.map((p, i) => (
              <div key={i} className={`flex justify-between items-center px-3 py-2.5 rounded-[8px] border transition-all ${p.connectionId === currentDrawerId ? 'bg-zinc-900/80 border-zinc-700/60' : 'bg-zinc-950/40 border-zinc-800/40'}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar {...getPlayerAvatar(p)} name={p.displayName} size={28} ring={p.connectionId === currentDrawerId} />
                  <div className="min-w-0">
                    <span className="font-medium text-zinc-300 text-[12px] block truncate">{p.displayName}</span>
                    {p.connectionId === currentDrawerId && (
                      <span className="text-[9px] text-zinc-600 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-zinc-500 animate-pulse" />
                        Drawing
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-medium text-zinc-600 font-mono">
                  {phase === 'Lobby' ? '—' : p.totalPoints}
                </span>
              </div>
            ))}
          </div>
          {phase === 'Lobby' && (
            <div className="mt-4 space-y-2">
              {players.length < 2 && (
                <p className="text-[9px] text-zinc-700 text-center font-medium">Need at least 2 players</p>
              )}
              <button
                onClick={handleStartGame}
                disabled={players.length < 2}
                className="w-full bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed py-2.5 rounded-[8px] font-medium text-[13px] transition-colors"
              >
                Start game
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
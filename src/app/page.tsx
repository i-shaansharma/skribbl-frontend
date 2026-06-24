'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
// ─── Avatar inline ───────────────────────────────────────────────────────────
type AvatarIconKey = 'skull'|'ghost'|'alien'|'robot'|'clown'|'ninja'|'devil'|'zombie'|'fire'|'ice'|'storm'|'toxic'|'rage'|'cool'|'cursed'|'poop'|'nerd'|'explode';
type AvatarColor = 'zinc';
const AVATAR_ICONS: AvatarIconKey[] = ['skull','ghost','alien','robot','clown','ninja','devil','zombie','fire','ice','storm','toxic','rage','cool','cursed','poop','nerd','explode'];
const AVATAR_COLORS: AvatarColor[] = ['zinc'];
const AVATAR_EMOJI: Record<AvatarIconKey, string> = {skull:'\u{1F480}',ghost:'\u{1F47B}',alien:'\u{1F47D}',robot:'\u{1F916}',clown:'\u{1F921}',ninja:'\u{1F97D}',devil:'\u{1F608}',zombie:'\u{1F635}',fire:'\u{1F525}',ice:'\u2744\uFE0F',storm:'\u26A1',toxic:'\u2620\uFE0F',rage:'\u{1F621}',cool:'\u{1F60E}',cursed:'\u{1F631}',poop:'\u{1F4A9}',nerd:'\u{1F913}',explode:'\u{1F92F}'};
function randomAvatar() {
  return { icon: AVATAR_ICONS[Math.floor(Math.random()*AVATAR_ICONS.length)], color: 'zinc' as AvatarColor };
}
function Avatar({ icon, color, size = 24 }: { icon: AvatarIconKey; color: AvatarColor; size?: number }) {
  return (
    <span style={{ fontSize: size * 0.75, background: '#0a0a0a', border: '1px solid #27272a', borderRadius: '10px', width: size + 10, height: size + 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }}>
      {AVATAR_EMOJI[icon] ?? '�'}
    </span>
  );
}

import {
  Dices, Settings, Play, LogIn,
  ChevronDown, Pencil, Eye, Trophy,
  Clock, Users, Zap, ArrowRight, Shield, Globe, Sparkles,
  Shuffle, BookOpen,
} from 'lucide-react';

/* ─── constants ────────────────────────────────────────── */

const RANDOM_NAMES = [
  'BrockLee','ChrisPBacon','AlooArjun','NeilDown',
  'MoeLester','SalmonElla','BenDover','AlBeback',
  'LukeAtMe','AnitaBath','TrustMeBro','DidiParty',
  'HughJass','Phil McKracken',
];

const SETTINGS_CONFIG = [
  { label: 'Rounds',      key: 'rounds',     min: 2,  max: 10,  step: 1,  fmt: (v: number) => `${v}` },
  { label: 'Draw time',   key: 'drawTime',   min: 15, max: 240, step: 5,  fmt: (v: number) => `${v}s` },
  { label: 'Max players', key: 'maxPlayers', min: 2,  max: 20,  step: 1,  fmt: (v: number) => `${v}` },
  { label: 'Hints',       key: 'hintCount',  min: 0,  max: 4,   step: 1,  fmt: (v: number) => v === 0 ? 'Off' : `${v} letter${v > 1 ? 's' : ''}` },
] as const;

type SettingsKey = typeof SETTINGS_CONFIG[number]['key'];

const WORD_PACKS = [
  { id: 'standard', label: 'Standard' },
  { id: 'animals',  label: 'Animals' },
  { id: 'movies',   label: 'Movies & TV' },
  { id: 'custom',   label: 'Custom' },
] as const;

const FEATURES = [
  { icon: Pencil,  label: 'Draw',    sub: 'Freehand canvas'    },
  { icon: Eye,     label: 'Guess',   sub: 'Real-time chat'     },
  { icon: Trophy,  label: 'Win',     sub: 'Live leaderboard'   },
  { icon: Clock,   label: 'Fast',    sub: 'Under 10s to start' },
  { icon: Users,   label: 'Social',   sub: 'Up to 20 players'  },
  { icon: Zap,     label: 'Instant', sub: 'No account needed'  },
];

const SOCIAL = [
  {
    href: 'https://github.com/i-shaansharma',
    label: 'GitHub',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
      </svg>
    ),
  },
  {
    href: 'https://www.linkedin.com/in/ishshaansharma',
    label: 'LinkedIn',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
        <rect x="2" y="9" width="4" height="12"/>
        <circle cx="4" cy="4" r="2"/>
      </svg>
    ),
  },
  {
    href: 'https://www.instagram.com/i_shaansharma',
    label: 'Instagram',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    ),
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Enter your name', desc: 'Pick a name, an avatar, or generate both' },
  { step: '02', title: 'Create or join', desc: 'Start a new room or enter an existing code' },
  { step: '03', title: 'Draw & guess', desc: 'Take turns drawing while others guess' },
];

const STORAGE_KEY = 'i-sketch:profile';

/* ─── component ─────────────────────────────────────────── */

export default function LobbyScreen() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [avatarIcon, setAvatarIcon] = useState<AvatarIconKey>('skull');
  const [avatarColor, setAvatarColor] = useState<AvatarColor>('zinc');
  const [settings, setSettings] = useState({ rounds: 3, drawTime: 80, maxPlayers: 8, hintCount: 2 });
  const [wordPack, setWordPack] = useState<typeof WORD_PACKS[number]['id']>('standard');
  const [customWords, setCustomWords] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [diceSpinning, setDiceSpinning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState('');

  const nameOk = name.trim().length > 0;

  /* ── mount animation + restore saved profile ── */
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setName(parsed.name);
        if (parsed.avatarIcon) setAvatarIcon(parsed.avatarIcon);
        if (parsed.avatarColor) setAvatarColor(parsed.avatarColor);
      } else {
        const { icon, color } = randomAvatar();
        setAvatarIcon(icon);
        setAvatarColor(color);
      }
    } catch {
      const { icon, color } = randomAvatar();
      setAvatarIcon(icon);
      setAvatarColor(color);
    }
    return () => clearTimeout(timer);
  }, []);

  /* ── persist profile locally so returning players keep their look ── */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, avatarIcon, avatarColor }));
    } catch {}
  }, [name, avatarIcon, avatarColor]);

  /* disconnect on mount */
  useEffect(() => {
    socket.disconnect();
  }, []);

  /* ── subtle grid background ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawGrid();
    };

    const drawGrid = () => {
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

      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 3, 0,
        canvas.width / 2, canvas.height / 3, canvas.width * 0.6
      );
      gradient.addColorStop(0, 'rgba(63, 63, 70, 0.08)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  /* ── handlers ── */
  const pickRandomName = useCallback(() => {
    setName(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]);
    setError('');
    setDiceSpinning(true);
    setTimeout(() => setDiceSpinning(false), 400);
  }, []);

  const shuffleAvatar = useCallback(() => {
    const { icon, color } = randomAvatar();
    setAvatarIcon(icon);
    setAvatarColor(color);
  }, []);

  const setSetting = useCallback((key: SettingsKey, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const buildSettingsPayload = useCallback(() => ({
    ...settings,
    wordPack,
    customWords: wordPack === 'custom'
      ? customWords.split(',').map(w => w.trim()).filter(Boolean)
      : [],
  }), [settings, wordPack, customWords]);

  const profileQuery = useCallback((displayName: string) =>
    `name=${encodeURIComponent(displayName)}&avatarIcon=${avatarIcon}&avatarColor=${encodeURIComponent(avatarColor)}`,
    [avatarIcon, avatarColor]
  );

  const handleCreateRoom = useCallback(() => {
    if (!name.trim()) { setToast('Enter your name first ✍️'); setTimeout(() => setToast(''), 2500); return; }
    setLoading(true);
    setError('');
    socket.connect();
    socket.once('connect', () => {
      socket.emit('create_room', {
        hostName: name.trim(),
        settings: buildSettingsPayload(),
        avatarIcon,
        avatarColor,
      }, (res: any) => {
        if (res.success) {
          router.push(`/room/${res.roomId}?${profileQuery(name.trim())}`);
        } else {
          setError(res.message || 'Failed to create room');
          setLoading(false);
        }
      });
    });
    socket.once('connect_error', () => {
      setError('Could not reach the server. Try again.');
      setLoading(false);
      socket.disconnect();
    });
  }, [name, buildSettingsPayload, avatarIcon, avatarColor, router, profileQuery]);

  const handleJoinRoom = useCallback(() => {
    if (!name.trim()) { setToast('Enter your name first ✍️'); setTimeout(() => setToast(''), 2500); return; }
    if (!roomId.trim()) { setToast('Enter a Sketch ID ✍️'); setTimeout(() => setToast(''), 2500); return; }
    router.push(`/room/${roomId.trim().toUpperCase()}?${profileQuery(name.trim())}`);
  }, [name, roomId, router, profileQuery]);

  const handleQuickPlay = useCallback(() => {
    if (!name.trim()) { setToast('Enter your name first ✍️'); setTimeout(() => setToast(''), 2500); return; }
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/room/${randomCode}?${profileQuery(name.trim())}`);
  }, [name, router, profileQuery]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  /* ─── render ─────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-5 py-16 overflow-hidden">

      {/* Subtle Grid Background */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 w-full h-full z-0" />

      {/* Noise Texture Overlay */}
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.03]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}
      />

      {/* Top subtle gradient */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] z-[1]"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(100, 100, 115, 0.18) 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] z-[1]"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(50, 50, 60, 0.08) 0%, transparent 70%)' }} />

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-48 z-[1]"
        style={{ background: 'linear-gradient(to top, #0a0a0a 20%, transparent)' }} />

      {/* ── Status pill ── */}
      <div
        className={`relative z-10 mb-6 flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-zinc-700/40 bg-zinc-900/60 backdrop-blur-sm text-[10px] text-zinc-400 tracking-[0.15em] uppercase font-medium select-none transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
        Live · Free · No account
      </div>

      {/* ── Wordmark ── */}
      <div className={`relative z-10 text-center mb-2 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h1 className="text-[56px] sm:text-[68px] font-medium tracking-[-0.05em] leading-none select-none"
          style={{ background: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          i-sketch
        </h1>
      </div>

      {/* ── Tagline ── */}
      <p className={`relative z-10 text-[11px] font-medium tracking-[0.3em] text-zinc-500 uppercase mb-8 transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        Draw · Guess · Win
      </p>


      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-[10px] border border-zinc-700/60 bg-[#111113] text-zinc-200 text-[12px] font-medium shadow-2xl shadow-black/60 animate-in">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
          {toast}
        </div>
      )}

      {/* ── Main Card ── */}
      <div className={`relative z-10 w-full max-w-[400px] transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="rounded-[16px] border border-zinc-700/40 bg-[#0f0f11] p-6 flex flex-col gap-3.5 relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]">

          {/* Inner top border highlight */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600/50 to-transparent" />
          <div className="pointer-events-none absolute inset-0 rounded-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" />

          {/* ── Name + Avatar ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-medium tracking-[0.12em] uppercase text-zinc-600">
                Your name
              </label>
              {nameOk && (
                <span className="text-[10px] text-emerald-500/80 flex items-center gap-1.5 font-medium">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  Ready
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAvatarPicker(s => !s)}
                title="Change avatar"
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-[8px] border border-zinc-800 bg-[#0a0a0a] hover:border-zinc-600 hover:bg-zinc-900 transition-all active:scale-95"
              >
                <Avatar icon={avatarIcon} color={avatarColor} size={26} />
              </button>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
                placeholder="Enter your name"
                maxLength={20}
                className="flex-1 min-w-0 px-4 py-2.5 rounded-[8px] border border-zinc-800 bg-[#0a0a0a] text-[13px] text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all"
              />
              <button
                onClick={pickRandomName}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-[8px] border border-zinc-800 bg-[#0a0a0a] text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900 transition-all active:scale-95"
                title="Random name"
              >
                <Dices
                  className="w-4 h-4 transition-transform duration-300"
                  style={{ transform: diceSpinning ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
            </div>

            {/* ── Avatar Picker Panel ── */}
            {showAvatarPicker && (
              <div className="mt-2.5 rounded-[10px] border border-zinc-800/60 bg-[#0a0a0a] p-4 flex flex-col gap-4 animate-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-600 tracking-[0.05em] uppercase font-medium">Choose a look</span>
                  <button
                    onClick={shuffleAvatar}
                    className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors font-medium"
                  >
                    <Shuffle className="w-3 h-3" /> Shuffle
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_ICONS.map(ic => (
                    <button
                      key={ic}
                      onClick={() => setAvatarIcon(ic)}
                      className={`flex items-center justify-center rounded-[8px] py-2 border transition-all ${avatarIcon === ic ? 'border-zinc-500 bg-zinc-900' : 'border-zinc-800/60 bg-zinc-950/40 hover:border-zinc-700'}`}
                    >
                      <Avatar icon={ic} color={avatarColor} size={24} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Settings Toggle ── */}
          <button
            onClick={() => setShowSettings(s => !s)}
            className="flex items-center justify-between px-4 py-2.5 rounded-[8px] border border-zinc-800/60 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 hover:border-zinc-700/60 transition-all text-[11px] font-medium"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" />
              Sketch settings
            </span>
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-mono text-zinc-600">
                {settings.rounds}r · {settings.drawTime}s · {settings.maxPlayers}p
              </span>
              <ChevronDown
                className="w-3 h-3 transition-transform duration-200"
                style={{ transform: showSettings ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </div>
          </button>

          {/* ── Settings Panel ── */}
          {showSettings && (
            <div className="rounded-[10px] border border-zinc-800/60 bg-[#0a0a0a] p-4 flex flex-col gap-5 animate-in">
              {SETTINGS_CONFIG.map(({ label, key, min, max, step, fmt }) => (
                <div key={key}>
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-zinc-600 tracking-[0.05em] uppercase font-medium">{label}</span>
                    <span className="text-[11px] text-zinc-300 font-mono tabular-nums">{fmt(settings[key])}</span>
                  </div>
                  <input
                    type="range" min={min} max={max} step={step}
                    value={settings[key]}
                    onChange={e => setSetting(key, Number(e.target.value))}
                    className="w-full cursor-pointer accent-zinc-500"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-zinc-700 font-mono">{fmt(min)}</span>
                    <span className="text-[9px] text-zinc-700 font-mono">{fmt(max)}</span>
                  </div>
                </div>
              ))}

              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <BookOpen className="w-3 h-3 text-zinc-600" />
                  <span className="text-[10px] text-zinc-600 tracking-[0.05em] uppercase font-medium">Word pack</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {WORD_PACKS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setWordPack(p.id)}
                      className={`px-2 py-2 rounded-[7px] text-[10px] font-medium border transition-all ${wordPack === p.id ? 'border-zinc-500 bg-zinc-900 text-zinc-200' : 'border-zinc-800/60 bg-zinc-950/40 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {wordPack === 'custom' && (
                  <textarea
                    value={customWords}
                    onChange={e => setCustomWords(e.target.value)}
                    placeholder="banana, rocket, igloo, …"
                    rows={2}
                    className="mt-2.5 w-full px-3 py-2 rounded-[7px] border border-zinc-800 bg-zinc-950/60 text-[11px] text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-all resize-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Create Room Button ── */}
          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="group w-full flex items-center justify-center gap-2 py-3 rounded-[10px] bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-900 text-[13px] font-semibold tracking-[-0.02em] transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] shadow-[0_0_30px_rgba(255,255,255,0.18),0_4px_20px_rgba(0,0,0,0.4)]"
          >
            {loading
              ? <span className="w-3.5 h-3.5 border-[1.5px] border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
              : <Play className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" fill="currentColor" />}
            {loading ? 'Connecting…' : 'Create room'}
            {!loading && (
              <kbd className="ml-1 opacity-40 group-hover:opacity-60 transition-opacity text-[10px]">↵</kbd>
            )}
          </button>

          {/* ── Quick Play ── */}
          <button
            onClick={handleQuickPlay}
            className="group w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] border border-zinc-700/50 bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800/90 hover:border-zinc-500/60 text-[12px] font-medium transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 shadow-[0_0_20px_rgba(255,255,255,0.06)]"
          >
            <Zap className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="currentColor" />
            Quick Play
          </button>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-zinc-800/60" />
            <span className="text-[9px] font-medium tracking-[0.15em] text-zinc-700 uppercase">or join sketch</span>
            <div className="flex-1 h-px bg-zinc-800/60" />
          </div>

          {/* ── Join Room ── */}
          <div>
            <label className="text-[10px] font-medium tracking-[0.12em] uppercase text-zinc-600 mb-2 block">
              Sketch ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={e => { setRoomId(e.target.value.toUpperCase()); setError(''); setToast(''); }}
                onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
                placeholder="A1B2C3"
                maxLength={12}
                className="flex-1 min-w-0 px-4 py-2.5 rounded-[8px] border border-zinc-800 bg-[#0a0a0a] font-mono text-[12px] tracking-[0.2em] text-zinc-200 placeholder-zinc-800 uppercase focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all"
              />
              <button
                onClick={handleJoinRoom}
                disabled={false}
                className="shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-[8px] border border-zinc-800 bg-[#0a0a0a] text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 hover:bg-zinc-900 disabled:opacity-20 disabled:cursor-not-allowed text-[12px] font-medium transition-all hover:-translate-y-[0.5px] active:translate-y-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                Join
              </button>
            </div>
          </div>
        </div>

        {/* ── Share Link ── */}
        <button
          onClick={handleCopyLink}
          className="w-full mt-1 flex items-center justify-center gap-2 py-2 rounded-[8px] border border-zinc-800/40 bg-transparent text-zinc-600 hover:text-zinc-400 hover:border-zinc-700/60 hover:bg-zinc-900/30 text-[10px] font-medium tracking-[0.05em] transition-all"
        >
          {copied ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Link copied
            </>
          ) : (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Share invite link
            </>
          )}
        </button>
      </div>

      {/* ── How It Works ── */}
      <div className={`relative z-10 mt-5 w-full max-w-[500px] transition-all duration-700 delay-[400ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-700 text-center mb-3">How it works</p>
        <div className="grid grid-cols-3 gap-3">
          {HOW_IT_WORKS.map(({ step, title, desc }) => (
            <div key={step} className="text-center px-2">
              <span className="text-[10px] font-mono text-zinc-700 block mb-2">{step}</span>
              <p className="text-[11px] font-medium text-zinc-400 mb-1">{title}</p>
              <p className="text-[9px] text-zinc-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trust Indicators ── */}
      <div className={`relative z-10 mt-10 flex items-center gap-6 transition-all duration-700 delay-[500ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {[
          { icon: Shield, label: 'Private rooms' },
          { icon: Globe, label: 'Real-time sync' },
          { icon: Sparkles, label: 'Zero friction' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-zinc-700">
            <Icon className="w-3 h-3" strokeWidth={1.5} />
            <span className="text-[9px] font-medium tracking-[0.05em] uppercase">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className={`relative z-10 mt-4 flex flex-col items-center gap-3 transition-all duration-700 delay-[400ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <p className="text-[10px] text-zinc-700">
          Built for{' '}
          <span className="text-zinc-400 font-medium">Web3Task</span>
          {' '}by{' '}
          <span className="text-zinc-500 font-medium hover:text-zinc-300 transition-colors cursor-default">
            Ishaan Sharma
          </span>
        </p>
        <div className="flex items-center divide-x divide-zinc-800/60 border border-zinc-800/60 rounded-[8px] overflow-hidden">
          {SOCIAL.map(({ href, label, icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={label}
              className="px-3 py-2.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/40 transition-all flex items-center justify-center"
            >
              {icon}
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}

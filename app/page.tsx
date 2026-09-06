'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Shell,
  Sparkles,
  Volume2,
  VolumeX,
  Waves,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OceanAudio } from '@/lib/game-audio';
import { idleInput, regionNames } from '@/lib/game-model';
import type { Input } from '@/lib/game-model';
import type { GameController, Snapshot } from '@/lib/game-scene';
import { registerGameTools } from '@/lib/webmcp';
function readBest() {
  try {
    const n = Number(localStorage.getItem('little-lobster-best'));
    return Number.isInteger(n) && n >= 0 && n <= 48 ? n : 0;
  } catch {
    return 0;
  }
}
function subscribeBest(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('lobster-best', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('lobster-best', callback);
  };
}
const initial: Snapshot = {
  status: 'playing',
  pearls: 0,
  health: 3,
  progress: 0,
  region: 0,
  dashReady: true,
  checkpoint: false,
  friend: false,
  seconds: 0,
};
export default function Home() {
  const [started, setStarted] = useState(false),
    [muted, setMuted] = useState(true),
    [snap, setSnap] = useState(initial),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false),
    [notice, setNotice] = useState('');
  const canvas = useRef<HTMLDivElement>(null),
    controller = useRef<GameController | null>(null),
    audio = useRef<OceanAudio | null>(null),
    noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    focusTarget = useRef<HTMLDivElement>(null);
  const best = useSyncExternalStore(subscribeBest, readBest, () => 0);
  useEffect(() => {
    audio.current = new OceanAudio();
    return () => {
      audio.current?.destroy();
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!started || !canvas.current) return;
    const parent = canvas.current;
    let cancelled = false,
      unregister = () => {};
    import('@/lib/game-scene')
      .then(({ createOceanGame }) => {
        if (cancelled) return;
        const game = createOceanGame(
          parent,
          setSnap,
          (event) => {
            audio.current?.play(event);
            const messages = {
              checkpoint: 'Checkpoint reached. Hearts restored!',
              friend:
                'Narwhal says hello! Hearts restored + a little protection.',
              win: 'You brought the pearls home.',
              hurt: 'Ouch! Dash past enemies or swim around.',
              pearl: '',
              dash: '',
              defeat: 'Nice dash! The path is clear.',
            };
            const message = messages[event.kind];
            if (message) {
              setNotice(message);
              if (noticeTimer.current) clearTimeout(noticeTimer.current);
              noticeTimer.current = setTimeout(() => setNotice(''), 3500);
            }
          },
          () => setError(true),
        );
        controller.current = game;
        unregister = registerGameTools(game);
        setReady(true);
        focusTarget.current?.focus({ preventScroll: true });
      })
      .catch(() => setError(true));
    return () => {
      cancelled = true;
      unregister();
      controller.current?.destroy();
      controller.current = null;
    };
  }, [started]);
  useEffect(() => {
    if (snap.status === 'won') {
      try {
        localStorage.setItem(
          'little-lobster-best',
          String(Math.max(readBest(), snap.pearls)),
        );
        window.dispatchEvent(new Event('lobster-best'));
      } catch {}
    }
  }, [snap.status, snap.pearls]);
  useEffect(() => {
    const keyMap: Record<string, keyof Input> = {
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
      ArrowUp: 'swim',
      KeyW: 'swim',
      Space: 'swim',
      ArrowDown: 'down',
      KeyS: 'down',
      ShiftLeft: 'dash',
      ShiftRight: 'dash',
      KeyX: 'dash',
    };
    const held = new Set<string>();
    const sync = () => {
      const game = controller.current;
      if (!game) return;
      Object.assign(game.input, idleInput());
      for (const code of held) {
        const key = keyMap[code];
        if (key) game.input[key] = true;
      }
    };
    const keydown = (e: KeyboardEvent) => {
      const game = controller.current;
      if (!game || e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        e.target instanceof HTMLButtonElement &&
        (e.code === 'Space' || e.code === 'Enter')
      )
        return;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (!e.repeat) {
          game.pause(game.snapshot().status === 'playing');
          held.clear();
        }
        return;
      }
      if (keyMap[e.code]) {
        e.preventDefault();
        held.add(e.code);
        sync();
      }
    };
    const keyup = (e: KeyboardEvent) => {
      held.delete(e.code);
      sync();
    };
    const blur = () => {
      held.clear();
      controller.current?.pause(true);
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  const sound = () => {
    if (muted) audio.current?.enable();
    else if (audio.current) audio.current.muted = true;
    setMuted(!muted);
  };
  const resume = () => {
    controller.current?.pause(false);
    focusTarget.current?.focus({ preventScroll: true });
  };
  const restart = () => {
    controller.current?.restart();
    setNotice('');
    focusTarget.current?.focus({ preventScroll: true });
  };
  const touch = (key: keyof Input, label: string, icon: React.ReactNode) => (
    <Button
      variant="ghost"
      className={`touch-button touch-${key}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        if (controller.current) controller.current.input[key] = true;
      }}
      onPointerUp={() => {
        if (controller.current) controller.current.input[key] = false;
      }}
      onPointerCancel={() => {
        if (controller.current) controller.current.input[key] = false;
      }}
      onLostPointerCapture={() => {
        if (controller.current) controller.current.input[key] = false;
      }}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
  const overlay =
    started &&
    (snap.status === 'paused' ||
      snap.status === 'lost' ||
      snap.status === 'won');
  return (
    <main className="ocean-app">
      <header className="masthead">
        <Link className="wordmark" href="/" aria-label="Little Lobster home">
          <Shell size={28} />
          <span>
            little lobster<span className="wordmark-sub">PEARL RESCUE</span>
          </span>
        </Link>
        <div className="masthead-right">
          <span className="edition">A TINY OCEAN ADVENTURE</span>
          {best > 0 && (
            <span className="best-score">
              <Sparkles size={14} /> Best {best}/48
            </span>
          )}
          <Button
            className="icon-button"
            variant="ghost"
            aria-label={muted ? 'Turn sound on' : 'Mute sound'}
            aria-pressed={!muted}
            onClick={sound}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
        </div>
      </header>
      <section
        className={`game-frame ${started ? 'is-playing' : ''}`}
        aria-label="Little Lobster game"
      >
        {!started ? (
          <>
            <div className="welcome-sea" />
            <div className="welcome-vignette" />
            <div className="chapter-tag">
              <span className="live-dot" /> WORLD 01{' '}
              <span className="tag-divider">/</span> THE PEARL TRAIL
            </div>
            <div className="welcome-content">
              <p className="eyebrow">SMALL CLAWS. BIG ADVENTURE.</p>
              <h1>
                Little
                <br />
                <em>Lobster</em>
              </h1>
              <p className="welcome-copy">
                Follow the pearls into the blue.
                <br />
                There’s a whole ocean to meet.
              </p>
              <Button className="dive-button" onClick={() => setStarted(true)}>
                Dive in <ArrowRight size={20} />
              </Button>
              <span className="start-hint">
                Collect 18 pearls and find the home shell.
              </span>
            </div>
            <Image
              width={1254}
              height={1254}
              unoptimized
              className="welcome-lobster"
              src="/assets/lobster.png"
              alt="Your little hamster hero in a red lobster suit"
            />
            <div className="world-label">
              <Waves size={18} /> Sunlit Reef <span>01 / 03</span>
            </div>
          </>
        ) : (
          <>
            <div
              ref={focusTarget}
              tabIndex={-1}
              className="game-focus"
              aria-label="Use arrow keys to move, Space to swim, Shift to dash, and Escape to pause."
            >
              <div className="phaser-host" ref={canvas} />
            </div>
            <div className="game-hud">
              <div className="hud-left">
                <div
                  className="heart-row"
                  aria-label={`${snap.health} of 3 hearts`}
                >
                  {[0, 1, 2].map((i) => (
                    <Heart
                      key={i}
                      size={21}
                      fill={i < snap.health ? 'currentColor' : 'none'}
                      className={i < snap.health ? 'heart' : 'heart-empty'}
                    />
                  ))}
                </div>
                <div className="pearl-score">
                  <span className="pearl-dot" />
                  {snap.pearls}
                  <span>/ 18</span>
                  {snap.pearls >= 18 && <Check size={15} />}
                </div>
              </div>
              <div className="hud-right">
                <span
                  className={`dash-status ${snap.dashReady ? 'charged' : ''}`}
                >
                  <Zap size={15} />
                  {snap.dashReady ? 'Dash ready' : 'Recharging'}
                </span>
                <Button
                  variant="ghost"
                  className="pause-button"
                  aria-label={
                    snap.status === 'paused' ? 'Resume game' : 'Pause game'
                  }
                  onClick={() =>
                    snap.status === 'paused'
                      ? resume()
                      : controller.current?.pause(true)
                  }
                >
                  {snap.status === 'paused' ? <Play /> : <Pause />}
                </Button>
              </div>
            </div>
            {!ready && !error && (
              <output className="loading-message">
                Getting your flippers ready…
              </output>
            )}
            {error && (
              <div className="state-overlay">
                <div className="state-card">
                  <h2>The ocean couldn’t load.</h2>
                  <p>Please reload to try again.</p>
                  <Button
                    className="dive-button"
                    onClick={() => window.location.reload()}
                  >
                    Try again <RotateCcw />
                  </Button>
                </div>
              </div>
            )}
            <output className="game-notice" aria-live="polite">
              {notice}
            </output>
            {snap.progress > 0.91 &&
              snap.pearls < 18 &&
              snap.status === 'playing' && (
                <div className="exit-hint">
                  Find {18 - snap.pearls} more pearls, then return to the shell.
                </div>
              )}
            {overlay && !error && (
              <div className="state-overlay">
                <div className="state-card">
                  <span className="state-icon">
                    {snap.status === 'won' ? (
                      <Shell size={38} />
                    ) : snap.status === 'lost' ? (
                      <Heart size={38} />
                    ) : (
                      <Waves size={38} />
                    )}
                  </span>
                  <p className="eyebrow">
                    {snap.status === 'won'
                      ? 'A LITTLE OCEAN HERO'
                      : snap.status === 'lost'
                        ? 'EVERY ADVENTURE TAKES PRACTICE'
                        : 'TAKE YOUR TIME'}
                  </p>
                  <h2>
                    {snap.status === 'won'
                      ? 'Home, sweet shell.'
                      : snap.status === 'lost'
                        ? 'A little breather.'
                        : 'Just floating.'}
                  </h2>
                  <p>
                    {snap.status === 'won'
                      ? `${snap.pearls} pearls brought home in ${Math.floor(snap.seconds / 60)}m ${snap.seconds % 60}s.${snap.friend ? ' And a narwhal friend made along the way.' : ''}`
                      : snap.status === 'lost'
                        ? `Your pearls are safe. Try again from ${snap.checkpoint ? 'the checkpoint' : 'the reef'}.`
                        : 'The ocean will be right here.'}
                  </p>
                  <Button
                    className="dive-button"
                    onClick={
                      snap.status === 'won'
                        ? restart
                        : snap.status === 'lost'
                          ? () => {
                              controller.current?.continue();
                              setNotice('');
                              focusTarget.current?.focus({
                                preventScroll: true,
                              });
                            }
                          : resume
                    }
                  >
                    {snap.status === 'won'
                      ? 'Play again'
                      : snap.status === 'lost'
                        ? 'Keep swimming'
                        : 'Keep exploring'}
                    <ArrowRight size={20} />
                  </Button>
                  {snap.status === 'paused' && (
                    <Button
                      variant="ghost"
                      className="restart-button"
                      onClick={restart}
                    >
                      <RotateCcw size={14} /> Start over
                    </Button>
                  )}
                </div>
              </div>
            )}
            {!overlay && !error && (
              <div className="touch-controls">
                <div>
                  {touch('left', 'Left', <ArrowLeft />)}
                  {touch('right', 'Right', <ArrowRight />)}
                  {touch('down', 'Sink', <ArrowDown />)}
                </div>
                <div>
                  {touch('dash', 'Dash', <Zap />)}
                  {touch('swim', 'Swim', <ArrowUp />)}
                </div>
              </div>
            )}
            <div className="game-route">
              <span>
                <Waves size={14} />
                {regionNames[snap.region]}
              </span>
              <div
                className="route-track"
                aria-label={`${Math.min(100, Math.round(snap.progress * 100))}% through the level`}
              >
                <i
                  style={{ width: `${Math.min(100, snap.progress * 100)}%` }}
                />
              </div>
              <Shell size={18} />
            </div>
          </>
        )}
      </section>
      <div className="below-game">
        <div className="controls-legend">
          <span>
            <kbd>←</kbd>
            <kbd>→</kbd> Move
          </span>
          <span>
            <kbd>SPACE</kbd> Swim
          </span>
          <span>
            <kbd>SHIFT</kbd> Claw dash
          </span>
          <span>
            <kbd>ESC</kbd> Pause
          </span>
        </div>
        <span className="gentle-note">
          Take a breath. Dive a little deeper.
        </span>
      </div>
      <div className="chapter-strip">
        {regionNames.map((name, i) => (
          <div
            key={name}
            className={snap.region === i ? 'current-chapter' : ''}
          >
            <span>0{i + 1}</span>
            {name}
            <span className="chapter-line" />
          </div>
        ))}
      </div>
      <footer className="game-footer">
        <span>MADE FOR A LITTLE ESCAPE</span>
        <span>Collect pearls. Make waves.</span>
      </footer>
    </main>
  );
}

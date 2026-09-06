import * as Phaser from 'phaser';
import {
  advance,
  continueGame,
  createGame,
  idleInput,
  pearlCount,
  platforms,
  region,
  setPaused,
  WORLD,
} from './game-model';
import type { GameEvent, GameState, Input } from './game-model';
export type Snapshot = {
  status: GameState['status'];
  pearls: number;
  health: number;
  progress: number;
  region: number;
  dashReady: boolean;
  checkpoint: boolean;
  friend: boolean;
  seconds: number;
};
export type GameController = {
  input: Input;
  pause: (paused: boolean) => void;
  restart: () => void;
  continue: () => void;
  snapshot: () => Snapshot;
  destroy: () => void;
};
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: number;
};
export function createOceanGame(
  parent: HTMLElement,
  onSnapshot: (snapshot: Snapshot) => void,
  onEvent: (event: GameEvent) => void,
  onError: () => void,
): GameController {
  let state = createGame();
  const input = idleInput();
  const snapshot = (): Snapshot => ({
    status: state.status,
    pearls: pearlCount(state),
    health: state.player.health,
    progress: state.player.x / WORLD.exitX,
    region: region(state.player.x),
    dashReady: state.player.dashCooldown === 0,
    checkpoint: state.checkpoint,
    friend: state.friend,
    seconds: Math.floor(state.elapsed),
  });
  const emit = () => onSnapshot(snapshot());
  class Ocean extends Phaser.Scene {
    private hero: Phaser.GameObjects.Image | null = null;
    private backdrop: Phaser.GameObjects.TileSprite | null = null;
    private shade: Phaser.GameObjects.Rectangle | null = null;
    private ink: Phaser.GameObjects.Rectangle | null = null;
    private paint: Phaser.GameObjects.Graphics | null = null;
    private cameraX = 0;
    private timer = 0;
    private accumulated = 0;
    private particles: Particle[] = [];
    private enemies = new Map<number, Phaser.GameObjects.Image>();
    private buddy: Phaser.GameObjects.Image | null = null;
    private shell: Phaser.GameObjects.Text | null = null;
    private labels: { x: number; y: number; text: Phaser.GameObjects.Text }[] =
      [];
    constructor() {
      super('ocean');
    }
    preload() {
      this.load.image('lobster', '/assets/lobster.png');
      this.load.image('reef', '/assets/reef.png');
      this.load.image('creatures', '/assets/creatures.png');
      this.load.on('loaderror', onError);
    }
    create() {
      const w = this.scale.width;
      this.backdrop = this.add
        .tileSprite(0, 0, w, 720, 'reef')
        .setOrigin(0)
        .setTileScale(0.72);
      this.shade = this.add.rectangle(0, 0, w, 720, 0x03112e, 0).setOrigin(0);
      this.paint = this.add.graphics();
      const atlas = this.textures.get('creatures');
      atlas.add('sepia', 0, 0, 0, 627, 605);
      atlas.add('catfish', 0, 627, 0, 627, 605);
      atlas.add('bigfin', 0, 630, 610, 624, 644);
      // The narwhal's horn crosses its atlas cell; clip the neighboring squid while rendering.
      const buddyTexture = this.textures.createCanvas('narwhal', 800, 644);
      if (buddyTexture) {
        const c = buddyTexture.context;
        c.save();
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(800, 0);
        c.lineTo(800, 205);
        c.lineTo(590, 280);
        c.lineTo(590, 644);
        c.lineTo(0, 644);
        c.closePath();
        c.clip();
        const source = atlas.getSourceImage();
        if (
          source instanceof HTMLImageElement ||
          source instanceof HTMLCanvasElement
        )
          c.drawImage(source, 0, 610, 800, 644, 0, 0, 800, 644);
        c.restore();
        buddyTexture.refresh();
      }
      state.creatures.forEach((e) => {
        const size =
          e.kind === 'bigfin' ? 225 : e.kind === 'catfish' ? 118 : 100;
        this.enemies.set(
          e.id,
          this.add
            .image(e.x, e.y, 'creatures', e.kind)
            .setDisplaySize(size, size),
        );
      });
      this.buddy = this.add
        .image(3370, 230, 'narwhal')
        .setDisplaySize(190, 150);
      this.shell = this.add
        .text(WORLD.exitX, WORLD.exitY, '🐚', { fontSize: '92px' })
        .setOrigin(0.5);
      this.hero = this.add
        .image(state.player.x, state.player.y, 'lobster')
        .setDisplaySize(104, 104);
      for (const l of [
        { x: 300, y: 200, t: 'Follow the pearl trail →' },
        { x: 870, y: 660, t: 'Hold SPACE to swim · SHIFT to dash' },
        { x: 1710, y: 195, t: 'Catch the bubble current ↑' },
        { x: 2570, y: 590, t: '✦  CHECKPOINT' },
        { x: 3370, y: 130, t: 'A friendly face. Swim over to say hello.' },
        { x: 4910, y: 175, t: 'Bigfin ahead. Slip underneath!' },
        { x: WORLD.exitX, y: 650, t: 'HOME · 18 PEARLS' },
      ]) {
        this.labels.push({
          x: l.x,
          y: l.y,
          text: this.add
            .text(l.x, l.y, l.t, {
              fontFamily: 'Arial',
              fontSize: '16px',
              color: '#e1eee0',
              stroke: '#123b4e',
              strokeThickness: 4,
            })
            .setOrigin(0.5),
        });
      }
      this.ink = this.add
        .rectangle(0, 0, w, 720, 0x241039, 0)
        .setOrigin(0)
        .setDepth(20);
      emit();
    }
    update(_time: number, delta: number) {
      if (
        !this.hero ||
        !this.paint ||
        !this.backdrop ||
        !this.shade ||
        !this.ink
      )
        return;
      this.accumulated += Math.min(delta / 1000, 0.1);
      while (this.accumulated >= 1 / 60) {
        advance(state, input, 1 / 60);
        for (const event of state.events) {
          onEvent(event);
          this.burst(event);
        }
        this.accumulated -= 1 / 60;
      }
      this.timer += delta;
      if (this.timer > 100) {
        emit();
        this.timer = 0;
      }
      const w = this.scale.width,
        p = state.player,
        t = state.elapsed;
      const target = Math.max(0, Math.min(WORLD.width - w, p.x - w * 0.32));
      this.cameraX += (target - this.cameraX) * 0.12;
      if (Math.abs(target - this.cameraX) > w) this.cameraX = target;
      const x = (worldX: number) => worldX - this.cameraX;
      this.backdrop.setSize(w, 720);
      this.backdrop.tilePositionX = this.cameraX * 0.19;
      this.shade.setSize(w, 720).setAlpha(region(p.x) * 0.19);
      this.ink.setSize(w, 720).setAlpha(Math.min(0.48, state.ink * 0.6));
      const g = this.paint;
      g.clear();
      for (let i = 0; i < 38; i++) {
        const bx =
          (((i * 197 - this.cameraX * 0.35) % (w + 100)) + (w + 100)) %
          (w + 100);
        const by = 720 - ((i * 91 + t * (13 + (i % 5) * 3)) % 750);
        g.lineStyle(1, 0xd3f2e7, 0.23);
        g.strokeCircle(bx, by, 2 + (i % 5));
      }
      for (const c of [1710, 4050]) {
        if (x(c) < -100 || x(c) > w + 100) continue;
        g.fillStyle(0xa5e6cd, 0.07);
        g.fillRoundedRect(x(c) - 60, 170, 120, 470, 40);
        for (let i = 0; i < 14; i++) {
          g.lineStyle(2, 0xb8eddf, 0.4);
          g.strokeCircle(
            x(c) + Math.sin(i * 7 + t) * 37,
            620 - ((i * 38 + t * 130) % 440),
            3 + (i % 5),
          );
        }
      }
      for (const pl of platforms) {
        if (x(pl.x) > w || x(pl.x + pl.width) < 0) continue;
        g.fillStyle(0x092f42, 0.9);
        g.fillRoundedRect(x(pl.x), pl.y, pl.width, pl.height, 12);
        g.lineStyle(2, 0x67b9aa, 0.65);
        g.strokeRoundedRect(x(pl.x), pl.y, pl.width, pl.height, 12);
        g.fillStyle(0x99d4be, 0.7);
        g.fillRoundedRect(x(pl.x) + 7, pl.y, pl.width - 14, 5, 3);
      }
      for (const pearl of state.pearls) {
        if (pearl.collected || x(pearl.x) < -30 || x(pearl.x) > w + 30)
          continue;
        const py = pearl.y + Math.sin(t * 2 + pearl.x) * 4;
        g.fillStyle(0xbdf4e2, 0.09);
        g.fillCircle(x(pearl.x), py, 22);
        g.fillStyle(0xe4ecdd, 1);
        g.fillCircle(x(pearl.x), py, 8);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(x(pearl.x) - 2, py - 3, 3);
      }
      g.lineStyle(3, state.checkpoint ? 0xb0f1c3 : 0xa7cbd4, 0.65);
      g.strokeCircle(x(2570), 485, 31);
      g.fillStyle(0xb5e6d3, 0.12);
      g.fillCircle(x(2570), 485, 44);
      const ready = pearlCount(state) >= WORLD.requiredPearls;
      g.lineStyle(3, ready ? 0xf7df9b : 0x93babe, 0.65 + 0.2 * Math.sin(t * 3));
      g.strokeCircle(x(WORLD.exitX), WORLD.exitY, 76);
      g.fillStyle(0xf4dba8, 0.1);
      g.fillCircle(x(WORLD.exitX), WORLD.exitY, 92);
      this.shell?.setPosition(x(WORLD.exitX), WORLD.exitY + Math.sin(t) * 5);
      for (const e of state.creatures) {
        const sprite = this.enemies.get(e.id);
        sprite
          ?.setPosition(x(e.x), e.y)
          .setVisible(e.active)
          .setRotation(Math.sin(t * 1.4 + e.id) * 0.07);
        if (e.kind === 'catfish')
          sprite?.setFlipX(Math.cos(t * 0.8 + e.id) > 0);
        if (e.kind === 'sepia' && e.active && Math.sin(t * 1.4 + e.id) > 0.8) {
          g.fillStyle(0x432557, 0.35);
          g.fillCircle(x(e.x) - 40, e.y + 18, 82);
        }
      }
      this.buddy
        ?.setPosition(
          x(3370 + Math.sin(t * 0.5) * 110),
          230 + Math.sin(t * 0.8) * 35,
        )
        .setRotation(Math.sin(t) * 0.06);
      this.hero
        .setPosition(x(p.x), p.y + Math.sin(t * 4) * 2)
        .setFlipX(p.facing < 0)
        .setRotation(p.dashTime > 0 ? p.facing * 0.25 : p.vy * 0.0005)
        .setAlpha(p.invincible > 0 && Math.sin(t * 25) > 0 ? 0.45 : 1);
      if (p.dashTime > 0) {
        g.lineStyle(3, 0xc1f1df, 0.6);
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(x(p.x) - p.facing * 35, p.y - 15 + i * 16);
          g.lineTo(x(p.x) - p.facing * (90 + i * 15), p.y - 15 + i * 16);
          g.strokePath();
        }
      }
      for (const l of this.labels) l.text.setX(x(l.x));
      if (state.status === 'playing')
        for (const part of this.particles) {
          part.life -= delta / 1000;
          part.x += (part.vx * delta) / 1000;
          part.y += (part.vy * delta) / 1000;
        }
      this.particles = this.particles.filter((part) => part.life > 0);
      for (const part of this.particles) {
        g.fillStyle(part.color, Math.min(1, part.life));
        g.fillCircle(x(part.x), part.y, 3);
      }
    }
    burst(event: GameEvent) {
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5;
        this.particles.push({
          x: event.x,
          y: event.y,
          vx: Math.cos(angle) * 90,
          vy: Math.sin(angle) * 90 - 20,
          life: 0.7,
          color: event.kind === 'hurt' ? 0xf49c89 : 0xe4f7c7,
        });
      }
    }
  }
  const logicalWidth = () =>
    Math.round((720 * parent.clientWidth) / Math.max(1, parent.clientHeight));
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: logicalWidth(),
    height: 720,
    backgroundColor: '#145366',
    transparent: false,
    antialias: true,
    scene: Ocean,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
    banner: false,
  });
  const observer = new ResizeObserver(() => {
    game.scale.resize(logicalWidth(), 720);
  });
  observer.observe(parent);
  return {
    input,
    pause(paused) {
      setPaused(state, paused);
      Object.assign(input, idleInput());
      emit();
    },
    restart() {
      state = createGame();
      Object.assign(input, idleInput());
      emit();
    },
    continue() {
      continueGame(state);
      Object.assign(input, idleInput());
      emit();
    },
    snapshot,
    destroy() {
      observer.disconnect();
      game.destroy(true);
    },
  };
}

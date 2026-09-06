import type * as Phaser from 'phaser';
import { LobsterView } from './LobsterView';
import { WORLD, platforms, pearlBlocks, region } from '../model/level';
import { pearlCount } from '../model/simulation';
import type { GameState, GameEvent } from '../model/simulation';
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: number;
};

export class OceanView {
  private backdrop: Phaser.GameObjects.TileSprite;
  private shade: Phaser.GameObjects.Rectangle;
  private ink: Phaser.GameObjects.Rectangle;
  private paint: Phaser.GameObjects.Graphics;
  private blockLabels: Phaser.GameObjects.Text[];
  private cameraX = 0;
  private particles: Particle[] = [];
  private enemies = new Map<number, Phaser.GameObjects.Image>();
  private buddy: Phaser.GameObjects.Image;
  private shell: Phaser.GameObjects.Text;
  private labels: { x: number; y: number; text: Phaser.GameObjects.Text }[] =
    [];
  readonly lobster: LobsterView;
  constructor(
    private scene: Phaser.Scene,
    state: GameState,
  ) {
    const w = scene.scale.width;
    this.backdrop = scene.add
      .tileSprite(0, 0, w, 720, 'reef')
      .setOrigin(0)
      .setTileScale(0.72)
      .setTint(0x9bffff);
    this.shade = scene.add.rectangle(0, 0, w, 720, 0x03112e, 0).setOrigin(0);
    this.paint = scene.add.graphics();
    this.blockLabels = pearlBlocks.map((block) =>
      scene.add
        .text(block.x, block.y, '?', {
          fontFamily: 'Arial Black, Arial',
          fontSize: '32px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#a6530a',
          strokeThickness: 4,
        })
        .setOrigin(0.5),
    );
    state.creatures.forEach((e) => {
      const size = e.kind === 'bigfin' ? 225 : e.kind === 'catfish' ? 118 : 100;
      this.enemies.set(
        e.id,
        scene.add
          .image(e.x, e.y, 'creatures', e.kind)
          .setDisplaySize(size, size),
      );
    });
    this.buddy = scene.add.image(3370, 230, 'narwhal').setDisplaySize(190, 150);
    this.shell = scene.add
      .text(WORLD.exitX, WORLD.exitY, '🐚', { fontSize: '92px' })
      .setOrigin(0.5);
    this.lobster = new LobsterView(scene, state);
    for (const l of [
      { x: 300, y: 200, t: 'WORLD 1-1  ·  PEARL RESCUE →' },
      { x: 440, y: 675, t: 'SPACE: jump / swim   SHIFT: dash' },
      { x: 780, y: 290, t: 'Bump golden blocks from below!' },
      { x: 1200, y: 180, t: 'Bounce on smaller enemies ↓' },
      { x: 1710, y: 195, t: 'Catch the bubble current ↑' },
      { x: 2570, y: 590, t: '✦  CHECKPOINT' },
      { x: 3370, y: 130, t: 'A friendly face. Swim over to say hello.' },
      { x: 4910, y: 175, t: 'Bigfin ahead. Slip underneath!' },
      { x: WORLD.exitX, y: 650, t: 'HOME · 18 PEARLS' },
    ]) {
      this.labels.push({
        x: l.x,
        y: l.y,
        text: scene.add
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
    this.ink = scene.add
      .rectangle(0, 0, w, 720, 0x241039, 0)
      .setOrigin(0)
      .setDepth(20);
  }

  reset(state: GameState) {
    this.particles = [];
    this.cameraX = Math.max(
      0,
      Math.min(
        WORLD.width - this.scene.scale.width,
        state.player.x - this.scene.scale.width * 0.32,
      ),
    );
    this.lobster.reset(state);
    this.render(state, 0);
  }

  render(state: GameState, delta: number) {
    const w = this.scene.scale.width,
      p = state.player,
      t = state.elapsed;
    const target = Math.max(0, Math.min(WORLD.width - w, p.x - w * 0.32));
    this.cameraX += (target - this.cameraX) * 0.12;
    if (Math.abs(target - this.cameraX) > w) this.cameraX = target;
    const x = (worldX: number) => worldX - this.cameraX;
    this.backdrop.setSize(w, 720);
    this.backdrop.tilePositionX = this.cameraX * 0.19;
    this.shade.setSize(w, 720).setAlpha(region(p.x) * 0.09);
    this.ink.setSize(w, 720).setAlpha(Math.min(0.48, state.ink * 0.6));
    const g = this.paint;
    g.clear();
    for (let i = 0; i < 38; i++) {
      const bx =
        (((i * 197 - this.cameraX * 0.35) % (w + 100)) + (w + 100)) % (w + 100);
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
    g.fillStyle(0x184b80);
    g.fillRect(0, WORLD.floor + 10, w, 86);
    g.fillStyle(0xffd56b);
    g.fillRect(0, WORLD.floor, w, 12);
    g.fillStyle(0xfff2a8);
    g.fillRect(0, WORLD.floor, w, 4);
    g.lineStyle(3, 0x2875a2);
    for (
      let tile = Math.floor(this.cameraX / 64);
      tile < (this.cameraX + w) / 64;
      tile++
    ) {
      g.strokeRect(x(tile * 64), WORLD.floor + 14, 64, 38);
      g.strokeRect(x(tile * 64 - 32), WORLD.floor + 52, 64, 38);
    }
    for (const pl of platforms) {
      if (x(pl.x) > w || x(pl.x + pl.width) < 0) continue;
      g.fillStyle(0x073965);
      g.fillRoundedRect(x(pl.x) - 3, pl.y - 3, pl.width + 6, pl.height + 9, 6);
      g.fillStyle(0xe8773d);
      g.fillRoundedRect(x(pl.x), pl.y, pl.width, pl.height, 4);
      g.fillStyle(0xffd66e);
      g.fillRect(x(pl.x), pl.y, pl.width, 9);
      g.fillStyle(0xffefad);
      g.fillRect(x(pl.x) + 4, pl.y, pl.width - 8, 3);
      g.lineStyle(2, 0xa44730);
      for (let tile = 40; tile < pl.width; tile += 40) {
        g.lineBetween(
          x(pl.x) + tile,
          pl.y + 10,
          x(pl.x) + tile,
          pl.y + pl.height,
        );
      }
    }
    state.blocks.forEach((block, index) => {
      const bx = x(block.x),
        by = block.y - Math.sin((block.bump / 0.22) * Math.PI) * 12;
      g.fillStyle(0x173e65);
      g.fillRoundedRect(bx - 27, by - 27, 54, 58, 6);
      g.fillStyle(block.used ? 0x4f8caa : 0xffb82e);
      g.fillRoundedRect(bx - 24, by - 24, 48, 48, 4);
      g.lineStyle(3, block.used ? 0x7fb2c2 : 0xffec8c);
      g.strokeRoundedRect(bx - 20, by - 20, 40, 40, 3);
      this.blockLabels[index]
        ?.setPosition(bx, by)
        .setText(block.used ? '·' : '?');
    });
    for (const pearl of state.pearls) {
      if (pearl.collected || x(pearl.x) < -30 || x(pearl.x) > w + 30) continue;
      const py = pearl.y + Math.sin(t * 2 + pearl.x) * 4;
      g.fillStyle(0xffdf67, 0.2);
      g.fillCircle(x(pearl.x), py, 22);
      g.fillStyle(0xffe77b, 1);
      g.fillCircle(x(pearl.x), py, 11);
      g.lineStyle(2, 0xc68522);
      g.strokeCircle(x(pearl.x), py, 11);
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
      if (e.kind === 'catfish') sprite?.setFlipX(Math.cos(t * 0.8 + e.id) > 0);
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
    this.lobster.render(state, this.cameraX);
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

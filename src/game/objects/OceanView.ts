import type * as Phaser from 'phaser';
import { LobsterView } from './LobsterView';
import { EnemyView } from './EnemyView';
import { InkCloudView } from './InkCloudView';
import { ReefScenery } from './ReefScenery';
import { OceanEffects } from './OceanEffects';
import { region, biomeNames } from '../model/level';
import { pearlCount } from '../model/simulation';
import type { GameState, GameEvent } from '../model/simulation';

export class OceanView {
  private electroSprites: Phaser.GameObjects.Image[] = [];
  private scenery: ReefScenery;
  private pearls: Phaser.GameObjects.Image[];
  private blocks: Phaser.GameObjects.Image[];
  private shade: Phaser.GameObjects.Rectangle;
  private ink: Phaser.GameObjects.Rectangle;
  private paint: Phaser.GameObjects.Graphics;
  private blockLabels: Phaser.GameObjects.Text[];
  private ringLabels: Phaser.GameObjects.Text[];
  private treasures: Phaser.GameObjects.Image[];
  private treasureLabels: Phaser.GameObjects.Text[];
  private cameraX = 0;
  private effects: OceanEffects;
  private treasureReactions: {
    lift: number;
    scale: number;
    labelAlpha: number;
  }[];
  private treasureTweens = new Map<number, Phaser.Tweens.Tween>();
  private enemies = new Map<number, EnemyView>();
  private inkClouds = new Map<number, InkCloudView>();
  private buddy: Phaser.GameObjects.Image;
  private shell: Phaser.GameObjects.Image;
  private labels: { x: number; y: number; text: Phaser.GameObjects.Text }[] =
    [];
  readonly lobster: LobsterView;
  constructor(
    private scene: Phaser.Scene,
    private state: GameState,
  ) {
    const w = scene.scale.width;
    this.treasureReactions = state.treasures.map(() => ({
      lift: 0,
      scale: 1,
      labelAlpha: 1,
    }));
    this.effects = new OceanEffects(scene);
    this.scenery = new ReefScenery(scene, state.level);
    this.shade = scene.add
      .rectangle(0, 0, w, 720, 0x03112e, 0)
      .setOrigin(0)
      .setDepth(-15);
    this.paint = scene.add.graphics();
    this.pearls = state.pearls.map((pearl) =>
      scene.add
        .image(pearl.x, pearl.y, 'reef-props', 'pearl')
        .setDisplaySize(25, 25),
    );
    this.ringLabels = state.level.trial.rings.map((ring, index) =>
      scene.add
        .text(ring.x, ring.y, String(index + 1), {
          fontFamily: 'Arial',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#fff2b5',
          stroke: '#123b4e',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setName(`trial-ring-${index}`)
        .setDepth(2),
    );
    this.treasures = state.treasures.map((treasure) =>
      scene.add
        .image(treasure.x, treasure.y, 'reef-props', 'pearl')
        .setDisplaySize(42, 42)
        .setTint(0xffd35d)
        .setName('golden-pearl')
        .setDepth(2),
    );
    this.treasureLabels = state.level.treasures.map((treasure) =>
      scene.add
        .text(treasure.x, treasure.y + 44, treasure.name, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#ffe8a0',
          stroke: '#123b4e',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(2),
    );
    this.blocks = state.blocks.map((block) =>
      scene.add
        .image(block.x, block.y, 'reef-props', 'reward-block')
        .setDisplaySize(52, 52),
    );
    this.blockLabels = state.blocks.map((block) =>
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
    for (const creature of state.creatures) {
      if (creature.kind === 'sepia')
        this.inkClouds.set(creature.id, new InkCloudView(scene));
    }
    state.creatures.forEach((e) => {
      this.enemies.set(e.id, new EnemyView(scene, e));
    });
    this.buddy = scene.add.image(3370, 230, 'narwhal').setDisplaySize(190, 150);
    this.shell = scene.add
      .image(
        state.level.world.exitX,
        state.level.world.exitY,
        state.level.biome === 'reef'
          ? 'reef-props'
          : state.level.biome === 'kelp'
            ? 'kelp-forest-props'
            : 'crystal-cave-props',
        'shell-house',
      )
      .setDisplaySize(150, 154)
      .setOrigin(0.5);
    this.lobster = new LobsterView(scene, state);
    for (const l of state.level.number === 1
      ? [
          { x: 300, y: 200, t: 'WORLD 1-1  ·  PEARL RESCUE →' },
          { x: 440, y: 675, t: 'SPACE: jump / swim   SHIFT: dash' },
          { x: 780, y: 290, t: 'Bump golden blocks from below!' },
          { x: 1210, y: 200, t: 'BOUNCE TRAIL · 3 stomps without landing' },
          {
            x: 1050,
            y: 655,
            t: 'Easy pearl path →     ↶ Return here to retry bounces',
          },
          { x: 1920, y: 140, t: 'CURRENT RUN · 3 rings in 4 seconds →' },
          { x: 1710, y: 655, t: 'Ride up ↑  ·  Hold sink to stay low' },
          { x: 2570, y: 590, t: '✦  CHECKPOINT' },
          { x: 3370, y: 130, t: 'A friendly face. Swim over to say hello.' },
          { x: 4910, y: 175, t: 'Bigfin ahead. Slip underneath!' },
          { x: state.level.world.exitX, y: 650, t: 'NEXT LEVEL · 18 PEARLS' },
        ]
      : [
          {
            x: 410,
            y: 170,
            t: `LEVEL ${state.level.number} · ${biomeNames[state.level.biome]}`,
          },
          { x: state.level.checkpointX, y: 660, t: '✦ CHECKPOINT' },
          { x: state.level.world.exitX, y: 650, t: 'NEXT LEVEL · 18 PEARLS' },
          ...state.level.sections.map((name, index) => ({
            x: 550 + index * 650,
            y: 190,
            t: name,
          })),
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
    this.state = state;
    this.effects.reset();
    for (const tween of this.treasureTweens.values()) tween.remove();
    this.treasureTweens.clear();
    for (const reaction of this.treasureReactions) {
      reaction.lift = 0;
      reaction.scale = reaction.labelAlpha = 1;
    }
    for (const cloud of this.inkClouds.values()) cloud.reset();
    this.cameraX = Math.max(
      0,
      Math.min(
        state.level.world.width - this.scene.scale.width,
        state.player.x - this.scene.scale.width * 0.32,
      ),
    );
    this.lobster.reset(state);
    for (const creature of state.creatures)
      this.enemies.get(creature.id)?.reset(creature);
    this.render(state, 0);
  }

  render(state: GameState, delta: number) {
    const w = this.scene.scale.width,
      p = state.player,
      t = state.elapsed;
    const target = Math.max(
      0,
      Math.min(state.level.world.width - w, p.x - w * 0.32),
    );
    this.cameraX += (target - this.cameraX) * 0.12;
    if (Math.abs(target - this.cameraX) > w) this.cameraX = target;
    const x = (worldX: number) => worldX - this.cameraX;
    this.scenery.render(this.cameraX);
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
    for (const current of state.level.currents) {
      const c = current.x;
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
    state.level.trial.rings.forEach((ring, index) => {
      const passed =
        state.ringTrial.kind === 'complete' ||
        (state.ringTrial.kind === 'racing' && index < state.ringTrial.nextRing);
      const next =
        state.ringTrial.kind === 'ready'
          ? index === 0
          : state.ringTrial.kind === 'racing' &&
            index === state.ringTrial.nextRing;
      const color = passed ? 0x9ef7cf : 0xffda70;
      g.lineStyle(next ? 5 : 2, color, passed ? 0.25 : next ? 0.95 : 0.45);
      g.strokeCircle(x(ring.x), ring.y, 46);
      if (next) {
        g.lineStyle(2, color, 0.2 + Math.sin(t * 4) * 0.1);
        g.strokeCircle(x(ring.x), ring.y, 55);
      }
      this.ringLabels[index]
        ?.setPosition(x(ring.x), ring.y)
        .setText(passed ? '✓' : String(index + 1))
        .setAlpha(passed ? 0.4 : 1);
    });
    state.treasures.forEach((treasure, index) => {
      const reaction = this.treasureReactions[index];
      const lift = reaction?.lift ?? 0;
      this.treasures[index]
        ?.setPosition(x(treasure.x), treasure.y + Math.sin(t * 3) * 5 - lift)
        .setDisplaySize(
          42 * (reaction?.scale ?? 1),
          42 * (reaction?.scale ?? 1),
        )
        .setVisible(!treasure.collected)
        .setAlpha(treasure.unlocked ? 1 : 0.3);
      this.treasureLabels[index]
        ?.setPosition(x(treasure.x), treasure.y + 42)
        .setAlpha(treasure.collected ? 1 : (reaction?.labelAlpha ?? 1))
        .setText(
          treasure.collected
            ? '✓ +3 pearls'
            : treasure.unlocked
              ? '+3 · Catch it!'
              : index === 0
                ? '3 stomps to unlock'
                : 'Finish the rings',
        );
      if (!treasure.collected) {
        g.lineStyle(2, 0xffd35d, treasure.unlocked ? 0.8 : 0.3);
        g.strokeCircle(x(treasure.x), treasure.y, 33);
        if (treasure.unlocked) {
          g.fillStyle(0xffd35d, 0.13);
          g.fillCircle(x(treasure.x), treasure.y, 48);
        }
      }
    });
    state.blocks.forEach((block, index) => {
      const bx = x(block.x),
        by = block.y - Math.sin((block.bump / 0.22) * Math.PI) * 12;
      this.blocks[index]?.setPosition(bx, by).setVisible(!block.used);
      if (block.used) {
        g.fillStyle(0x173e65);
        g.fillRoundedRect(bx - 25, by - 25, 50, 52, 8);
        g.fillStyle(0x518391);
        g.fillRoundedRect(bx - 23, by - 23, 46, 46, 7);
        g.lineStyle(2, 0x8db5ae);
        g.strokeRoundedRect(bx - 19, by - 19, 38, 38, 5);
      }
      this.blockLabels[index]
        ?.setPosition(bx, by)
        .setText(block.used ? '·' : '');
    });
    state.pearls.forEach((pearl, index) => {
      const visible =
        !pearl.collected && x(pearl.x) >= -30 && x(pearl.x) <= w + 30;
      const py = pearl.y + Math.sin(t * 2 + pearl.x) * 4;
      this.pearls[index]?.setVisible(visible).setPosition(x(pearl.x), py);
      if (!visible) return;
      g.fillStyle(0xffeed0, 0.1 + Math.sin(t * 2 + pearl.x) * 0.025);
      g.fillCircle(x(pearl.x), py, 22);
      const glint = Math.max(0, Math.sin(t * 2.5 + pearl.x));
      g.lineStyle(1.5, 0xfff8df, glint * 0.85);
      g.lineBetween(x(pearl.x) + 13, py - 18, x(pearl.x) + 13, py - 10);
      g.lineBetween(x(pearl.x) + 9, py - 14, x(pearl.x) + 17, py - 14);
    });
    g.lineStyle(3, state.checkpoint ? 0xb0f1c3 : 0xa7cbd4, 0.65);
    g.strokeCircle(x(state.level.checkpointX), 485, 31);
    g.fillStyle(0xb5e6d3, 0.12);
    g.fillCircle(x(state.level.checkpointX), 485, 44);
    const ready = pearlCount(state) >= state.level.world.requiredPearls;
    g.lineStyle(3, ready ? 0xf7df9b : 0x93babe, 0.65 + 0.2 * Math.sin(t * 3));
    g.strokeCircle(x(state.level.world.exitX), state.level.world.exitY, 76);
    g.fillStyle(0xf4dba8, 0.1);
    g.fillCircle(x(state.level.world.exitX), state.level.world.exitY, 92);
    this.shell?.setPosition(
      x(state.level.world.exitX),
      state.level.world.exitY + Math.sin(t) * 5,
    );
    for (const e of state.creatures) {
      this.enemies.get(e.id)?.render(e, t, this.cameraX);
      this.inkClouds.get(e.id)?.render(e, t, this.cameraX);
    }
    this.buddy
      ?.setPosition(
        x(state.level.friendX + Math.sin(t * 0.5) * 110),
        230 + Math.sin(t * 0.8) * 35,
      )
      .setRotation(Math.sin(t) * 0.06);
    const orbs = [
      ...state.electroPickups.map((pickup) => ({
        ...pickup,
        size: 58,
        alpha: pickup.life < 2 ? 0.5 + Math.sin(t * 16) * 0.3 : 1,
      })),
      ...state.electroBalls
        .filter((ball) => ball.life > 0)
        .map((ball) => ({ ...ball, size: 38, alpha: 1 })),
    ];
    while (this.electroSprites.length > orbs.length)
      this.electroSprites.pop()?.destroy();
    orbs.forEach((orb, index) => {
      const sprite =
        this.electroSprites[index] ??
        this.scene.add
          .image(0, 0, 'electro-orb')
          .setDepth(8)
          .setName('electro-orb');
      this.electroSprites[index] = sprite;
      sprite
        .setPosition(x(orb.x), orb.y)
        .setDisplaySize(orb.size, orb.size)
        .setAlpha(orb.alpha)
        .setRotation(Math.sin(t * 9) * 0.1);
    });
    if (p.electroTime > 0) {
      g.lineStyle(2, 0x73f5ff, 0.55 + Math.sin(t * 12) * 0.2);
      g.strokeCircle(x(p.x), p.y, 43);
      g.fillStyle(0x47dfff, 0.1);
      g.fillCircle(x(p.x), p.y, 43);
    }
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
    this.effects.render(state, this.cameraX, delta);
    this.setPlaying(state.status === 'playing');
  }
  burst(event: GameEvent) {
    this.effects.burst(event);
    if (event.kind === 'treasure-unlocked') {
      const index = this.state.level.treasures.findIndex(
        (treasure) => treasure.x === event.x && treasure.y === event.y,
      );
      const reaction = this.treasureReactions[index];
      if (!reaction) return;
      this.treasureTweens.get(index)?.remove();
      reaction.labelAlpha = 0;
      const tween = this.scene.tweens.add({
        targets: reaction,
        lift: {
          from: 0,
          to: 22,
          duration: 320,
          yoyo: true,
          ease: 'Sine.easeInOut',
        },
        scale: {
          from: 1,
          to: 1.35,
          duration: 320,
          yoyo: true,
          ease: 'Sine.easeInOut',
        },
        labelAlpha: { from: 0, to: 1, delay: 220, duration: 420 },
        onComplete: () => this.treasureTweens.delete(index),
      });
      this.treasureTweens.set(index, tween);
    }
  }

  setPlaying(playing: boolean) {
    this.effects.setPlaying(playing);
    for (const tween of this.treasureTweens.values()) {
      if (playing) tween.resume();
      else tween.pause();
    }
  }
}

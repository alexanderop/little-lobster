import type * as Phaser from 'phaser';
import type { GameEvent, GameState } from '../model/simulation';

export class OceanEffects {
  private readonly bubbles: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly gold: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly motes: Phaser.GameObjects.Particles.ParticleEmitter;
  private dashElapsed = 0;

  constructor(scene: Phaser.Scene) {
    if (!scene.textures.exists('effect-bubble')) {
      const brush = scene.make.graphics({ x: 0, y: 0 });
      brush.lineStyle(2, 0xffffff, 0.85);
      brush.strokeCircle(12, 12, 9);
      brush.fillStyle(0xffffff, 0.9);
      brush.fillCircle(9, 8, 2);
      brush.generateTexture('effect-bubble', 24, 24);
      brush.clear();
      brush.fillStyle(0xffffff);
      brush.fillTriangle(8, 0, 12, 8, 8, 16);
      brush.fillTriangle(8, 0, 4, 8, 8, 16);
      brush.generateTexture('effect-spark', 16, 16);
      brush.destroy();
    }
    this.bubbles = scene.add
      .particles(0, 0, 'effect-bubble', {
        emitting: false,
        lifespan: { min: 350, max: 650 },
        speed: { min: 30, max: 85 },
        gravityY: -65,
        scale: { start: 0.45, end: 0.8 },
        alpha: { start: 0.7, end: 0 },
        tint: 0xc1f1df,
        maxParticles: 100,
      })
      .setName('dash-and-stomp-bubbles')
      .setDepth(7);
    this.sparks = scene.add
      .particles(0, 0, 'effect-spark', {
        emitting: false,
        lifespan: { min: 150, max: 320 },
        speed: { min: 100, max: 230 },
        scale: { start: 0.7, end: 0 },
        rotate: { min: 0, max: 360 },
        tint: [0x78efff, 0xe2ffff],
        alpha: { start: 1, end: 0 },
        maxParticles: 100,
      })
      .setName('electro-sparks')
      .setDepth(9);
    this.gold = scene.add
      .particles(0, 0, 'effect-spark', {
        emitting: false,
        lifespan: { min: 550, max: 900 },
        speed: { min: 70, max: 160 },
        angle: { min: 205, max: 335 },
        gravityY: 160,
        scale: { start: 0.85, end: 0.2 },
        rotate: { start: 0, end: 240 },
        tint: [0xffd35d, 0xffefb0],
        alpha: { start: 1, end: 0 },
        maxParticles: 100,
      })
      .setName('treasure-fragments')
      .setDepth(9);
    this.motes = scene.add
      .particles(0, 0, 'effect-spark', {
        emitting: false,
        lifespan: 500,
        speed: { min: 30, max: 80 },
        scale: { start: 0.35, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint: 0xe4f7c7,
        maxParticles: 100,
      })
      .setName('reward-motes')
      .setDepth(7);
  }

  private get emitters() {
    return [this.bubbles, this.sparks, this.gold, this.motes];
  }

  render(state: GameState, cameraX: number, delta: number) {
    for (const emitter of this.emitters) emitter.setX(-cameraX);
    if (state.status !== 'playing' || state.player.dashTime <= 0) {
      this.dashElapsed = 0;
      return;
    }
    this.dashElapsed += delta;
    while (this.dashElapsed >= 24) {
      this.dashElapsed -= 24;
      this.bubbles.emitParticleAt(
        state.player.x - state.player.facing * 42,
        state.player.y + 12,
        2,
      );
    }
  }

  burst(event: GameEvent) {
    switch (event.kind) {
      case 'dash':
        break;
      case 'stomp':
        for (let i = 0; i < 14; i++) {
          const angle = (i * Math.PI * 2) / 14;
          this.bubbles.emitParticleAt(
            event.x + Math.cos(angle) * 25,
            event.y + Math.sin(angle) * 12,
            1,
          );
        }
        break;
      case 'electro-spawn':
      case 'electro-pickup':
      case 'electro-shot':
      case 'electro-hit':
        this.sparks.emitParticleAt(
          event.x,
          event.y,
          event.kind === 'electro-shot' ? 6 : 18,
        );
        break;
      case 'treasure':
      case 'treasure-unlocked':
        this.gold.emitParticleAt(event.x, event.y, 28);
        break;
      default:
        this.motes.setParticleTint(
          event.kind === 'hurt'
            ? 0xf49c89
            : event.kind === 'ring'
              ? 0xffd35d
              : 0xe4f7c7,
        );
        this.motes.emitParticleAt(event.x, event.y, 10);
    }
  }

  setPlaying(playing: boolean) {
    for (const emitter of this.emitters) {
      if (playing) emitter.resume();
      else emitter.pause();
    }
  }

  reset() {
    this.dashElapsed = 0;
    for (const emitter of this.emitters) emitter.killAll();
    this.setPlaying(true);
  }
}

import type * as Phaser from 'phaser';
import { heroFrame } from '../hero-animation';
import type { GameState, GameEvent } from '../model/simulation';

export class LobsterView {
  readonly sprite: Phaser.GameObjects.Sprite;
  private heroFacing = 1;
  private turnTime = 0;
  private landingTime = 0;
  private hurtTime = 0;
  private pearlTime = 0;

  constructor(scene: Phaser.Scene, state: GameState) {
    this.sprite = scene.add
      .sprite(state.player.x, state.player.y, 'lobster-poses', 0)
      .setName('lobster')
      .setOrigin(0.5, 0.55)
      .setDisplaySize(120, 135);
    this.reset(state);
  }

  reset(state: GameState) {
    this.heroFacing = state.player.facing;
    this.turnTime = this.landingTime = this.hurtTime = this.pearlTime = 0;
  }

  step(state: GameState, fallingSpeed: number, seconds: number) {
    this.turnTime = Math.max(0, this.turnTime - seconds);
    this.landingTime = Math.max(0, this.landingTime - seconds);
    this.hurtTime = Math.max(0, this.hurtTime - seconds);
    this.pearlTime = Math.max(0, this.pearlTime - seconds);
    if (fallingSpeed > 60 && state.player.vy === 0) this.landingTime = 0.24;
    if (this.heroFacing !== state.player.facing) {
      this.heroFacing = state.player.facing;
      this.turnTime = 0.18;
    }
  }

  react(event: GameEvent) {
    if (event.kind === 'hurt') this.hurtTime = 0.32;
    if (
      event.kind === 'pearl' ||
      event.kind === 'block' ||
      event.kind === 'treasure'
    )
      this.pearlTime = 0.28;
  }

  render(state: GameState, cameraX: number) {
    const p = state.player,
      t = state.elapsed;
    const x = (worldX: number) => worldX - cameraX;
    const speed = Math.min(1, Math.abs(p.vx) / 315);
    const breath = Math.sin(t * 3.2);
    const paddle = Math.sin(t * 15) * speed;
    const stroke = Math.sin(
      (1 - Math.min(1, p.strokeCooldown / 0.42)) * Math.PI,
    );
    const dash = p.dashTime / 0.24;
    const turn = Math.sin((this.turnTime / 0.18) * Math.PI);
    const landing = Math.sin((this.landingTime / 0.24) * Math.PI);
    const hurt = this.hurtTime / 0.32;
    const delight = Math.sin((this.pearlTime / 0.28) * Math.PI);
    const width =
      1 +
      breath * 0.012 +
      paddle * 0.01 -
      stroke * 0.025 +
      dash * 0.1 +
      landing * 0.1 -
      hurt * 0.06 +
      delight * 0.04;
    const height =
      1 -
      breath * 0.012 -
      paddle * 0.01 +
      stroke * 0.03 -
      dash * 0.08 -
      landing * 0.09 +
      hurt * 0.04 +
      delight * 0.04;
    this.sprite
      .setFrame(
        heroFrame(state, hurt > 0 ? 'hurt' : delight > 0.1 ? 'pearl' : 'none'),
      )
      .setDisplaySize(120 * width * (1 - turn * 0.16), 135 * height)
      .setPosition(
        x(p.x) + Math.sin(hurt * Math.PI * 5) * hurt * 7,
        p.y + breath * 2 + paddle - stroke * 2 - delight * 5 + landing * 6,
      )
      .setFlipX(p.facing < 0)
      .setRotation(
        p.facing *
          (p.vy * 0.00035 +
            paddle * 0.025 -
            stroke * 0.04 +
            dash * 0.15 -
            hurt * 0.3 +
            delight * 0.12),
      )
      .setAlpha(p.invincible > 0 ? 0.8 : 1)
      .setTint(hurt > 0.6 ? 0xffb7a5 : 0xffffff);
  }
}

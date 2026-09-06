import { expect, test } from 'vitest';
import * as Phaser from 'phaser';
import { LobsterView } from '../../src/game/objects/LobsterView';
import { Preloader } from '../../src/game/scenes/Preloader';
import {
  advance,
  createGame,
  idleInput,
} from '../../src/game/model/simulation';

test('damage protection keeps the lobster visible without flashing or stopping movement', async () => {
  const parent = document.createElement('div');
  document.body.append(parent);
  const ready = Promise.withResolvers<void>();
  class FeedbackScene extends Phaser.Scene {
    create() {
      ready.resolve();
    }
  }
  const scene = new FeedbackScene('ocean');
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: 960,
    height: 720,
    banner: false,
    audio: { noAudio: true },
    scene: [new Preloader(ready.reject), scene],
  });
  try {
    await ready.promise;
    game.loop.sleep();
    const state = createGame();
    const enemy = state.creatures[0];
    if (!enemy) throw new Error('Enemy missing');
    state.player.x = enemy.x;
    state.player.y = enemy.y;
    advance(state, idleInput(), 1 / 60);
    expect(state.events.some((event) => event.kind === 'hurt')).toBe(true);
    expect(state.player.invincible).toBeGreaterThan(0);
    const view = new LobsterView(scene, state);
    for (const event of state.events) view.react(event);
    const startX = state.player.x;
    const health = state.player.health;
    const opacity = new Set<number>();
    for (let frame = 0; frame < 90; frame++) {
      const fallingSpeed = state.player.vy;
      advance(state, { ...idleInput(), right: true }, 1 / 60);
      view.step(state, fallingSpeed, 1 / 60);
      view.render(state, 0);
      opacity.add(view.sprite.alpha);
      expect(view.sprite.visible).toBe(true);
      expect(view.sprite.alpha).toBeGreaterThanOrEqual(0.7);
      expect(state.status).toBe('playing');
      expect(state.player.health).toBe(health);
    }
    expect(opacity.size).toBe(1);
    expect(state.player.x).toBeGreaterThan(startX + 300);
    for (let frame = 0; frame < 30; frame++)
      advance(state, idleInput(), 1 / 60);
    view.render(state, 0);
    expect(state.player.invincible).toBe(0);
    expect(view.sprite.alpha).toBe(1);
  } finally {
    game.destroy(true);
    game.loop.wake();
    await expect.poll(() => parent.querySelector('canvas')).toBeNull();
    parent.remove();
  }
});

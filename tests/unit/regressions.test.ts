import { expect, test } from 'vitest';
import {
  advance,
  createGame,
  idleInput,
  setPaused,
  continueGame,
} from '../../src/game/model/simulation';
import { WORLD } from '../../src/game/model/level';

test('pausing immediately after collecting a pearl freezes the entire model', () => {
  const state = createGame();
  Object.assign(state.player, { x: state.pearls[0].x, y: state.pearls[0].y });
  advance(state, idleInput(), 1 / 60);
  expect(state.events.some((event) => event.kind === 'pearl')).toBe(true);
  setPaused(state, true);
  const before = structuredClone(state);
  advance(state, { ...idleInput(), dash: true, swim: true }, 1 / 60);
  expect(state).toEqual(before);
});

test('17 pearls cannot finish, and 18 only finish at the home shell', () => {
  const state = createGame();
  state.pearls.slice(0, 17).forEach((pearl) => {
    pearl.collected = true;
  });
  Object.assign(state.player, { x: WORLD.exitX, y: WORLD.exitY });
  advance(state, idleInput(), 1 / 60);
  expect(state.status).toBe('playing');
  state.pearls[17].collected = true;
  state.player.x = 160;
  advance(state, idleInput(), 1 / 60);
  expect(state.status).toBe('playing');
  Object.assign(state.player, { x: WORLD.exitX, y: WORLD.exitY });
  advance(state, idleInput(), 1 / 60);
  expect(state.status).toBe('won');
  const before = structuredClone(state);
  advance(state, { ...idleInput(), left: true }, 1 / 60);
  continueGame(state);
  expect(state).toEqual(before);
});

test('retry after fatal damage restores the checkpoint and collected block rewards', () => {
  const state = createGame();
  state.checkpoint = true;
  state.blocks[0].used = true;
  state.pearls[0].collected = true;
  Object.assign(state.player, {
    x: state.creatures[0].x,
    y: state.creatures[0].y,
    health: 1,
    invincible: 0,
    vy: 0,
  });
  advance(state, idleInput(), 1 / 60);
  expect(state.status).toBe('lost');
  continueGame(state);
  expect(state.player.x).toBe(2570);
  expect(state.player.health).toBe(3);
  expect(state.blocks[0].used).toBe(true);
  expect(state.pearls[0].collected).toBe(true);
  expect(state.status).toBe('playing');
});

test.each([1, -1])(
  'reward blocks stop horizontal movement from direction %s',
  (direction) => {
    const state = createGame();
    const block = state.blocks[0];
    Object.assign(state.player, {
      x: block.x - direction * 50,
      y: block.y,
      vx: direction * 315,
      grounded: false,
    });
    for (let frame = 0; frame < 3; frame++) {
      advance(
        state,
        { ...idleInput(), right: direction === 1, left: direction === -1 },
        1 / 60,
      );
    }
    expect((block.x - state.player.x) * direction).toBeGreaterThanOrEqual(44);
    expect(state.player.vx).toBe(0);
    expect(block.used).toBe(false);
  },
);

test.each([1, -1])(
  'damage pushes away from an enemy behind facing %s',
  (facing) => {
    const state = createGame();
    const enemy = state.creatures[0];
    const dt = 1 / 60;
    const enemyX = enemy.homeX + Math.sin(dt * 0.8 + enemy.id) * 100;
    const enemyY = enemy.homeY + Math.sin(dt * 1.3 + enemy.id) * 23;
    Object.assign(state.player, {
      x: enemyX + facing * 35,
      y: enemyY,
      facing,
      grounded: false,
    });
    const startX = state.player.x;
    advance(state, idleInput(), dt);
    expect(state.player.health).toBe(2);
    expect((state.player.x - startX) * facing).toBeGreaterThan(0);
  },
);

import { expect, test } from 'vitest';
import {
  advance,
  continueGame,
  createGame,
  idleInput,
  pearlCount,
  setPaused,
} from '../../src/game/model/simulation';
import { GameInput } from '../../src/game/input';

function collectPearl(random: () => number) {
  const state = createGame();
  state.pearls = [{ x: state.player.x, y: state.player.y, collected: false }];
  advance(state, idleInput(), 1 / 60, random);
  return state;
}

test('the first pearl always drops electro power exactly once, even on an unlucky roll', () => {
  const state = collectPearl(() => 0.99);
  expect(pearlCount(state)).toBe(1);
  expect(state.electroPickups).toHaveLength(1);
  advance(state, idleInput(), 1 / 60, () => 0);
  expect(state.electroPickups).toHaveLength(1);
});

test('later pearls retain random drops', () => {
  for (const [roll, drops] of [
    [0.99, 0],
    [0.1, 1],
  ]) {
    const state = createGame();
    state.pearls = [
      { x: 0, y: 0, collected: false },
      { x: state.player.x, y: state.player.y, collected: false },
    ];
    advance(state, idleInput(), 1 / 60, () => roll);
    expect(pearlCount(state)).toBe(1);
    expect(state.electroPickups).toHaveLength(drops);
  }
});

test('bumping a fresh reward block can release electric power', () => {
  const state = createGame();
  const block = state.blocks[0];
  if (!block) throw new Error('Missing reward block');
  Object.assign(state.player, {
    x: block.x,
    y: block.y + 55,
    vy: -265,
    grounded: false,
  });
  advance(state, idleInput(), 1 / 60, () => 0);
  expect(block.used).toBe(true);
  expect(state.electroPickups).toHaveLength(1);
});

test('catching a drop enables keyboard shots, limits firing rate, and defeats a small enemy', () => {
  const state = collectPearl(() => 0);
  for (let i = 0; i < 30; i++) advance(state, idleInput(), 1 / 60, () => 1);
  expect(state.electroPickups).toHaveLength(0);
  expect(state.player.electroTime).toBeGreaterThan(19);
  const controls = new GameInput();
  controls.key('KeyF', true);
  advance(state, controls.read(), 1 / 60);
  expect(state.electroBalls).toHaveLength(1);
  advance(state, controls.read(), 1 / 60);
  expect(state.electroBalls).toHaveLength(1);
  const enemy = state.creatures[0];
  if (!enemy) throw new Error('Missing enemy');
  Object.assign(enemy, { homeX: state.player.x + 150, homeY: state.player.y });
  controls.clear();
  for (let i = 0; i < 30; i++) advance(state, controls.read(), 1 / 60);
  expect(enemy.active).toBe(false);
  expect(state.player.health).toBe(3);
});

test('shots require power, follow facing, and disappear after their lifetime', () => {
  const state = createGame();
  const fire = { ...idleInput(), fire: true };
  advance(state, fire, 1 / 60);
  expect(state.electroBalls).toHaveLength(0);
  state.player.electroTime = 20;
  state.player.facing = -1;
  advance(state, fire, 1 / 60);
  expect(state.electroBalls[0]?.vx).toBeLessThan(0);
  for (let i = 0; i < 100; i++) advance(state, idleInput(), 1 / 60);
  expect(state.electroBalls).toHaveLength(0);
});

test('pause freezes power and shots; expiry and retry remove power', () => {
  const state = createGame();
  state.player.electroTime = 0.1;
  advance(state, { ...idleInput(), fire: true }, 1 / 60);
  setPaused(state, true);
  const frozen = structuredClone(state);
  advance(state, idleInput(), 1);
  expect(state).toEqual(frozen);
  setPaused(state, false);
  for (let i = 0; i < 10; i++) advance(state, idleInput(), 1 / 60);
  expect(state.player.electroTime).toBe(0);
  state.status = 'lost';
  state.player.electroTime = 12;
  continueGame(state);
  expect(state.player.electroTime).toBe(0);
  expect(state.electroBalls).toHaveLength(0);
  expect(state.electroPickups).toHaveLength(0);
});

test('touch firing preserves keyboard firing until both release', () => {
  const input = new GameInput();
  input.pointer(1, 'fire');
  input.key('KeyF', true);
  input.pointer(1, null);
  expect(input.read().fire).toBe(true);
  input.key('KeyF', false);
  expect(input.read().fire).toBe(false);
});

test('damage removes power and Bigfin survives one electro hit', () => {
  const state = createGame();
  const enemy = state.creatures.find((creature) => creature.kind === 'bigfin');
  if (!enemy) throw new Error('Missing Bigfin');
  state.creatures = [enemy];
  Object.assign(enemy, {
    homeX: state.player.x - Math.sin(enemy.id) * 100,
    homeY: state.player.y - Math.sin(enemy.id) * 105,
  });
  state.player.electroTime = 20;
  state.electroBalls.push({
    x: state.player.x,
    y: state.player.y,
    vx: 0,
    life: 1,
  });
  advance(state, idleInput(), 1 / 60);
  expect(enemy.active).toBe(true);
  expect(enemy.boss?.health).toBe(7);
  expect(state.electroBalls).toHaveLength(0);
  expect(state.player.health).toBe(2);
  expect(state.player.electroTime).toBe(0);
});

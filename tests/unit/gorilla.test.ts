import { expect, test } from 'vitest';
import {
  advance,
  continueGame,
  createGame,
  idleInput,
  setPaused,
} from '../../src/game/model/simulation';

function encounter() {
  const state = createGame();
  const enemy = state.creatures.find((enemy) => enemy.kind === 'gorilla');
  if (!enemy?.boss) throw new Error('Missing gorilla');
  state.creatures = [enemy];
  state.blocks = [];
  state.friend = true;
  state.player.x = enemy.homeX - 300;
  state.player.y = enemy.homeY;
  advance(state, idleInput(), 0);
  return { state, enemy, hp: enemy.boss };
}

test('gorilla survives one hit and dies on the second separate hit', () => {
  const { state, enemy, hp } = encounter();
  const hit = () => {
    state.electroBalls.push({ x: enemy.x, y: enemy.y, vx: 0, life: 1 });
    advance(state, idleInput(), 1 / 60);
  };
  hit();
  expect(hp.health).toBe(1);
  expect(enemy.active).toBe(true);
  hit();
  expect(hp.health).toBe(1);
  hp.hurtTime = 0;
  hit();
  expect(hp.health).toBe(0);
  expect(enemy.active).toBe(false);
  expect(state.bananas).toHaveLength(0);
});

test('gorilla throws arcing bananas toward the player after the windup', () => {
  const { state, hp } = encounter();
  hp.cooldown = 0.3;
  advance(state, idleInput(), 0.05);
  expect(state.bananas).toHaveLength(0);
  hp.cooldown = 0;
  advance(state, idleInput(), 1 / 60);
  expect(state.bananas).toHaveLength(1);
  expect(state.bossBalls).toHaveLength(0);
  expect(hp.throwTime).toBe(0.25);
  const banana = state.bananas[0];
  if (!banana) throw new Error('Missing banana');
  expect(banana.vx).toBeLessThan(0);
  const vy = banana.vy;
  advance(state, idleInput(), 0.05);
  expect(banana.vy).toBeGreaterThan(vy);
  setPaused(state, true);
  const frozen = structuredClone(state);
  advance(state, idleInput(), 0.05);
  expect(state).toEqual(frozen);
  state.status = 'lost';
  hp.health = 1;
  continueGame(state);
  expect(hp.health).toBe(2);
  expect(state.bananas).toHaveLength(0);
});

test('banana contact damages once, dash protects, and old bananas expire', () => {
  for (const dashTime of [0, 0.2]) {
    const { state, enemy } = encounter();
    state.player.dashTime = dashTime;
    state.bananas.push({
      x: state.player.x,
      y: state.player.y,
      vx: 0,
      vy: 0,
      life: 1,
      owner: enemy.id,
    });
    advance(state, idleInput(), 1 / 60);
    expect(state.player.health).toBe(dashTime ? 3 : 2);
    expect(state.bananas).toHaveLength(0);
    state.bananas.push({
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      life: 0.01,
      owner: enemy.id,
    });
    advance(state, idleInput(), 1 / 60);
    expect(state.bananas).toHaveLength(0);
  }
});

test('dash and stomp each remove one gorilla HP', () => {
  for (const attack of ['dash', 'stomp']) {
    const { state, enemy, hp } = encounter();
    state.player.x = enemy.x - (attack === 'dash' ? 35 : 0);
    state.player.y = enemy.y - (attack === 'stomp' ? 55 : 0);
    state.player.vy = attack === 'stomp' ? 180 : 0;
    advance(state, { ...idleInput(), dash: attack === 'dash' }, 1 / 60);
    expect(hp.health).toBe(1);
    expect(enemy.active).toBe(true);
    expect(state.player.health).toBe(3);
  }
});

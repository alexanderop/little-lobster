import { expect, test } from 'vitest';
import {
  advance,
  continueGame,
  createGame,
  idleInput,
  setPaused,
} from '../../src/game/model/simulation';
import { generateLevel } from '../../src/game/model/level';

function encounter() {
  const state = createGame();
  const enemy = state.creatures.find((enemy) => enemy.boss);
  if (!enemy?.boss) throw new Error('Missing boss');
  state.creatures = [enemy];
  state.blocks = [];
  state.checkpoint = true;
  state.friend = true;
  state.player.x = enemy.homeX - 300;
  state.player.y = 400;
  return { state, enemy, boss: enemy.boss };
}

function hitBoss() {
  const { state, enemy, boss } = encounter();
  const hit = () => {
    state.electroBalls.push({
      x: enemy.homeX + Math.sin(state.elapsed * 0.5 + enemy.id) * 100,
      y: enemy.homeY + Math.sin(state.elapsed * 1.3 + enemy.id) * 105,
      vx: 0,
      life: 1,
    });
    advance(state, idleInput(), 1 / 60);
  };
  return { state, enemy, boss, hit };
}

test('Bigfin takes eight separate hits, flashes briefly, and clears attacks on defeat', () => {
  const { state, enemy, boss, hit } = hitBoss();
  hit();
  expect(boss.health).toBe(7);
  expect(enemy.active).toBe(true);
  hit();
  expect(boss.health).toBe(7);
  for (let i = 0; i < 7; i++) {
    boss.hurtTime = 0;
    hit();
  }
  expect(boss.health).toBe(0);
  expect(enemy.active).toBe(false);
  expect(state.events.some((event) => event.kind === 'defeat')).toBe(true);
  expect(state.bossBalls).toHaveLength(0);
  for (let i = 0; i < 120; i++) advance(state, idleInput(), 1 / 60);
  expect(state.bossBalls).toHaveLength(0);
});

test('Bigfin aims its own balls at the player and attacks faster below half HP', () => {
  const { state, boss } = encounter();
  boss.cooldown = 0.01;
  advance(state, idleInput(), 1 / 60);
  expect(state.bossBalls).toHaveLength(1);
  const ball = state.bossBalls[0];
  if (!ball) throw new Error('Missing boss shot');
  expect(ball.vx).toBeLessThan(0);
  expect(ball.vy).toBeGreaterThan(0);
  expect(boss.cooldown).toBe(1.8);
  boss.health = 4;
  boss.cooldown = 0;
  advance(state, idleInput(), 1 / 60);
  expect(boss.cooldown).toBe(1.15);
});

test('hostile balls damage the player once, respect dash immunity, and expire', () => {
  for (const dashTime of [0, 0.2]) {
    const { state, boss } = encounter();
    state.player.dashTime = dashTime;
    state.player.electroTime = 10;
    for (let i = 0; i < 2; i++)
      state.bossBalls.push({
        x: state.player.x,
        y: state.player.y,
        vx: 0,
        vy: 0,
        life: 1,
      });
    advance(state, idleInput(), 1 / 60);
    expect(state.player.health).toBe(dashTime ? 3 : 2);
    expect(state.bossBalls).toHaveLength(dashTime ? 0 : 1);
    state.bossBalls = [];
    expect(boss.health).toBe(8);
    state.bossBalls.push({ x: 100, y: 100, vx: 0, vy: 0, life: 0.01 });
    advance(state, idleInput(), 1 / 60);
    expect(state.bossBalls).toHaveLength(0);
  }
});

test('pause freezes boss attacks and retry restores a living boss and clears shots', () => {
  const { state, boss } = encounter();
  boss.health = 3;
  boss.cooldown = 0;
  advance(state, idleInput(), 1 / 60);
  setPaused(state, true);
  const frozen = structuredClone(state);
  advance(state, idleInput(), 1);
  expect(state).toEqual(frozen);
  state.status = 'lost';
  continueGame(state);
  expect(boss.health).toBe(8);
  expect(boss.cooldown).toBe(1.8);
  expect(state.bossBalls).toHaveLength(0);
});

test('dashing can hurt Bigfin without an electric pickup', () => {
  const { state, enemy, boss } = encounter();
  state.player.x = enemy.homeX + Math.sin(enemy.id) * 100 - 40;
  state.player.y = enemy.homeY + Math.sin(enemy.id) * 105;
  advance(state, { ...idleInput(), dash: true }, 1 / 60);
  expect(boss.health).toBe(7);
  expect(state.player.health).toBe(3);
});

test('generated Bigfins receive health and distant bosses do not shoot', () => {
  for (let level = 1; level <= 12; level++) {
    const state = createGame(generateLevel(level, 52));
    for (let i = 0; i < 180; i++) advance(state, idleInput(), 1 / 60);
    expect(state.bossBalls).toHaveLength(0);
    for (const enemy of state.creatures.filter(
      (enemy) => enemy.kind === 'bigfin',
    ))
      expect(enemy.boss?.health).toBe(8);
  }
});

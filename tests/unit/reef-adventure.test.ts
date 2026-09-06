import { expect, test } from 'vitest';
import { reefTrial, bounceFishIds, WORLD } from '../../src/game/model/level';
import {
  advance,
  continueGame,
  createGame,
  idleInput,
  pearlCount,
  setPaused,
} from '../../src/game/model/simulation';
import type { GameState } from '../../src/game/model/simulation';

function swimTo(
  state: GameState,
  target: { x: number; y: number },
  budget = 900,
) {
  for (let frame = 0; frame < budget; frame++) {
    const dx = target.x - state.player.x;
    const dy = target.y - state.player.y;
    if (Math.hypot(dx, dy) < 25) return;
    advance(
      state,
      {
        ...idleInput(),
        left: dx < -10,
        right: dx > 10,
        swim: dy < -10,
        down: dy > 15,
      },
      1 / 60,
      () => 1,
    );
  }
  throw new Error(
    `Could not reach ${target.x}, ${target.y} from ${state.player.x}, ${state.player.y}`,
  );
}

test('the current course can be reached and completed from spawn using movement controls', () => {
  const state = createGame();
  swimTo(state, { x: 600, y: 270 });
  swimTo(state, { x: 1600, y: 270 });
  for (const ring of reefTrial.rings) swimTo(state, ring);
  expect(state.ringTrial.kind).toBe('complete');
  expect(state.treasures[1].unlocked).toBe(true);
  const before = pearlCount(state);
  swimTo(state, state.treasures[1]);
  expect(state.treasures[1].collected).toBe(true);
  expect(pearlCount(state)).toBe(before + 3);
  expect(state.player.health).toBe(3);
});

test('three airborne stomps unlock a reachable golden pearl', () => {
  const state = createGame();
  swimTo(state, { x: 850, y: 270 });
  for (const id of bounceFishIds) {
    const enemy = state.creatures.find((creature) => creature.id === id);
    if (!enemy) throw new Error('Bounce fish missing');
    let descending = false;
    for (let frame = 0; frame < 900 && enemy.active; frame++) {
      const dx = enemy.x - state.player.x;
      if (Math.abs(dx) < 25 && state.player.y < enemy.y - 100)
        descending = true;
      advance(
        state,
        {
          ...idleInput(),
          left: dx < -8,
          right: dx > 8,
          swim: !descending && state.player.y > enemy.y - 150,
          down: descending,
        },
        1 / 60,
        () => 1,
      );
    }
    expect(enemy.active).toBe(false);
    expect(state.player.health).toBe(3);
  }
  expect(state.stompChain).toBe(3);
  expect(state.treasures[0].unlocked).toBe(true);
  swimTo(state, state.treasures[0]);
  expect(state.treasures[0].collected).toBe(true);
});

test('rings must be visited in order and an expired attempt can be retried', () => {
  const state = createGame();
  Object.assign(state.player, reefTrial.rings[2]);
  advance(state, idleInput(), 1 / 60);
  expect(state.ringTrial.kind).toBe('ready');
  Object.assign(state.player, reefTrial.rings[0]);
  advance(state, idleInput(), 1 / 60);
  expect(state.ringTrial.kind).toBe('racing');
  Object.assign(state.player, { x: 1850, y: 90 });
  for (let frame = 0; frame < 250; frame++) advance(state, idleInput(), 1 / 60);
  expect(state.ringTrial.kind).toBe('ready');
  expect(state.treasures[1].unlocked).toBe(false);
  Object.assign(state.player, reefTrial.rings[0]);
  advance(state, idleInput(), 1 / 60);
  expect(state.ringTrial.kind).toBe('racing');
});

test('ring refills enable the next dash and pausing freezes a running challenge', () => {
  const state = createGame();
  state.player.dashCooldown = 1;
  Object.assign(state.player, reefTrial.rings[0]);
  advance(state, idleInput(), 1 / 60);
  expect(state.player.dashCooldown).toBe(0);
  setPaused(state, true);
  const frozen = structuredClone(state);
  for (let frame = 0; frame < 300; frame++) advance(state, idleInput(), 1 / 60);
  expect(state).toEqual(frozen);
});

test('landing breaks a stomp chain and returning to its start restores the fish', () => {
  const state = createGame();
  state.stompChain = 2;
  state.creatures
    .filter((enemy) => bounceFishIds.includes(enemy.id))
    .forEach((enemy) => {
      enemy.active = false;
    });
  Object.assign(state.player, { x: 1350, y: WORLD.floor - 34 });
  advance(state, idleInput(), 1 / 60);
  expect(state.stompChain).toBe(0);
  swimTo(state, { x: 850, y: 270 });
  expect(
    state.creatures
      .filter((enemy) => bounceFishIds.includes(enemy.id))
      .every((enemy) => enemy.active),
  ).toBe(true);
});

test('locked treasure cannot be collected; earned treasure survives retry and cannot score twice', () => {
  const state = createGame();
  const treasure = state.treasures[1];
  Object.assign(state.player, treasure);
  advance(state, idleInput(), 1 / 60);
  expect(treasure.collected).toBe(false);
  treasure.unlocked = true;
  advance(state, idleInput(), 1 / 60);
  expect(pearlCount(state)).toBe(3);
  state.status = 'lost';
  state.ringTrial = { kind: 'racing', nextRing: 1, remaining: 2 };
  continueGame(state);
  expect(state.ringTrial.kind).toBe('ready');
  expect(pearlCount(state)).toBe(3);
  Object.assign(state.player, treasure);
  advance(state, idleInput(), 1 / 60);
  expect(pearlCount(state)).toBe(3);
  expect(
    createGame().treasures.every((item) => !item.unlocked && !item.collected),
  ).toBe(true);
});

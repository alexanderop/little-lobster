import { expect, test } from 'vitest';
import { generateLevel } from '../../src/game/model/level';
import {
  advance,
  adventureHint,
  continueGame,
  createGame,
  idleInput,
  nextLevel,
  pearlCount,
  type GameState,
} from '../../src/game/model/simulation';

function travel(
  state: GameState,
  target: { x: number; y: number },
  dash = false,
) {
  for (let frame = 0; frame < 900; frame++) {
    const dx = target.x - state.player.x;
    const dy = target.y - state.player.y;
    if (Math.hypot(dx, dy) < 25 || state.status === 'won') return;
    advance(
      state,
      {
        ...idleInput(),
        left: dx < -10,
        right: dx > 10,
        swim: dy < -10,
        down: dy > 15,
        dash: dash && Math.abs(dx) > 110 && Math.abs(dy) < 45,
      },
      1 / 60,
      () => 1,
    );
  }
  throw new Error(
    `Could not reach ${target.x},${target.y} from ${state.player.x},${state.player.y}`,
  );
}

test('Current School can be surfed from spawn through the high trail and optional timed finale', () => {
  const state = createGame(generateLevel(2, 42));
  for (const pearl of state.level.pearls.slice(0, 15)) travel(state, pearl);
  expect(pearlCount(state)).toBeGreaterThanOrEqual(12);
  travel(state, { x: 1750, y: 500 });
  expect(state.checkpoint).toBe(true);
  travel(state, { x: 1950, y: 460 });
  for (const ring of state.level.trial.rings) travel(state, ring, true);
  expect(state.ringTrial.kind).toBe('complete');
  expect(state.treasures[0].unlocked).toBe(true);
  const before = pearlCount(state);
  travel(state, state.treasures[0]);
  expect(state.treasures[0].collected).toBe(true);
  expect(pearlCount(state)).toBe(before + 3);
  travel(state, { x: 2800, y: 575 });
  expect(state.status).toBe('won');
  expect(state.player.health).toBe(3);
  expect(nextLevel(state).level.number).toBe(3);
});

test('the seabed is safe but cannot supply the course goal; the ring challenge remains optional', () => {
  const state = createGame(generateLevel(2));
  for (let frame = 0; frame < 650; frame++)
    advance(
      state,
      { ...idleInput(), right: true, down: true },
      1 / 60,
      () => 1,
    );
  expect(state.status).toBe('playing');
  expect(state.player.health).toBe(3);
  expect(pearlCount(state)).toBeLessThan(12);
  expect(adventureHint(state)).toContain('Need more pearls');
  for (const pearl of state.level.pearls.slice(0, 15).reverse())
    travel(state, pearl);
  travel(state, { x: 1700, y: 575 });
  travel(state, { x: 2800, y: 575 });
  expect(state.ringTrial.kind).toBe('ready');
  expect(state.treasures[0].collected).toBe(false);
  expect(state.status).toBe('won');
});

test('currents lift without swim input and a failed finale can be retried from its first ring', () => {
  const state = createGame(generateLevel(2));
  travel(state, { x: 480, y: 570 });
  for (let frame = 0; frame < 65; frame++)
    advance(state, idleInput(), 1 / 60, () => 1);
  expect(state.player.y).toBeLessThan(350);
  travel(state, { x: 1850, y: 460 });
  travel(state, state.level.trial.rings[0]);
  expect(state.ringTrial.kind).toBe('racing');
  expect(adventureHint(state)).toContain('/4');
  for (let frame = 0; frame < 320; frame++)
    advance(state, { ...idleInput(), down: true }, 1 / 60, () => 1);
  expect(state.ringTrial.kind).toBe('ready');
  expect(state.treasures[0].unlocked).toBe(false);
  for (const ring of state.level.trial.rings) travel(state, ring, true);
  expect(state.ringTrial.kind).toBe('complete');
  travel(state, state.treasures[0]);
  const earned = pearlCount(state);
  state.status = 'lost';
  continueGame(state);
  expect(state.player.x).toBe(1750);
  expect(state.treasures[0].collected).toBe(true);
  expect(pearlCount(state)).toBe(earned);
});

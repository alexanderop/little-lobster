import { expect, test, afterEach, vi } from 'vitest';
import { generateLevel } from '../../src/game/model/level';
import {
  advance,
  createGame,
  continueGame,
  idleInput,
  nextLevel,
  pearlCount,
} from '../../src/game/model/simulation';
import { JOURNEY_KEY, readJourney, saveJourney } from '../../src/game/journey';

afterEach(() => vi.unstubAllGlobals());

test('the seabed route completes 1200 generated levels with real movement and hazards', () => {
  const input = { ...idleInput(), right: true, down: true };
  for (let seed = 0; seed < 100; seed++) {
    for (let number = 3; number < 15; number++) {
      const state = createGame(generateLevel(number, seed));
      for (let frame = 0; frame < 900 && state.status === 'playing'; frame++)
        advance(state, input, 1 / 60, () => 1);
      expect(
        state.status,
        `seed ${seed}, level ${number}, x ${state.player.x}`,
      ).toBe('won');
      expect(pearlCount(state)).toBeGreaterThanOrEqual(
        state.level.world.requiredPearls,
      );
      expect(state.player.health).toBe(3);
    }
  }
});

test('levels repeat from their seed, vary between seeds, and never repeat an adjacent biome', () => {
  const layouts = new Set<string>();
  for (let seed = 0; seed < 100; seed++) {
    const level = generateLevel(3, seed);
    expect(level).toEqual(generateLevel(3, seed));
    expect(new Set(level.sections).size).toBe(5);
    layouts.add(JSON.stringify(level.platforms));
  }
  expect(layouts.size).toBeGreaterThan(90);
  for (let number = 2; number < 60; number++)
    expect(generateLevel(number).biome).not.toBe(
      generateLevel(number - 1).biome,
    );
  expect(generateLevel(10001).encounters.length).toBeLessThanOrEqual(5);
});

test('completion carries pearls once, retry preserves the layout and rewards, restart can reset the run', () => {
  const state = createGame(generateLevel(3, 456), 81);
  state.pearls[0].collected = true;
  state.checkpoint = true;
  state.status = 'lost';
  const layout = structuredClone(state.level);
  continueGame(state);
  expect(state.level).toEqual(layout);
  expect(state.player.x).toBe(layout.checkpointX);
  expect(pearlCount(state)).toBe(1);
  expect(nextLevel(state)).toBe(state);
  state.status = 'won';
  const next = nextLevel(state);
  expect(next.level.number).toBe(4);
  expect(next.level.seed).toBe(456);
  expect(next.bankedPearls).toBe(82);
  expect(pearlCount(next)).toBe(0);
  expect(nextLevel(next)).toBe(next);
  expect(next.player.health).toBe(3);
  expect(createGame().bankedPearls).toBe(0);
});

test('saved journeys restore the same level and banked pearls, rejecting damaged saves', () => {
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  });
  const state = createGame(generateLevel(8, 12345), 210);
  saveJourney(state);
  expect(readJourney()).toEqual(state);
  for (const invalid of [
    'null',
    '{',
    '{}',
    '{"version":1,"level":-1,"seed":1,"pearls":5}',
    '{"version":1,"level":2,"seed":1,"pearls":"5"}',
  ]) {
    entries.set(JOURNEY_KEY, invalid);
    expect(readJourney().level.number).toBe(1);
  }
  vi.stubGlobal('localStorage', {
    getItem() {
      throw new Error('Unavailable');
    },
    setItem() {
      throw new Error('Unavailable');
    },
  });
  expect(() => saveJourney(state)).not.toThrow();
  expect(readJourney().level.number).toBe(1);
});

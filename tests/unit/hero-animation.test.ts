import { test } from 'vitest';
import assert from 'node:assert/strict';
import { heroFrame } from '../../src/game/hero-animation';
import {
  advance,
  createGame,
  idleInput,
  setPaused,
} from '../../src/game/model/simulation';

test('holding swim produces distinct reach, pull, and recovery poses', () => {
  const state = createGame();
  const frames = new Set<number>();
  for (let i = 0; i < 60; i++) {
    advance(state, { ...idleInput(), swim: true }, 1 / 60);
    frames.add(heroFrame(state));
  }
  assert.deepEqual(
    [...frames].sort((a, b) => a - b),
    [3, 4, 5],
  );
});

test('resting character blinks and waves, and pause freezes its frame', () => {
  const state = createGame();
  const frames = new Set<number>();
  for (let i = 0; i < 240; i++) {
    advance(state, idleInput(), 1 / 60);
    frames.add(heroFrame(state));
  }
  assert.deepEqual(
    [...frames].sort((a, b) => a - b),
    [0, 1, 2],
  );
  setPaused(state, true);
  const frozen = heroFrame(state);
  for (let i = 0; i < 120; i++) {
    advance(state, { ...idleInput(), swim: true, dash: true }, 1 / 60);
    assert.equal(heroFrame(state), frozen);
  }
});

test('dash and hurt override swimming, then swimming resumes', () => {
  const state = createGame();
  advance(state, { ...idleInput(), swim: true, dash: true }, 1 / 60);
  assert.equal(heroFrame(state), 6);
  assert.equal(heroFrame(state, 'hurt'), 7);
  for (let i = 0; i < 20; i++)
    advance(state, { ...idleInput(), swim: true }, 1 / 60);
  assert.ok([3, 4, 5].includes(heroFrame(state)));
});

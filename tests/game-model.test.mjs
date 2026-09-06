import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  advance,
  continueGame,
  createGame,
  idleInput,
  pearlCount,
  setPaused,
  WORLD,
} from '../lib/game-model.ts';
function run(state, input, frames) {
  for (let i = 0; i < frames; i++) advance(state, input, 1 / 60);
}
test('swim rises, release sinks, and movement stays inside the world', () => {
  const s = createGame();
  const y = s.player.y;
  run(s, { ...idleInput(), swim: true }, 60);
  assert.ok(s.player.y < y - 100);
  const top = s.player.y;
  run(s, idleInput(), 180);
  assert.ok(s.player.y > top);
  run(s, { ...idleInput(), left: true }, 120);
  assert.ok(s.player.x >= 36);
  run(s, { ...idleInput(), swim: true }, 300);
  assert.ok(s.player.y >= 90 && s.player.y < 96);
});
test('pearls collect once and pausing freezes the simulation', () => {
  const s = createGame();
  s.player.x = s.pearls[0].x;
  s.player.y = s.pearls[0].y;
  advance(s, idleInput(), 1 / 60);
  assert.equal(pearlCount(s), 1);
  advance(s, idleInput(), 1 / 60);
  assert.equal(pearlCount(s), 1);
  setPaused(s, true);
  const before = JSON.stringify(s);
  run(s, { ...idleInput(), right: true, swim: true, dash: true }, 120);
  assert.equal(JSON.stringify(s), before);
});
test('claw dash clears catfish and has a cooldown', () => {
  const s = createGame();
  const e = s.creatures[0];
  s.player.x = e.x - 24;
  s.player.y = e.y;
  advance(s, { ...idleInput(), right: true, dash: true }, 1 / 60);
  assert.equal(e.active, false);
  assert.equal(s.player.health, 3);
  const events = s.events.filter((e) => e.kind === 'dash').length;
  assert.equal(events, 1);
  advance(s, { ...idleInput(), dash: true }, 1 / 60);
  assert.equal(
    s.events.some((e) => e.kind === 'dash'),
    false,
  );
});
test('damage has invulnerability and retry preserves pearls and checkpoint', () => {
  const s = createGame();
  s.player.x = 2540;
  advance(s, idleInput(), 1 / 60);
  assert.equal(s.checkpoint, true);
  s.pearls[0].collected = true;
  s.status = 'lost';
  continueGame(s);
  assert.equal(s.player.x, 2570);
  assert.equal(s.player.health, 3);
  assert.equal(pearlCount(s), 1);
  assert.equal(s.status, 'playing');
  s.player.invincible = 0;
  s.player.x = s.creatures[0].x;
  s.player.y = s.creatures[0].y;
  advance(s, idleInput(), 1 / 60);
  assert.equal(s.player.health, 2);
  s.player.x = s.creatures[0].x;
  s.player.y = s.creatures[0].y;
  advance(s, idleInput(), 1 / 60);
  assert.equal(s.player.health, 2);
});
test('home shell requires pearls and completes only when reached', () => {
  const s = createGame();
  s.player.x = WORLD.exitX;
  s.player.y = WORLD.exitY;
  advance(s, idleInput(), 1 / 60);
  assert.equal(s.status, 'playing');
  s.pearls.slice(0, 18).forEach((p) => (p.collected = true));
  advance(s, idleInput(), 1 / 60);
  assert.equal(s.status, 'won');
});
test('a player can swim the complete pearl trail using only controls', () => {
  const s = createGame();
  let targetIndex = 0;
  for (let frame = 0; frame < 24000 && s.status !== 'won'; frame++) {
    if (s.status === 'lost') continueGame(s);
    while (
      targetIndex < s.pearls.length &&
      (s.pearls[targetIndex].collected ||
        s.pearls[targetIndex].x < s.player.x - 55)
    )
      targetIndex++;
    const target = s.pearls[targetIndex] ?? { x: WORLD.exitX, y: WORLD.exitY };
    const dx = target.x - s.player.x,
      dy = target.y - s.player.y;
    advance(
      s,
      {
        left: dx < -15,
        right: dx > 15,
        swim: dy < -8,
        down: dy > 12,
        dash: false,
      },
      1 / 60,
    );
  }
  assert.equal(
    s.status,
    'won',
    `Stopped at ${s.player.x}, ${s.player.y}, ${pearlCount(s)} pearls`,
  );
  assert.ok(pearlCount(s) >= 18);
});
test('sink input lets the player descend through a bubble current', () => {
  const s = createGame();
  s.player.x = 1700;
  s.player.y = 280;
  run(s, { ...idleInput(), down: true }, 60);
  assert.ok(s.player.y > 400);
});

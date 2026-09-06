import { expect, test } from 'vitest';
import { GameInput } from '../../src/game/input';
import { idleInput } from '../../src/game/model/simulation';

test('keyboard release preserves a held touch action', () => {
  const input = new GameInput();
  input.pointer(1, 'swim');
  input.key('ArrowRight', true);
  input.key('ArrowRight', false);
  expect(input.read()).toEqual({ ...idleInput(), swim: true });
});

test('releasing one pointer or key does not cancel another source of the same action', () => {
  const input = new GameInput();
  input.key('KeyD', true);
  input.key('ArrowRight', true);
  input.key('ArrowRight', false);
  expect(input.read().right).toBe(true);
  input.pointer(11, 'right');
  input.pointer(12, 'right');
  input.key('KeyD', false);
  input.pointer(11, null);
  expect(input.read().right).toBe(true);
  input.pointer(12, null);
  expect(input.read()).toEqual(idleInput());
});

test('pause/reset clears every input source and unrelated keys do nothing', () => {
  const input = new GameInput();
  input.key('Space', true);
  input.pointer(1, 'dash');
  expect(input.key('Tab', true)).toBe(false);
  input.clear();
  expect(input.read()).toEqual(idleInput());
});

import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render, cleanup } from 'vitest-browser-vue';
import App from '../../src/App.vue';
import { readBest, saveBest } from '../../src/game/best-score';
import { OceanScene } from '../../src/game/scenes/OceanScene';
import { idleInput, createGame } from '../../src/game/model/simulation';
import { WORLD } from '../../src/game/model/level';
import '../../src/style.css';

afterEach(async () => {
  vi.restoreAllMocks();
  cleanup();
  await expect.poll(() => document.querySelector('canvas')).toBeNull();
  localStorage.clear();
});

test('pause shortcuts preserve game-over menu focus and keyboard retry', async () => {
  const created = vi.spyOn(OceanScene.prototype, 'create');
  await render(App);
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await expect
    .element(page.getByRole('button', { name: 'Pause game' }))
    .toBeEnabled();
  const scene = created.mock.contexts[0];
  if (!(scene instanceof OceanScene))
    throw new Error('Ocean scene did not start');
  const hazard = createGame().creatures.find(
    (enemy) => enemy.kind === 'costume-cat',
  );
  if (!hazard) throw new Error('Starting hazard missing');
  for (
    let frame = 0;
    frame < 3600 && scene.snapshot().status === 'playing';
    frame++
  ) {
    const x = scene.snapshot().progress * WORLD.exitX;
    scene.setInput({
      ...idleInput(),
      right: x < hazard.homeX - 5,
      left: x > hazard.homeX + 5,
      down: true,
    });
    scene.update((frame * 1000) / 60, 1000 / 60);
  }
  expect(scene.snapshot().status).toBe('lost');
  const retry = page.getByRole('button', { name: 'Keep swimming' });
  await expect.element(retry).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  await expect.element(retry).toHaveFocus();
  await userEvent.keyboard('p');
  await expect.element(retry).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  expect(scene.snapshot().status).toBe('playing');
});

test('Vue starts the real game, focuses controls, pauses, resumes and restarts', async () => {
  await render(App);
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await expect
    .element(page.getByRole('button', { name: 'Pause game' }))
    .toBeEnabled();
  await expect
    .element(
      page.getByText('Follow the pearls. Take the high route for a challenge!'),
    )
    .toBeVisible();
  await expect
    .element(page.getByLabelText('0 of 2 golden pearls'))
    .toBeVisible();
  await expect
    .poll(() => document.activeElement?.className)
    .toBe('phaser-host');
  await userEvent.keyboard('{Escape}');
  await expect
    .element(page.getByRole('dialog', { name: 'Just floating.' }))
    .toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Keep playing' }))
    .toHaveFocus();
  await page.getByRole('button', { name: 'Keep playing' }).click();
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect
    .element(page.getByRole('progressbar', { name: 'Level progress' }))
    .toHaveAttribute('aria-valuenow', '3');
  await expect.poll(() => document.querySelectorAll('canvas').length).toBe(1);
});

test('best score persists, never decreases, and invalid stored values are ignored', () => {
  expect(readBest()).toBe(0);
  saveBest(24);
  saveBest(18);
  expect(readBest()).toBe(24);
  localStorage.setItem('little-lobster-best', 'not-a-score');
  expect(readBest()).toBe(0);
  localStorage.setItem('little-lobster-best', '9999');
  expect(readBest()).toBe(0);
});

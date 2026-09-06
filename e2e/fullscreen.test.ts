import { expect, test } from '@playwright/test';

test('fullscreen contains the game and controls, and restores the page on exit', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter fullscreen' }).click();
  await expect(
    page.getByRole('button', { name: 'Exit fullscreen' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.tagName))
    .toBe('MAIN');
  await expect(page.locator('.game-footer')).toBeHidden();
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await expect(page.getByRole('button', { name: 'Pause game' })).toBeEnabled();
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const frame = document
          .querySelector('.game-frame')
          ?.getBoundingClientRect();
        const canvas = document
          .querySelector('canvas')
          ?.getBoundingClientRect();
        if (!frame || !canvas) return false;
        return (
          Math.abs(frame.bottom - window.innerHeight) < 2 &&
          Math.abs(frame.width - window.innerWidth) < 2 &&
          Math.abs(canvas.width - frame.width) < 2 &&
          Math.abs(canvas.height - frame.height) < 2
        );
      });
    })
    .toBe(true);
  await page.getByRole('button', { name: 'Exit fullscreen' }).click();
  await expect(
    page.getByRole('button', { name: 'Enter fullscreen' }),
  ).toHaveAttribute('aria-pressed', 'false');
  if (isMobile) await expect(page.locator('.game-footer')).toBeHidden();
  else await expect(page.locator('.game-footer')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Enter fullscreen' }).click();
  await expect(
    page.getByRole('button', { name: 'Exit fullscreen' }),
  ).toBeVisible();
  await page.evaluate(() => document.exitFullscreen());
  await expect(
    page.getByRole('button', { name: 'Enter fullscreen' }),
  ).toHaveAttribute('aria-pressed', 'false');
});

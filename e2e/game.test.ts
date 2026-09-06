import { expect, test } from '@playwright/test';

test('welcome screen preserves the desktop and mobile layout', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Let’s play' })).toBeVisible();
  await expect(page).toHaveScreenshot('welcome.png', {
    animations: 'disabled',
  });
});

test('built game loads assets, moves through real input, pauses and restarts', async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await expect(page.getByRole('button', { name: 'Pause game' })).toBeEnabled();
  const progress = page.getByRole('progressbar', { name: 'Level progress' });
  const start = Number(await progress.getAttribute('aria-valuenow'));
  if (isMobile) {
    const right = page.getByRole('button', { name: 'Right', exact: true });
    const box = await right.boundingBox();
    if (!box) throw new Error('Right touch control is missing');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.keyboard.press('KeyW');
    await expect
      .poll(async () => Number(await progress.getAttribute('aria-valuenow')))
      .toBeGreaterThan(start + 2);
    await page.mouse.up();
  } else {
    await page.keyboard.down('ArrowRight');
    await expect
      .poll(async () => Number(await progress.getAttribute('aria-valuenow')))
      .toBeGreaterThan(start + 2);
    await page.keyboard.up('ArrowRight');
  }
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Just floating.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Keep playing' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Start over' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Keep playing' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(progress).toHaveAttribute('aria-valuenow', '3');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({
    path: `test-results/game-${isMobile ? 'mobile' : 'desktop'}.png`,
  });
  expect(errors).toEqual([]);
});

test('loading stays visible until assets finish and a missing asset offers retry', async ({
  page,
}) => {
  const gate = Promise.withResolvers<void>();
  await page.route('**/assets/lobster-poses.png', async (route) => {
    await gate.promise;
    await route.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Let’s play' }).click();
  try {
    await expect(page.getByText('Getting your flippers ready…')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Pause game' }),
    ).toBeDisabled();
  } finally {
    gate.resolve();
  }
  await expect(
    page.getByRole('heading', { name: 'The ocean couldn’t load.' }),
  ).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.unroute('**/assets/lobster-poses.png');
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await expect(page.getByRole('button', { name: 'Pause game' })).toBeEnabled();
});

test('reload retains best score but starts a fresh run', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('little-lobster-best', '24'));
  await page.reload();
  await expect(page.getByText('Best 24/62')).toBeAttached();
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await expect(page.getByRole('button', { name: 'Pause game' })).toBeEnabled();
  await expect(
    page.getByRole('progressbar', { name: 'Level progress' }),
  ).toHaveAttribute('aria-valuenow', '3');
});

test('the first pearl guarantees electro power and enables the firing control', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await expect(page.getByRole('button', { name: 'Pause game' })).toBeEnabled();
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('Space');
  const progress = page.getByRole('progressbar', { name: 'Level progress' });
  await expect
    .poll(async () => Number(await progress.getAttribute('aria-valuenow')), {
      intervals: [16],
    })
    .toBeGreaterThanOrEqual(5);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('Space');
  await expect(page.getByText(/^Electro \d+s$/)).toBeVisible({
    timeout: 12000,
  });
  if (isMobile) {
    const fire = page.getByRole('button', { name: 'Electro', exact: true });
    await expect(fire).toBeEnabled();
    const box = await fire.boundingBox();
    if (!box) throw new Error('Missing Electro control');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
  } else {
    await page.keyboard.down('KeyF');
  }
  await page.waitForTimeout(180);
  await page.screenshot({
    path: `test-results/electro-${isMobile ? 'mobile' : 'desktop'}.png`,
  });
  await page.mouse.up();
  await page.keyboard.up('KeyF');
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByText(/^Electro \d+s$/)).toHaveCount(0);
});

test('saved journey plays through kelp, advances to crystal caves and resumes after reload', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'little-lobster-journey-v1',
      JSON.stringify({ version: 1, level: 2, seed: 52, pearls: 24 }),
    ),
  );
  await page.reload();
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await expect(
    page.getByText('Level 2 · Kelp Forest', { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/kelp-${isMobile ? 'mobile' : 'desktop'}.png`,
  });
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowDown');
  await page.keyboard.down('Shift');
  const next = page.getByRole('button', { name: 'Next level' });
  await expect(next).toBeVisible({ timeout: 25000 });
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowDown');
  await page.keyboard.up('Shift');
  await expect(next).toBeFocused();
  await next.click();
  await expect(
    page.getByText('Level 3 · Crystal Caves', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.phaser-host')).toBeFocused();
  await page.screenshot({
    path: `test-results/crystal-${isMobile ? 'mobile' : 'desktop'}.png`,
  });
  await page.reload();
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await expect(
    page.getByText('Level 3 · Crystal Caves', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(
    page.getByText('Level 1 · Sunlit Reef', { exact: true }),
  ).toBeVisible();
});

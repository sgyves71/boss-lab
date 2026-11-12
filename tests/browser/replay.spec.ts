import { expect, test } from '@playwright/test';

test('step through dodging, amplified rockets, and each event at expiration; rewind and restart', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const next = page.getByRole('button', { name: 'Next event' });
  await expect(page.getByTestId('player-hp')).toHaveText('100 / 100');
  await expect(page.getByTestId('boss-hp')).toHaveText('500 / 500');
  await expect(page.getByRole('button', { name: 'Previous event' })).toBeDisabled();
  await next.click(); // Wide Shot
  await expect(page.getByTestId('boss-hp')).toHaveText('492 / 500');
  await next.click(); // Corrosion
  await expect(page.getByTestId('corrosion-time')).toHaveText('3.000s left');
  await next.click(); // First warning
  await expect(page.locator('[data-lane="middle"]')).toHaveClass(/targeted/);
  await next.click(); // Move
  await expect(page.getByRole('img', { name: 'Player spacecraft in top lane' })).toBeVisible();
  await next.click(); // Dodge
  await expect(page.locator('#event-title')).toHaveText('Boss shot dodged');
  await expect(page.getByTestId('player-hp')).toHaveText('100 / 100');
  await next.click(); // Second warning
  await expect(page.locator('[data-lane="top"]')).toHaveClass(/targeted/);
  await next.click(); // Boosted rocket
  await expect(page.getByTestId('time')).toHaveText('3.999s');
  await expect(page.getByTestId('corrosion-time')).toHaveText('0.001s left');
  await expect(page.getByTestId('boss-hp')).toHaveText('422 / 500');
  await next.click(); // Expiration, before damage
  await expect(page.locator('#event-title')).toHaveText('Shield Corrosion expires');
  await expect(page.getByTestId('corrosion-time')).toHaveText('INACTIVE');
  await expect(page.getByTestId('player-hp')).toHaveText('100 / 100');
  await expect(page.getByTestId('boss-hp')).toHaveText('422 / 500');
  await next.click(); // Boss projectile
  await expect(page.getByTestId('player-hp')).toHaveText('90 / 100');
  await expect(page.getByTestId('boss-hp')).toHaveText('422 / 500');
  await next.click(); // Normal rocket
  await expect(page.getByTestId('boss-hp')).toHaveText('387 / 500');
  await expect(page.getByRole('button', { name: 'Replay complete' })).toBeDisabled();
  await expect(page.locator('#combat-log .log-item')).toHaveCount(10);
  const boundaryLog = await page.locator('#combat-log .log-item').allTextContents();
  expect(boundaryLog.slice(-3)).toEqual([
    '4.000sShield Corrosion expires', '4.000sPlayer takes 10 damage', '4.000sVX-5 rocket hits for 35 damage',
  ]);
  await page.getByRole('button', { name: 'Previous event' }).click();
  await expect(page.getByTestId('boss-hp')).toHaveText('422 / 500');
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.getByTestId('boss-hp')).toHaveText('500 / 500');
  await expect(page.getByTestId('player-hp')).toHaveText('100 / 100');
  await expect(page.locator('#combat-log .log-item')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('replay controls and layout work on a narrow screen and with the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const next = page.getByRole('button', { name: 'Next event' });
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('boss-hp')).toHaveText('492 / 500');
  const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fitsViewport).toBe(true);
  await page.screenshot({ path: 'test-results/replay-mobile.png', fullPage: true });
});

test('capture the desktop warning state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const next = page.getByRole('button', { name: 'Next event' });
  for (let step = 0; step < 3; step += 1) await next.click();
  await expect(page.locator('#event-title')).toHaveText('Warning: middle lane targeted');
  await page.screenshot({ path: 'test-results/replay-desktop.png', fullPage: true });
});

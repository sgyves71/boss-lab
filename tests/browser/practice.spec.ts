import { expect, test } from '@playwright/test';

test('choose actions, dodge, hit the corrosion boundary, then replay and resume the same run', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByLabel('Main weapon', { exact: true }).selectOption('laser');
  const time = page.getByLabel('Action time (seconds)');
  await time.fill('1.000');
  await page.getByRole('button', { name: 'Apply Shield Corrosion', exact: true }).click();
  await expect(page.getByTestId('corrosion-time')).toHaveText('3.000s left');
  await expect(page.getByLabel('Main weapon', { exact: true })).toBeDisabled();
  await time.fill('2.000');
  await page.getByRole('button', { name: 'Top lane', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Player spacecraft in top lane' })).toBeVisible();
  await time.fill('2.500');
  await page.getByRole('button', { name: 'Laser hit', exact: true }).click();
  await expect(page.getByTestId('player-hp')).toHaveText('100 / 100');
  await expect(page.getByTestId('boss-hp')).toHaveText('486 / 500');
  await time.fill('3.999');
  await page.getByRole('button', { name: 'VX-5 hit', exact: true }).click();
  await expect(page.getByTestId('boss-hp')).toHaveText('416 / 500');
  await expect(page.getByTestId('corrosion-time')).toHaveText('0.001s left');
  await time.fill('4.000');
  await page.getByRole('button', { name: 'VX-5 hit', exact: true }).click();
  await expect(page.getByTestId('boss-hp')).toHaveText('381 / 500');
  await expect(page.getByTestId('player-hp')).toHaveText('90 / 100');
  const recordedLog = await page.locator('#combat-log .log-item').allTextContents();
  await page.getByRole('button', { name: 'Replay my run' }).click();
  await expect(page.getByTestId('boss-hp')).toHaveText('500 / 500');
  for (let event = 0; event < recordedLog.length; event += 1) {
    await page.getByRole('button', { name: 'Next event' }).click();
  }
  expect(await page.locator('#combat-log .log-item').allTextContents()).toEqual(recordedLog);
  await expect(page.getByTestId('boss-hp')).toHaveText('381 / 500');
  await expect(page.getByTestId('player-hp')).toHaveText('90 / 100');
  await page.getByRole('button', { name: 'Return to practice' }).click();
  await expect(page.getByTestId('time')).toHaveText('4.000s');
  await page.getByRole('button', { name: 'Laser hit', exact: true }).click();
  await expect(page.getByTestId('boss-hp')).toHaveText('367 / 500');
  await time.fill('2');
  await page.getByRole('button', { name: 'Advance to time', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('at or after');
  await expect(page.getByTestId('time')).toHaveText('4.000s');
  await page.getByRole('button', { name: 'New practice', exact: true }).click();
  await expect(page.getByTestId('time')).toHaveText('0.000s');
  await expect(page.getByTestId('boss-hp')).toHaveText('500 / 500');
  await expect(page.locator('#practice-error')).toBeEmpty();
  expect(errors).toEqual([]);
});

test('equipment restrictions, defeat controls, and a time-only recording work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByLabel('Equip VX-5 rockets').uncheck();
  await expect(page.getByRole('button', { name: 'VX-5 hit', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '+0.25s', exact: true }).click();
  await expect(page.getByTestId('time')).toHaveText('0.250s');
  await page.getByRole('button', { name: 'Replay my run' }).click();
  await expect(page.getByTestId('time')).toHaveText('0.250s');
  await expect(page.locator('#event-title')).toHaveText('No combat events recorded');
  await page.getByRole('button', { name: 'Return to practice' }).click();
  await page.getByRole('button', { name: 'New practice', exact: true }).click();
  await page.getByLabel('Equip VX-5 rockets').check();
  await page.getByRole('button', { name: 'Apply Shield Corrosion', exact: true }).click();
  for (let hit = 0; hit < 8; hit += 1) await page.getByRole('button', { name: 'VX-5 hit', exact: true }).click();
  await expect(page.getByTestId('boss-hp')).toHaveText('0 / 500');
  await expect(page.locator('#event-title')).toHaveText('Boss defeated');
  await expect(page.getByRole('button', { name: 'VX-5 hit', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Top lane', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Replay my run' })).toBeEnabled();
});

test('practice is usable on mobile and shows the boss warning', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByLabel('Action time (seconds)').fill('1.500');
  await page.getByRole('button', { name: 'Advance to time', exact: true }).click();
  await expect(page.locator('[data-lane="middle"]')).toHaveClass(/targeted/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/practice-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: 'test-results/practice-desktop.png', fullPage: true });
});

import { expect, test } from '@playwright/test';

test('a new reviewer can inspect a complete victory and return to a fresh practice', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await page.getByText('What this project demonstrates', { exact: true }).click();
  await expect(page.locator('.demo-guide details')).toContainText('deterministic TypeScript simulation');
  await page.getByRole('button', { name: 'Complete fight', exact: true }).click();
  await expect(page.getByTestId('boss-hp')).toHaveText('500 / 500');
  for (let step = 0; step < 30 && await page.locator('#player-damage').isHidden(); step += 1) {
    await page.getByRole('button', { name: 'Next event' }).click();
  }
  await expect(page.locator('#player-damage')).toHaveText('−10 HP');
  await expect(page.locator('#player-damage')).toBeVisible();
  await expect(page.locator('#player-ship')).toHaveClass(/taking-damage/);
  await expect(page.getByTestId('player-hp')).toHaveText('90 / 100');
  await page.screenshot({ path: 'test-results/player-hit.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Next event' }).click();
  await expect(page.locator('#player-damage')).toBeHidden();
  await page.getByRole('button', { name: 'Show outcome', exact: true }).click();
  await expect(page.getByTestId('boss-hp')).toHaveText('0 / 500');
  await expect(page.getByTestId('player-hp')).toHaveText('80 / 100');
  await expect(page.getByTestId('time')).toHaveText('7.500s');
  await expect(page.locator('#battle-status')).toContainText('VICTORY');
  await expect(page.locator('#combat-log')).toContainText('Boss defeated');
  await page.screenshot({ path: 'test-results/complete-victory.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.getByTestId('boss-hp')).toHaveText('500 / 500');
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await expect(page.getByTestId('time')).toHaveText('0.000s');
});

test('practice explains cadence and repeats boss warnings after the first cycle', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByRole('button', { name: 'VX-5 hit', exact: true }).click();
  await page.getByRole('button', { name: 'VX-5 hit', exact: true }).click();
  await expect(page.locator('#practice-error')).toContainText('ready at 1.000s');
  await expect(page.getByTestId('boss-hp')).toHaveText('465 / 500');
  await expect(page.getByTestId('time')).toHaveText('0.000s');
  await page.getByLabel('Action time (seconds)').fill('1');
  await page.getByRole('button', { name: 'VX-5 hit', exact: true }).click();
  await expect(page.getByTestId('boss-hp')).toHaveText('430 / 500');
  await page.getByLabel('Action time (seconds)').fill('7.5');
  await page.getByRole('button', { name: 'Advance to time', exact: true }).click();
  await expect(page.locator('#combat-log')).toContainText('7.500sWarning: middle lane targeted');
  await expect(page.locator('[data-lane="middle"]')).toHaveClass(/targeted/);
});

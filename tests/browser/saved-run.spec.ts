import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('save survives reload, exports portable inputs, and imports without trusting bad data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByLabel('Main weapon', { exact: true }).selectOption('laser');
  await page.getByLabel('Action time (seconds)').fill('1');
  await page.getByRole('button', { name: 'Apply Shield Corrosion', exact: true }).click();
  await page.getByLabel('Action time (seconds)').fill('2');
  await page.getByRole('button', { name: 'VX-5 hit', exact: true }).click();
  await page.getByRole('button', { name: 'Save run', exact: true }).click();
  await expect(page.locator('#save-status')).toContainText('Run saved');
  await page.reload();
  await page.getByRole('button', { name: 'Load saved run', exact: true }).click();
  await expect(page.getByTestId('boss-hp')).toHaveText('430 / 500');
  await expect(page.getByTestId('time')).toHaveText('2.000s');
  await expect(page.getByLabel('Main weapon', { exact: true })).toHaveValue('laser');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const download = await downloadEvent;
  const file = await readFile((await download.path())!, 'utf8');
  const saved = JSON.parse(file);
  expect(saved.rulesVersion).toBe('shooter-demo-v2');
  expect(saved.decisions).toHaveLength(2);
  expect(saved.initial.mainWeapon).toBe('laser');
  expect(saved).not.toHaveProperty('frames');
  await page.getByRole('button', { name: 'New practice', exact: true }).click();
  await page.locator('#import-run').setInputFiles({ name: 'replay.json', mimeType: 'application/json', buffer: Buffer.from(file) });
  await expect(page.getByTestId('boss-hp')).toHaveText('430 / 500');
  await expect(page.locator('#save-status')).toContainText('Imported run verified');
  await page.locator('#import-run').setInputFiles({ name: 'invalid.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...saved, rulesVersion: 'future' })) });
  await expect(page.locator('#save-status')).toContainText('unsupported');
  await expect(page.getByTestId('boss-hp')).toHaveText('430 / 500');
  await page.evaluate(() => localStorage.setItem('boss-lab.saved-run.v1', '{broken'));
  await page.getByRole('button', { name: 'Load saved run', exact: true }).click();
  await expect(page.locator('#save-status')).toContainText('not valid JSON');
  await expect(page.getByTestId('boss-hp')).toHaveText('430 / 500');
});

test('storage denial leaves practice usable and reports save/load errors', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled'); } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByRole('button', { name: '+0.25s', exact: true }).click();
  await page.getByRole('button', { name: 'Save run', exact: true }).click();
  await expect(page.locator('#save-status')).toContainText('Could not save');
  await page.getByRole('button', { name: 'Load saved run', exact: true }).click();
  await expect(page.locator('#save-status')).toContainText('Could not load');
  await page.getByRole('button', { name: 'Wide Shot hit', exact: true }).click();
  await expect(page.getByTestId('boss-hp')).toHaveText('492 / 500');
});

test('an existing v1 browser save keeps its original pattern and can continue', async ({ page }) => {
  const fixture = JSON.parse(await readFile(new URL('../../examples/victory-v1.json', import.meta.url), 'utf8'));
  fixture.decisions = fixture.decisions.filter((input: { atMs: number }) => input.atMs <= 5000);
  await page.goto('/');
  await page.evaluate((saved) => localStorage.setItem('boss-lab.saved-run.v1', JSON.stringify(saved)), fixture);
  await page.getByRole('button', { name: 'Load saved run', exact: true }).click();
  await expect(page.locator('#pattern-description')).toContainText('Legacy saved run (v1)');
  await page.getByLabel('Action time (seconds)').fill('6.5');
  await page.getByRole('button', { name: 'Advance to time', exact: true }).click();
  await expect(page.locator('#combat-log')).toContainText('6.500sWarning: middle lane targeted');
  await page.getByRole('button', { name: 'Save run', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('boss-lab.saved-run.v1')!));
  expect(saved.rulesVersion).toBe('shooter-demo-v1');
  await page.getByRole('button', { name: 'New practice', exact: true }).click();
  await expect(page.locator('#pattern-description')).toContainText('Every 6 seconds');
  await expect(page.locator('#pattern-description')).toContainText('bottom at +5.500s');
});

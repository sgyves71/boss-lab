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
  expect(saved.rulesVersion).toBe('shooter-demo-v1');
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

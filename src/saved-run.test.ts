import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actInPractice, createPractice } from './practice.ts';
import { serializeRun, deserializeRun } from './saved-run.ts';
import { createExampleVictory } from './example-fight.ts';
import { readFileSync } from 'node:fs';

test('a saved run reconstructs equipment, exact state, events, and future scheduling from inputs', () => {
  let session = actInPractice(createPractice({ mainWeapon: 'laser' }), { type: 'apply-shield-corrosion', atMs: 1000 });
  session = actInPractice(session, { type: 'move', atMs: 2000, lane: 'bottom' });
  session = actInPractice(session, { type: 'hit', atMs: 3999, weapon: 'vx-5' });
  const loaded = deserializeRun(serializeRun(session));
  assert.deepEqual(loaded, session);
  assert.deepEqual(actInPractice(loaded, { type: 'advance-time', atMs: 5000 }),
    actInPractice(session, { type: 'advance-time', atMs: 5000 }));
});

test('save/load preserves time-only and fatal catch-up decisions', () => {
  for (const session of [
    actInPractice(createPractice(), { type: 'advance-time', atMs: 250 }),
    actInPractice(createPractice({ playerHp: 5 }), { type: 'hit', atMs: 5000, weapon: 'vx-5' }),
  ]) assert.deepEqual(deserializeRun(serializeRun(session)), session);
});

test('malformed, incompatible, oversized, and impossible saved inputs are rejected', () => {
  const valid = JSON.parse(serializeRun(createPractice()));
  for (const invalid of ['{', 'null', '[]', 'x'.repeat(500001),
    JSON.stringify({ ...valid, rulesVersion: 'future' }),
    JSON.stringify({ ...valid, initial: { ...valid.initial, mainWeapon: 'unknown' } }),
    JSON.stringify({ ...valid, decisions: [{ type: 'boss-fire', atMs: 0 }] }),
    JSON.stringify({ ...valid, decisions: [{ type: 'advance-time', atMs: 120001 }] }),
    JSON.stringify({ ...valid, decisions: [{ type: 'hit', atMs: 0, weapon: 'laser' }] }),
    JSON.stringify({ ...valid, decisions: [{ type: 'advance-time', atMs: 1000 }, { type: 'advance-time', atMs: 0 }] }),
    JSON.stringify({ ...valid, decisions: [{ type: 'hit', atMs: 0, weapon: 'vx-5' }, { type: 'hit', atMs: 1, weapon: 'vx-5' }] }),
  ]) assert.throws(() => deserializeRun(invalid));
});

test('a complete victory survives save/load without storing computed state', () => {
  const example = createExampleVictory();
  const serialized = serializeRun(example);
  assert.deepEqual(deserializeRun(serialized), example);
  assert.equal('frames' in JSON.parse(serialized), false);
  const fixture = readFileSync(new URL('../examples/victory.json', import.meta.url), 'utf8');
  assert.deepEqual(deserializeRun(fixture), example);
});

test('v1 saves preserve the original schedule, outcome, and version when saved again', () => {
  const fixture = readFileSync(new URL('../examples/victory-v1.json', import.meta.url), 'utf8');
  const legacy = deserializeRun(fixture);
  assert.equal(legacy.rulesVersion, 'shooter-demo-v1');
  assert.equal(legacy.state.playerHp, 90);
  assert.equal(legacy.state.result, 'boss-defeated');
  assert.ok(legacy.frames.some((frame) => frame.event.type === 'boss-shot-fired' && frame.event.atMs === 6500));
  assert.equal(JSON.parse(serializeRun(legacy)).rulesVersion, 'shooter-demo-v1');
  assert.deepEqual(deserializeRun(serializeRun(legacy)), legacy);

  const saved = JSON.parse(fixture);
  saved.decisions = saved.decisions.filter((input: { atMs: number }) => input.atMs <= 5000);
  const resumed = actInPractice(deserializeRun(JSON.stringify(saved)), { type: 'advance-time', atMs: 7500 });
  assert.equal(resumed.state.playerHp, 90);
  assert.ok(resumed.frames.some((frame) => frame.event.type === 'boss-shot-fired' && frame.event.atMs === 6500));
  assert.deepEqual(deserializeRun(serializeRun(resumed)), resumed);

  saved.rulesVersion = 'shooter-demo-v2';
  const current = actInPractice(deserializeRun(JSON.stringify(saved)), { type: 'advance-time', atMs: 7500 });
  assert.equal(current.state.playerHp, 80);
  assert.equal(current.rulesVersion, 'shooter-demo-v2');
});

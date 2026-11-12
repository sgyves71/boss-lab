import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actInPractice, createPractice } from './practice.ts';
import { replayBattle } from './replay.ts';
import { createExampleVictory } from './example-fight.ts';

test('player chooses corrosion and movement times, and recorded actions replay identically', () => {
  const initial = Object.freeze(createPractice({ mainWeapon: 'laser' }));
  let session = actInPractice(initial, { type: 'apply-shield-corrosion', atMs: 1000 });
  session = actInPractice(session, { type: 'move', atMs: 2000, lane: 'top' });
  session = actInPractice(session, { type: 'hit', atMs: 2500, weapon: 'laser' });
  assert.equal(session.state.playerHp, 100);
  assert.equal(session.state.bossHp, 486);
  session = actInPractice(session, { type: 'hit', atMs: 3000, weapon: 'vx-5' });
  session = actInPractice(session, { type: 'hit', atMs: 4000, weapon: 'vx-5' });
  assert.equal(session.state.playerHp, 90);
  assert.equal(session.state.bossHp, 381);
  const replay = replayBattle(session.initialState, session.actions);
  assert.deepEqual(replay.finalState, session.state);
  assert.deepEqual(replay.frames, session.frames);
  assert.deepEqual(initial.actions, []);
  assert.equal(initial.state.bossHp, 500);
});

test('jumping across three boss shots resolves them once and in order', () => {
  let session = actInPractice(createPractice(), { type: 'advance-time', atMs: 5000 });
  assert.equal(session.state.playerHp, 90); // Middle hit, top missed; bottom shot is still pending.
  assert.deepEqual(session.frames.map((frame) => frame.event.atMs), [1500, 2500, 3000, 4000, 4500]);
  session = actInPractice(session, { type: 'advance-time', atMs: 6000 });
  assert.deepEqual(session.frames.map((frame) => frame.event.atMs), [1500, 2500, 3000, 4000, 4500, 5500]);
  assert.equal(session.state.playerHp, 90); // Bottom shot also misses the idle middle-lane player.
  assert.deepEqual(replayBattle(session.initialState, session.actions).finalState, session.state);
});

test('moving at impact is too late; invalid decisions do not change the session', () => {
  const initial = createPractice();
  const late = actInPractice(initial, { type: 'move', atMs: 2500, lane: 'top' });
  assert.equal(late.state.playerHp, 90);
  assert.throws(() => actInPractice(late, { type: 'advance-time', atMs: 2499 }), /Choose a time/);
  assert.throws(() => actInPractice(initial, { type: 'hit', atMs: 2000, weapon: 'laser' }), /not equipped/);
  assert.equal(initial.state.timeMs, 0);
  assert.deepEqual(initial.actions, []);
});

test('player defeat while catching up prevents a later player hit and remains replayable', () => {
  const session = actInPractice(createPractice({ playerHp: 5 }), { type: 'hit', atMs: 5000, weapon: 'vx-5' });
  assert.equal(session.state.result, 'player-defeated');
  assert.equal(session.state.timeMs, 2500);
  assert.equal(session.state.bossHp, 500);
  assert.deepEqual(replayBattle(session.initialState, session.actions).finalState, session.state);
  assert.throws(() => actInPractice(session, { type: 'advance-time', atMs: 6000 }), /finished/);
});

test('cadence rejects early hits, accepts the exact ready time, and tracks weapons independently', () => {
  let session = actInPractice(createPractice(), { type: 'hit', atMs: 0, weapon: 'vx-5' });
  assert.equal(session.nextHitAtMs['vx-5'], 1000);
  assert.throws(() => actInPractice(session, { type: 'hit', atMs: 999, weapon: 'vx-5' }), /ready at 1.000s/);
  assert.equal(session.state.timeMs, 0);
  session = actInPractice(session, { type: 'hit', atMs: 0, weapon: 'wide-shot' });
  assert.throws(() => actInPractice(session, { type: 'hit', atMs: 249, weapon: 'wide-shot' }), /ready at 0.250s/);
  session = actInPractice(session, { type: 'hit', atMs: 250, weapon: 'wide-shot' });
  session = actInPractice(session, { type: 'hit', atMs: 1000, weapon: 'vx-5' });
  assert.equal(session.state.bossHp, 414);
  let laser = actInPractice(createPractice({ mainWeapon: 'laser' }), { type: 'hit', atMs: 0, weapon: 'laser' });
  assert.throws(() => actInPractice(laser, { type: 'hit', atMs: 499, weapon: 'laser' }), /ready at 0.500s/);
  laser = actInPractice(laser, { type: 'hit', atMs: 500, weapon: 'laser' });
  assert.equal(laser.state.bossHp, 472);
});

test('boss pattern repeats every six seconds and can defeat an idle player', () => {
  const session = actInPractice(createPractice(), { type: 'advance-time', atMs: 8000 });
  assert.equal(session.state.playerHp, 90);
  const warnings = session.frames.filter((frame) => frame.event.type === 'boss-shot-fired');
  assert.deepEqual(warnings.map((frame) => frame.event.atMs), [1500, 3000, 4500, 7500]);
  assert.deepEqual(warnings.map((frame) => frame.event.type === 'boss-shot-fired' ? frame.event.lane : null),
    ['middle', 'top', 'bottom', 'middle']);
  const defeated = actInPractice(createPractice(), { type: 'advance-time', atMs: 60000 });
  assert.equal(defeated.state.result, 'player-defeated');
  assert.equal(defeated.state.timeMs, 56500);
  assert.deepEqual(replayBattle(defeated.initialState, defeated.actions).finalState, defeated.state);
  assert.throws(() => actInPractice(createPractice(), { type: 'advance-time', atMs: 120001 }), /120 seconds/);
});

test('the complete example uses legal cadence, takes both targeted hits, and wins reproducibly', () => {
  const example = createExampleVictory();
  assert.equal(example.state.result, 'boss-defeated');
  assert.equal(example.state.bossHp, 0);
  assert.equal(example.state.playerHp, 80);
  assert.equal(example.state.timeMs, 7500);
  assert.deepEqual(replayBattle(example.initialState, example.actions).finalState, example.state);
  assert.deepEqual(example.frames.filter((frame) => frame.event.type === 'player-damaged')
    .map((frame) => frame.event.atMs), [2500, 5500]);
  assert.ok(example.frames.some((frame) => frame.event.type === 'boss-shot-fired' && frame.event.atMs === 7500));
});

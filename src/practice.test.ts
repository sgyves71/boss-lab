import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actInPractice, createPractice } from './practice.ts';
import { replayBattle } from './replay.ts';

test('player chooses corrosion and movement times, and recorded actions replay identically', () => {
  const initial = Object.freeze(createPractice({ mainWeapon: 'laser' }));
  let session = actInPractice(initial, { type: 'apply-shield-corrosion', atMs: 1000 });
  session = actInPractice(session, { type: 'move', atMs: 2000, lane: 'top' });
  session = actInPractice(session, { type: 'hit', atMs: 2500, weapon: 'laser' });
  assert.equal(session.state.playerHp, 100);
  assert.equal(session.state.bossHp, 486);
  session = actInPractice(session, { type: 'hit', atMs: 3999, weapon: 'vx-5' });
  session = actInPractice(session, { type: 'hit', atMs: 4000, weapon: 'vx-5' });
  assert.equal(session.state.playerHp, 90);
  assert.equal(session.state.bossHp, 381);
  const replay = replayBattle(session.initialState, session.actions);
  assert.deepEqual(replay.finalState, session.state);
  assert.deepEqual(replay.frames, session.frames);
  assert.deepEqual(initial.actions, []);
  assert.equal(initial.state.bossHp, 500);
});

test('jumping across both boss shots resolves them once and in order', () => {
  let session = actInPractice(createPractice(), { type: 'advance-time', atMs: 5000 });
  assert.equal(session.state.playerHp, 90); // Middle hit, then top missed.
  assert.deepEqual(session.frames.map((frame) => frame.event.atMs), [1500, 2500, 3000, 4000]);
  session = actInPractice(session, { type: 'advance-time', atMs: 6000 });
  assert.equal(session.frames.length, 4);
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

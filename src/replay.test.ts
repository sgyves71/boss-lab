import assert from 'node:assert/strict';
import { test } from 'node:test';
import { replayBattle } from './replay.ts';
import { createTrainingBattle, TRAINING_ACTIONS } from './scenario.ts';

test('training replay is deterministic and records state after each individual event', () => {
  const initial = Object.freeze(createTrainingBattle());
  const replay = replayBattle(initial, TRAINING_ACTIONS);
  assert.deepEqual(replay, replayBattle(initial, TRAINING_ACTIONS));
  assert.equal(replay.frames.length, 10);
  assert.equal(replay.finalState.playerHp, 90);
  assert.equal(replay.finalState.bossHp, 387);
  const boundary = replay.frames.filter((frame) => frame.event.atMs === 4000);
  assert.deepEqual(boundary.map((frame) => [frame.event.type, frame.state.playerHp, frame.state.bossHp]), [
    ['shield-corrosion-expired', 100, 422],
    ['player-damaged', 90, 422],
    ['damage', 90, 387],
  ]);
  assert.equal(replay.frames[6]?.state.shieldCorrosion?.durationMs, 3000);
  assert.equal(initial.bossHp, 500);
  assert.equal(initial.shieldCorrosion, null);
});

test('an empty replay preserves the starting state', () => {
  const initial = createTrainingBattle();
  const replay = replayBattle(initial, []);
  assert.deepEqual(replay.frames, []);
  assert.deepEqual(replay.finalState, initial);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveTurn, type BattleState } from './combat.ts';

test('Storm Ward expires before the next Ember Mark tick', () => {
  const initial: BattleState = Object.freeze({
    turn: 1,
    playerHp: 20,
    veyraHp: 18,
    stormWardExpiresOnTurn: 2,
    emberMarkTicksRemaining: 0,
    telegraphedAttackDamage: 4,
    result: 'ongoing',
  });

  const turn1 = resolveTurn(initial, 'ember-mark');
  assert.notStrictEqual(turn1.state, initial, 'return a new battle state');
  assert.equal(turn1.state.turn, 2);
  assert.equal(turn1.state.playerHp, 16);
  assert.equal(turn1.state.veyraHp, 18);
  assert.equal(turn1.state.emberMarkTicksRemaining, 2);
  assert.equal(turn1.state.stormWardExpiresOnTurn, 2);

  const turn2 = resolveTurn(Object.freeze(turn1.state), 'guard');
  assert.notStrictEqual(turn2.state, turn1.state, 'return a new battle state');
  assert.equal(turn2.state.turn, 3);
  assert.equal(turn2.state.playerHp, 15);
  assert.equal(turn2.state.veyraHp, 16);
  assert.equal(turn2.state.emberMarkTicksRemaining, 1);
  assert.equal(turn2.state.stormWardExpiresOnTurn, null);

  const expirationIndex = turn2.events.findIndex(
    (event) => event.type === 'storm-ward-expired' && event.turn === 2,
  );
  const tickIndex = turn2.events.findIndex(
    (event) => event.type === 'damage'
      && event.turn === 2
      && event.source === 'ember-mark'
      && event.target === 'veyra'
      && event.amount === 2,
  );
  assert.ok(expirationIndex >= 0, 'turn 2 must emit Storm Ward expiration');
  assert.ok(tickIndex >= 0, 'turn 2 must emit 2 Ember Mark damage to Veyra');
  assert.ok(expirationIndex < tickIndex, 'Storm Ward must expire before Ember Mark damage');
});

function activeBattle(overrides: Partial<BattleState> = {}): BattleState {
  return Object.freeze({
    turn: 2,
    playerHp: 16,
    veyraHp: 18,
    stormWardExpiresOnTurn: 2,
    emberMarkTicksRemaining: 2,
    telegraphedAttackDamage: 4,
    result: 'ongoing',
    ...overrides,
  });
}

test('a blocked Ember Mark tick is spent', () => {
  const { state, events } = resolveTurn(activeBattle({ stormWardExpiresOnTurn: 3 }), 'guard');
  assert.equal(state.veyraHp, 18);
  assert.equal(state.emberMarkTicksRemaining, 1);
  assert.ok(events.some((event) => event.type === 'damage-blocked'
    && event.source === 'ember-mark' && event.amount === 2));
});

test('reapplying Ember Mark resolves the old tick before resetting to two', () => {
  const { state } = resolveTurn(activeBattle({ emberMarkTicksRemaining: 1 }), 'ember-mark');
  assert.equal(state.veyraHp, 16);
  assert.equal(state.emberMarkTicksRemaining, 2);
  assert.equal(state.playerHp, 12);
});

test('a lethal Ember Mark tick ends the fight before the move or attack', () => {
  const { state, events } = resolveTurn(activeBattle({ veyraHp: 1 }), 'ember-mark');
  assert.equal(state.veyraHp, 0);
  assert.equal(state.playerHp, 16);
  assert.equal(state.emberMarkTicksRemaining, 1);
  assert.equal(state.turn, 2);
  assert.equal(state.result, 'player-won');
  assert.deepEqual(events.at(-1), { type: 'fight-ended', turn: 2, result: 'player-won' });
  assert.throws(() => resolveTurn(state, 'strike'), /finished fight/);
});

test('Strike is blocked by Ward and becomes lethal after Ward expires', () => {
  const blocked = resolveTurn(activeBattle({ turn: 1, emberMarkTicksRemaining: 0 }), 'strike');
  assert.equal(blocked.state.veyraHp, 18);
  assert.ok(blocked.events.some((event) => event.type === 'damage-blocked'
    && event.source === 'strike' && event.amount === 5));

  const lethal = resolveTurn(activeBattle({ veyraHp: 3, emberMarkTicksRemaining: 0 }), 'strike');
  assert.equal(lethal.state.veyraHp, 0);
  assert.equal(lethal.state.playerHp, 16);
  assert.equal(lethal.state.result, 'player-won');
  assert.equal(lethal.events.at(-1)?.type, 'fight-ended');
});

test('Guard lasts for its turn only and lethal attacks clamp player HP', () => {
  const guarded = resolveTurn(activeBattle({ playerHp: 4, emberMarkTicksRemaining: 0 }), 'guard');
  assert.equal(guarded.state.playerHp, 3);
  const unguarded = resolveTurn(guarded.state, 'ember-mark');
  assert.equal(unguarded.state.playerHp, 0);
  assert.equal(unguarded.state.result, 'veyra-won');
  assert.equal(unguarded.events.at(-1)?.type, 'fight-ended');
});

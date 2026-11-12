import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBattle, resolveEvent, type BattleState, type BattleAction } from './combat.ts';

function initialBattle(overrides: Partial<BattleState> = {}): BattleState {
  return Object.freeze({
    ...createBattle(), ...overrides,
  });
}

test('VX-5 deals 70 just before expiration and 35 exactly at expiration', () => {
  const initial = initialBattle();
  const applied = resolveEvent(initial, { type: 'apply-shield-corrosion', atMs: 1000 });
  assert.notStrictEqual(applied.state, initial);
  assert.equal(applied.state.bossHp, 500);
  assert.deepEqual(applied.state.shieldCorrosion, { startedAtMs: 1000, durationMs: 3000 });
  assert.equal(initial.shieldCorrosion, null);
  Object.freeze(applied.state.shieldCorrosion);
  const before = resolveEvent(Object.freeze(applied.state), { type: 'hit', atMs: 3999, weapon: 'vx-5' });
  assert.equal(before.state.timeMs, 3999);
  assert.equal(before.state.bossHp, 430);
  assert.notEqual(before.state.shieldCorrosion, null);
  assert.equal(applied.state.bossHp, 500);
  const boundary = resolveEvent(Object.freeze(before.state), { type: 'hit', atMs: 4000, weapon: 'vx-5' });
  assert.equal(boundary.state.timeMs, 4000);
  assert.equal(boundary.state.bossHp, 395);
  assert.equal(boundary.state.shieldCorrosion, null);
  assert.notEqual(before.state.shieldCorrosion, null);
  const expirationIndex = boundary.events.findIndex(
    (event) => event.type === 'shield-corrosion-expired' && event.atMs === 4000,
  );
  const damageIndex = boundary.events.findIndex(
    (event) => event.type === 'damage' && event.atMs === 4000
      && event.weapon === 'vx-5' && event.amount === 35,
  );
  assert.ok(expirationIndex >= 0, 'emit Shield Corrosion expiration');
  assert.ok(damageIndex >= 0, 'emit normal rocket damage at expiration');
  assert.ok(expirationIndex < damageIndex, 'expire the Shield Corrosion before resolving the hit');
});

test('VX-5 hits for 35 normally and 70 at the instant the Shield Corrosion is applied', () => {
  const normal = resolveEvent(initialBattle(), { type: 'hit', atMs: 0, weapon: 'vx-5' });
  assert.equal(normal.state.bossHp, 465);
  const applied = resolveEvent(normal.state, { type: 'apply-shield-corrosion', atMs: 1000 });
  const boosted = resolveEvent(applied.state, { type: 'hit', atMs: 1000, weapon: 'vx-5' });
  assert.equal(boosted.state.bossHp, 395);
});

for (const [weapon, damage] of [['wide-shot', 8], ['laser', 14]] as const) {
  test(`${weapon} deals ${damage} per hit with or without the Shield Corrosion`, () => {
    const normal = resolveEvent(initialBattle({ mainWeapon: weapon }), { type: 'hit', atMs: 0, weapon });
    assert.equal(normal.state.bossHp, 500 - damage);
    const applied = resolveEvent(normal.state, { type: 'apply-shield-corrosion', atMs: 1000 });
    const boosted = resolveEvent(applied.state, { type: 'hit', atMs: 2000, weapon });
    assert.equal(boosted.state.bossHp, 500 - damage * 2);
  });
}

test('three landed Wide Shot projectiles deal 24 total damage', () => {
  let state = initialBattle();
  for (let hit = 0; hit < 3; hit += 1) {
    state = resolveEvent(state, { type: 'hit', atMs: 1000, weapon: 'wide-shot' }).state;
  }
  assert.equal(state.bossHp, 476);
});

test('advancing past expiration emits it at its scheduled time without damage', () => {
  const applied = resolveEvent(initialBattle(), { type: 'apply-shield-corrosion', atMs: 1000 });
  const advanced = resolveEvent(applied.state, { type: 'advance-time', atMs: 6000 });
  assert.equal(advanced.state.timeMs, 6000);
  assert.equal(advanced.state.bossHp, 500);
  assert.equal(advanced.state.shieldCorrosion, null);
  assert.deepEqual(advanced.events, [{ type: 'shield-corrosion-expired', atMs: 4000 }]);
  const later = resolveEvent(advanced.state, { type: 'advance-time', atMs: 7000 });
  assert.deepEqual(later.events, []);
});

test('unequipped weapons cannot register hits', () => {
  assert.throws(() => resolveEvent(initialBattle({ vx5Equipped: false }),
    { type: 'hit', atMs: 0, weapon: 'vx-5' }), /not equipped/);
  assert.throws(() => resolveEvent(initialBattle(),
    { type: 'hit', atMs: 0, weapon: 'laser' }), /not equipped/);
});

test('time cannot move backwards or use invalid millisecond values', () => {
  const state = initialBattle({ timeMs: 1000 });
  for (const atMs of [999, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => resolveEvent(state, { type: 'advance-time', atMs }), /Time must/);
  }
});

test('active Shield Corrosion refresh is unsupported; a new Shield Corrosion can be applied after expiration', () => {
  const applied = resolveEvent(initialBattle(), { type: 'apply-shield-corrosion', atMs: 1000 });
  assert.throws(() => resolveEvent(applied.state, { type: 'apply-shield-corrosion', atMs: 2000 }), /not supported/);
  const reapplied = resolveEvent(applied.state, { type: 'apply-shield-corrosion', atMs: 4000 });
  assert.deepEqual(reapplied.state.shieldCorrosion, { startedAtMs: 4000, durationMs: 3000 });
});

test('lethal damage clamps HP and finishes the battle immediately', () => {
  const defeated = resolveEvent(initialBattle({ bossHp: 10 }), { type: 'hit', atMs: 1000, weapon: 'vx-5' });
  assert.equal(defeated.state.bossHp, 0);
  assert.equal(defeated.state.result, 'boss-defeated');
  assert.equal(defeated.events.at(-1)?.type, 'boss-defeated');
  assert.throws(() => resolveEvent(defeated.state, { type: 'advance-time', atMs: 2000 }), /finished/);
});

test('the same initial state and timestamped actions produce identical results', () => {
  const actions: readonly BattleAction[] = [
    { type: 'apply-shield-corrosion', atMs: 1000 },
    { type: 'hit', atMs: 3999, weapon: 'vx-5' },
    { type: 'hit', atMs: 4000, weapon: 'vx-5' },
  ];
  function run() {
    let state = initialBattle();
    return actions.map((action) => {
      const resolution = resolveEvent(state, action);
      state = resolution.state;
      return resolution;
    });
  }
  assert.deepEqual(run(), run());
});

test('starting HP, equipment and boss shot damage have configurable defaults', () => {
  const initial = createBattle();
  assert.equal(initial.playerHp, 100);
  assert.equal(initial.bossHp, 500);
  assert.equal(initial.bossShotDamage, 10);
  assert.equal(initial.playerLane, 'middle');
  const configured = createBattle({ playerHp: 80, bossHp: 1000, bossShotDamage: 15 });
  assert.equal(configured.playerHp, 80);
  assert.equal(configured.bossHp, 1000);
  assert.equal(configured.bossShotDamage, 15);
  assert.throws(() => createBattle({ playerHp: 0 }), /positive integers/);
});

test('moving before impact dodges a telegraphed lane shot', () => {
  const initial = Object.freeze(createBattle());
  const fired = resolveEvent(initial, { type: 'boss-fire', atMs: 1000, lane: 'middle', impactAtMs: 2000 });
  assert.equal(fired.state.playerHp, 100);
  assert.equal(initial.pendingBossShot, null);
  Object.freeze(fired.state.pendingBossShot);
  const moved = resolveEvent(Object.freeze(fired.state), { type: 'move', atMs: 1999, lane: 'top' });
  const impact = resolveEvent(moved.state, { type: 'advance-time', atMs: 2000 });
  assert.equal(impact.state.playerHp, 100);
  assert.equal(impact.state.pendingBossShot, null);
  assert.ok(impact.events.some((event) => event.type === 'boss-shot-dodged' && event.atMs === 2000));
  assert.equal(fired.state.playerLane, 'middle');
  assert.notEqual(fired.state.pendingBossShot, null);
});

test('moving exactly at impact is too late and each landed boss shot reduces HP', () => {
  const fired = resolveEvent(createBattle(), { type: 'boss-fire', atMs: 1000, lane: 'middle', impactAtMs: 2000 });
  const late = resolveEvent(fired.state, { type: 'move', atMs: 2000, lane: 'top' });
  assert.equal(late.state.playerHp, 90);
  assert.equal(late.state.playerLane, 'top');
  const damageIndex = late.events.findIndex((event) => event.type === 'player-damaged');
  const moveIndex = late.events.findIndex((event) => event.type === 'player-moved');
  assert.ok(damageIndex >= 0 && moveIndex > damageIndex);
  const nextShot = resolveEvent(late.state, { type: 'boss-fire', atMs: 2500, lane: 'top', impactAtMs: 3500 });
  const second = resolveEvent(nextShot.state, { type: 'advance-time', atMs: 3500 });
  assert.equal(second.state.playerHp, 80);
});

test('scheduled expiration and impact stay chronological when time jumps', () => {
  const applied = resolveEvent(createBattle(), { type: 'apply-shield-corrosion', atMs: 1000 });
  const fired = resolveEvent(applied.state, { type: 'boss-fire', atMs: 1500, lane: 'middle', impactAtMs: 3000 });
  const later = resolveEvent(fired.state, { type: 'advance-time', atMs: 6000 });
  assert.deepEqual(later.events.map((event) => [event.type, event.atMs]), [
    ['player-damaged', 3000], ['shield-corrosion-expired', 4000],
  ]);
  assert.equal(later.state.playerHp, 90);
  assert.equal(later.state.timeMs, 6000);
});

test('lethal boss damage stops at impact time before later effects or actions', () => {
  const applied = resolveEvent(createBattle({ playerHp: 5 }), { type: 'apply-shield-corrosion', atMs: 1000 });
  const fired = resolveEvent(applied.state, { type: 'boss-fire', atMs: 1500, lane: 'middle', impactAtMs: 2000 });
  const lethal = resolveEvent(fired.state, { type: 'hit', atMs: 5000, weapon: 'vx-5' });
  assert.equal(lethal.state.playerHp, 0);
  assert.equal(lethal.state.bossHp, 500);
  assert.equal(lethal.state.timeMs, 2000);
  assert.equal(lethal.state.result, 'player-defeated');
  assert.deepEqual(lethal.events.map((event) => event.type), ['player-damaged', 'player-defeated']);
  assert.throws(() => resolveEvent(lethal.state, { type: 'move', atMs: 5000, lane: 'top' }), /finished/);
});

test('boss shots require a future impact and only one can be pending', () => {
  assert.throws(() => resolveEvent(createBattle(),
    { type: 'boss-fire', atMs: 1000, lane: 'top', impactAtMs: 1000 }), /after firing/);
  const fired = resolveEvent(createBattle(), { type: 'boss-fire', atMs: 1000, lane: 'top', impactAtMs: 2000 });
  assert.throws(() => resolveEvent(fired.state,
    { type: 'boss-fire', atMs: 1500, lane: 'middle', impactAtMs: 2500 }), /one boss shot/);
});

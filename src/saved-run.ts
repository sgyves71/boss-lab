import { actInPractice, createPractice, MAX_PRACTICE_TIME_MS, type PlayerAction, type PracticeSession } from './practice.ts';
import { isMainWeapon } from './combat.ts';

export const RULES_VERSION = 'shooter-demo-v1';
export const SAVED_RUN_KEY = 'boss-lab.saved-run.v1';
const MAX_DECISIONS = 2000;

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a replay object');
  }
  return value as Record<string, unknown>;
}

function decision(value: unknown): PlayerAction {
  const input = record(value);
  if (!Number.isSafeInteger(input.atMs) || (input.atMs as number) < 0
    || (input.atMs as number) > MAX_PRACTICE_TIME_MS) {
    throw new Error('Saved action time must be between 0 and 120 seconds');
  }
  const atMs = input.atMs as number;
  switch (input.type) {
    case 'apply-shield-corrosion': return { type: input.type, atMs };
    case 'advance-time': return { type: input.type, atMs };
    case 'move':
      if (input.lane === 'top' || input.lane === 'middle' || input.lane === 'bottom') {
        return { type: input.type, atMs, lane: input.lane };
      }
      break;
    case 'hit':
      if (isMainWeapon(input.weapon) || input.weapon === 'vx-5') {
        return { type: input.type, atMs, weapon: input.weapon };
      }
      break;
  }
  throw new Error('Saved replay contains an unsupported player action');
}

/** Store inputs and version metadata, never trust stored HP or computed event logs. */
export function serializeRun(session: PracticeSession): string {
  const initial = session.initialState;
  const serialized = JSON.stringify({
    formatVersion: 1,
    rulesVersion: RULES_VERSION,
    scenarioId: 'practice',
    initial: {
      playerHp: initial.playerHp, bossHp: initial.bossHp, bossShotDamage: initial.bossShotDamage,
      mainWeapon: initial.mainWeapon, vx5Equipped: initial.vx5Equipped,
    },
    decisions: session.decisions,
  });
  // Apply the same validation on save and load so a successful save is always readable.
  deserializeRun(serialized);
  return serialized;
}

export function deserializeRun(serialized: string): PracticeSession {
  if (serialized.length > 500_000) throw new Error('Saved replay is too large');
  let parsed: unknown;
  try { parsed = JSON.parse(serialized); } catch { throw new Error('Saved replay is not valid JSON'); }
  const saved = record(parsed);
  if (saved.formatVersion !== 1 || saved.rulesVersion !== RULES_VERSION || saved.scenarioId !== 'practice') {
    throw new Error('Saved replay uses an unsupported format, scenario, or rules version');
  }
  const initial = record(saved.initial);
  if (!isMainWeapon(initial.mainWeapon)
    || typeof initial.vx5Equipped !== 'boolean'
    || !Number.isSafeInteger(initial.playerHp) || !Number.isSafeInteger(initial.bossHp)
    || !Number.isSafeInteger(initial.bossShotDamage)) {
    throw new Error('Saved replay has invalid starting equipment or HP');
  }
  if (!Array.isArray(saved.decisions) || saved.decisions.length > MAX_DECISIONS) {
    throw new Error('Saved replay must contain at most 2000 decisions');
  }
  let session = createPractice({
    mainWeapon: initial.mainWeapon, vx5Equipped: initial.vx5Equipped,
    playerHp: initial.playerHp as number, bossHp: initial.bossHp as number,
    bossShotDamage: initial.bossShotDamage as number,
  });
  for (const input of saved.decisions) session = actInPractice(session, decision(input));
  return session;
}

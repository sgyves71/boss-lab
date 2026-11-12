export const MAIN_WEAPONS = {
  'wide-shot': { damagePerHit: 8 },
  laser: { damagePerHit: 14 },
} as const;

export type MainWeapon = keyof typeof MAIN_WEAPONS;
export function isMainWeapon(value: unknown): value is MainWeapon {
  return typeof value === 'string' && Object.hasOwn(MAIN_WEAPONS, value);
}
export type Weapon = MainWeapon | 'vx-5';
export const VX5_DAMAGE_PER_HIT = 35;
export const SHIELD_CORROSION_DURATION_MS = 3000;
export type ShieldCorrosion = Readonly<{ startedAtMs: number; durationMs: number }>;
export type Lane = 'top' | 'middle' | 'bottom';
export type BossShot = Readonly<{ lane: Lane; impactAtMs: number; damage: number }>;

export type BattleState = Readonly<{
  timeMs: number;
  bossHp: number;
  playerHp: number;
  playerLane: Lane;
  bossShotDamage: number;
  pendingBossShot: BossShot | null;
  mainWeapon: MainWeapon;
  vx5Equipped: boolean;
  shieldCorrosion: ShieldCorrosion | null;
  result: 'ongoing' | 'boss-defeated' | 'player-defeated';
}>;

export function createBattle(options: Partial<Pick<BattleState,
  'playerHp' | 'bossHp' | 'bossShotDamage' | 'mainWeapon' | 'vx5Equipped'
>> = {}): BattleState {
  const state: BattleState = {
    timeMs: 0, playerHp: 100, bossHp: 500, bossShotDamage: 10,
    playerLane: 'middle', pendingBossShot: null,
    mainWeapon: 'wide-shot', vx5Equipped: true,
    shieldCorrosion: null, result: 'ongoing', ...options,
  };
  for (const value of [state.playerHp, state.bossHp, state.bossShotDamage]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error('Starting HP and boss shot damage must be positive integers');
    }
  }
  return state;
}

/** A hit means one projectile has already landed; flight is outside this model. */
export type BattleAction =
  | Readonly<{ type: 'apply-shield-corrosion'; atMs: number }>
  | Readonly<{ type: 'hit'; atMs: number; weapon: Weapon }>
  | Readonly<{ type: 'move'; atMs: number; lane: Lane }>
  | Readonly<{ type: 'boss-fire'; atMs: number; lane: Lane; impactAtMs: number }>
  | Readonly<{ type: 'advance-time'; atMs: number }>;

export type CombatEvent =
  | Readonly<{ type: 'shield-corrosion-applied'; atMs: number; durationMs: number }>
  | Readonly<{ type: 'shield-corrosion-expired'; atMs: number }>
  | Readonly<{ type: 'damage'; atMs: number; weapon: Weapon; amount: number }>
  | Readonly<{ type: 'player-moved'; atMs: number; lane: Lane }>
  | Readonly<{ type: 'boss-shot-fired'; atMs: number; lane: Lane; impactAtMs: number }>
  | Readonly<{ type: 'boss-shot-dodged'; atMs: number; lane: Lane }>
  | Readonly<{ type: 'player-damaged'; atMs: number; amount: number }>
  | Readonly<{ type: 'player-defeated'; atMs: number }>
  | Readonly<{ type: 'boss-defeated'; atMs: number }>;

export type EventFrame = Readonly<{ state: BattleState; event: CombatEvent }>;
export type Resolution = Readonly<{
  state: BattleState;
  events: readonly CombatEvent[];
  frames: readonly EventFrame[];
}>;

/** Advance the shared battle timeline without reading a clock or mutating input. */
export function resolveEvent(state: BattleState, action: BattleAction): Resolution {
  if (state.result !== 'ongoing') throw new Error('The battle has already finished');
  if (!Number.isSafeInteger(action.atMs) || action.atMs < 0 || action.atMs < state.timeMs) {
    throw new Error('Time must be a nonnegative integer in milliseconds and cannot move backwards');
  }
  if (action.type === 'hit') {
    const equipped = action.weapon === 'vx-5'
      ? state.vx5Equipped : action.weapon === state.mainWeapon;
    if (!equipped) throw new Error('The hit weapon is not equipped');
  }
  if (action.type === 'boss-fire'
    && (!Number.isSafeInteger(action.impactAtMs) || action.impactAtMs <= action.atMs)) {
    throw new Error('Boss shot impact must be an integer timestamp after firing');
  }

  const next = { ...state, timeMs: action.atMs };
  const events: CombatEvent[] = [];
  const frames: EventFrame[] = [];
  function emit(event: CombatEvent): void {
    events.push(event);
    frames.push({ event, state: { ...next, timeMs: event.atMs } });
  }

  // Process scheduled effects chronologically before the submitted action.
  while (true) {
    const expiresAtMs = next.shieldCorrosion === null ? Infinity
      : next.shieldCorrosion.startedAtMs + next.shieldCorrosion.durationMs;
    const impactAtMs = next.pendingBossShot?.impactAtMs ?? Infinity;
    const dueAtMs = Math.min(expiresAtMs, impactAtMs);
    if (dueAtMs > action.atMs) break;
    if (expiresAtMs <= impactAtMs) {
      next.shieldCorrosion = null;
      emit({ type: 'shield-corrosion-expired', atMs: expiresAtMs });
    } else {
      const shot = next.pendingBossShot!;
      next.pendingBossShot = null;
      if (shot.lane !== next.playerLane) {
        emit({ type: 'boss-shot-dodged', atMs: impactAtMs, lane: shot.lane });
      } else {
        next.playerHp = Math.max(0, next.playerHp - shot.damage);
        emit({ type: 'player-damaged', atMs: impactAtMs, amount: shot.damage });
        if (next.playerHp === 0) {
          next.result = 'player-defeated';
          next.timeMs = impactAtMs;
          emit({ type: 'player-defeated', atMs: impactAtMs });
          return { state: next, events, frames };
        }
      }
    }
  }

  switch (action.type) {
    case 'move':
      next.playerLane = action.lane;
      emit({ type: 'player-moved', atMs: action.atMs, lane: action.lane });
      break;
    case 'boss-fire':
      if (next.pendingBossShot !== null) {
        throw new Error('Only one boss shot can be in flight in this prototype');
      }
      next.pendingBossShot = {
        lane: action.lane, impactAtMs: action.impactAtMs, damage: next.bossShotDamage,
      };
      emit({ type: 'boss-shot-fired', atMs: action.atMs,
        lane: action.lane, impactAtMs: action.impactAtMs });
      break;
    case 'apply-shield-corrosion':
      if (next.shieldCorrosion !== null) {
        throw new Error('Shield Corrosion refresh and stacking are not supported in this prototype');
      }
      next.shieldCorrosion = { startedAtMs: action.atMs, durationMs: SHIELD_CORROSION_DURATION_MS };
      emit({ type: 'shield-corrosion-applied', atMs: action.atMs, durationMs: SHIELD_CORROSION_DURATION_MS });
      break;
    case 'hit': {
      const amount = action.weapon === 'vx-5'
        ? VX5_DAMAGE_PER_HIT * (next.shieldCorrosion === null ? 1 : 2)
        : MAIN_WEAPONS[action.weapon].damagePerHit;
      next.bossHp = Math.max(0, next.bossHp - amount);
      emit({ type: 'damage', atMs: action.atMs, weapon: action.weapon, amount });
      if (next.bossHp === 0) {
        next.result = 'boss-defeated';
        emit({ type: 'boss-defeated', atMs: action.atMs });
      }
      break;
    }
    case 'advance-time':
      break;
  }
  return { state: next, events, frames };
}

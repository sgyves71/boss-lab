export type Move = 'strike' | 'guard' | 'ember-mark';

export type BattleState = Readonly<{
  /** The turn to resolve on the next call. */
  turn: number;
  playerHp: number;
  veyraHp: number;
  /** null means Storm Ward is no longer active. */
  stormWardExpiresOnTurn: number | null;
  emberMarkTicksRemaining: number;
  telegraphedAttackDamage: number;
  result: 'ongoing' | 'player-won' | 'veyra-won';
}>;

export type CombatEvent =
  | Readonly<{ type: 'storm-ward-expired'; turn: number }>
  | Readonly<{
      type: 'damage' | 'damage-blocked';
      turn: number;
      source: 'strike' | 'ember-mark' | 'veyra-attack';
      target: 'player' | 'veyra';
      amount: number;
    }>
  | Readonly<{
      type: 'fight-ended';
      turn: number;
      result: 'player-won' | 'veyra-won';
    }>;

export type TurnResolution = Readonly<{
  state: BattleState;
  events: readonly CombatEvent[];
}>;

/** Resolve one complete turn without mutating the input; events are chronological. */
export function resolveTurn(state: BattleState, move: Move): TurnResolution {
  if (state.result !== 'ongoing') {
    throw new Error('A finished fight accepts no further moves');
  }

  const next = { ...state };
  const events: CombatEvent[] = [];

  function damage(
    source: 'strike' | 'ember-mark' | 'veyra-attack',
    target: 'player' | 'veyra',
    amount: number,
  ): void {
    if (target === 'veyra' && next.stormWardExpiresOnTurn !== null) {
      events.push({ type: 'damage-blocked', turn: state.turn, source, target, amount });
      return;
    }

    if (target === 'player') {
      next.playerHp = Math.max(0, next.playerHp - amount);
    } else {
      next.veyraHp = Math.max(0, next.veyraHp - amount);
    }
    events.push({ type: 'damage', turn: state.turn, source, target, amount });

    if (next.playerHp === 0 || next.veyraHp === 0) {
      const result = next.veyraHp === 0 ? 'player-won' : 'veyra-won';
      next.result = result;
      events.push({ type: 'fight-ended', turn: state.turn, result });
    }
  }

  function expireStormWard(): void {
    if (next.stormWardExpiresOnTurn === state.turn) {
      next.stormWardExpiresOnTurn = null;
      events.push({ type: 'storm-ward-expired', turn: state.turn });
    }
  }

  function tickEmberMark(): void {
    if (next.emberMarkTicksRemaining > 0) {
      next.emberMarkTicksRemaining -= 1;
      damage('ember-mark', 'veyra', 2);
    }
  }

  expireStormWard();
  tickEmberMark();
  if (next.result !== 'ongoing') return { state: next, events };

  switch (move) {
    case 'strike':
      damage('strike', 'veyra', 5);
      break;
    case 'ember-mark':
      next.emberMarkTicksRemaining = 2;
      break;
    case 'guard':
      break;
  }
  if (next.result !== 'ongoing') return { state: next, events };

  const attackDamage = Math.max(0, next.telegraphedAttackDamage - (move === 'guard' ? 3 : 0));
  damage('veyra-attack', 'player', attackDamage);
  if (next.result === 'ongoing') next.turn += 1;

  return { state: next, events };
}

import { resolveEvent, type BattleAction, type BattleState, type EventFrame } from './combat.ts';

/** Snapshots come from the engine so the viewer never recalculates damage or timing. */
export function replayBattle(initialState: BattleState, actions: readonly BattleAction[]) {
  let state = initialState;
  const frames: EventFrame[] = [];
  for (const action of actions) {
    const resolution = resolveEvent(state, action);
    frames.push(...resolution.frames);
    state = resolution.state;
  }
  return { initialState, frames, finalState: state } as const;
}

import { createBattle, resolveEvent, type BattleAction, type BattleState, type EventFrame } from './combat.ts';
import { TRAINING_ACTIONS } from './scenario.ts';

export type PlayerAction = Exclude<BattleAction, { type: 'boss-fire' }>;
const BOSS_ACTIONS = TRAINING_ACTIONS.filter(
  (action): action is Extract<BattleAction, { type: 'boss-fire' }> => action.type === 'boss-fire',
);

export type PracticeSession = Readonly<{
  initialState: BattleState;
  state: BattleState;
  actions: readonly BattleAction[];
  frames: readonly EventFrame[];
  nextBossAction: number;
}>;

export function createPractice(options: Parameters<typeof createBattle>[0] = {}): PracticeSession {
  const initialState = createBattle(options);
  return { initialState, state: initialState, actions: [], frames: [], nextBossAction: 0 };
}

/** Merge the fixed boss schedule with player decisions on the shared simulation clock. */
export function actInPractice(session: PracticeSession, action: PlayerAction): PracticeSession {
  if (session.state.result !== 'ongoing') throw new Error('The battle has already finished');
  if (!Number.isSafeInteger(action.atMs) || action.atMs < session.state.timeMs || action.atMs < 0) {
    throw new Error('Choose a time at or after the current time, in whole milliseconds');
  }
  let state = session.state;
  const actions = [...session.actions];
  const frames = [...session.frames];
  let nextBossAction = session.nextBossAction;
  function submit(input: BattleAction) {
    const resolution = resolveEvent(state, input);
    state = resolution.state;
    actions.push(input);
    frames.push(...resolution.frames);
  }
  while (nextBossAction < BOSS_ACTIONS.length) {
    const bossAction = BOSS_ACTIONS[nextBossAction]!;
    if (bossAction.atMs > action.atMs) break;
    submit(bossAction);
    nextBossAction += 1;
    if (state.result !== 'ongoing') break;
  }
  if (state.result === 'ongoing') submit(action);
  return { initialState: session.initialState, state, actions, frames, nextBossAction };
}

import { createBattle, resolveEvent, type BattleAction, type BattleState, type EventFrame, type Weapon } from './combat.ts';

export type PlayerAction = Exclude<BattleAction, { type: 'boss-fire' }>;
export const FIRING_INTERVAL_MS: Readonly<Record<Weapon, number>> = {
  'wide-shot': 250, laser: 500, 'vx-5': 1000,
};
export const MAX_PRACTICE_TIME_MS = 120_000;

function bossActionAt(index: number): Extract<BattleAction, { type: 'boss-fire' }> {
  const cycleStart = Math.floor(index / 3) * 6000;
  const position = index % 3;
  const offset = position === 0 ? 1500 : position === 1 ? 3000 : 4500;
  const lane = position === 0 ? 'middle' : position === 1 ? 'top' : 'bottom';
  const atMs = cycleStart + offset;
  return {
    type: 'boss-fire',
    atMs,
    impactAtMs: atMs + 1000,
    lane,
  };
}

export type PracticeSession = Readonly<{
  initialState: BattleState;
  state: BattleState;
  actions: readonly BattleAction[];
  decisions: readonly PlayerAction[];
  frames: readonly EventFrame[];
  nextBossAction: number;
  nextHitAtMs: Readonly<Record<Weapon, number>>;
}>;

export function createPractice(options: Parameters<typeof createBattle>[0] = {}): PracticeSession {
  const initialState = createBattle(options);
  return { initialState, state: initialState, actions: [], decisions: [], frames: [], nextBossAction: 0,
    nextHitAtMs: { 'wide-shot': 0, laser: 0, 'vx-5': 0 } };
}

export function nextBossWarning(session: PracticeSession) {
  return bossActionAt(session.nextBossAction);
}

/** Merge the fixed boss schedule with player decisions on the shared simulation clock. */
export function actInPractice(session: PracticeSession, action: PlayerAction): PracticeSession {
  if (session.state.result !== 'ongoing') throw new Error('The battle has already finished');
  if (!Number.isSafeInteger(action.atMs) || action.atMs < session.state.timeMs || action.atMs < 0
    || action.atMs > MAX_PRACTICE_TIME_MS) {
    throw new Error('Choose a time at or after the current time, in whole milliseconds, up to 120 seconds');
  }
  if (action.type === 'hit' && action.atMs < session.nextHitAtMs[action.weapon]) {
    throw new Error(`${action.weapon} is ready at ${(session.nextHitAtMs[action.weapon] / 1000).toFixed(3)}s`);
  }
  let state = session.state;
  const actions = [...session.actions];
  const frames = [...session.frames];
  let nextBossAction = session.nextBossAction;
  const nextHitAtMs = { ...session.nextHitAtMs };
  function submit(input: BattleAction) {
    const resolution = resolveEvent(state, input);
    state = resolution.state;
    actions.push(input);
    frames.push(...resolution.frames);
  }
  while (true) {
    const bossAction = bossActionAt(nextBossAction);
    if (bossAction.atMs > action.atMs) break;
    submit(bossAction);
    nextBossAction += 1;
    if (state.result !== 'ongoing') break;
  }
  if (state.result === 'ongoing') {
    const frameCount = frames.length;
    submit(action);
    if (action.type === 'hit' && frames.slice(frameCount).some((frame) => frame.event.type === 'damage')) {
      nextHitAtMs[action.weapon] = action.atMs + FIRING_INTERVAL_MS[action.weapon];
    }
  }
  return { initialState: session.initialState, state, actions,
    decisions: [...session.decisions, action], frames, nextBossAction, nextHitAtMs };
}

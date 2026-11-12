import { createBattle, type BattleAction } from './combat.ts';

export const createTrainingBattle = () => createBattle();
export const TRAINING_ACTIONS: readonly BattleAction[] = [
  { type: 'hit', atMs: 0, weapon: 'wide-shot' },
  { type: 'apply-shield-corrosion', atMs: 1000 },
  { type: 'boss-fire', atMs: 1500, lane: 'middle', impactAtMs: 2500 },
  { type: 'move', atMs: 2000, lane: 'top' },
  { type: 'advance-time', atMs: 2500 },
  { type: 'boss-fire', atMs: 3000, lane: 'top', impactAtMs: 4000 },
  { type: 'hit', atMs: 3999, weapon: 'vx-5' },
  { type: 'hit', atMs: 4000, weapon: 'vx-5' },
];

import { actInPractice, createPractice, type PlayerAction } from './practice.ts';

/** A complete, reproducible fight for a reviewer to inspect without learning the controls. */
export function createExampleVictory() {
  const decisions: readonly PlayerAction[] = [
    { type: 'hit', atMs: 0, weapon: 'vx-5' },
    { type: 'apply-shield-corrosion', atMs: 1000 },
    { type: 'hit', atMs: 1000, weapon: 'vx-5' },
    { type: 'hit', atMs: 2000, weapon: 'vx-5' },
    { type: 'hit', atMs: 3000, weapon: 'vx-5' },
    { type: 'move', atMs: 3500, lane: 'bottom' },
    { type: 'hit', atMs: 4000, weapon: 'vx-5' },
    { type: 'apply-shield-corrosion', atMs: 5000 },
    { type: 'hit', atMs: 5000, weapon: 'vx-5' },
    { type: 'hit', atMs: 6000, weapon: 'vx-5' },
    { type: 'hit', atMs: 7000, weapon: 'vx-5' },
    { type: 'hit', atMs: 7500, weapon: 'laser' },
  ];
  return decisions.reduce(actInPractice, createPractice({ mainWeapon: 'laser' }));
}

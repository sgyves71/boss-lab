import { deserializeRun, serializeRun, SAVED_RUN_KEY } from '../src/saved-run.ts';
import { type PracticeSession } from '../src/practice.ts';

export function saveLocalRun(session: PracticeSession): void {
  localStorage.setItem(SAVED_RUN_KEY, serializeRun(session));
}

export function loadLocalRun(): PracticeSession {
  const saved = localStorage.getItem(SAVED_RUN_KEY);
  if (saved === null) throw new Error('No saved run yet. Make a decision in Practice, then select Save run.');
  return deserializeRun(saved);
}

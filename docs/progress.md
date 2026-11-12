# Boss Lab progress

## Completed foundation

- Initial combat documentation committed as `28b344d`.
- Turn-based Veyra resolver, six engine tests, strict TypeScript checking, and VS Code setup committed as `9517d49`.
- Verified the original ordering regression by temporarily reversing Ward expiration and Ember Mark damage, observing the failure, then restoring the correct sequence.

## Current milestone: timed shooter damage

The learning example now follows the user's horizontal shooter concept:

- One equipped main weapon: Wide Shot (8 damage per hit) or Laser (14).
- Optional VX-5 homing side rockets: 35 damage per hit, doubled to 70 while the boss Shield Corrosion is active.
- Explicit shared simulation time in milliseconds; Shield Corrosion start and duration are stored in state.
- Three-second duration with an exclusive expiration boundary. Applied at 1,000 ms, the Shield Corrosion boosts a rocket at 3,999 ms but not one at 4,000 ms.
- Pure `resolveEvent(state, action)` returns a new state and chronological events. Hits represent confirmed landed projectiles.
- `npm run demo` prints a readable example without real-time waits.
- `npm run check` runs strict type-checking and the shooter engine tests.

Verification: the initial 11 shooter tests passed. Temporarily changing expiration from `>=` to `>` made the boundary regression fail with 360 boss HP instead of 395, proving the rocket incorrectly received doubled damage at expiration. The correct comparison was restored.

The original turn-based example is preserved in Git history. Shield Corrosion refresh/stacking rules remain undecided; active reapplication is explicitly unsupported for now.

## HP and lane-dodge simulation

- User selected provisional defaults: player 100 HP, boss 500 HP, boss projectile damage 10. `createBattle()` makes these configurable.
- User selected three vertical lanes. Boss attacks warn of a lane and future impact time; moving out before impact avoids damage. Movement exactly at impact is too late.
- Scheduled impact and corrosion expiration resolve chronologically, even when the caller jumps forward in time. Defeat stops the timeline immediately.
- One boss projectile may be pending at a time. Continuous movement, attack generation, and actual homing remain future work.
- `npm run check` passes strict type-checking and all 17 tests. The expanded terminal demo shows both a dodge and taking damage.

## Interactive replay

- Timed shooter damage and lane dodging committed as `2ee2afd`.
- Browser replay runs locally with `npm run dev`, using Vite and plain TypeScript.
- Shared training actions in `src/scenario.ts` drive both the terminal demo and browser replay.
- The engine emits individual event frames, letting the viewer show corrosion expiration, incoming damage, and rocket damage separately at 4 seconds. The replay runner uses engine snapshots rather than duplicating rules in the UI.
- The screen includes HP, three lanes, boss warnings, remaining corrosion time, explanations, ordered log, Next event, Previous event, and Restart controls.
- Verification: strict core/browser type-checking, 19 engine/replay tests, production build, and three Playwright browser checks pass. Desktop and narrow-screen screenshots were visually inspected. Playback remains scripted; ship control is a later milestone.

## Next milestones

1. Review the HP and dodge sequence, then choose further boss mechanics: vulnerability windows and meaningful choices about Shield Corrosion timing.
2. Replay runner and step-by-step view are complete; review the encounter in the browser before adding mechanics.
3. Build a small playable encounter, then add movement, collisions, and homing simulation in manageable steps.
4. Add replay persistence, browser journey coverage, and GitHub Actions when those layers exist. Keep one Cypress replay scenario for the migration comparison.

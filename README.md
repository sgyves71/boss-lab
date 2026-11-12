# Boss Lab

A horizontal shooter boss-combat prototype. Equip Wide Shot or Laser, add optional VX-5 homing rockets, and apply a timed Shield Corrosion that doubles rocket damage. The goal is to understand and replay combat down to the exact event where a rule goes wrong.

Start with the [combat rules](docs/combat-rules.md). The timing regression checks that rockets deal 70 damage just before Shield Corrosion expiration and 35 exactly at expiration. The original turn-based learning example remains in Git history at `9517d49`.

## Development

Use Node.js 24 (verified with 24.18.0, recorded in `.nvmrc`) and npm. From the project folder:

```sh
npm ci
npm run check
```

`npm run check` runs strict TypeScript checking followed by the engine tests. Use `npm test` to run only tests or `npm run typecheck` to check only types. Tests execute TypeScript directly with Node; no build step is needed.

Run `npm run demo` for a readable combat log: a Wide Shot hit, Shield Corrosion, a boss warning, a successful lane dodge, and a later boss hit. Rockets deal 70 just before corrosion expires and 35 at expiration. Time is simulated, so it finishes immediately.

`createBattle()` starts the player at 100 HP and the boss at 500 HP, with 10 damage per landed boss projectile. These provisional values and equipment are configurable. Move between top, middle, and bottom lanes before a warned shot arrives to dodge it. The current demo scripts those actions; it is not an interactive game yet.

In VS Code, select the workspace TypeScript version if prompted. Press Ctrl+Shift+B to check the project, or select **Debug combat tests** in Run and Debug to run tests with breakpoints. These use VS Code's built-in TypeScript and Node tooling; no additional extensions are required.

## Watch the replay

```sh
npm run dev
```

Open the local address printed in the terminal (normally `http://127.0.0.1:5173`). Use **Next event** to step through the encounter, the back arrow to revisit an event, and **Restart** to return to the starting state. The screen shows both HP bars, the player's lane, the targeted lane, Shield Corrosion's remaining duration, and a plain-language combat log. It is a scripted replay; you are controlling playback rather than piloting the ship.

The browser and terminal demo share `src/scenario.ts`. `src/replay.ts` runs the scenario through the engine and collects a state snapshot for each emitted event. In particular, expiration, incoming damage, and rocket damage at 4 seconds can be inspected individually. The interface does not calculate combat damage.

`npm run build` creates the browser app in `dist/`; `npm run preview` serves that build locally. The UI uses Vite and plain TypeScript, without a UI framework. Google Fonts are optional; local fallback fonts keep the app usable offline.

## Try your own decisions

Select **Practice** above the arena. Choose Wide Shot or Laser and optional VX-5 rockets before your first action. Enter an **Action time (seconds)**, then select a lane move, a confirmed weapon hit, Shield Corrosion, or **Advance to time**. The +0.25s and +1s buttons advance from the current clock. Typing alone does not change battle time.

Try applying Shield Corrosion at `1.000`, moving to the top lane at `2.000`, then landing rockets at `3.999` and `4.000`. The first boss shot misses; the second hits if you stay in the top lane. You can also move to the bottom lane before 4 seconds to dodge both.

Select **Replay my run** to inspect the recorded events. **Return to practice** resumes the same session; **New practice** starts fresh. Runs are held in memory and disappear on reload. This sandbox has two scheduled boss shots and no firing rate or action costs yet; it registers hits directly rather than simulating projectile flight.

## Browser checks

Install the test browser once:

```sh
npx playwright install chromium
npm run test:e2e
```

Playwright starts and stops a local server on port 4173. Tests cover the training replay, event ordering at expiration, back/restart, keyboard operation, practice decisions, replay/resume, equipment, victory controls, and narrow-screen layouts. Screenshots are written to the ignored `test-results/` folder. Run `npm run check`, `npm run build`, and `npm run test:e2e` before committing changes to the screen.

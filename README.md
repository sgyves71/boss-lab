# Boss Lab

A small TypeScript boss-fight demo about explaining and reproducing combat. Choose a weapon, dodge warned attacks, and time **Shield Corrosion** to double VX-5 rocket damage. Then replay each event to see why the outcome happened.

The project is intentionally a simulation with three lanes and confirmed projectile hits. It demonstrates deterministic rules, immutable state, versioned replay inputs, validation, and automated tests without requiring a full arcade engine.

## Run locally

Use Node.js 24 (verified with 24.18.0; see `.nvmrc`) and npm:

```sh
npm ci
npm run dev
```

Open the local address printed in the terminal, normally `http://127.0.0.1:5173`.

## A three-minute tour

1. **Training replay:** use Next event to see the timing boundary. Corrosion applied at 1 second boosts a rocket at 3.999 seconds; it expires before damage at 4 seconds. The log shows expiration, incoming damage, and rocket damage separately.
2. **Complete fight:** inspect a full victory with legal firing intervals and repeated boss attacks. Show outcome jumps to the final state: boss 0 HP, player 100 HP, at 7.5 seconds. Back and Restart let you inspect how it happened.
3. **Practice:** choose your loadout before the first action. Enter an action time, then move, apply corrosion, register a hit, or advance time. Typing alone does not advance the simulation. The +0.25s and +1s buttons advance from the current clock.
4. **Replay and save:** Replay my run inspects your decisions; Return to practice resumes the original session. Save run stores one practice run in this browser. Load saved run restores it after a reload. Export JSON and Import JSON let you keep or share a copy.

For a ready-made portable run, import [examples/victory.json](examples/victory.json). It reconstructs the same complete victory through the practice runner.

## Combat at a glance

Player starts at **100 HP**, boss at **500 HP**. Each landed boss shot deals **10 damage**. These values are configurable in the engine.

| Equipped attack | Damage per hit | Practice interval |
| --- | ---: | ---: |
| Wide Shot | 8 | 250 ms |
| Laser | 14 | 500 ms |
| VX-5 homing rocket | 35, or 70 with corrosion | 1,000 ms |

Equip one main weapon and optional VX-5 side rockets. Each weapon tracks its own next available hit time; hits exactly at that time are accepted. The first hit is available immediately.

The boss repeats a five-second cycle: warn the middle lane at +1.5s, impact at +2.5s; warn the top lane at +3s, impact at +4s. Move away before impact to dodge. Moving exactly at impact is too late. Bottom is a safe lane in this deliberately simple teaching pattern.

Shield Corrosion lasts three seconds, boosts rockets only, and is checked at impact. Applying it again while active is unsupported. Confirmed hits stand in for projectile flight; practice cadence limits those hit opportunities. The low-level training replay isolates damage and expiration rules without imposing firing cadence.

Practice accepts timestamps up to 120 seconds to bound schedule processing. It has no continuous movement, collision geometry, ammunition, or resource costs. More sophisticated boss behavior is outside this demo's scope.

## What to review in the code

- [Architecture and interview walkthrough](docs/architecture.md): action flow, boundaries, tradeoffs, and the timing regression.
- [Combat rules](docs/combat-rules.md): exact ordering, expiration, equipment, and defeat behavior.
- [Progress history](docs/progress.md): how the example developed from a turn-based regression into a shooter simulation.
- `src/combat.ts`: pure rule resolution, with no DOM, storage, or wall clock.
- `src/practice.ts`: repeating boss schedule, cadence, and recorded decisions.
- `src/saved-run.ts`: versioned input serialization and validation. Saved HP and event logs are never trusted; loading replays the decisions.
- `web/`: local UI, engine snapshots, and browser storage adapter.

Replays use format version 1 and rules version `shooter-demo-v1`. Unknown versions, invalid equipment, out-of-order times, illegal cadence, and malformed files are rejected before replacing the current session. Saves are limited to 2,000 decisions, 120 seconds of simulation, and a bounded JSON size. Browser-local persistence has no account or backend; export a file for portability across devices or origins.

## Verify

```sh
npx playwright install chromium
npm run verify
```

`npm run verify` checks strict TypeScript types, runs the engine/replay/persistence tests, builds the browser app, and runs Playwright journeys. For faster individual checks:

```sh
npm run check       # types + Node tests
npm run build       # production output in dist/
npm run test:e2e    # browser journeys
npm run demo        # short terminal timing example
```

Playwright starts and stops a local server on port 4173. Screenshots and failure traces are written to ignored `test-results/`. The GitHub Actions workflow runs the same layers on pushes and pull requests and keeps failure artifacts. It requires a GitHub remote and a pushed commit to execute; adding the workflow locally does not constitute a hosted CI run.

The UI uses Vite and plain TypeScript. `npm run preview` serves the production build. Google Fonts are optional; fallback fonts keep the app usable offline. In VS Code, choose the workspace TypeScript version if prompted; Ctrl+Shift+B runs quick checks and Debug combat tests supports engine breakpoints.

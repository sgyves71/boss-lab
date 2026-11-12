# How Boss Lab works

Boss Lab is a small combat simulation with a browser viewer. Its central question is: can we explain exactly why a hit dealt a particular amount of damage, and reproduce it later?

## Follow one action

1. The browser collects a player's decision and simulation timestamp.
2. The practice runner inserts boss warnings that are due before that decision.
3. `resolveEvent` processes scheduled expiration and impact, then the action. It returns a new battle state, ordered events, and a state snapshot after each event.
4. The browser renders those snapshots and a plain-language explanation. It does not calculate damage or determine whether a shot was dodged.
5. Replay feeds recorded actions through that same engine. The clock is an input, so tests can examine a three-second effect without waiting in real time.

## Where to look

| File | Responsibility |
| --- | --- |
| `src/combat.ts` | Equipment, damage, timed effects, impact order, and defeat |
| `src/practice.ts` | Boss schedule, player decisions, and run recording |
| `src/replay.ts` | Reproduce ordered events and snapshots from inputs |
| `src/saved-run.ts` | Versioned input format, validation, and reconstruction |
| `src/example-fight.ts` | Complete victory using the same practice rules |
| `src/scenario.ts` | Short guided timing example shared with the terminal demo |
| `web/main.ts` | Controls, state presentation, explanations, and playback |
| `web/run-storage.ts` | Browser-local save/load adapter |
| `src/*.test.ts` | Rule boundaries and reproducibility |
| `tests/browser/` | User journeys across the engine and browser interface |

There is no engine dependency on a DOM, database, network, or system clock. TypeScript configurations check the engine without browser APIs and the UI with browser APIs.

## Practice policy and persistence

The core resolver handles confirmed hits and their effects. Practice adds hit cadence and a repeating boss schedule. Keeping those policies separate lets the short training excerpt isolate damage ordering, including hits one millisecond apart, while the full encounter uses legal firing intervals. A production projectile system would check cadence at launch and submit collisions later; this demo deliberately does not model that flight time.

Main weapons and rockets have independent readiness timestamps. Practice accepts the next hit at `atMs >= readyAtMs`, and rejected decisions leave the session unchanged. Current rules generate a six-second pattern targeting middle, top, and bottom. A session carries its rules version so loaded v1 runs continue using their original five-second pattern.

Persistence stores the initial configuration and player decisions with `formatVersion`, `rulesVersion`, and `scenarioId`. Loading validates the envelope and action shapes, then recreates the session through practice. That regenerates warnings, cooldown readiness, state, and event snapshots rather than trusting stored outputs. The included victory JSON is tested against the live rules so an example cannot silently drift.

The codec accepts `shooter-demo-v1` and `shooter-demo-v2`. The rules version selects the boss schedule during reconstruction and stays attached to the session during continuation and saving. This preserves outcomes under the original rules. The save envelope remains format version 1, and the existing browser slot remains readable. Unknown versions are rejected. There is no randomness, so no seed is consumed yet. Browser storage is an adapter. Tests cover legacy continuation, JSON corruption, unavailable storage, reload, and export/import. Loading or importing a bad run leaves the current session intact.

The local UI saves one run per origin, not an authenticated replay library. The two-minute practice horizon, 2,000-decision save limit, and JSON size limit bound processing and file inputs. These are demonstration limits, not claims about a production persistence service.

## The regression worth discussing

Apply Shield Corrosion at 1,000 ms for 3,000 ms. Its active interval is `[1000, 4000)`. A VX-5 rocket at 3,999 ms deals 70 damage; a rocket at 4,000 ms deals 35.

Checking expiration with `>` instead of `>=` mistakenly boosts the second rocket. The regression asserts HP and the presence and relative order of expiration and damage events. It allows unrelated log entries to be added later. We temporarily introduced this comparison bug, observed the test fail, restored the comparison, and reran checks successfully.

The original learning exercise used Storm Ward and Ember Mark in a turn-based fight. That implementation remains in Git history at `9517d49`; the shooter keeps the same ordering lesson in a more engaging example.

## Intentional tradeoffs

- Confirmed hits stand in for collision detection and homing. This isolates combat rules from movement and rendering.
- Three lanes stand in for continuous ship coordinates. A warning and a timestamp make dodging deterministic.
- An immutable state and event snapshots favor clarity over memory efficiency. A larger replay system could store periodic checkpoints and reconstruct intermediate states.
- Equipment is fixed for a run. Projectile travel, mid-flight weapon switching, corrosion refresh, and simultaneous defeat would require additional explicit rules.
- There is no backend or account system. Browser-local persistence is sufficient to demonstrate the save/replay boundary without introducing unrelated infrastructure.
- Playwright covers browser journeys. A historical plan mentioned comparing one Cypress scenario; that migration comparison is deferred rather than installing a second browser runner for this small demo.

## A short interview walkthrough

1. Run the guided example and point out the three distinct events at 4 seconds.
2. Make a different decision in practice and replay the resulting run.
   Save and reload the run, or import `examples/victory.json` to show that inputs reconstruct the same outcome.
3. Open the expiration regression and explain the exact boundary bug it catches.
4. Follow the action from the UI through practice scheduling into the pure resolver.
5. Discuss what would change when adding real-time movement: the game loop would supply timestamps and hits, while the combat rules and replay remain testable independently.

The goal is a complete, explainable engineering example. A full arcade engine is a separate next step.

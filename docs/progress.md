# Boss Lab progress

## Current status: complete interview demo

The demo has a clear reviewer journey: a short timing lesson, a complete victory, player-controlled practice, and versioned saved replays. The engineering focus is deterministic simulation and explaining outcomes, rather than building a full arcade engine.

- Starting values: player 100 HP, boss 500 HP, boss projectile damage 10.
- User-approved practice cadence: Wide Shot 8 damage every 250 ms, Laser 14 every 500 ms, VX-5 35 every 1,000 ms.
- Shield Corrosion lasts 3 seconds and doubles VX-5 damage to 70 at impact. Expiration uses an exclusive end boundary.
- User-approved boss pattern now repeats every 6 seconds, with middle warning/impact at +1.5/+2.5s, top at +3/+4s, and bottom at +4.5/+5.5s. The implementation and tests were committed as `4574792`.
- Complete fight is a legal practice victory at 7.5 seconds, player HP 80 and boss HP 0. The v2 fixture is `examples/victory.json`. `examples/victory-v1.json` preserves the original 90 HP result under v1.
- Saved-run format version 1 supports both rule sets. New practice starts with `shooter-demo-v2`. Loading, resuming, and re-exporting a v1 run retain its original schedule and version.
- Practice records decisions and generated actions. Event snapshots support forward/back playback without duplicating rules in the UI.
- Save/load uses one browser-local slot; JSON export/import allows sharing. Rules version and input validation prevent incompatible or impossible runs from replacing the active session.
- README includes a short tour, run/check commands, limits, and source links. `docs/architecture.md` explains boundaries, persistence, tradeoffs, and an interview walkthrough.
- The public source repository is `https://github.com/sgyves71/boss-lab`. GitHub Actions runs types, Node tests, build, and Playwright on pushes and pull requests. The delivery milestone verifies the first hosted run before handoff.
- The public Site is linked through `.openai/hosting.json`. A five-minute walkthrough and iteration plan describe how the current app becomes a baseline for further development. The release milestone records deployment verification separately from CI.

## Verification

- `npm run verify` runs strict core/browser types, 31 Node tests, the production build, and 11 Playwright journeys, including legacy browser save restoration and continuation.
- Coverage includes expiration ordering, independent cadence boundaries, repeated attacks, victory and defeat, exact replay reproduction, save/load reconstruction, invalid files, unavailable storage, reload, import/export, and narrow-screen layout.
- Desktop and mobile layouts are visually inspected from browser-test screenshots.
- The expiration regression was verified by temporarily changing `>=` to `>`, observing the incorrect doubled hit at expiration, and restoring the correct comparison.

## Milestone history

- `28b344d`: initial documentation and two-turn Storm Ward / Ember Mark specification.
- `9517d49`: first deterministic turn resolver, six tests, strict TypeScript checking, and VS Code setup.
- `2ee2afd`: switch to timestamped shooter damage, named weapons, timed corrosion, and lane dodges.
- `e0ac68d`: event-by-event browser replay and shared training scenario.
- `49770d0`: player-controlled practice and recorded replay.
- Current milestone: cadence, repeated boss pattern, complete example, saved runs, reviewer documentation, and CI configuration.

## Deliberately outside this demo

Continuous movement, geometric collision detection, homing trajectories, ammunition, resource costs, advanced boss phases, corrosion refresh/stacking, backend accounts, and a replay library are not implemented. The original Cypress migration comparison remains a future comparison exercise; Playwright is the browser runner for this demo.

The next review should assess the shared example and its explanation before choosing deeper shooter development. Future changes follow the branch, test, CI, review, and publish loop in `docs/iteration-plan.md`.

# Boss Lab progress

## Current status: complete interview demo

The local demo now has a clear reviewer journey: a short timing lesson, a complete victory, player-controlled practice, and versioned saved replays. The engineering focus is deterministic simulation and explaining outcomes, rather than building a full arcade engine.

- Starting values: player 100 HP, boss 500 HP, boss projectile damage 10.
- User-approved practice cadence: Wide Shot 8 damage every 250 ms, Laser 14 every 500 ms, VX-5 35 every 1,000 ms.
- Shield Corrosion lasts 3 seconds and doubles VX-5 damage to 70 at impact. Expiration uses an exclusive end boundary.
- User-approved boss pattern repeats every 5 seconds: middle warning at +1.5s / impact +2.5s, top warning at +3s / impact +4s. Bottom remains a safe teaching lane.
- Complete fight is a legal practice victory at 7.5 seconds, player HP 100 and boss HP 0. A portable input fixture is included at `examples/victory.json`.
- Practice records decisions and generated actions. Event snapshots support forward/back playback without duplicating rules in the UI.
- Save/load uses one browser-local slot; JSON export/import allows sharing. Rules version and input validation prevent incompatible or impossible runs from replacing the active session.
- README includes a short tour, run/check commands, limits, and source links. `docs/architecture.md` explains boundaries, persistence, tradeoffs, and an interview walkthrough.
- GitHub Actions is configured for types, Node tests, build, and Playwright on pushes and pull requests. No remote is configured yet; hosted execution has not been verified.

## Verification

- `npm run verify` is the full local check command: strict core/browser types, 30 Node tests, production build, and 10 Playwright journeys.
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

The next review should assess the finished example and its explanation before choosing deeper shooter development. Publishing or connecting a GitHub remote can be a separate step.

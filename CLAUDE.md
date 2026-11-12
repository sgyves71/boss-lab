# Working on Boss Lab

Boss Lab is a TypeScript horizontal shooter boss-combat prototype designed around reproducible replays. The current milestone models timestamped hits, equipped Wide Shot or Laser, optional VX-5 homing rockets, and a three-second rocket damage Shield Corrosion. The original turn-based Veyra example is preserved in Git history at `9517d49`.

- Read `docs/combat-rules.md` before proposing changes to combat behavior. Identify ambiguous rules and ask for a decision before implementing them.
- Keep combat resolution independent of the UI, API, database, and wall clock. Pass simulation timestamps explicitly. Make randomness explicit and seedable when adding it.
- Keep combat events ordered so replay comparisons can detect a change in behavior.
- Use engine tests for combat rules, API tests for replay persistence and validation, and Playwright for browser journeys. Keep one Cypress replay scenario for the migration comparison.
- For a bug fix, identify the applicable rule and show that the regression test fails with the bug and passes with the fix.
- Report which checks ran and their results.

## Verification

- `npm test` runs the combat regression with Node.js 24 or newer using native TypeScript execution and the built-in test runner. Native execution strips types; it does not type-check them.
- `npm run typecheck` checks source and tests with strict TypeScript settings without emitting JavaScript.
- `npm run check` runs type-checking followed by all engine tests. Run it before committing.
- `npm run demo` prints the timed shooter sequence, lane warnings and dodges, and both fighters' HP without waiting in real time.
- `npm run dev` starts the local replay screen. Browser presentation lives in `web/`, with its own DOM-aware TypeScript configuration; the core engine remains independent of browser APIs.
- Practice scheduling and action recording live in `src/practice.ts`; keep them independent of the UI and wall clock. Test recorded runs by replaying their actual inputs through the engine.
- `npm run build` builds the browser app. `npm run test:e2e` runs the Playwright journeys (install Chromium first with `npx playwright install chromium`). Run both for UI changes.
- `npm run verify` runs types, engine/persistence tests, production build, and Playwright. CI uses the same checks on Node 24. A local workflow file is not evidence of a hosted CI run.
- Saves contain versioned configuration and player decisions, never trusted HP or event output. Validate and reconstruct saves before replacing an active run.

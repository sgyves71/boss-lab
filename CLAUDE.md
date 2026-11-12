# Working on Boss Lab

Boss Lab is a TypeScript turn-based combat game designed around reproducible replays. The first fight is against Veyra the Storm Dragon. Implement Storm Ward and Ember Mark in the first milestone. Build Stormbreak in the next milestone.

- Read `docs/combat-rules.md` before proposing changes to combat behavior. Identify ambiguous rules and ask for a decision before implementing them.
- Keep turn resolution independent of the UI, API, database, and clock. Make randomness explicit and seedable when adding it.
- Keep combat events ordered so replay comparisons can detect a change in behavior.
- Use engine tests for combat rules, API tests for replay persistence and validation, and Playwright for browser journeys. Keep one Cypress replay scenario for the migration comparison.
- For a bug fix, identify the applicable rule and show that the regression test fails with the bug and passes with the fix.
- Report which checks ran and their results. Add the actual verification commands here once the TypeScript project is configured.

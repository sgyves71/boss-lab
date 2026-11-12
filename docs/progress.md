# Boss Lab progress

## Day 1 · Review the combat spec

The first milestone is a playable, reproducible fight against Veyra the Storm Dragon. The README, combat rules, and Claude Code instructions are drafted. The engine and test suite are still to come.

Use Codex in VS Code for hands-on work and ChatGPT for milestone check-ins. Bring in Claude Code later.

### Next session in VS Code

1. Open the Boss Lab folder and review the changes in Source Control.
2. Read the [combat rules](combat-rules.md) and work through the first two turns by hand. Play Ember Mark on turn 1 and Guard on turn 2. Verify that Storm Ward expires before the Ember Mark tick. The player should finish turn 2 at 15 HP and Veyra at 16 HP.
3. In the VS Code Codex chat, ask Codex to read the combat rules, walk through the two turns independently, and flag any rule that could produce two different implementations. Compare its answer with yours and resolve any ambiguity in the spec.
4. Review the final diff and make the first commit. When GitHub is connected, push the commit.

## Upcoming milestones

### First engine test status

- The initial documentation commit is complete (`28b344d`).
- `src/combat.ts` defines the typed, UI-independent turn contract and first resolver. Each call runs start-of-turn effects, the move, and the attack, then advances if the fight continues.
- `npm test` runs the engine tests with Node.js 24 or newer. The original placeholder failed because the resolver was unimplemented; the implemented resolver passes.
- Temporarily resolving Ember Mark before Storm Ward expiration makes the two-turn regression fail: Veyra has 18 HP instead of 16. The correct order was restored and the regression passed again.
- Additional engine tests cover blocked ticks, reapplication, Strike, Guard duration, HP clamping, and immediate fight completion.
- Strict TypeScript checking is configured via `npm run typecheck`; `npm run check` runs it followed by all six engine tests. VS Code tasks, a test debugger configuration, and workspace TypeScript settings are included.

- **First engine test.** Implemented and verified, including the reversed-effect regression check described above.
- **Playable fight and replay.** Build the browser fight and replay flow. Add Playwright coverage and run the checks in GitHub Actions. Keep one Cypress replay spec for comparison.
- **Stormbreak.** After the first fight is playable and replayable, add Veyra's below-half-health phase. Honor her current telegraph and use the new attack pattern on the following turn.

# Growing the demo in reviewable steps

The current app is the baseline: a complete, explainable encounter, practice decisions, deterministic replay, and portable saved inputs. Preserve that baseline while expanding the project.

## The loop for each change

1. Describe a concrete player-visible behavior and its rule. Resolve ambiguous timing before implementation.
2. Write the smallest useful test for that behavior, including a boundary or regression that could fail for a real bug.
3. Implement the rule in the engine or practice runner. Keep presentation and persistence outside combat resolution.
4. Run `npm run verify` locally. For changed browser journeys, inspect desktop and narrow-screen behavior.
5. Push a focused branch and open a pull request. Explain the behavior, relevant tests, and any replay compatibility impact.
6. Wait for CI on the exact proposed commit and review the diff. Merge the change, then publish the tested source to the existing Site.
7. Verify the deployment result and update the walkthrough if the reviewer journey changed. Record the Git commit and Site version so the release can be identified later.

GitHub CI checks changes; it does not automatically publish the Site. Sites deployment currently uses the assistant's authenticated publishing workflow. No deployment credential belongs in repository files or screenshots.

## Suggested next iterations

| Iteration | Player-visible result | Evidence |
| --- | --- | --- |
| Broader boss pattern | Every lane becomes unsafe at a readable time | Warning, movement-boundary, and replay tests |
| Better practice controls | Submit the next legal shot without manually calculating its ready time | Cadence and keyboard/browser journeys |
| Vulnerability window | Timing corrosion around boss behavior changes the outcome | Explicit duration/order specification and focused engine tests |
| Continuous movement | Position changes smoothly while the same combat rules resolve hits | Separate movement/collision tests and replay input design |

Choose one next iteration rather than combining them into a large engine rewrite. A rules change must either increment the saved replay's rules version with a clear rejection/migration policy, or retain an older resolver. Existing saved runs should never silently acquire different results under the same version.

## What remains deliberately small

There is one browser-local save slot and no account service. Projectile hits are supplied, not detected geometrically. The boss pattern is predictable and unbalanced as an arcade challenge. These constraints make the engineering example understandable; they are explicit future choices, not hidden finished features.

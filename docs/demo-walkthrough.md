# Five-minute Boss Lab walkthrough

Use the published demo and source repository together. The app explains the behavior; the code and checks show why it is reproducible.

## 0:00 — State the problem

"This is a small combat simulation built to explain outcomes. I wanted to answer why a hit did a particular amount of damage, reproduce that result, and catch changes in the rules with focused tests."

The app has three lanes and confirmed hits. It deliberately leaves out projectile physics so the combat rules remain visible.

## 0:30 — Show a complete encounter

Select **Complete fight**, then step through to the first incoming hit at 2.5 seconds. The ship reacts and drops from 100 to 90 HP. Later it changes lane, avoids another shot, and wins at 7.5 seconds. **Show outcome** jumps to that final result.

"This example uses exactly the same practice runner as a player's decisions. It is not a separate animation with hard-coded HP."

## 1:30 — Explain one timing boundary

Switch to **Training replay**. Step to 3.999 seconds, where a rocket deals 70 damage. At 4 seconds, step through expiration, incoming damage, then a rocket dealing 35.

"Shield Corrosion is active in a half-open time interval. Expiration occurs before a hit exactly at the end. The regression checks both HP and relative event order, without fixing the entire log shape."

Open the first test in `src/combat.test.ts`. Explain how changing `>=` to `>` makes the boundary hit incorrectly deal double damage. The repository history records that mutation experiment and restoration.

## 2:30 — Make and reproduce a decision

Select **Practice**, set action time to `1.000`, and apply Shield Corrosion. Set time to `2.000` and choose **Top lane**. Set time to `3.000` and land a VX-5 hit. The first boss shot has missed. Staying top until 4 seconds would take damage; moving bottom at 3.5 seconds avoids it.

Select **Replay my run**. The recorded decisions reproduce the events. Return to practice, save the run, reload the page, and load it again. An exported JSON file contains versioned starting configuration and decisions, not trusted result data.

## 3:30 — Follow the architecture

Open `src/combat.ts`, `src/practice.ts`, and `src/saved-run.ts`.

"The engine takes explicit simulation time and returns new state plus ordered events. Practice adds cadence and the repeating boss schedule. Saving and loading reconstruct a run through those rules. Browser rendering and local storage are adapters around that core."

Show one cadence test and the save/load round-trip test. Explain why tests can cover several simulated seconds immediately: there is no wall-clock dependency.

## 4:30 — Show the delivery process

Open the latest successful GitHub Actions run and its tested commit. Show the small implementation commits in history, from the original turn-based example through the shooter, replay, practice, and saved-run milestones.

"A future change will be one rule or behavior at a time: state the intended outcome, add a meaningful regression, implement it, run the same checks in CI, review the diff, and publish a new version. A green CI run and a published demo are separate pieces of evidence."

Close with a deliberate tradeoff: the bottom lane is safe in this teaching pattern. A more interesting boss pattern is a good next iteration; real-time movement and collision simulation would be a later, separate milestone.

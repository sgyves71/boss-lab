# Boss Lab combat rules

## Starting state

- The player starts with 20 HP and Veyra starts with 18 HP.
- The first turn is turn 1. Storm Ward blocks damage to Veyra during turn 1 and expires at the start of turn 2.
- Veyra telegraphs a 4-damage attack before every turn in this scenario.

## Player moves

- **Strike** deals 5 damage to Veyra. Storm Ward blocks that damage while active.
- **Guard** reduces Veyra's attack by 3 on the current turn, to a minimum of zero.
- **Ember Mark** applies two future ticks of 2 damage each. The first tick happens at the start of the next turn. An active Storm Ward blocks a tick's damage, and the tick is spent either way. Reapplying Ember Mark resets the remaining ticks to two after the current turn's tick resolves.

## Turn order

1. Expire Storm Ward if this is its expiration turn.
2. Resolve a pending Ember Mark tick.
3. Resolve the player's move.
4. Resolve Veyra's telegraphed attack, applying Guard if chosen.
5. Advance to the next turn.

After each damage step, clamp HP to zero. If either fighter reaches zero, record the result and end the fight immediately. A finished fight accepts no further moves. Log Storm Ward expiration, damage, blocked damage, and the fight result in the order they occur.

## First regression scenario

| Turn | Player move | Expected outcome |
| --- | --- | --- |
| 1 | Ember Mark | The player drops to 16 HP. Veyra stays at 18 HP. |
| 2 | Guard | Storm Ward expires, then Ember Mark deals 2 damage. Veyra attacks for 1 damage. The player ends at 15 HP and Veyra at 16 HP. |

The turn-2 log must record Storm Ward expiration before Ember Mark damage. Reversing the steps blocks the tick and leaves Veyra at 18 HP.

## Replay contract

A replay records the scenario ID, rules version, seed, and ordered player moves. The same inputs under the same rules version must produce the same ordered combat events and final state. The first scenario uses a fixed attack. The seed becomes relevant when randomized behavior is added.

## Next milestone · Stormbreak

Veyra takes flight when her HP first drops below half and changes her attack pattern. If she crosses the threshold mid-turn, she still resolves the attack she already telegraphed, provided the fight continues. The new pattern applies to the next turn's telegraph. Attack values and patterns will be defined when this phase is built.

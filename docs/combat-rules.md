# Boss Lab combat rules

## Scope

A horizontal shooter boss encounter modeled as timestamped combat events, with a simple three-lane dodge simulation. Continuous movement, firing rate, geometric collision detection, homing trajectories, and weapon switching are future work. A player weapon hit input means one projectile actually landed; homing does not guarantee a hit.

## Starting state and boss attacks

- `createBattle()` starts at 0 ms with player HP 100, boss HP 500, and boss projectile damage 10. These are provisional balance values and can be configured, along with equipment. HP and damage must be positive integers.
- The player begins in the middle lane. Available lanes are top, middle, and bottom. A `move` action changes lane immediately; travel between lanes is not modeled yet.
- `boss-fire` names a target lane and a future impact timestamp, emitting a warning event. The caller supplies the attack schedule; the boss does not yet select attacks autonomously.
- Only one boss projectile can be pending in this prototype. Its lane, impact time, and damage are captured when fired.
- At impact, a player in the targeted lane takes the captured damage; otherwise emit a dodge event. Shield Corrosion never changes boss projectile damage.
- Scheduled effects resolve before the submitted action at that timestamp. Moving at 1,999 ms avoids an impact at 2,000 ms; moving at 2,000 ms is too late.
- Lane changes do not yet affect whether player projectiles hit the boss. Those hits are supplied explicitly.

## Equipment and damage

The player equips one main weapon and may also equip VX-5 side rockets.

| Weapon | Damage per landed projectile | With active Shield Corrosion |
| --- | ---: | ---: |
| Wide Shot | 8 | 8 |
| Laser | 14 | 14 |
| VX-5 homing rocket | 35 | 70 |

Each landed projectile is a separate hit, including multiple hits at the same timestamp. Only equipped weapons can register hits. Main weapon definitions live in `MAIN_WEAPONS` so more can be added without changing the resolution sequence.

## Shared simulation timeline

- Battle time starts at 0 and uses nonnegative integer milliseconds. The engine receives time explicitly and never reads the system clock or waits in real time.
- `resolveEvent(state, action)` returns a new state and ordered events. The returned state is passed into the next call.
- Actions are `apply-shield-corrosion`, `hit`, `move`, `boss-fire`, and `advance-time`, each carrying `atMs` on the same battle timeline. Time may stay the same or advance, but cannot move backwards.
- Actions with equal timestamps resolve in submitted order. Thus applying the Shield Corrosion and then landing a rocket at the same time boosts that hit; a hit submitted before application does not benefit.
- State is a snapshot after processing the action, including effects that expired on the way to that time.
- When jumping forward, resolve expiration and boss projectile impact chronologically at their scheduled timestamps. If they coincide, expire Shield Corrosion first. An impact at the submitted action time also resolves before that action.

## Shield Corrosion

Applying the Shield Corrosion stores its start time and a duration of 3,000 milliseconds. It is active in the interval `[startedAtMs, startedAtMs + durationMs)`. Only VX-5 damage is doubled, checked when the rocket hits rather than when it launches.

For a Shield Corrosion applied at 1,000 ms:

| Time | Action | Outcome |
| --- | --- | --- |
| 1,000 ms | Apply Shield Corrosion | Active through times before 4,000 ms |
| 3,999 ms | VX-5 hit | 70 damage |
| 4,000 ms | VX-5 hit | Shield Corrosion expires first, then 35 damage |

Before resolving an action, expire any Shield Corrosion whose end time has been reached. Record expiration at its scheduled time even if the next action jumps past that time. Emit expiration before damage and only once. `advance-time` lets the caller process expiration without a hit.

Refresh, stacking, resource costs, and cooldowns have not been designed. Applying another Shield Corrosion while one is active is explicitly unsupported in this prototype and raises an error; it is not a final gameplay rule. A new Shield Corrosion can be applied after expiration.

## Defeat and events

Clamp either fighter's HP to zero after damage. Emit damage, then the appropriate defeat event if HP reaches zero, and accept no more actions after defeat. Damage events contain calculated hit damage before HP clamping; they can exceed remaining HP.

If a scheduled boss shot defeats the player while advancing to a later action, stop at the impact timestamp. Do not process later effects or the requested action. For equal-time impacts, this means the player can be defeated before their submitted weapon hit; simultaneous draws are not modeled.

The event list describes only the current call. When collecting a full log, append each returned list in order. No UI, storage, or real-time scheduler is needed for resolution.

## Replay contract

The same starting state and ordered timestamped actions must produce identical states and events under the same rules version. A future saved replay will record the scenario, rules version, loadout, starting state, and actions. No randomness is used yet; future randomness must have an explicit seed.

## Previous learning example

The turn-based Storm Ward and Ember Mark rules and their regression tests are preserved in commit `9517d49`. The shooter expiration-boundary regression now carries forward the same lesson: expire an effect before resolving damage at its expiration time.

## Shooter design references

- [R-Type Final 2 Wave Cannon manual](https://rtypefinal2.com/ja/manual/p130.html): charging changes attack strength. Possible future lesson: choosing when to commit to an attack.
- [R-Type Final developer interview](https://shmuplations.com/rtypefinal/): Force positioning and readable clues support learning from failure. Our lane warning is an original simplified exercise in that principle.
- [DARIUSBURST official Burst guide](https://darius.jp/dbcs/characters/silver_hawk_2.html): beam placement, resource consumption, and timed counters connect offense and defense. Possible future direction: a boss attack that creates an opportunity for a well-timed counter.

These references guide design discussion; charge weapons, Force equipment, and Burst counters are not implemented here.

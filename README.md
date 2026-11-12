# Boss Lab

A horizontal shooter boss-combat prototype. Equip Wide Shot or Laser, add optional VX-5 homing rockets, and apply a timed Shield Corrosion that doubles rocket damage. The goal is to understand and replay combat down to the exact event where a rule goes wrong.

Start with the [combat rules](docs/combat-rules.md). The timing regression checks that rockets deal 70 damage just before Shield Corrosion expiration and 35 exactly at expiration. The original turn-based learning example remains in Git history at `9517d49`.

## Development

Use Node.js 24 (verified with 24.18.0, recorded in `.nvmrc`) and npm. From the project folder:

```sh
npm ci
npm run check
```

`npm run check` runs strict TypeScript checking followed by the engine tests. Use `npm test` to run only tests or `npm run typecheck` to check only types. Tests execute TypeScript directly with Node; no build step is needed.

Run `npm run demo` for a readable combat log: a Wide Shot hit, Shield Corrosion, a boss warning, a successful lane dodge, and a later boss hit. Rockets deal 70 just before corrosion expires and 35 at expiration. Time is simulated, so it finishes immediately.

`createBattle()` starts the player at 100 HP and the boss at 500 HP, with 10 damage per landed boss projectile. These provisional values and equipment are configurable. Move between top, middle, and bottom lanes before a warned shot arrives to dodge it. The current demo scripts those actions; it is not an interactive game yet.

In VS Code, select the workspace TypeScript version if prompted. Press Ctrl+Shift+B to check the project, or select **Debug combat tests** in Run and Debug to run tests with breakpoints. These use VS Code's built-in TypeScript and Node tooling; no additional extensions are required.

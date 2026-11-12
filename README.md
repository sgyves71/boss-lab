# Boss Lab

A turn-based boss fight against Veyra the Storm Dragon atop a ruined observatory. The goal is to save a fight and replay it turn by turn, down to the exact event where a combat rule goes wrong.

Start with the [combat rules](docs/combat-rules.md). The first regression test covers Storm Ward expiring before Ember Mark deals damage. Stormbreak is the next phase to build.

## Development

Use Node.js 24 (verified with 24.18.0, recorded in `.nvmrc`) and npm. From the project folder:

```sh
npm ci
npm run check
```

`npm run check` runs strict TypeScript checking followed by the six engine tests. Use `npm test` to run only tests or `npm run typecheck` to check only types. Tests execute TypeScript directly with Node; no build step is needed.

In VS Code, select the workspace TypeScript version if prompted. Press Ctrl+Shift+B to check the project, or select **Debug combat tests** in Run and Debug to run tests with breakpoints. These use VS Code's built-in TypeScript and Node tooling; no additional extensions are required.

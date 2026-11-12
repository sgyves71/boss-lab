import { createBattle, resolveEvent, type BattleAction } from './combat.ts';

let state = createBattle();
const actions: readonly BattleAction[] = [
  { type: 'hit', atMs: 0, weapon: 'wide-shot' },
  { type: 'apply-shield-corrosion', atMs: 1000 },
  { type: 'boss-fire', atMs: 1500, lane: 'middle', impactAtMs: 2500 },
  { type: 'move', atMs: 2000, lane: 'top' },
  { type: 'advance-time', atMs: 2500 },
  { type: 'boss-fire', atMs: 3000, lane: 'top', impactAtMs: 4000 },
  { type: 'hit', atMs: 3999, weapon: 'vx-5' },
  { type: 'hit', atMs: 4000, weapon: 'vx-5' },
];

console.log('Boss Lab: Wide Shot + VX-5. Player HP: 100, boss HP: 500.');
console.log('Times are simulated. Each hit is one projectile that landed.\n');
for (const action of actions) {
  const resolution = resolveEvent(state, action);
  state = resolution.state;
  for (const event of resolution.events) {
    const time = `${(event.atMs / 1000).toFixed(3)}s`;
    switch (event.type) {
      case 'boss-shot-fired':
        console.log(`${time}: WARNING: ${event.lane} lane shot arrives at ${event.impactAtMs / 1000}s.`);
        break;
      case 'player-moved':
        console.log(`${time}: Move to ${event.lane} lane.`);
        break;
      case 'boss-shot-dodged':
        console.log(`${time}: Dodged the ${event.lane} lane shot.`);
        break;
      case 'player-damaged':
        console.log(`${time}: Boss shot hits player for ${event.amount} damage.`);
        break;
      case 'player-defeated':
        console.log(`${time}: Player defeated.`);
        break;
      case 'shield-corrosion-applied':
        console.log(`${time}: Shield Corrosion applied for ${event.durationMs / 1000}s.`);
        break;
      case 'shield-corrosion-expired':
        console.log(`${time}: Shield Corrosion expired.`);
        break;
      case 'damage':
        console.log(`${time}: ${event.weapon} hit for ${event.amount} damage.`);
        break;
      case 'boss-defeated':
        console.log(`${time}: Boss defeated.`);
        break;
    }
  }
  console.log(`         Player HP: ${state.playerHp} | Boss HP: ${state.bossHp} | Lane: ${state.playerLane}\n`);
}

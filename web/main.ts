import './style.css';
import { type CombatEvent, type Lane } from '../src/combat.ts';
import { replayBattle } from '../src/replay.ts';
import { createTrainingBattle, TRAINING_ACTIONS } from '../src/scenario.ts';

const replay = replayBattle(createTrainingBattle(), TRAINING_ACTIONS);
let cursor = 0;
const app = document.querySelector<HTMLDivElement>('#app')!;

const playerShip = `<svg viewBox="0 0 130 70" aria-hidden="true"><path fill="#f5ab50" d="M5 30 33 24 26 6 64 21 96 27 124 35 96 43 64 49 26 64 33 46 5 40 20 35Z"/><path fill="#ede6d7" d="m35 27 38 2 25 6-25 6-38 2 18-8Z"/><path fill="#222f32" d="m59 30 22 5-22 5 8-5Z"/><path fill="#65dfc7" d="m4 31 13 4-13 4Z"/></svg>`;
const bossShip = `<svg viewBox="0 0 180 160" aria-hidden="true"><path fill="#435759" stroke="#8da29f" stroke-width="2" d="m92 10 39 18 30-8-7 34 18 26-18 26 7 34-30-8-39 18-28-28-28-3 14-25-26-14 26-14-14-25 28-3Z"/><path fill="#1a2729" stroke="#77958e" stroke-width="2" d="m109 35 29 20-13 25 13 25-29 20-27-23-18-22 18-22Z"/><path fill="#f5ab50" d="m80 63 19-7 15 24-15 24-19-7-11-17Z"/><path fill="#ffe8b6" d="m82 71 13-5 8 14-8 14-13-5-5-9Z"/><path stroke="#b1c3b9" stroke-width="3" d="m123 31 15 10m-15 88 15-10M51 54l17 8m-17 44 17-8"/></svg>`;

function describe(event: CombatEvent): { title: string; detail: string; kind: string } {
  switch (event.type) {
    case 'damage': {
      const weapon = event.weapon === 'vx-5' ? 'VX-5 rocket' : event.weapon === 'laser' ? 'Laser' : 'Wide Shot';
      return { title: `${weapon} hits for ${event.amount} damage`, kind: 'damage',
        detail: event.weapon === 'vx-5'
          ? event.amount === 70 ? 'Shield Corrosion is active at impact: 35 × 2 = 70 damage.'
            : 'Shield Corrosion has expired. This rocket deals its normal 35 damage.'
          : 'One projectile landed. Main weapon damage is unaffected by Shield Corrosion.' };
    }
    case 'shield-corrosion-applied':
      return { title: 'Shield Corrosion applied', kind: 'corrosion', detail: 'For the next 3 seconds, each VX-5 rocket that lands deals double damage. Main weapons are unchanged.' };
    case 'shield-corrosion-expired':
      return { title: 'Shield Corrosion expires', kind: 'corrosion', detail: 'The 3-second window ends now. Expiration resolves before hits at this exact timestamp.' };
    case 'boss-shot-fired':
      return { title: `Warning: ${event.lane} lane targeted`, kind: 'warning', detail: `The boss shot arrives at ${(event.impactAtMs / 1000).toFixed(3)}s. Move out of this lane before impact to avoid damage.` };
    case 'player-moved':
      return { title: `Move to the ${event.lane} lane`, kind: 'move', detail: 'The ship moves before the incoming shot arrives. Lane changes are instantaneous in this prototype.' };
    case 'boss-shot-dodged':
      return { title: 'Boss shot dodged', kind: 'move', detail: `The shot reaches the ${event.lane} lane, but the player has moved away. No HP lost.` };
    case 'player-damaged':
      return { title: `Player takes ${event.amount} damage`, kind: 'warning', detail: 'The ship is still in the targeted lane at impact. Shield Corrosion does not reduce incoming damage.' };
    case 'player-defeated':
      return { title: 'Player defeated', kind: 'warning', detail: 'Player HP reached zero. The battle stops immediately.' };
    case 'boss-defeated':
      return { title: 'Boss defeated', kind: 'damage', detail: 'Boss HP reached zero. The battle stops immediately.' };
  }
}

app.innerHTML = `
  <div class="shell">
    <header class="masthead"><a class="brand" href="/" aria-label="Boss Lab home"><span class="brand-mark">B<span>↗</span></span>BOSS LAB<span class="brand-slash">/</span><span class="brand-sub">COMBAT STUDIES</span></a><span class="local-label"><i></i> LOCAL PROTOTYPE</span></header>
    <main>
      <div class="page-heading"><div><p class="eyebrow">STUDY 001 <span> / </span> TIMING &amp; POSITION</p><h1>Every hit has a moment.</h1><p class="intro">Slow the encounter down. See what lands, what misses, and why.</p></div><span class="mode-tag">STEP-BY-STEP REPLAY</span></div>
      <div class="workspace">
        <section class="battle-panel" aria-label="Battle replay">
          <div class="panel-heading"><span><i class="live-dot"></i> TRAINING ENCOUNTER</span><span id="step-count"></span></div>
          <div class="health-row">
            <div class="health player-health"><div class="health-label"><span>PLAYER</span><strong id="player-hp" data-testid="player-hp"></strong></div><progress id="player-health" max="100" value="100" aria-label="Player health"></progress><small>WIDE SHOT <span>+</span> VX-5 ROCKETS</small></div>
            <div class="health boss-health"><div class="health-label"><span>BOSS</span><strong id="boss-hp" data-testid="boss-hp"></strong></div><progress id="boss-health" max="500" value="500" aria-label="Boss health"></progress><small>10 DAMAGE / LANDED SHOT</small></div>
          </div>
          <div class="arena" aria-label="Three-lane battlefield">
            <div class="stars"></div>
            ${(['top', 'middle', 'bottom'] as const).map((lane) => `<div class="lane" data-lane="${lane}"><span class="lane-label">${lane.toUpperCase()}</span><span class="lane-warning">TARGETED LANE</span></div>`).join('')}
            <div id="player-ship" class="player-ship" role="img">${playerShip}<span>YOU</span></div>
            <div class="boss-ship" role="img" aria-label="Boss spacecraft">${bossShip}<span>BOSS</span></div>
            <div id="hit-flash" class="hit-flash" aria-hidden="true"></div>
            <div class="arena-footer"><span>SIMULATION TIME <strong id="time" data-testid="time"></strong></span><span id="lane-status"></span></div>
          </div>
          <div class="effect-strip"><span id="effect-light" class="effect-light"></span><div><strong>Shield Corrosion</strong><p id="corrosion-description"></p></div><strong id="corrosion-time" data-testid="corrosion-time"></strong></div>
          <div class="transport"><button id="restart" class="quiet-button" type="button">↺ <span>Restart</span></button><div class="playback"><button id="previous" class="back-button" type="button" aria-label="Previous event">←</button><button id="next" class="primary-button" type="button">Next event <span>→</span></button></div></div>
          <p class="transport-note">Time advances when you step. Nothing moves while you read.</p>
        </section>
        <aside class="inspector" aria-label="Event details">
          <div class="panel-heading"><span>WHAT JUST HAPPENED</span><span id="event-time"></span></div>
          <section id="current-event" class="current-event" aria-live="polite" aria-atomic="true"><p id="event-category" class="eyebrow"></p><h2 id="event-title"></h2><p id="event-detail"></p></section>
          <section class="log-section"><div class="log-heading"><h2>Combat log</h2><span>IN RESOLUTION ORDER</span></div><ol id="combat-log" aria-label="Combat log"></ol></section>
        </aside>
      </div>
      <section class="lesson"><span class="lesson-label">THE RULE TO WATCH</span><p>A rocket at <strong>3.999s</strong> deals <strong class="mint">70 damage.</strong> At <strong>4.000s</strong>, corrosion expires first. The next rocket deals <strong class="amber">35.</strong></p><span class="lesson-index">01 / TIMING</span></section>
      <footer><span>A SMALL ENCOUNTER. ONE EVENT AT A TIME.</span><span>Scripted replay · Movement &amp; hits are predetermined</span></footer>
    </main>
  </div>`;

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
function text(id: string, value: string) { element(id).textContent = value; }
function render() {
  const frame = replay.frames[cursor - 1];
  const state = frame?.state ?? replay.initialState;
  const seconds = (state.timeMs / 1000).toFixed(3);
  const complete = cursor === replay.frames.length;
  text('step-count', `${String(cursor).padStart(2, '0')} / ${replay.frames.length} EVENTS`);
  text('player-hp', `${state.playerHp} / 100`);
  text('boss-hp', `${state.bossHp} / 500`);
  element<HTMLProgressElement>('player-health').value = state.playerHp;
  element<HTMLProgressElement>('boss-health').value = state.bossHp;
  text('time', `${seconds}s`);
  text('lane-status', `${state.playerLane.toUpperCase()} LANE`);
  const lanePositions: Record<Lane, string> = { top: '19%', middle: '45%', bottom: '71%' };
  element('player-ship').style.top = lanePositions[state.playerLane];
  element('player-ship').setAttribute('aria-label', `Player spacecraft in ${state.playerLane} lane`);
  document.querySelectorAll<HTMLElement>('.lane').forEach((lane) => {
    const targeted = lane.dataset.lane === state.pendingBossShot?.lane;
    lane.classList.toggle('targeted', targeted);
    lane.setAttribute('aria-label', `${lane.dataset.lane} lane${targeted ? ', targeted by boss' : ''}`);
  });
  const remainingMs = state.shieldCorrosion === null ? 0 : Math.max(0,
    state.shieldCorrosion.startedAtMs + state.shieldCorrosion.durationMs - state.timeMs);
  element('effect-light').classList.toggle('active', remainingMs > 0);
  text('corrosion-description', remainingMs > 0 ? 'VX-5 rocket damage doubled: 35 → 70' : 'Inactive · VX-5 rockets deal 35 damage');
  text('corrosion-time', remainingMs > 0 ? `${(remainingMs / 1000).toFixed(3)}s left` : 'INACTIVE');
  const info = frame ? describe(frame.event) : {
    title: 'Ready when you are.', kind: 'start',
    detail: 'Start with 100 player HP and 500 boss HP. Step through this short encounter to see how dodging and Shield Corrosion work.',
  };
  text('event-category', frame ? info.kind.toUpperCase() : 'BEFORE THE FIRST SHOT');
  text('event-title', info.title);
  text('event-detail', info.detail);
  text('event-time', frame ? `${seconds}s` : 'STANDBY');
  element('current-event').dataset.kind = info.kind;
  const log = element<HTMLOListElement>('combat-log');
  log.replaceChildren();
  if (cursor === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-log';
    empty.textContent = 'The combat log will appear here. Select Next event to begin.';
    log.append(empty);
  }
  replay.frames.slice(0, cursor).forEach((entry, index) => {
    const item = document.createElement('li');
    item.className = index === cursor - 1 ? 'log-item selected' : 'log-item';
    const time = document.createElement('time');
    time.textContent = `${(entry.event.atMs / 1000).toFixed(3)}s`;
    const message = document.createElement('span');
    message.textContent = describe(entry.event).title;
    item.append(time, message);
    log.append(item);
  });
  log.scrollTop = log.scrollHeight;
  element<HTMLButtonElement>('previous').disabled = cursor === 0;
  element<HTMLButtonElement>('restart').disabled = cursor === 0;
  const next = element<HTMLButtonElement>('next');
  next.disabled = complete;
  next.innerHTML = complete ? 'Replay complete <span>✓</span>' : 'Next event <span>→</span>';
  element('hit-flash').className = `hit-flash ${frame?.event.type === 'damage' ? 'visible' : ''}`;
}
element('next').addEventListener('click', () => { if (cursor < replay.frames.length) cursor += 1; render(); });
element('previous').addEventListener('click', () => { cursor = Math.max(0, cursor - 1); render(); });
element('restart').addEventListener('click', () => { cursor = 0; render(); });
render();

import './style.css';
import { type CombatEvent, type Lane, type MainWeapon } from '../src/combat.ts';
import { replayBattle } from '../src/replay.ts';
import { createTrainingBattle, TRAINING_ACTIONS } from '../src/scenario.ts';
import { actInPractice, createPractice, nextBossWarning, type PlayerAction } from '../src/practice.ts';
import { serializeRun, deserializeRun } from '../src/saved-run.ts';
import { loadLocalRun, saveLocalRun } from './run-storage.ts';
import { createExampleVictory } from '../src/example-fight.ts';

let replay = replayBattle(createTrainingBattle(), TRAINING_ACTIONS);
let cursor = 0;
let mode: 'training' | 'example' | 'practice' | 'recording' = 'training';
let practice = createPractice();
let practiceFeedback: string | null = null;
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
            : 'Shield Corrosion is not active at impact. This rocket deals its normal 35 damage.'
          : 'One projectile landed. Main weapon damage is unaffected by Shield Corrosion.' };
    }
    case 'shield-corrosion-applied':
      return { title: 'Shield Corrosion applied', kind: 'corrosion', detail: 'For the next 3 seconds, each VX-5 rocket that lands deals double damage. Main weapons are unchanged.' };
    case 'shield-corrosion-expired':
      return { title: 'Shield Corrosion expires', kind: 'corrosion', detail: 'The 3-second window ends now. Expiration resolves before hits at this exact timestamp.' };
    case 'boss-shot-fired':
      return { title: `Warning: ${event.lane} lane targeted`, kind: 'warning', detail: `The boss shot arrives at ${(event.impactAtMs / 1000).toFixed(3)}s. Move out of this lane before impact to avoid damage.` };
    case 'player-moved':
      return { title: `Move to the ${event.lane} lane`, kind: 'move', detail: 'The ship changes lane instantly. Moving before impact avoids a targeted shot; moving exactly at impact is too late.' };
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
      <div class="page-heading"><div><p class="eyebrow">STUDY 001 <span> / </span> TIMING &amp; POSITION</p><h1>Every hit has a moment.</h1><p class="intro">Slow the encounter down. See what lands, what misses, and why.</p></div><span id="mode-tag" class="mode-tag">STEP-BY-STEP REPLAY</span></div>
      <nav class="mode-switch" aria-label="Encounter mode"><button id="training-mode" type="button" aria-pressed="true">Training replay</button><button id="example-mode" type="button" aria-pressed="false">Complete fight</button><button id="practice-mode" type="button" aria-pressed="false">Practice</button><span>Learn the timing. Watch a victory. Try your own decisions.</span></nav>
      <section class="demo-guide" aria-label="How to use this demo"><strong>Defeat the boss. Understand every hit.</strong><p>Start with Training replay for the timing rule, or Complete fight for a full victory. Then try Practice, save your run, and replay your decisions.</p><details><summary>What this project demonstrates</summary><p>A deterministic TypeScript simulation: the same setup and timestamped decisions produce the same state and ordered events. The browser shows engine snapshots; combat does not depend on the UI or a real-time clock. Unit tests target timing boundaries, while browser tests cover the full journey. This is a combat rules demo with three lanes and confirmed hits, rather than a full arcade shooter.</p></details></section>
      <section class="save-strip" aria-label="Saved replay controls"><div class="save-buttons"><button id="save-run" type="button" class="action-button">Save run</button><button id="load-run" type="button" class="action-button">Load saved run</button><button id="export-run" type="button" class="text-button">Export JSON</button><button id="import-trigger" class="text-button" type="button">Import JSON</button><input id="import-run" type="file" accept=".json,application/json" hidden /></div><p id="save-status" role="status">Save or export your Practice run. One run can be saved in this browser; JSON lets you keep or share a copy.</p></section>
      <div class="workspace">
        <section class="battle-panel" aria-label="Battle replay">
          <div class="panel-heading"><span><i class="live-dot"></i> TRAINING ENCOUNTER</span><span id="step-count"></span></div>
          <div class="health-row">
            <div class="health player-health"><div class="health-label"><span>PLAYER</span><strong id="player-hp" data-testid="player-hp"></strong></div><progress id="player-health" max="100" value="100" aria-label="Player health"></progress><small id="loadout-label">WIDE SHOT + VX-5 ROCKETS</small></div>
            <div class="health boss-health"><div class="health-label"><span>BOSS</span><strong id="boss-hp" data-testid="boss-hp"></strong></div><progress id="boss-health" max="500" value="500" aria-label="Boss health"></progress><small id="boss-damage-label">10 DAMAGE / LANDED SHOT</small></div>
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
          <p id="battle-status" class="battle-status" role="status"></p>
          <section id="practice-controls" class="practice-controls" hidden aria-label="Practice controls">
            <div class="practice-heading"><strong>Your decisions</strong><button id="new-practice" type="button" class="text-button">New practice</button></div>
            <div class="loadout-controls"><label>Main weapon<select id="main-weapon" aria-label="Main weapon"><option value="wide-shot">Wide Shot · 8 / hit</option><option value="laser">Laser · 14 / hit</option></select></label><label class="checkbox-label"><input id="rockets-equipped" type="checkbox" checked /> Equip VX-5 rockets</label></div>
            <p class="practice-hint">Choose equipment before your first action. Every 5 seconds: middle impact at +2.500s, then top impact at +4.000s. Each has a 1-second warning.</p>
            <p id="pattern-status" class="practice-hint"></p>
            <div class="time-controls"><label for="action-time">Action time (seconds)<input id="action-time" type="number" min="0" step="0.001" value="0.000" /></label><button id="add-quarter" class="action-button" type="button">+0.25s</button><button id="add-second" class="action-button" type="button">+1s</button><button id="wait" class="action-button" type="button">Advance to time</button></div>
            <fieldset class="lane-controls"><legend>Move at this time</legend><button type="button" class="action-button" data-move="top">Top lane</button><button type="button" class="action-button" data-move="middle">Middle lane</button><button type="button" class="action-button" data-move="bottom">Bottom lane</button></fieldset>
            <div class="attack-controls"><button id="main-hit" type="button" class="action-button">Main weapon hit</button><button id="rocket-hit" type="button" class="action-button">VX-5 hit</button><button id="apply-corrosion" type="button" class="action-button">Apply Shield Corrosion</button></div>
            <p id="practice-error" class="practice-error" role="alert"></p>
            <p id="cadence-status" class="practice-hint"></p>
            <p class="practice-hint">Hit intervals: Wide Shot 0.25s · Laser 0.5s · VX-5 1s. Hits are confirmed landings; time changes only when you submit an action. Demo time range: 0–120s.</p>
            <button id="replay-run" class="primary-button" type="button">Replay my run <span>→</span></button>
          </section>
          <div id="replay-transport" class="transport"><button id="restart" class="quiet-button" type="button">↺ <span>Restart</span></button><div class="playback"><button id="previous" class="back-button" type="button" aria-label="Previous event">←</button><button id="next" class="primary-button" type="button">Next event <span>→</span></button></div></div>
          <p id="replay-hint" class="transport-note">Time advances when you step. Nothing moves while you read.</p><button id="show-outcome" class="resume-button" type="button" hidden>Show outcome</button>
          <button id="resume-practice" type="button" class="resume-button" hidden>Return to practice</button>
        </section>
        <aside class="inspector" aria-label="Event details">
          <div class="panel-heading"><span>WHAT JUST HAPPENED</span><span id="event-time"></span></div>
          <section id="current-event" class="current-event" aria-live="polite" aria-atomic="true"><p id="event-category" class="eyebrow"></p><h2 id="event-title"></h2><p id="event-detail"></p></section>
          <section class="log-section"><div class="log-heading"><h2>Combat log</h2><span>IN RESOLUTION ORDER</span></div><ol id="combat-log" aria-label="Combat log"></ol></section>
        </aside>
      </div>
      <section class="lesson"><span class="lesson-label">THE RULE TO WATCH</span><p>Apply corrosion at <strong>1.000s</strong>: a rocket at <strong>3.999s</strong> deals <strong class="mint">70 damage.</strong> At <strong>4.000s</strong>, corrosion expires first. The next rocket deals <strong class="amber">35.</strong></p><span class="lesson-index">01 / TIMING</span></section>
      <footer><span>A SMALL ENCOUNTER. ONE EVENT AT A TIME.</span><span id="mode-description">Scripted replay · Movement &amp; hits are predetermined</span></footer>
    </main>
  </div>`;

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
function text(id: string, value: string) { element(id).textContent = value; }
function render() {
  const inPractice = mode === 'practice';
  const frames = inPractice ? practice.frames : replay.frames;
  const visibleCount = inPractice ? frames.length : cursor;
  const frame = frames[visibleCount - 1];
  const state = inPractice ? practice.state : cursor === replay.frames.length && (cursor > 0 || mode === 'recording')
    ? replay.finalState : frame?.state ?? replay.initialState;
  const seconds = (state.timeMs / 1000).toFixed(3);
  const initial = inPractice ? practice.initialState : replay.initialState;
  const complete = cursor === replay.frames.length;
  text('step-count', inPractice ? `${frames.length} ${frames.length === 1 ? 'EVENT' : 'EVENTS'} RECORDED` : `${String(cursor).padStart(2, '0')} / ${replay.frames.length} EVENTS`);
  text('mode-tag', inPractice ? 'CHOOSE YOUR TIMING' : mode === 'recording' ? 'YOUR RUN / REPLAY' : mode === 'example' ? 'COMPLETE FIGHT / REPLAY' : 'STEP-BY-STEP REPLAY');
  element('training-mode').setAttribute('aria-pressed', String(mode === 'training'));
  element('practice-mode').setAttribute('aria-pressed', String(mode === 'practice' || mode === 'recording'));
  element('example-mode').setAttribute('aria-pressed', String(mode === 'example'));
  element('practice-controls').hidden = !inPractice;
  element('replay-transport').hidden = inPractice;
  element('replay-hint').hidden = inPractice;
  element('resume-practice').hidden = mode !== 'recording';
  element('show-outcome').hidden = (mode !== 'example' && mode !== 'recording') || complete;
  text('mode-description', inPractice ? 'Practice sandbox · Your actions are recorded in memory' : mode === 'recording'
    ? 'Your recorded decisions · Playback does not change your practice run' : mode === 'example' ? 'Complete example · Legal cadence, repeated attacks, and a victory' : 'Scripted replay · Movement & hits are predetermined');
  text('player-hp', `${state.playerHp} / ${initial.playerHp}`);
  text('boss-hp', `${state.bossHp} / ${initial.bossHp}`);
  text('boss-damage-label', `${state.bossShotDamage} DAMAGE / LANDED SHOT`);
  document.querySelector('.boss-ship')!.classList.toggle('defeated', state.bossHp === 0);
  element<HTMLProgressElement>('player-health').max = initial.playerHp;
  element<HTMLProgressElement>('boss-health').max = initial.bossHp;
  text('battle-status', state.result === 'boss-defeated' ? 'VICTORY — Boss defeated. Replay your run or start a new encounter.'
    : state.result === 'player-defeated' ? 'DEFEAT — Player HP reached zero. Review the warnings in your replay, then try again.'
      : mode === 'training' ? 'Guided timing excerpt — this short replay ends before the boss is defeated.'
        : mode === 'recording' ? 'Recorded practice run — step through your decisions.' : mode === 'example'
          ? 'Complete example — Laser and VX-5, timed corrosion, dodging, and victory at 7.500s.' : 'Objective: reduce boss HP to zero before yours runs out.');
  element('battle-status').dataset.result = state.result;
  element<HTMLButtonElement>('save-run').disabled = practice.decisions.length === 0;
  element<HTMLButtonElement>('export-run').disabled = practice.decisions.length === 0;
  text('loadout-label', `${state.mainWeapon === 'laser' ? 'LASER' : 'WIDE SHOT'}${state.vx5Equipped ? ' + VX-5 ROCKETS' : ''}`);
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
  const info = mode === 'recording' && frames.length === 0 ? { title: 'No combat events recorded', kind: 'time',
    detail: 'This run only advanced time. The clock shows the final timestamp; return to practice to make a decision.' }
    : inPractice && practiceFeedback ? { title: practiceFeedback, kind: 'time',
    detail: 'No combat event occurred during this time advance. The clock and effect timers still advance.' }
    : frame ? describe(frame.event) : {
    title: 'Ready when you are.', kind: 'start',
    detail: inPractice ? 'Choose a timestamp, then move, apply corrosion, or register a landed hit. Advance time to see boss warnings and impacts. Your decisions will be recorded.'
      : `Start with ${initial.playerHp} player HP and ${initial.bossHp} boss HP. Step through the encounter to see how dodging and Shield Corrosion work.`,
  };
  text('event-category', frame ? info.kind.toUpperCase() : 'BEFORE THE FIRST SHOT');
  text('event-title', info.title);
  text('event-detail', info.detail);
  text('event-time', inPractice && practiceFeedback ? `${seconds}s` : frame ? `${(frame.event.atMs / 1000).toFixed(3)}s` : 'STANDBY');
  element('current-event').dataset.kind = info.kind;
  const log = element<HTMLOListElement>('combat-log');
  log.replaceChildren();
  if (visibleCount === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-log';
    empty.textContent = inPractice ? 'Choose your first action to start recording.' : 'The combat log will appear here. Select Next event to begin.';
    log.append(empty);
  }
  frames.slice(0, visibleCount).forEach((entry, index) => {
    const item = document.createElement('li');
    item.className = index === visibleCount - 1 ? 'log-item selected' : 'log-item';
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
  if (inPractice) {
    const finished = state.result !== 'ongoing';
    const started = practice.actions.length > 0;
    element<HTMLSelectElement>('main-weapon').disabled = started;
    element<HTMLInputElement>('rockets-equipped').disabled = started;
    element<HTMLInputElement>('action-time').value = seconds;
    element<HTMLInputElement>('action-time').min = seconds;
    document.querySelectorAll<HTMLButtonElement>('#practice-controls .action-button').forEach((button) => { button.disabled = finished; });
    element<HTMLButtonElement>('rocket-hit').disabled = finished || !state.vx5Equipped;
    element<HTMLButtonElement>('apply-corrosion').disabled = finished;
    element<HTMLButtonElement>('replay-run').disabled = practice.actions.length === 0;
    text('main-hit', `${state.mainWeapon === 'laser' ? 'Laser' : 'Wide Shot'} hit`);
    const nextWarning = nextBossWarning(practice);
    text('pattern-status', finished ? 'Encounter finished.' : `Next warning: ${nextWarning.lane} lane at ${(nextWarning.atMs / 1000).toFixed(3)}s. Impact at ${(nextWarning.impactAtMs / 1000).toFixed(3)}s.`);
    const readiness = (weapon: MainWeapon | 'vx-5') => practice.nextHitAtMs[weapon] <= state.timeMs
      ? 'ready now' : `ready at ${(practice.nextHitAtMs[weapon] / 1000).toFixed(3)}s`;
    text('cadence-status', `Main weapon ${readiness(state.mainWeapon)}${state.vx5Equipped ? ` · VX-5 ${readiness('vx-5')}` : ''}.`);
    document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.move === state.playerLane));
    });
  }
}
element('next').addEventListener('click', () => { if (cursor < replay.frames.length) cursor += 1; render(); });
element('previous').addEventListener('click', () => { cursor = Math.max(0, cursor - 1); render(); });
element('restart').addEventListener('click', () => { cursor = 0; render(); });
element('training-mode').addEventListener('click', () => {
  mode = 'training'; replay = replayBattle(createTrainingBattle(), TRAINING_ACTIONS); cursor = 0; render();
});
element('example-mode').addEventListener('click', () => {
  const example = createExampleVictory();
  replay = replayBattle(example.initialState, example.actions); cursor = 0; mode = 'example'; render();
});
element('show-outcome').addEventListener('click', () => { cursor = replay.frames.length; render(); });
element('practice-mode').addEventListener('click', () => { mode = 'practice'; render(); });
element('resume-practice').addEventListener('click', () => { mode = 'practice'; render(); });
function newPractice() {
  practice = createPractice({
    mainWeapon: element<HTMLSelectElement>('main-weapon').value as MainWeapon,
    vx5Equipped: element<HTMLInputElement>('rockets-equipped').checked,
  });
  practiceFeedback = null;
  text('practice-error', '');
  render();
}
element('new-practice').addEventListener('click', newPractice);
element('main-weapon').addEventListener('change', newPractice);
element('rockets-equipped').addEventListener('change', newPractice);
function actionTime() {
  const value = element<HTMLInputElement>('action-time').value;
  const ms = Number(value) * 1000;
  if (value.trim() === '' || !Number.isFinite(ms) || Math.abs(ms - Math.round(ms)) > 0.000001) {
    throw new Error('Enter seconds with at most three decimal places');
  }
  return Math.round(ms);
}
function submitDecision(build: (atMs: number) => PlayerAction) {
  try {
    const before = practice.frames.length;
    practice = actInPractice(practice, build(actionTime()));
    practiceFeedback = practice.frames.length === before ? `Time advanced to ${(practice.state.timeMs / 1000).toFixed(3)}s` : null;
    text('practice-error', '');
    render();
  } catch (error) { text('practice-error', error instanceof Error ? error.message : 'That action could not be resolved'); }
}
element('main-hit').addEventListener('click', () => submitDecision((atMs) => ({ type: 'hit', atMs, weapon: practice.state.mainWeapon })));
element('rocket-hit').addEventListener('click', () => submitDecision((atMs) => ({ type: 'hit', atMs, weapon: 'vx-5' })));
element('apply-corrosion').addEventListener('click', () => submitDecision((atMs) => ({ type: 'apply-shield-corrosion', atMs })));
element('wait').addEventListener('click', () => submitDecision((atMs) => ({ type: 'advance-time', atMs })));
element('add-quarter').addEventListener('click', () => {
  element<HTMLInputElement>('action-time').value = ((practice.state.timeMs + 250) / 1000).toFixed(3);
  submitDecision((atMs) => ({ type: 'advance-time', atMs }));
});
element('add-second').addEventListener('click', () => {
  element<HTMLInputElement>('action-time').value = ((practice.state.timeMs + 1000) / 1000).toFixed(3);
  submitDecision((atMs) => ({ type: 'advance-time', atMs }));
});
document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((button) => {
  button.addEventListener('click', () => submitDecision((atMs) => ({ type: 'move', atMs, lane: button.dataset.move as Lane })));
});
element('replay-run').addEventListener('click', () => {
  replay = replayBattle(practice.initialState, practice.actions); cursor = 0; mode = 'recording'; render();
});
function restoreRun(session: ReturnType<typeof createPractice>) {
  practice = session;
  practiceFeedback = null;
  mode = 'practice';
  element<HTMLSelectElement>('main-weapon').value = session.state.mainWeapon;
  element<HTMLInputElement>('rockets-equipped').checked = session.state.vx5Equipped;
  text('practice-error', '');
  render();
}
element('save-run').addEventListener('click', () => {
  try { saveLocalRun(practice); text('save-status', 'Run saved in this browser. Load it after a reload to replay or continue.'); }
  catch (error) { text('save-status', `Could not save: ${error instanceof Error ? error.message : 'Browser storage is unavailable'}`); }
});
element('load-run').addEventListener('click', () => {
  try { restoreRun(loadLocalRun()); text('save-status', 'Saved run loaded and verified by the engine. Select Replay my run to inspect it.'); }
  catch (error) { text('save-status', `Could not load: ${error instanceof Error ? error.message : 'Browser storage is unavailable'}`); }
});
element('export-run').addEventListener('click', () => {
  try {
    const url = URL.createObjectURL(new Blob([serializeRun(practice)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'boss-lab-replay.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    text('save-status', 'Replay JSON exported. It contains the setup, rules version, and your decisions.');
  } catch (error) { text('save-status', `Could not export: ${error instanceof Error ? error.message : 'Export failed'}`); }
});
element<HTMLInputElement>('import-run').addEventListener('change', async (event) => {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 500_000) throw new Error('Replay file is too large');
    restoreRun(deserializeRun(await file.text()));
    text('save-status', 'Imported run verified by the engine. Save it locally or select Replay my run.');
  } catch (error) { text('save-status', `Could not import: ${error instanceof Error ? error.message : 'Import failed'}`); }
  input.value = '';
});
element('import-trigger').addEventListener('click', () => element<HTMLInputElement>('import-run').click());
render();

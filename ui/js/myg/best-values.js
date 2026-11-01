// BEST VALUES: read a whole GPC script and suggest the settings for its aim assist.
// SHOTER mode: the code of each aim assist gives its SPEED and SIZE/RADIUS (see code-reader.js); the table pairs are suggested.
// FC mode: the code of each combo that moves a stick is listed with its sweep size and step time (see keywords.js).
import { analyseCode } from './code-reader.js';
import { analyseCombos, KEYWORDS } from './keywords.js';
import { simulateAll } from './simulate.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export { SHOTER_PAIRS } from "./shoter-pairs.js";
import { SHOTER_PAIRS } from "./shoter-pairs.js";

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** Every `int name = value;` (or `define name = value`) whose name fits the pattern (name-based fallback). */
function numbers(text, pattern) {
  const out = [];
  const re = /\b(?:const\s+)?(?:u?int8?|u?int16|u?int32|int|define)\s+(\w+)\s*=\s*(-?\d+)/g;
  let m;
  while ((m = re.exec(text))) if (pattern.test(m[1])) out.push({ name: m[1], value: Number(m[2]), line: lineOf(text, m.index) });
  return out;
}

/** Name-based fallback for plain scripts with no code roles: sizes and speeds named as such. */
export function analyseShoter(text) {
  const notAa = /tab|toggle|enable|resol|sens|vm|per_?sec|rps|\bon\b|\boff\b/i;
  const sizes = numbers(text, /size|radius/i).filter((x) => x.value > 1 && !notAa.test(x.name));
  const speeds = numbers(text, /speed|spd/i).filter((x) => x.value > 1 && !notAa.test(x.name));
  const waits = [...text.matchAll(/\bwait\s*\(\s*(\d+)\s*\)/g)].map((m) => Number(m[1])).filter((w) => w >= 1);
  const bigSticks = [...text.matchAll(/set_val\s*\(\s*PS4_(?:RX|RY|LX|LY)\s*,\s*(-?\d+)\s*\)/g)].filter((m) => Math.abs(Number(m[1])) >= 60);
  const minWait = waits.length ? Math.min(...waits) : null;
  const risks = [];
  if (minWait !== null && minWait < 15) risks.push(`a wait of ${minWait} ms`);
  if (bigSticks.length) risks.push(`${bigSticks.length} stick move(s) of 60 or more`);
  return { sizes, speeds, risks, size: sizes[0]?.value ?? null, speed: speeds[0]?.value ?? null };
}

/** Picks a pair: the first one as strong as the current pair, one step lower when there is a risk. */
export function pickShoter(report) {
  if (report.size === null || report.speed === null) return null;
  const sorted = [...SHOTER_PAIRS].sort((a, b) => a.size * a.speed - b.size * b.speed);
  let idx = sorted.findIndex((p) => p.size * p.speed >= report.size * report.speed);
  if (idx < 0) idx = sorted.length - 1;
  if (report.risks.length) idx = Math.max(0, idx - 1);
  return { pick: sorted[idx], current: { size: report.size, speed: report.speed }, risky: report.risks.length > 0 };
}

/** The table pair for one AA section, from what its code does, clamped to the ranges of its values. */
export function recommendSection(r) {
  const size = r.size.def;
  const speed = r.speed.def;
  const sorted = [...SHOTER_PAIRS].sort((a, b) => a.size * a.speed - b.size * b.speed);
  let idx = sorted.findIndex((p) => p.size * p.speed >= size * speed);
  if (idx < 0) idx = sorted.length - 1;
  const risks = [];
  if (r.bigSticks > 0) risks.push(`${r.bigSticks} stick move(s) of 60 or more`);
  if (r.minWait !== null && r.minWait < 15) risks.push(`a wait of ${r.minWait} ms`);
  if (speed >= 60) risks.push(`SPEED starts at ${speed}`);
  if (risks.length) idx = Math.max(0, idx - 1);
  const p = sorted[idx];
  const clamp = (v, lo, hi) => Math.min(hi ?? v, Math.max(lo ?? v, v));
  const outS = clamp(p.size, r.size.min, r.size.max);
  const outP = clamp(p.speed, r.speed.min, r.speed.max);
  return { pick: p.name, size: outS, speed: outP, clamped: outS !== p.size || outP !== p.speed, risks };
}

/** FC: what the script does for aim and shots. Facts only, no invented numbers. */
export function analyseFc(text) {
  const combos = analyseCombos(text);
  const sweeps = combos.filter((c) => c.sweep);
  const shotBtn = combos.some((c) => c.buttons.some((b) => /CIRCLE|R2/.test(b)));
  return { combos, sweeps, shotBtn };
}

// ---------- drawing (same look as the rest of the app)

const chips = (counts) => Object.entries(counts)
  .map(([k, n]) => `<span class="bv-chip" title="${esc(KEYWORDS[k]?.label ?? k)}">${esc(k)} <b>${n}</b></span>`).join('');

const trace = (steps, title) => steps.length
  ? `<div class="bv-trace"><div class="bv-label">${esc(title)}</div>${steps.map((s) => `<div class="bv-step"><span>line ${s.line}</span>${esc(s.text)}</div>`).join('')}</div>`
  : '';

// The simulator's table for one section: each table pair with its measured jolt and effect.
const simTable = (sim) => sim.table.map((p) => `<tr>
    <td>${esc(p.name)}</td><td>${p.size}</td><td>${p.speed}</td><td>${p.effect}</td><td>${p.jolt}</td>
    <td class="${p.hard?.length ? 'bv-warn' : p.ok ? 'bv-ok' : 'bv-warn'}">${p.hard?.length ? esc(p.hard.join(', ')) : p.ok ? 'smooth' : 'jolt'}</td></tr>`).join('');

function codeCard(r, sim) {
  const rec = recommendSection(r);
  const risk = rec.risks.length ? `<div class="bv-warn">Risks: ${esc(rec.risks.join(', '))}</div>` : '';
  const best = sim
    ? `<div class="bv-suggest">Simulated best: <b>SIZE ${sim.best.size} · SPEED ${sim.best.speed}</b>
         ${sim.notes?.length ? `<div class="bv-warn">${esc(sim.notes.join('; '))}</div>` : ''}
         <span class="bv-muted">effect ${sim.best.effect} · jolt ${sim.best.jolt} (limit ${sim.limit}) · ${sim.tried} settings tried, ${sim.accepted} smooth</span></div>
       <table class="bv-table"><tr><th>Table pair</th><th>SIZE</th><th>SPEED</th><th>Effect</th><th>Jolt</th><th>Result</th></tr>${simTable(sim)}</table>`
    : '';
  return `<div class="bv-card">
    <div class="bv-head"><span>${esc(r.section)}</span><span class="bv-pick">${esc(sim ? `SIZE ${sim.best.size} · SPEED ${sim.best.speed}` : rec.pick)}</span></div>
    <table class="bv-table">
      <tr><th>Value</th><th>Name</th><th>Now</th><th>Range</th><th>Used at</th></tr>
      <tr><td>SIZE / RADIUS</td><td>${esc(r.size.name)}</td><td>${r.size.def}</td><td>${r.size.min ?? '-'} to ${r.size.max ?? '-'}</td><td>line ${r.size.line ?? '-'}</td></tr>
      <tr><td>SPEED</td><td>${esc(r.speed.name)}</td><td>${r.speed.def}</td><td>${r.speed.min ?? '-'} to ${r.speed.max ?? '-'}</td><td>line ${r.speed.line ?? '-'}</td></tr>
    </table>
    ${best || `<div class="bv-suggest">Suggested: <b>${esc(rec.pick)}</b> · SIZE ${rec.size} · SPEED ${rec.speed}${rec.clamped ? ' <span class="bv-muted">(limited to the range)</span>' : ''}</div>`}
    ${risk}
    <div class="bv-chips">${chips(r.keywords)}</div>
    ${trace(r.speedTrace, 'SPEED followed through the code')}
    ${trace(r.sizeTrace, 'SIZE / RADIUS followed through the code')}
  </div>`;
}

function shoterHtml(text) {
  const results = analyseCode(text);
  if (results.length) {
    // The simulator runs each section alone with the candidate values and measures the sticks.
    const sims = simulateAll(text, { jolt: 30 });
    return `<p class="bv-muted">Found <b>${results.length}</b> aim assist section(s). Each one is run alone in the simulator with candidate SIZE and SPEED values; the strongest setting with no hard jolt is the best.</p>
      ${results.map((r, i) => codeCard(r, sims[i])).join('')}
      <p class="bv-muted">Jolt = the largest step the stick takes from one frame to the next. Effect = how far the assist moves the stick. Limit 30 is a first guess; change it once you feel the result in game.</p>`;
  }
  const rep = analyseShoter(text);
  const pick = pickShoter(rep);
  if (!pick) return `<div class="bv-card"><div class="bv-warn">No aim assist found: no SPEED and SIZE/RADIUS that the code uses with COS/SIN and 360.</div></div>`;
  const rows = SHOTER_PAIRS.map((p) => `<tr${pick.pick.name === p.name ? ' class="bv-best"' : ''}><td>${esc(p.name)}</td><td>${p.size}</td><td>${p.speed}</td></tr>`).join('');
  return `<div class="bv-card">
    <p class="bv-muted">Name-based reading (no code roles found).</p>
    <div class="bv-suggest">Your values: SIZE <b>${rep.size}</b> · SPEED <b>${rep.speed}</b></div>
    ${rep.risks.length ? `<div class="bv-warn">Risks: ${esc(rep.risks.join(', '))}</div>` : ''}
    <div class="bv-suggest">Suggested: <b>${esc(pick.pick.name)}</b> · SIZE ${pick.pick.size} · SPEED ${pick.pick.speed}</div>
    <table class="bv-table"><tr><th>Pair</th><th>SIZE</th><th>SPEED</th></tr>${rows}</table>
  </div>`;
}

function fcHtml(text) {
  const rep = analyseFc(text);
  if (!rep.sweeps.length) {
    return `<div class="bv-card"><div class="bv-warn">No aim sweep found: no combo moves a stick in both directions.</div></div>`;
  }
  const rows = rep.sweeps.map((c) => {
    const amp = Math.max(...c.sticks.map((s) => Math.abs(s.value)));
    const stick = [...new Set(c.sticks.map((s) => s.stick))].join(', ');
    const waits = c.waits.length ? `${Math.min(...c.waits)} to ${Math.max(...c.waits)} ms` : '-';
    return `<tr>
      <td>${esc(c.name)} <small class="bv-muted">line ${c.line}</small></td>
      <td>${esc(stick)}</td>
      <td>${amp}</td>
      <td>${waits}</td>
      <td>${esc(c.buttons.map((b) => b.replace('PS4_', '')).join(' + ') || '-')}</td>
      <td><div class="bv-chips">${chips(c.keywords)}</div></td>
    </tr>`;
  }).join('');
  return `<div class="bv-card">
    <div class="bv-head"><span>Aim sweeps in the script</span><span class="bv-pick">${rep.sweeps.length} found</span></div>
    <p class="bv-muted">A sweep is a combo that moves a stick to both sides. Its SIZE is the stick amount; its SPEED is the wait between the steps. The wait is the real speed of the sweep here, so the table pairs (angle steps) do not map onto it directly.</p>
    <table class="bv-table"><tr><th>Combo</th><th>Stick</th><th>Size (stick)</th><th>Speed (wait)</th><th>Buttons</th><th>Keywords</th></tr>${rows}</table>
  </div>
  <div class="bv-card"><div class="bv-label">Sources for FC 26</div>
    <p class="bv-muted">Shot Assistance is set in the game (Assisted or Precision); most guides recommend Precision for competitive play. No numeric FC aim-assist values are published, so this mode shows what the script does and does not suggest numbers.</p>
  </div>`;
}

/** Renders the BEST VALUES page into a host element. */
export function renderBestValues(host) {
  host.innerHTML = `
    <div class="bv">
      <div class="bv-top">
        <div class="section-title">BEST VALUES</div>
        <select class="ls-sel bv-mode" data-bv="mode"><option value="shoter">SHOTER SCRIPT</option><option value="fc">FC SCRIPT</option></select>
      </div>
      <div class="bv-drop" data-bv="drop">
        <div class="bv-drop-title">Drop a .gpc script here</div>
        <div class="bv-muted">or click to open it</div>
        <input type="file" accept=".gpc,.txt" data-bv="file" hidden>
      </div>
      <div class="bv-out" data-bv="out"></div>
    </div>`;
  const drop = host.querySelector('[data-bv="drop"]');
  const file = host.querySelector('[data-bv="file"]');
  const out = host.querySelector('[data-bv="out"]');
  const mode = host.querySelector('[data-bv="mode"]');
  let text = '';
  const show = () => {
    if (!text) { out.innerHTML = ''; return; }
    out.innerHTML = '<p class="bv-muted">Reading the script and simulating its aim assists…</p>';
    // Yield once so the message is painted before the simulation runs.
    setTimeout(() => { out.innerHTML = mode.value === 'fc' ? fcHtml(text) : shoterHtml(text); }, 20);
  };
  const load = async (f) => { text = await f.text(); show(); };
  drop.addEventListener('click', () => file.click());
  file.addEventListener('change', () => file.files[0] && load(file.files[0]));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) load(e.dataTransfer.files[0]); });
  mode.addEventListener('change', show);
}

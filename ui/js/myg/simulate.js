// BEST VALUES simulator: runs one aim assist section of a generated script in the preview VM with
// candidate SIZE / SPEED values, measures the stick it moves, and keeps the strongest setting without a hard jolt.
// Measurements (per frame, the stick output of the script while ADS + FIRE are held):
//   jolt   = the largest change of the stick from one frame to the next (what the player feels as shaking)
//   effect = how far the script moves the stick away from the player's own input (the assist strength)
//   peak   = the largest stick value the script writes
import { GpcVM, BUILTIN_CONSTS as K } from './gpc-vm.js';
import { readTables, analyseCode } from './code-reader.js';
import { SHOTER_PAIRS, HIP_ALL_TYPES_PAIR } from './shoter-pairs.js';

/** A copy of the generated script that starts with the given option and value defaults. */
export function withDefaults(code, itemDef, valDef) {
  let out = code;
  if (itemDef) out = out.replace(/const uint8 ITEM_DEF\[\] = \{[\s\S]*?\};/, `const uint8 ITEM_DEF[] = {${itemDef.join(', ')}};`);
  if (valDef) out = out.replace(/const int16 VAL_DEF\[\] = \{[\s\S]*?\};/, `const int16 VAL_DEF[] = {${valDef.join(', ')}};`);
  return out;
}

/**
 * Holds the buttons of each scenario (ADS + FIRE for the ADS assists, FIRE alone for the HIP assist),
 * with the stick still and with a steady push, and measures the sticks the script writes.
 */
export function measure(code, { frames = 120, jolt: joltLimit = 30 } = {}) {
  const scenarios = [
    { ads: true, rx: 0, ry: 0 }, { ads: true, rx: 40, ry: 0 },
    { ads: false, rx: 0, ry: 0 }, { ads: false, rx: 40, ry: 0 },
  ];
  // All four sticks: some assists (AA BOOSTER) move the left stick.
  const STICKS = [K.PS4_RX, K.PS4_RY, K.PS4_LX, K.PS4_LY];
  let jolt = 0, peak = 0, effect = 0;
  for (const sc of scenarios) {
    const vm = new GpcVM(code);
    const frame = (held) => vm.frame(10, new Map(held));
    for (let i = 0; i < 5; i++) frame([]);
    let prev = null;
    let sum = 0;
    for (let i = 0; i < frames; i++) {
      const held = [[K.PS4_R2, 100], [K.PS4_RX, sc.rx], [K.PS4_RY, sc.ry]];
      if (sc.ads) held.push([K.PS4_L2, 100]);
      frame(held);
      const now = STICKS.map((b) => vm.outputs.get(b) ?? (b === K.PS4_RX ? sc.rx : 0));
      if (prev) for (let s = 0; s < 4; s++) jolt = Math.max(jolt, Math.abs(now[s] - prev[s]));
      prev = now;
      for (let s = 0; s < 4; s++) peak = Math.max(peak, Math.abs(now[s]));
      sum += Math.abs(now[0] - sc.rx) + Math.abs(now[1] - sc.ry) + Math.abs(now[2]) + Math.abs(now[3]);
    }
    effect += sum / frames / scenarios.length;
  }
  return { jolt, peak, effect: Math.round(effect * 10) / 10, ok: jolt <= joltLimit && peak <= 100 };
}

const lin = (lo, hi, n) => Array.from({ length: n }, (_, i) => Math.round(lo + ((hi - lo) * i) / (n - 1)));

/** Tries the table pairs and a grid across the ranges, keeps the strongest setting that is not a hard jolt. */
export function searchSection(text, section, { grid = 5, jolt = 30 } = {}) {
  const tables = readTables(text);
  if (!tables) return null;
  const itemIdx = tables.itemName.indexOf(section.section);
  if (itemIdx < 0) return null;
  const sMin = section.size.min ?? 1, sMax = section.size.max ?? 40;
  const pMin = section.speed.min ?? 1, pMax = section.speed.max ?? 60;
  const sizeK = Number(section.size.token.slice(2));
  const speedK = Number(section.speed.token.slice(2));
  const itemCount = tables.itemName.length;
  const valCount = tables.valName.length;
  const itemDef = Array.from({ length: itemCount }, (_, i) => (i === itemIdx ? 1 : 0));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // The user's rules. A candidate that breaks a hard rule is never picked as the best.
  //   SIZE never above SPEED (a bigger SIZE than SPEED shakes badly).
  //   HIP AA: SIZE under 15 (hard), and SPEED above 90 (wanted; the script may not allow it).
  const isHip = /HIP/i.test(section.section);
  const rulesOf = (s, p) => {
    const hard = [];
    if (s > p) hard.push('SIZE above SPEED');
    if (isHip && s >= 15) hard.push('HIP SIZE 15 or more');
    return hard;
  };
  const speedWanted = isHip ? 90 : null;
  const speedMissing = speedWanted !== null && pMax <= speedWanted;

  const candidates = new Map();
  const add = (s, p, label) => {
    const cs = clamp(s, sMin, sMax), cp = clamp(p, pMin, pMax);
    const key = `${cs}/${cp}`;
    if (!candidates.has(key)) candidates.set(key, { size: cs, speed: cp, labels: [] });
    if (label) candidates.get(key).labels.push(label);
  };
  const tablePairs = [...SHOTER_PAIRS, HIP_ALL_TYPES_PAIR];
  for (const p of tablePairs) add(p.size, p.speed, p.name);
  const sizeTop = isHip ? Math.min(sMax, 14) : sMax;
  for (const s of lin(sMin, sizeTop, grid)) for (const p of lin(pMin, pMax, grid)) add(s, p, null);

  const run = (s, p) => {
    const valDef = Array.from({ length: valCount }, (_, i) => tables.valDef[i] ?? 0);
    valDef[sizeK] = s;
    valDef[speedK] = p;
    return measure(withDefaults(text, itemDef, valDef), { jolt });
  };
  const rows = [...candidates.values()].map((c) => ({ ...c, hard: rulesOf(c.size, c.speed), ...run(c.size, c.speed) }));
  const legal = rows.filter((r) => r.ok && r.hard.length === 0);
  const best = legal.length
    ? legal.sort((a, b) => b.effect - a.effect || a.jolt - b.jolt)[0]
    : [...rows].filter((r) => r.hard.length === 0).sort((a, b) => a.jolt - b.jolt)[0] ?? rows[0];
  const table = tablePairs.map((p) => {
    const size = clamp(p.size, sMin, sMax), speed = clamp(p.speed, pMin, pMax);
    const c = rows.find((r) => r.size === size && r.speed === speed);
    return { name: p.name, size, speed, jolt: c.jolt, effect: c.effect, ok: c.ok, hard: c.hard };
  });
  return {
    section: section.section,
    best: { size: best.size, speed: best.speed, effect: best.effect, jolt: best.jolt, ok: best.ok && best.hard.length === 0 },
    table,
    tried: rows.length,
    accepted: legal.length,
    limit: jolt,
    notes: [
      ...(speedMissing ? [`HIP SPEED cannot go above 90 here: this script allows up to ${pMax}`] : []),
    ],
  };
}

/** Runs the search for every aim assist section of a generated script. */
export function simulateAll(text, { jolt = 30 } = {}) {
  const sections = analyseCode(text);
  return sections.map((s) => searchSection(text, s, { jolt }));
}

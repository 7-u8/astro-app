// Reads what the CODE does with each value (not the value's name).
// Roles, from the lines that use a value:
//   SPEED   : added to an angle that is then taken % 360 (the angle moves this much each step)
//   SIZE / RADIUS : multiplies f_cos / f_sin (the size of the circle), also through variables it was copied into
//   TIME    : used inside wait(...)
// Works on the app's generated scripts (value tables VAL_NAME / VAL_DEF / VAL_MIN / VAL_MAX, mod headers
// from ITEM_NAME) and on plain scripts (values are declared variables).

import { scanKeywords, traceValue } from './keywords.js';

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** `const <type> NAME[] = { ... };` as an array (numbers and strings). */
function table(text, name) {
  const m = text.match(new RegExp(`const\\s+\\w+\\s+${name}\\s*\\[\\s*\\]\\s*=\\s*\\{([\\s\\S]*?)\\};`));
  if (!m) return null;
  return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"|(-?\d+)/g)].map((x) => (x[1] !== undefined ? x[1] : Number(x[2])));
}

/** The app's value and mod tables, or null for a plain script. */
export function readTables(text) {
  const valName = table(text, 'VAL_NAME');
  if (!valName) return null;
  return {
    valName,
    valDef: table(text, 'VAL_DEF') ?? [],
    valMin: table(text, 'VAL_MIN') ?? [],
    valMax: table(text, 'VAL_MAX') ?? [],
    itemName: table(text, 'ITEM_NAME') ?? [],
  };
}

/** Declared variables with their literal value (0 when none). `int a = 5, b;` / `define A = 5`. */
export function declaredVars(text) {
  const out = new Map();
  for (const m of text.matchAll(/\b(?:const\s+)?(?:u?int(?:8|16|32)?|define)\s+([^;\n]+)/g)) {
    for (const part of m[1].split(',')) {
      const d = part.match(/^\s*(\w+)\s*(?:=\s*(-?\d+))?/);
      if (d) out.set(d[1], d[2] !== undefined ? Number(d[2]) : 0);
    }
  }
  return out;
}

/** Splits the generated script into the mods, by their header lines (`// POLAR AA`). */
function sectionsOf(text, itemNames) {
  const heads = [];
  for (const name of itemNames) {
    const re = new RegExp(`^[ \\t]*// ${name.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')}[ \\t]*$`, 'gm');
    let m;
    while ((m = re.exec(text))) heads.push({ name, start: m.index, bodyStart: m.index + m[0].length });
  }
  heads.sort((a, b) => a.start - b.start);
  return heads.map((h, i) => ({
    name: h.name,
    start: h.start,
    body: text.slice(h.bodyStart, i + 1 < heads.length ? heads[i + 1].start : text.length),
  }));
}

const TOKEN = /VL\[(\d+)\]|\b([A-Za-z_]\w*)\b/g;

/** Roles of every value used in one body of code. */
function roles(body, known) {
  const lines = body.split('\n');
  const deps = new Map();          // variable -> values it was built from
  const accum = new Set();         // angle variables (taken % 360)
  const speed = [], radius = [], time = [];
  const cosLines = [];
  let minWait = null;
  let bigSticks = 0;
  // A setter's first argument is where the value goes (a stick or a button), not a value that is read.
  const tokens = (line) => {
    const out = [];
    const src = line.replace(/\b(set_val|stk_add|stk_soft|stk_set|set_pvar)\s*\(\s*[A-Za-z_]\w*\s*,/g, '$1(');
    for (const m of src.matchAll(TOKEN)) {
      if (m[1] !== undefined) out.push(`VL${m[1]}`);
      else if (known.has(m[2])) out.push(m[2]);
    }
    return out;
  };
  lines.forEach((raw, i) => {
    const line = raw.replace(/\/\/.*$/, '');
    const toks = tokens(line);
    const lhsM = line.match(/^\s*(\w+)\s*[-+*/]?=(?!=)/);
    const lhs = lhsM && known.has(lhsM[1]) ? lhsM[1] : null;
    if (lhs) {
      const rhs = toks.filter((t) => t !== lhs);
      if (!deps.has(lhs)) deps.set(lhs, new Set());
      rhs.forEach((t) => deps.get(lhs).add(t));
      if (/%\s*360/.test(line)) {
        accum.add(lhs);
        rhs.forEach((t) => { if (!speed.includes(t)) speed.push(t); });
      }
    }
    // In `x = (y * f_cos(a)) / 100` the x is where the result goes, so it is not a size.
    if (/f_cos|f_sin/.test(line)) cosLines.push(lhs ? toks.filter((t) => t !== lhs) : toks);
    const w = line.match(/\bwait\s*\(\s*(\d+)\s*\)/);
    if (w) minWait = minWait === null ? Number(w[1]) : Math.min(minWait, Number(w[1]));
    if (/\bwait\s*\(/.test(line)) toks.forEach((t) => { if (!time.includes(t)) time.push(t); });
    const set = line.match(/\bset_val\s*\(\s*PS4_(?:RX|RY|LX|LY)\s*,\s*(-?\d+)\s*\)/);
    if (set && Math.abs(Number(set[1])) >= 60) bigSticks++;
  });
  // Everything a cos/sin line uses, followed back through the variables it was copied from.
  const closure = (t, seen = new Set()) => {
    if (seen.has(t)) return seen;
    seen.add(t);
    for (const d of deps.get(t) ?? []) closure(d, seen);
    return seen;
  };
  for (const toks of cosLines) for (const t of toks) for (const r of closure(t)) {
    if (!accum.has(r) && !radius.includes(r) && !speed.includes(r)) radius.push(r);
  }
  // Values that only feed the angle are speed, not size.
  return { speed: speed.filter((t) => !accum.has(t)), radius, time, minWait, bigSticks };
}

/** Describes one role value: its name, default and range (from the tables when there are tables). */
function describe(token, tables, declared) {
  const m = token.match(/^VL(\d+)$/);
  if (m && tables) {
    const k = Number(m[1]);
    return { token, name: tables.valName[k] ?? token, def: tables.valDef[k] ?? 0, min: tables.valMin[k] ?? null, max: tables.valMax[k] ?? null };
  }
  return { token, name: token, def: declared.get(token) ?? 0, min: null, max: null };
}

/** Reads the whole script: one result per body that has a SPEED and a SIZE/RADIUS. */
export function analyseCode(text) {
  const tables = readTables(text);
  const declared = declaredVars(text);
  const known = new Set([...declared.keys(), ...(tables ? [] : [])]);
  const sections = tables
    ? sectionsOf(text, tables.itemName)
    : [{ name: 'script', start: 0, body: text }];
  const results = [];
  for (const s of sections) {
    const r = roles(s.body, known);
    if (!r.speed.length || !r.radius.length) continue;
    // A value from the table (VL) is the real setting; a copy of it in a variable is only the way the code reaches it.
    const first = (list) => [...list].sort((a, b) => (b.startsWith('VL') ? 1 : 0) - (a.startsWith('VL') ? 1 : 0))[0];
    const speedTok = first(r.speed);
    const sizeTok = first(r.radius);
    const speed = describe(speedTok, tables, declared);
    const size = describe(sizeTok, tables, declared);
    const startLine = lineOf(text, s.start);
    const at = (token) => {
      const idx = s.body.search(new RegExp(token.startsWith('VL') ? `VL\\[${token.slice(2)}\\]` : `\\b${token}\\b`));
      return idx < 0 ? null : startLine + s.body.slice(0, idx).split('\n').length - 1;
    };
    results.push({
      section: s.name,
      speed: { ...speed, line: at(r.speed[0]) },
      size: { ...size, line: at(r.radius[0]) },
      minWait: r.minWait,
      bigSticks: r.bigSticks,
      keywords: scanKeywords(s.body, startLine).counts,
      speedTrace: traceValue(s.body, speedTok, startLine),
      sizeTrace: traceValue(s.body, sizeTok, startLine),
    });
  }
  return results;
}

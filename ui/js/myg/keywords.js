// Keywords the reader looks for in a script's code (MAX, MIN, SIN, COS, 360, RX, RY, ...),
// the lines where each one is used, and a trace of one value from where it is read to where it moves a stick.

const strip = (line) => line.replace(/\/\/.*$/, '');

export const KEYWORDS = {
  ANGLE: { re: /%\s*360|\b360\b/, label: '360 (an angle that goes round)' },
  COS: { re: /\bf_cos\b|\bcos\b/i, label: 'COS (the circle, x side)' },
  SIN: { re: /\bf_sin\b|\bsin\b|SIN_T/i, label: 'SIN (the circle, y side)' },
  MAX: { re: /\bmax\s*\(/i, label: 'MAX (the larger of two)' },
  MIN: { re: /\bmin\s*\(/i, label: 'MIN (the smaller of two)' },
  CLAMP: { re: /\bclamp\s*\(/i, label: 'clamp (keeps a value in its range)' },
  RX: { re: /PS4_RX|\bs_rx\b|\bRX\b/, label: 'RX (right stick, sideways)' },
  RY: { re: /PS4_RY|\bs_ry\b|\bRY\b/, label: 'RY (right stick, up and down)' },
  LX: { re: /PS4_LX|\bs_lx\b|\bLX\b/, label: 'LX (left stick, sideways)' },
  LY: { re: /PS4_LY|\bs_ly\b|\bLY\b/, label: 'LY (left stick, up and down)' },
  WRITE: { re: /\bstk_(add|set|soft)\s*\(|\bset_val\s*\(/, label: 'writes a value to a stick or a button' },
  WAIT: { re: /\bwait\s*\(/, label: 'wait (the time between two steps)' },
};

/** Counts every keyword in a body of code and lists the lines where it appears. */
export function scanKeywords(body, startLine = 1) {
  const counts = {};
  const lines = {};
  body.split('\n').forEach((raw, i) => {
    const line = strip(raw);
    for (const [key, { re }] of Object.entries(KEYWORDS)) {
      if (!re.test(line)) continue;
      counts[key] = (counts[key] ?? 0) + 1;
      (lines[key] ??= []).push(startLine + i);
    }
  });
  return { counts, lines };
}

/**
 * Follows one value (a name, or VL[k] written as "VLk") line by line: from where it is read,
 * through every variable it is copied into, until it is written to a stick. Returns the steps.
 */
export function traceValue(body, token, startLine = 1, maxSteps = 6) {
  const lines = body.split('\n');
  const steps = [];
  let cur = token;
  let from = -1;
  for (let step = 0; step < maxSteps; step++) {
    const pat = cur.startsWith('VL') ? new RegExp(`VL\\[${cur.slice(2)}\\]`) : new RegExp(`\\b${cur}\\b`);
    const i = lines.findIndex((l, j) => j > from && pat.test(strip(l)));
    if (i < 0) break;
    const line = strip(lines[i]).trim();
    steps.push({ line: startLine + i, text: line.slice(0, 100) });
    from = i;
    if (/\bstk_(add|set|soft)\s*\(|\bset_val\s*\(\s*PS4_(RX|RY|LX|LY)/.test(line)) break;
    const lhs = line.match(/^(\w+)\s*[-+*/]?=(?!=)/);
    if (lhs && lhs[1] !== cur) cur = lhs[1];
  }
  return steps;
}

/** Every `combo NAME { ... }` of a script, with the sticks it moves, the buttons it presses and its waits. */
export function analyseCombos(text) {
  const out = [];
  const head = /\bcombo\s+(\w+)\s*\{/g;
  let m;
  while ((m = head.exec(text))) {
    let depth = 1;
    let i = head.lastIndex;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    const body = text.slice(head.lastIndex, i - 1);
    const startLine = text.slice(0, m.index).split('\n').length;
    const sticks = [...body.matchAll(/set_val\s*\(\s*PS4_(RX|RY|LX|LY)\s*,\s*(-?\d+)/g)].map((x) => ({ stick: x[1], value: Number(x[2]) }));
    const buttons = [...new Set([...body.matchAll(/set_val\s*\(\s*(PS4_[A-Z0-9_]+)\s*,\s*(-?\d+)/g)].map((x) => x[1]).filter((b) => !/PS4_(RX|RY|LX|LY)$/.test(b)))];
    const waits = [...body.matchAll(/\bwait\s*\(\s*(\d+)\s*\)/g)].map((x) => Number(x[1]));
    const sweep = sticks.some((s) => s.value > 0) && sticks.some((s) => s.value < 0);
    out.push({
      name: m[1],
      line: startLine,
      sticks,
      buttons,
      waits,
      sweep,
      keywords: scanKeywords(body, startLine).counts,
    });
  }
  return out;
}

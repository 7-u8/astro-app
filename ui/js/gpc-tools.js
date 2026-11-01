// GPC script tools (pure functions, no DOM).
// Ported from the owner's earlier tools and made safe:
//   - gpc_cipher.py        -> stringsToData()
//   - q77 "ABUSHADAD GPC MULTI-TOOL"
//       Encoder: numbersToHex(), obfuscateVariables(), oneLine()
//       Decoder: hexToNumbers(), beautify()
// Every transform only touches real code: string literals and comments are left alone.

const RESERVED = new Set(['main', 'init', 'combo', 'function', 'define', 'data', 'const', 'string', 'int',
  'int8', 'int16', 'int32', 'uint8', 'uint16', 'uint32', 'if', 'else', 'while', 'for', 'do', 'switch', 'case',
  'default', 'break', 'continue', 'return', 'wait', 'call', 'event', 'enum', 'TRUE', 'FALSE']);

export const ENCODE_HEADER = '/* OPTIMIZED BY ABUSHADAD | MULTI-TOOL VERSION */';
export const DECODE_HEADER = '/* RECONSTRUCTED CODE BY ABUSHADAD */';

/** Splits source into code / string / comment segments. */
export function segments(src) {
  const out = [];
  let i = 0, start = 0;
  const push = (type, end) => { if (end > start) out.push({ type, text: src.slice(start, end) }); start = end; };
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '/') {
      push('code', i);
      let e = src.indexOf('\n', i);
      if (e === -1) e = src.length;
      push('comment', e); i = e;
    } else if (c === '/' && n === '*') {
      push('code', i);
      let e = src.indexOf('*/', i + 2);
      e = e === -1 ? src.length : e + 2;
      push('comment', e); i = e;
    } else if (c === '"' || c === "'") {
      push('code', i);
      let e = i + 1;
      while (e < src.length && src[e] !== c && src[e] !== '\n') e += src[e] === '\\' ? 2 : 1;
      e = Math.min(src.length, e + 1);
      push('string', e); i = e;
    } else {
      i++;
    }
  }
  push('code', src.length);
  return out;
}

const join = (segs) => segs.map((s) => s.text).join('');
const mapCode = (src, fn) => join(segments(src).map((s) => (s.type === 'code' ? { ...s, text: fn(s.text) } : s)));

// ---------------------------------------------------------------- Encoder

/** Positive decimal numbers -> 0x hex. Negative numbers stay as they are (same rule as q77). */
export function numbersToHex(src) {
  let count = 0;
  const text = mapCode(src, (code) => code.replace(/(^|[^A-Za-z0-9_.])(-?)(\d+)(?![A-Za-z0-9_.])/g, (m, pre, minus, digits) => {
    if (minus) return m;
    count++;
    return `${pre}0x${Number(digits).toString(16).toUpperCase()}`;
  }));
  return { text, count };
}

function randomName(used, prefix) {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (;;) {
    let r = '';
    for (let i = 0; i < 8; i++) r += abc[Math.floor(Math.random() * abc.length)];
    const name = prefix + r;
    if (!used.has(name)) { used.add(name); return name; }
  }
}

/** Finds names declared by the script: variables, defines, const strings, arrays. */
export function declaredNames(src) {
  const code = segments(src).map((s) => (s.type === 'code' ? s.text : ' '.repeat(s.text.length))).join('');
  const names = new Set();
  for (const m of code.matchAll(/\bdefine\s+([A-Za-z_]\w*)/g)) names.add(m[1]);
  for (const m of code.matchAll(/\bconst\s+string\s+([A-Za-z_]\w*)/g)) names.add(m[1]);
  for (const m of code.matchAll(/\b(?:const\s+)?(?:int|int8|int16|int32|uint8|uint16|uint32)\s+([A-Za-z_]\w*)\s*\[/g)) names.add(m[1]);
  // int a, b = 2, c;  (all names in the list, not only the first)
  for (const m of code.matchAll(/\bint\s+([^;(){}]+);/g)) {
    let depth = 0, part = '';
    const parts = [];
    for (const ch of m[1]) {
      if (ch === '[') depth++;
      if (ch === ']') depth--;
      if (ch === ',' && depth === 0) { parts.push(part); part = ''; } else part += ch;
    }
    parts.push(part);
    for (const p of parts) {
      const id = p.trim().match(/^([A-Za-z_]\w*)/);
      if (id) names.add(id[1]);
    }
  }
  for (const r of RESERVED) names.delete(r);
  return [...names];
}

/** Renames every declared variable/define/const/array to a random name (q77 "Obfuscate Variables"). */
export function obfuscateVariables(src, prefix = 'abushadad__') {
  const names = declaredNames(src);
  const used = new Set();
  const mapping = new Map(names.map((n) => [n, randomName(used, prefix)]));
  if (mapping.size === 0) return { text: src, mapping };
  const re = new RegExp(`\\b(${[...mapping.keys()].sort((a, b) => b.length - a.length).join('|')})\\b`, 'g');
  const text = mapCode(src, (code) => code.replace(re, (m) => mapping.get(m)));
  return { text, mapping };
}

/** Removes comments and puts the whole script on one line under a header (q77 "1-Line Mode + Header"). */
export function oneLine(src) {
  // Only code is squeezed; string literals are kept byte for byte.
  const body = segments(src)
    .filter((s) => s.type !== 'comment')
    .map((s) => (s.type === 'code' ? s.text.replace(/\s+/g, ' ').replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1') : s.text))
    .join('')
    .trim();
  return `${ENCODE_HEADER}\n${body}\n`;
}

// ---------------------------------------------------------------- Decoder

/** 0x hex numbers -> decimal (q77 "Convert HEX to Normal Numbers"). */
export function hexToNumbers(src) {
  let count = 0;
  const text = mapCode(src, (code) => code.replace(/\b0[xX]([0-9a-fA-F]+)\b/g, (m, h) => { count++; return String(parseInt(h, 16)); }));
  return { text, count };
}

/** Re-indents code: new line after { and ;, closing } on its own line (q77 "Beautify & Fix New Lines"). */
export function beautify(src) {
  const segs = segments(src.split('\n').filter((l) => l.trim() !== ENCODE_HEADER && l.trim() !== DECODE_HEADER).join('\n'));
  let out = '';
  let depth = 0, paren = 0, lineStart = true;
  const braces = []; // 'block' or 'init' (array initializer like {1, 2, 3})
  const nl = () => { out = out.replace(/[ \t]+$/, ''); out += '\n'; lineStart = true; };
  const write = (t) => {
    if (lineStart) { t = t.replace(/^\s+/, ''); if (!t) return; out += '\t'.repeat(depth); lineStart = false; }
    out += t;
  };
  for (const s of segs) {
    if (s.type !== 'code') {
      write(s.text);
      if (s.type === 'comment' && s.text.startsWith('//')) nl();
      continue;
    }
    const code = s.text
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/[ \t]*(<<=|>>=|<<|>>|==|!=|<=|>=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|&&|\|\||=|<|>)[ \t]*/g, ' $1 ');
    for (let i = 0; i < code.length; i++) {
      const c = code[i];
      if (c === '\n') { if (!lineStart && braces.at(-1) !== 'init') nl(); continue; }
      if (c === '(') paren++;
      if (c === ')') paren = Math.max(0, paren - 1);
      if (c === '{' && /=\s*$/.test(out)) {
        braces.push('init');
        write('{');
      } else if (c === '}' && braces.at(-1) === 'init') {
        braces.pop();
        out = out.replace(/[ \t]+$/, '');
        write('}');
      } else if (c === '{') {
        braces.push('block');
        out = out.replace(/[ \t]+$/, '');
        write(lineStart ? '{' : ' {');
        depth++; nl();
      } else if (c === '}') {
        braces.pop();
        if (!lineStart) nl();
        depth = Math.max(0, depth - 1);
        write('}'); nl();
      } else if (c === ';' && paren === 0) {
        write(';'); nl();
      } else if (c === ',') {
        write(', ');
        while (code[i + 1] === ' ' || code[i + 1] === '\t') i++;
      } else {
        write(c);
      }
    }
  }
  const body = out.replace(/\n{3,}/g, '\n\n').replace(/\}\n(?=\S)/g, '}\n\n').trim();
  return `${DECODE_HEADER}\n${body}\n`;
}

// ---------------------------------------------------------------- Strings -> data()

/** Splits GPC source into tokens with positions (strings and comments are single tokens). */
export function lex(src) {
  const toks = [];
  for (const s of segments(src).reduce((acc, seg) => {
    acc.push({ ...seg, start: acc.length ? acc.at(-1).start + acc.at(-1).text.length : 0 });
    return acc;
  }, [])) {
    if (s.type !== 'code') { toks.push({ t: s.type, s: s.text, start: s.start, end: s.start + s.text.length }); continue; }
    for (const m of s.text.matchAll(/(\s+)|([A-Za-z_]\w*)|(0[xX][0-9a-fA-F]+|\d+)|(.)/g)) {
      const t = m[1] ? 'ws' : m[2] ? 'ident' : m[3] ? 'num' : 'punct';
      toks.push({ t, s: m[0], start: s.start + m.index, end: s.start + m.index + m[0].length });
    }
  }
  return toks;
}

const unquote = (lit) => lit.slice(1, -1).replace(/\\(["\\])/g, '$1');

/**
 * gpc_cipher.py, extended: moves every string constant into one data() section.
 *   const string NAME = "...";          -> NAME          becomes get_str_G(i)
 *   const string NAME[] = {"a", "b"};   -> NAME[expr]    becomes get_<NAME>(expr)
 * Each lookup function returns the byte offset of the string inside data().
 */
export function stringsToData(src, groupSize = 8) {
  const toks = lex(src);
  const sig = toks.map((tk, i) => i).filter((i) => toks[i].t !== 'ws' && toks[i].t !== 'comment');
  const at = (k) => toks[sig[k]];
  const warnings = [];
  let decls = []; // { name, array, values[], start, end }

  for (let k = 0; k < sig.length; k++) {
    if (at(k).s !== 'const' || at(k + 1)?.s !== 'string' || at(k + 2)?.t !== 'ident') continue;
    const start = at(k).start;
    const name = at(k + 2).s;
    let j = k + 3;
    let array = false;
    if (at(j)?.s === '[') {
      while (at(j) && at(j).s !== ']') j++; // allow a size: NAME[34]
      array = true;
      j++;
    }
    if (at(j)?.s !== '=') continue;
    j++;
    const values = [];
    if (array) {
      if (at(j)?.s !== '{') continue;
      j++;
      let ok = true;
      while (at(j) && at(j).s !== '}') {
        if (at(j).t === 'string') values.push(unquote(at(j).s));
        else if (at(j).s !== ',') { ok = false; break; }
        j++;
      }
      if (!ok || !at(j)) continue;
      // GPC accepts an array initializer without the trailing ';'.
      if (at(j + 1)?.s === ';') j++;
    } else {
      if (at(j)?.t !== 'string') continue;
      values.push(unquote(at(j).s));
      j++;
      if (at(j)?.s !== ';') continue;
    }
    decls.push({ name, array, values, start, end: at(j).end });
    k = j;
  }
  if (decls.length === 0) {
    return { text: src, table: [], warnings: ['No string constants found (const string NAME = "..." or NAME[] = {...}).'] };
  }
  const lineOf = (p) => src.slice(0, p).split('\n').length;
  const inAnyDecl = (p) => decls.some((d) => p >= d.start && p < d.end);

  // An array used without [index] (e.g. sizeof(NAME)) cannot become a function: keep it as is.
  const kept = new Map();
  for (let k = 0; k < sig.length; k++) {
    const tk = at(k);
    const d = tk.t === 'ident' && decls.find((x) => x.array && x.name === tk.s);
    if (d && !inAnyDecl(tk.start) && at(k + 1)?.s !== '[') {
      if (!kept.has(d.name)) kept.set(d.name, []);
      kept.get(d.name).push(lineOf(tk.start));
    }
  }
  for (const [name, lines] of kept) {
    warnings.push(`${name} is used without [index] (line ${lines.join(', ')}, e.g. sizeof), so it was kept as a normal const string array.`);
  }
  decls = decls.filter((d) => !kept.has(d.name));
  if (decls.length === 0) return { text: src, table: [], warnings, declCount: 0, bytes: 0 };

  // An existing data() section: append our strings to its end so its own offsets do not move.
  let base = 0;
  let mergeAt = -1;
  const dataStarts = sig.map((_, k) => k).filter((k) => at(k).s === 'data' && at(k + 1)?.s === '(');
  if (dataStarts.length === 1) {
    let j = dataStarts[0] + 2, count = 0, ok = true, expectValue = true;
    for (; at(j) && at(j).s !== ')'; j++) {
      const s = at(j).s;
      if (expectValue && s === '-' && at(j + 1)?.t === 'num') { j++; count++; expectValue = false; }
      else if (expectValue && at(j).t === 'num') { count++; expectValue = false; }
      else if (!expectValue && s === ',') expectValue = true;
      else { ok = false; break; }
    }
    if (ok && at(j)) { base = count; mergeAt = at(j).start; }
    else warnings.push(`The existing data() section (line ${lineOf(at(dataStarts[0]).start)}) is not a plain list of numbers; merge it by hand.`);
  } else if (dataStarts.length > 1) {
    warnings.push('The script has more than one data() section; merge them by hand.');
  }

  // Pack every string (null-terminated) into one byte list.
  const bytes = [];
  const pack = (name, value) => {
    const offset = base + bytes.length;
    let lost = false;
    for (const ch of value) {
      const c = ch.codePointAt(0);
      if (c > 0xff) lost = true;
      bytes.push(c & 0xff);
    }
    bytes.push(0);
    if (lost) warnings.push(`"${name}" has characters outside Latin-1 (e.g. Arabic); the Zen cannot show them.`);
    return offset;
  };

  const table = [];
  const funcs = [];
  const scalars = decls.filter((d) => !d.array);
  scalars.forEach((d, k) => {
    const g = Math.floor(k / groupSize);
    d.call = `get_str_${g}(${k % groupSize})`;
    table.push({ name: d.name, value: d.values[0], offset: pack(d.name, d.values[0]), func: `get_str_${g}`, idx: k % groupSize });
  });
  for (let g = 0; g * groupSize < scalars.length; g++) {
    const grp = table.slice(g * groupSize, (g + 1) * groupSize);
    funcs.push(`function get_str_${g}(idx) {\n    switch (idx) {\n${grp.map((t) => `        case ${t.idx}: return ${t.offset};`).join('\n')}\n    }\n    return -1;\n}`);
  }
  for (const d of decls.filter((x) => x.array)) {
    d.func = `get_${d.name}`;
    const cases = d.values.map((v, i) => {
      const offset = pack(`${d.name}[${i}]`, v);
      table.push({ name: `${d.name}[${i}]`, value: v, offset, func: d.func, idx: i });
      return `        case ${i}: return ${offset};`;
    });
    funcs.push(`function ${d.func}(idx) {\n    switch (idx) {\n${cases.join('\n')}\n    }\n    return -1;\n}`);
  }

  const hex = bytes.map((b) => `0x${b.toString(16).toUpperCase().padStart(2, '0')}`);
  const hexLines = [];
  for (let i = 0; i < hex.length; i += 20) hexLines.push(hex.slice(i, i + 20).join(','));

  // Edits on the original text: remove declarations, rewrite uses, merge data.
  const edits = decls.map((d) => ({ start: d.start, end: d.end, text: '' }));
  if (mergeAt >= 0) {
    edits.push({ start: mergeAt, end: mergeAt, text: `,\n    // strings (auto-generated, offset ${base}+)\n    ${hexLines.join(',\n    ')}` });
  }
  const byName = new Map(decls.map((d) => [d.name, d]));
  const inDecl = (p) => decls.some((d) => p >= d.start && p < d.end);
  for (let k = 0; k < sig.length; k++) {
    const tk = at(k);
    const d = tk.t === 'ident' && byName.get(tk.s);
    if (!d || inDecl(tk.start)) continue;
    if (!d.array) { edits.push({ start: tk.start, end: tk.end, text: d.call }); continue; }
    if (at(k + 1)?.s !== '[') continue;
    let depth = 0, j = k + 1;
    for (; j < sig.length; j++) {
      if (at(j).s === '[') depth++;
      if (at(j).s === ']' && --depth === 0) break;
    }
    if (j >= sig.length) continue;
    const inner = src.slice(at(k + 1).end, at(j).start);
    edits.push({ start: tk.start, end: at(j).end, text: `${d.func}(${inner})` });
    k = j;
  }
  let rest = src;
  for (const e of edits.sort((a, b) => b.start - a.start)) rest = rest.slice(0, e.start) + e.text + rest.slice(e.end);
  rest = rest.replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n').replace(/^\n+/, '').replace(/\s*$/, '\n');

  // data() goes first (unless merged); the lookup functions go last, after main/combos.
  const header = '// ──────────────────────────────────────\n// String data section  (auto-generated)\n// ──────────────────────────────────────\n';
  const dataBlock = mergeAt >= 0 ? '' : `${header}data(${hexLines.join(',\n')});\n\n`;
  const funcBlock = `\n// String lookup functions (auto-generated)\n${funcs.join('\n\n')}\n`;
  const text = `${dataBlock}${rest}${funcBlock}`;
  return { text, table, warnings, declCount: decls.length, bytes: bytes.length, merged: mergeAt >= 0, base };
}

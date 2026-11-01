// Bitmap <-> GPC code: export as const image / packed arrays / pixel_oled lines, and import back.
import { Bitmap, OLED_W, OLED_H } from './oled.js';

export const EXPORT_FORMATS = [
  ['image', 'const image + image_oled (fastest, smallest)'],
  ['packed16', '16-bit packed array + draw function'],
  ['packed8', '8-bit packed array + draw function'],
  ['pixels', 'Individual pixel_oled lines'],
];

/** GPC-safe identifier from free text. */
export function gpcIdent(text, fallback = 'LOGO') {
  let s = String(text ?? '').normalize('NFKD').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
  if (!s) s = fallback;
  if (/^[0-9]/.test(s)) s = `_${s}`;
  return s.slice(0, 24);
}

/** Packs the region's pixels row by row into a continuous MSB-first bit stream. */
function packBits(bm, r, bits, color) {
  const out = [];
  let cur = 0, n = 0;
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      cur = (cur << 1) | (bm.get(x, y) === color ? 1 : 0);
      if (++n === bits) { out.push(cur); cur = 0; n = 0; }
    }
  }
  if (n) out.push(cur << (bits - n));
  return out;
}

const hex = (v, d) => `0x${v.toString(16).toUpperCase().padStart(d, '0')}`;

function chunk(list, per, indent) {
  const lines = [];
  for (let i = 0; i < list.length; i += per) lines.push(indent + list.slice(i, i + per).join(', '));
  return lines.join(',\n');
}

/**
 * Builds the GPC for a bitmap.
 * opts: { format, name, trim, color: 'auto'|'white'|'black', invertSupport }
 * Returns { code, call, draw, bytes, region, color } where:
 *   code  = declarations (data + draw function) to put at file scope
 *   call  = the statement that draws it, e.g. "draw_LOGO(0);"
 */
export function exportBitmap(bm, opts = {}) {
  const name = gpcIdent(opts.name);
  const format = opts.format ?? 'image';
  const whites = bm.count();
  // Pack the minority colour so the drawing loop touches fewer pixels.
  let color = opts.color === 'black' ? 0 : opts.color === 'white' ? 1 : (whites <= bm.data.length - whites ? 1 : 0);
  let region = opts.trim === false ? null : bm.bounds(color);
  if (!region) region = { x: 0, y: 0, w: opts.trim === false ? OLED_W : 1, h: opts.trim === false ? OLED_H : 1 };
  const bg = color ? 0 : 1; // screen colour behind the packed pixels
  const inv = opts.invertSupport;
  const fn = `draw_${name}`;
  const lines = [];
  let bytes = 0;

  if (format === 'image') {
    const data = packBits(bm, region, 8, color);
    bytes = data.length + 2;
    lines.push(`const image ${name} = {${region.w}, ${region.h},`);
    lines.push(`${chunk(data.map((v) => hex(v, 2)), 24, '    ')}`);
    lines.push('};');
    lines.push('');
    lines.push(inv ? `function ${fn}(invert) {` : `function ${fn}() {`);
    if (inv) {
      lines.push(`    if (invert) { cls_oled(${color}); image_oled(${region.x}, ${region.y}, ${bg}, FALSE, ${name}[0]); }`);
      lines.push(`    else { cls_oled(${bg}); image_oled(${region.x}, ${region.y}, ${color}, FALSE, ${name}[0]); }`);
    } else {
      lines.push(`    cls_oled(${bg});`);
      lines.push(`    image_oled(${region.x}, ${region.y}, ${color}, FALSE, ${name}[0]);`);
    }
    lines.push('}');
  } else if (format === 'packed16' || format === 'packed8') {
    const bits = format === 'packed16' ? 16 : 8;
    const data = packBits(bm, region, bits, color);
    bytes = (data.length + 2) * (bits / 8);
    const type = bits === 16 ? 'int16' : 'uint8';
    lines.push(`const ${type} ${name}[] = {${region.w}, ${region.h},`);
    lines.push(`${chunk(data.map((v) => hex(v, bits / 4)), bits === 16 ? 16 : 24, '    ')}`);
    lines.push('};');
    lines.push('');
    const v = `_${name}`;
    lines.push(`int ${v}X, ${v}Y, ${v}Bit, ${v}Pos, ${v}Word, ${v}On, ${v}Off;`);
    lines.push(inv ? `function ${fn}(invert) {` : `function ${fn}() {`);
    lines.push(`    ${v}On = ${color}; ${v}Off = ${bg};`);
    if (inv) lines.push(`    if (invert) { ${v}On = ${bg}; ${v}Off = ${color}; }`);
    lines.push(`    cls_oled(${v}Off);`);
    lines.push(`    ${v}Pos = 1;`);
    lines.push(`    ${v}Bit = 0;`);
    lines.push(`    for (${v}Y = 0; ${v}Y < ${name}[1]; ${v}Y++) {`);
    lines.push(`        for (${v}X = 0; ${v}X < ${name}[0]; ${v}X++) {`);
    lines.push(`            if (!${v}Bit) { ${v}Bit = ${bits}; ${v}Pos++; ${v}Word = ${name}[${v}Pos]; }`);
    lines.push(`            ${v}Bit--;`);
    lines.push(`            if (test_bit(${v}Word, ${v}Bit)) pixel_oled(${region.x} + ${v}X, ${region.y} + ${v}Y, ${v}On);`);
    lines.push('        }');
    lines.push('    }');
    lines.push('}');
  } else {
    const cells = [];
    for (let y = 0; y < bm.h; y++) for (let x = 0; x < bm.w; x++) if (bm.get(x, y) === color) cells.push([x, y]);
    bytes = cells.length * 6;
    lines.push(inv ? `int _${name}On;` : '');
    lines.push(inv ? `function ${fn}(invert) {` : `function ${fn}() {`);
    if (inv) {
      lines.push(`    _${name}On = ${color};`);
      lines.push(`    if (invert) _${name}On = ${bg};`);
      lines.push(`    cls_oled(!_${name}On);`);
      for (const [x, y] of cells) lines.push(`    pixel_oled(${x}, ${y}, _${name}On);`);
    } else {
      lines.push(`    cls_oled(${bg});`);
      for (const [x, y] of cells) lines.push(`    pixel_oled(${x}, ${y}, ${color});`);
    }
    lines.push('}');
  }

  const call = inv ? `${fn}(FALSE);` : `${fn}();`;
  return { code: lines.filter((l, i) => l !== '' || i > 0).join('\n').trim(), call, draw: fn, bytes, region, color, name };
}

/** A complete script that only shows the logo; used for the compile check and quick tests. */
export function previewScript(exp, title = 'Logo preview') {
  return [
    `// ${title} - generated by ASTRO APP Make Your GPC`,
    exp.code,
    '',
    'init {',
    `    ${exp.call}`,
    '}',
    '',
    'main {',
    '}',
    '',
  ].join('\n');
}

/**
 * Reads packed image data back from GPC source: `const image X = {w,h,...}`, uint8/int16 arrays,
 * Excalibur `w, h, 0x...` lists, or plain pixel_oled lines.
 */
export function importPacked(text) {
  const src = String(text ?? '');
  const bm = new Bitmap();
  const pixelRe = /pixel_oled\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\w+)\s*\)/g;
  const pix = [...src.matchAll(pixelRe)];
  if (pix.length && !/[{]/.test(src.replace(/function[^{]*\{/g, ''))) {
    for (const m of pix) bm.set(+m[1], +m[2], m[3] !== '0' && m[3].toUpperCase() !== 'FALSE' && m[3] !== 'OLED_BLACK');
    return { bitmap: bm, info: `${pix.length} pixel_oled lines` };
  }
  let bits = 16;
  if (/const\s+(image|u?int8|byte)\b/.test(src)) bits = 8;
  const body = src.includes('{') ? src.slice(src.indexOf('{') + 1, src.indexOf('}', src.indexOf('{'))) : src;
  const nums = [...body.matchAll(/0x[0-9a-fA-F]+|-?\d+/g)].map((m) => Number(m[0]));
  if (nums.length < 3) throw new Error('No packed data found. Paste a const image / array with width, height and data.');
  const [w, h, ...data] = nums;
  if (w < 1 || h < 1 || w > OLED_W || h > OLED_H) throw new Error(`Invalid size ${w}x${h}. The OLED is ${OLED_W}x${OLED_H}.`);
  if (bits === 16 && data.every((v) => v >= 0 && v <= 0xFF) && data.length >= Math.ceil((w * h) / 8)) bits = 8;
  let pos = 0, bit = 0, word = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!bit) { bit = bits; word = (data[pos++] ?? 0) & (bits === 16 ? 0xFFFF : 0xFF); }
      bit--;
      bm.set(x, y, (word >> bit) & 1);
    }
  }
  return { bitmap: bm, info: `${w}x${h}, ${bits}-bit` };
}

// 128x64 monochrome bitmap for the Cronus Zen OLED (1 = white pixel).

export const OLED_W = 128;
export const OLED_H = 64;

export class Bitmap {
  constructor(w = OLED_W, h = OLED_H, data = null) {
    this.w = w;
    this.h = h;
    this.data = data ?? new Uint8Array(w * h);
  }

  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.data[y * this.w + x] : 0; }
  set(x, y, v) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = v ? 1 : 0; }
  clone() { return new Bitmap(this.w, this.h, new Uint8Array(this.data)); }
  equals(o) { return o && o.w === this.w && o.h === this.h && this.data.every((v, i) => v === o.data[i]); }
  copyFrom(o) { this.data.set(o.data); }
  clear(v = 0) { this.data.fill(v ? 1 : 0); }
  invert() { for (let i = 0; i < this.data.length; i++) this.data[i] ^= 1; }
  count() { let n = 0; for (const v of this.data) n += v; return n; }

  /** Moves every pixel by (dx, dy); pixels pushed off one edge reappear on the other when wrap is set. */
  shift(dx, dy, wrap = false) {
    const src = new Uint8Array(this.data);
    this.data.fill(0);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        let nx = x + dx, ny = y + dy;
        if (wrap) { nx = (nx + this.w) % this.w; ny = (ny + this.h) % this.h; }
        if (nx >= 0 && ny >= 0 && nx < this.w && ny < this.h) this.data[ny * this.w + nx] = src[y * this.w + x];
      }
    }
  }

  /** mode: 'replace' | 'whites' (keep existing white, add new white) | 'blacks' (keep existing, add new black). */
  merge(o, mode = 'replace') {
    for (let i = 0; i < this.data.length; i++) {
      if (mode === 'whites') this.data[i] = this.data[i] | o.data[i];
      else if (mode === 'blacks') this.data[i] = this.data[i] & o.data[i];
      else this.data[i] = o.data[i];
    }
  }

  /** Bounding box of pixels equal to `color`, or null when there are none. */
  bounds(color = 1) {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.data[y * this.w + x] === color) {
          if (x < x0) x0 = x; if (y < y0) y0 = y;
          if (x > x1) x1 = x; if (y > y1) y1 = y;
        }
      }
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  /** Compact string for storage: base64 of the bits, 8 per byte, MSB first. */
  encode() {
    const bytes = new Uint8Array(Math.ceil(this.data.length / 8));
    for (let i = 0; i < this.data.length; i++) if (this.data[i]) bytes[i >> 3] |= 0x80 >> (i & 7);
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }

  static decode(str, w = OLED_W, h = OLED_H) {
    const bm = new Bitmap(w, h);
    try {
      const s = atob(str);
      for (let i = 0; i < bm.data.length; i++) bm.data[i] = (s.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
    } catch { /* corrupt or missing: stay blank */ }
    return bm;
  }
}

/**
 * Draws a bitmap on a canvas, one cell per pixel at `scale`.
 * opts: { on, off, grid, hover: {x,y}, crosshair }
 */
export function renderBitmap(canvas, bm, scale, opts = {}) {
  const on = opts.on ?? '#f2f4f8';
  const off = opts.off ?? '#050506';
  const w = bm.w * scale, h = bm.h * scale;
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const g = canvas.getContext('2d');
  g.fillStyle = off;
  g.fillRect(0, 0, w, h);
  g.fillStyle = on;
  for (let y = 0; y < bm.h; y++) {
    for (let x = 0; x < bm.w; x++) {
      if (bm.data[y * bm.w + x]) g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  if (opts.grid && scale >= 4) {
    g.strokeStyle = 'rgba(255,255,255,0.06)';
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 1; x < bm.w; x++) { g.moveTo(x * scale + 0.5, 0); g.lineTo(x * scale + 0.5, h); }
    for (let y = 1; y < bm.h; y++) { g.moveTo(0, y * scale + 0.5); g.lineTo(w, y * scale + 0.5); }
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.14)';
    g.beginPath();
    g.moveTo(64 * scale + 0.5, 0); g.lineTo(64 * scale + 0.5, h);
    g.moveTo(0, 32 * scale + 0.5); g.lineTo(w, 32 * scale + 0.5);
    g.stroke();
  }
  if (opts.hover) {
    const { x, y } = opts.hover;
    if (opts.crosshair) {
      g.fillStyle = 'rgba(120,170,255,0.10)';
      g.fillRect(0, y * scale, w, scale);
      g.fillRect(x * scale, 0, scale, h);
    }
    if (opts.pen) {
      g.strokeStyle = 'rgba(120,170,255,0.9)';
      g.lineWidth = 1;
      for (const [px, py] of opts.pen) g.strokeRect(px * scale + 0.5, py * scale + 0.5, scale - 1, scale - 1);
    }
  }
}

/** Cells covered by a pen of `size` with `shape` ('square' | 'round') centred on (cx, cy). */
export function penCells(cx, cy, size, shape) {
  const cells = [];
  const r = (size - 1) / 2;
  const start = -Math.floor(r), end = Math.ceil(r);
  for (let dy = start; dy <= end; dy++) {
    for (let dx = start; dx <= end; dx++) {
      if (shape === 'round' && size > 2 && dx * dx + dy * dy > (r + 0.35) * (r + 0.35)) continue;
      cells.push([cx + dx, cy + dy]);
    }
  }
  return cells;
}

/** Bresenham line so fast mouse drags leave no gaps. */
export function lineCells(x0, y0, x1, y1) {
  const out = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return out;
}

// Logo Studio: turn images and text into a 128x64 OLED logo and export it as GPC.
// Feature set modelled on Swizzy's Cronus Zen Message Screen Studio, written from scratch for ASTRO APP.
import { Bitmap, OLED_W, OLED_H, renderBitmap, penCells, lineCells } from './oled.js';
import { toMono, DITHER_OPTIONS } from './dither.js';
import { EXPORT_FORMATS, exportBitmap, importPacked, previewScript } from './gpc-image.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const FONT_FAMILIES = [
  'Segoe UI', 'Segoe UI Black', 'Bahnschrift', 'Arial', 'Arial Black', 'Impact', 'Verdana', 'Tahoma',
  'Trebuchet MS', 'Georgia', 'Times New Roman', 'Consolas', 'Courier New', 'Lucida Console', 'Cascadia Mono',
  'Segoe Script', 'Comic Sans MS', 'Sakkal Majalla', 'Arabic Typesetting', 'Traditional Arabic', 'Simplified Arabic',
];

export const FRAME_STYLES = [
  ['none', 'No frame'],
  ['box', 'Box'],
  ['double', 'Double box'],
  ['rounded', 'Rounded box'],
  ['corners', 'Corner brackets'],
  ['underline', 'Underline bar'],
  ['bars', 'Top & bottom bars'],
];

const POSITIONS = [
  ['tl', 'Top left'], ['tc', 'Top center'], ['tr', 'Top right'],
  ['cl', 'Center left'], ['cc', 'Center'], ['cr', 'Center right'],
  ['bl', 'Bottom left'], ['bc', 'Bottom center'], ['br', 'Bottom right'],
];

const anchor = (pos, free, axis) => {
  const c = axis === 'x' ? pos[1] : pos[0];
  if (c === 'l' || c === 't') return 0;
  if (c === 'r' || c === 'b') return free;
  return free / 2;
};

// ---------------------------------------------------------------------- layers

/** Rasterises an image source (ImageBitmap / canvas) with the given options into a 1-bit layer. */
export function renderImageLayer(src, o) {
  const cv = document.createElement('canvas');
  cv.width = OLED_W; cv.height = OLED_H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = o.smooth !== false;
  g.imageSmoothingQuality = 'high';

  const areaW = Math.max(1, OLED_W - o.mLeft - o.mRight);
  const areaH = Math.max(1, OLED_H - o.mTop - o.mBottom);
  const rotated = ((o.rotate % 180) + 180) % 180 === 90;
  const sw = rotated ? src.height : src.width;
  const sh = rotated ? src.width : src.height;
  let k;
  if (o.fit === 'fill') k = Math.max(areaW / sw, areaH / sh);
  else if (o.fit === 'none') k = 1;
  else k = Math.min(areaW / sw, areaH / sh);
  k *= o.scale / 100;
  let dw = sw * k, dh = sh * k;
  if (o.fit === 'stretch') { dw = areaW * (o.scale / 100); dh = areaH * (o.scale / 100); }
  const dx = o.mLeft + anchor(o.pos, areaW - dw, 'x') + o.offX;
  const dy = o.mTop + anchor(o.pos, areaH - dh, 'y') + o.offY;

  g.save();
  g.translate(dx + dw / 2, dy + dh / 2);
  g.rotate((o.rotate * Math.PI) / 180);
  g.scale(o.flipH ? -1 : 1, o.flipV ? -1 : 1);
  const iw = rotated ? dh : dw, ih = rotated ? dw : dh;
  g.drawImage(src, -iw / 2, -ih / 2, iw, ih);
  g.restore();

  const px = g.getImageData(0, 0, OLED_W, OLED_H).data;
  const bits = toMono(px, OLED_W, OLED_H, {
    threshold: o.threshold, invert: o.invert, hsl: o.hsl, method: o.dither,
    brightness: o.brightness, contrast: o.contrast, alphaBg: o.whiteBg ? 1 : 0,
  });
  return new Bitmap(OLED_W, OLED_H, bits);
}

function fontString(o, size) {
  return `${o.italic ? 'italic ' : ''}${o.bold ? '700 ' : ''}${size}px "${o.family}", "Segoe UI", sans-serif`;
}

function measureText(g, lines, o, size) {
  g.font = fontString(o, size);
  if ('letterSpacing' in g) g.letterSpacing = `${o.spacing || 0}px`;
  let w = 0, top = 0, bottom = 0;
  const metrics = lines.map((ln) => g.measureText(ln || ' '));
  for (const m of metrics) {
    w = Math.max(w, m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
    top = Math.max(top, m.actualBoundingBoxAscent);
    bottom = Math.max(bottom, m.actualBoundingBoxDescent);
  }
  const lineH = Math.ceil(size * (o.lineHeight ?? 1.1));
  const h = top + bottom + lineH * (lines.length - 1);
  return { w, h, top, lineH, metrics };
}

/** Largest font size whose text box fits in maxW x maxH. */
export function fitTextSize(text, o, maxW, maxH) {
  const g = document.createElement('canvas').getContext('2d');
  const lines = String(text || ' ').split('\n');
  let lo = 4, hi = 96;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const m = measureText(g, lines, o, mid);
    if (m.w <= maxW && m.h <= maxH) lo = mid; else hi = mid - 1;
  }
  return lo;
}

/** Renders text into a 1-bit layer. o: {text, family, size, bold, italic, spacing, align, pos, offX, offY, threshold, black} */
export function renderTextLayer(o) {
  const cv = document.createElement('canvas');
  cv.width = OLED_W; cv.height = OLED_H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const lines = String(o.text ?? '').split('\n');
  const m = measureText(g, lines, o, o.size);
  const x0 = anchor(o.pos, OLED_W - m.w, 'x') + o.offX;
  const y0 = anchor(o.pos, OLED_H - m.h, 'y') + o.offY;
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  lines.forEach((ln, i) => {
    const mt = m.metrics[i];
    const lw = mt.actualBoundingBoxLeft + mt.actualBoundingBoxRight;
    let lx = x0;
    if (o.align === 'center') lx = x0 + (m.w - lw) / 2;
    else if (o.align === 'right') lx = x0 + (m.w - lw);
    g.fillText(ln, Math.round(lx + mt.actualBoundingBoxLeft), Math.round(y0 + m.top + i * m.lineH));
  });
  const px = g.getImageData(0, 0, OLED_W, OLED_H).data;
  // Text is drawn white on transparent: alpha carries the glyph shape.
  const bits = new Uint8Array(OLED_W * OLED_H);
  for (let i = 0; i < bits.length; i++) {
    const on = px[i * 4 + 3] >= (o.threshold ?? 110);
    bits[i] = on !== !!o.black ? 1 : 0;
  }
  return new Bitmap(OLED_W, OLED_H, bits);
}

/** Draws a decorative frame onto a bitmap (white). */
export function drawFrame(bm, style) {
  const W = bm.w - 1, H = bm.h - 1;
  const hline = (x0, x1, y) => { for (let x = x0; x <= x1; x++) bm.set(x, y, 1); };
  const vline = (x, y0, y1) => { for (let y = y0; y <= y1; y++) bm.set(x, y, 1); };
  const rect = (x0, y0, x1, y1) => { hline(x0, x1, y0); hline(x0, x1, y1); vline(x0, y0, y1); vline(x1, y0, y1); };
  if (style === 'box') rect(0, 0, W, H);
  else if (style === 'double') { rect(0, 0, W, H); rect(2, 2, W - 2, H - 2); }
  else if (style === 'rounded') {
    hline(3, W - 3, 0); hline(3, W - 3, H); vline(0, 3, H - 3); vline(W, 3, H - 3);
    for (const [x, y] of [[1, 2], [2, 1], [W - 1, 2], [W - 2, 1], [1, H - 2], [2, H - 1], [W - 1, H - 2], [W - 2, H - 1]]) bm.set(x, y, 1);
  } else if (style === 'corners') {
    const L = 12;
    hline(0, L, 0); vline(0, 0, L); hline(W - L, W, 0); vline(W, 0, L);
    hline(0, L, H); vline(0, H - L, H); hline(W - L, W, H); vline(W, H - L, H);
  } else if (style === 'underline') { hline(14, W - 14, H - 6); hline(24, W - 24, H - 4); }
  else if (style === 'bars') { hline(0, W, 1); hline(0, W, 2); hline(0, W, H - 1); hline(0, W, H - 2); }
}

// ---------------------------------------------------------------------- studio UI

const IMAGE_DEFAULTS = {
  fit: 'fit', pos: 'cc', scale: 100, offX: 0, offY: 0, mTop: 0, mBottom: 0, mLeft: 0, mRight: 0,
  rotate: 0, flipH: false, flipV: false, threshold: 128, brightness: 0, contrast: 0,
  dither: 'floyd', hsl: false, invert: false, whiteBg: false, smooth: true, merge: 'replace', frame: 0,
};

const TEXT_DEFAULTS = {
  text: 'ASTRO', family: 'Segoe UI Black', size: 24, autoSize: true, bold: false, italic: false, spacing: 0,
  align: 'center', pos: 'cc', offX: 0, offY: 0, threshold: 110, black: false, merge: 'whites',
};

export class LogoStudio {
  /**
   * host: element to render into
   * opts: { bitmap, exportOptions, name, onChange(bitmap), onExportChange(opts), toast, modal, compile(src), openInCompiler(name, text) }
   */
  constructor(host, opts) {
    this.host = host;
    this.o = opts;
    this.bm = opts.bitmap ? opts.bitmap.clone() : new Bitmap();
    this.undo = [];
    this.redo = [];
    this.pen = { color: 1, size: 1, shape: 'square' };
    this.view = { grid: true, crosshair: false };
    this.mode = 'export'; // export | image | text
    this.base = null;
    this.img = { ...IMAGE_DEFAULTS };
    this.txt = { ...TEXT_DEFAULTS, text: opts.name || TEXT_DEFAULTS.text };
    this.exp = { format: 'image', color: 'auto', trim: true, invertSupport: false, ...(opts.exportOptions ?? {}) };
    this.source = null; // { bitmap: ImageBitmap, decoder, frames, frame, name }
    this.hover = null;
    this.scale = 6;
    this._build();
  }

  // ---------- public
  get bitmap() { return this.bm; }
  setName(name) { this.o.name = name; if (this.mode === 'export') this._renderPanel(); }
  setBitmap(bm, record = true) {
    if (record) this._pushUndo();
    this.bm = bm.clone();
    this._changed();
  }
  destroy() { this._ro?.disconnect(); this.host.innerHTML = ''; }

  // ---------- layout
  _build() {
    this.host.innerHTML = `
      <div class="ls">
        <div class="ls-toolbar">
          <div class="ls-group">
            <button class="btn btn-sm" data-a="image">Load image</button>
            <button class="btn btn-sm" data-a="text">Text</button>
            <button class="btn btn-sm" data-a="import">Import packed</button>
          </div>
          <div class="ls-group" title="Left click draws with the pen colour, right click with the other one">
            <span class="ls-lbl">Pen</span>
            <button class="ls-swatch on" data-pen="1" title="White pixels"></button>
            <button class="ls-swatch off" data-pen="0" title="Black pixels"></button>
            <select class="ls-sel" data-k="size" title="Pen size">${[1, 2, 3, 4, 5, 6, 8, 10].map((s) => `<option value="${s}">${s}px</option>`).join('')}</select>
            <select class="ls-sel" data-k="shape" title="Pen shape"><option value="square">Square</option><option value="round">Round</option></select>
          </div>
          <div class="ls-group">
            <button class="icon-btn" data-a="undo" title="Undo (Ctrl+Z)">&#x21B6;</button>
            <button class="icon-btn" data-a="redo" title="Redo (Ctrl+Y)">&#x21B7;</button>
            <button class="btn btn-sm" data-a="clear">Clear</button>
            <button class="btn btn-sm" data-a="invert">Invert</button>
          </div>
          <div class="ls-group" title="Shift every pixel (arrow keys on the canvas, Shift = 8px)">
            <span class="ls-lbl">Shift</span>
            <button class="icon-btn" data-shift="-1,0">&#x2190;</button>
            <button class="icon-btn" data-shift="0,-1">&#x2191;</button>
            <button class="icon-btn" data-shift="0,1">&#x2193;</button>
            <button class="icon-btn" data-shift="1,0">&#x2192;</button>
            <label class="ls-chk"><input type="checkbox" data-k="wrap"><span>Wrap</span></label>
          </div>
          <div class="ls-group ls-right">
            <label class="ls-chk"><input type="checkbox" data-k="grid" checked><span>Grid</span></label>
            <label class="ls-chk"><input type="checkbox" data-k="crosshair"><span>Row/col</span></label>
          </div>
        </div>
        <div class="ls-body">
          <div class="ls-stage">
            <div class="ls-canvas-wrap"><canvas class="ls-canvas" tabindex="0"></canvas></div>
            <div class="ls-status"><span class="ls-xy">x -, y -</span><span class="ls-count"></span></div>
          </div>
          <aside class="ls-panel"></aside>
        </div>
        <input type="file" class="hidden ls-file" accept="image/*,.gif,.bmp,.webp,.png,.jpg,.jpeg">
      </div>`;
    const $ = (s) => this.host.querySelector(s);
    this.cv = $('.ls-canvas');
    this.wrap = $('.ls-canvas-wrap');
    this.panel = $('.ls-panel');
    this.fileInput = $('.ls-file');

    this.host.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => this._action(b.dataset.a)));
    this.host.querySelectorAll('[data-shift]').forEach((b) => b.addEventListener('click', () => {
      const [dx, dy] = b.dataset.shift.split(',').map(Number);
      this._shift(dx, dy);
    }));
    this.host.querySelectorAll('[data-pen]').forEach((b) => b.addEventListener('click', () => { this.pen.color = +b.dataset.pen; this._syncToolbar(); }));
    $('[data-k="size"]').addEventListener('change', (e) => { this.pen.size = +e.target.value; });
    $('[data-k="shape"]').addEventListener('change', (e) => { this.pen.shape = e.target.value; });
    $('[data-k="grid"]').addEventListener('change', (e) => { this.view.grid = e.target.checked; this._draw(); });
    $('[data-k="crosshair"]').addEventListener('change', (e) => { this.view.crosshair = e.target.checked; this._draw(); });
    this.wrapToggle = $('[data-k="wrap"]');
    this.fileInput.addEventListener('change', () => { const f = this.fileInput.files?.[0]; this.fileInput.value = ''; if (f) this._loadFile(f); });

    this._bindCanvas();
    this._ro = new ResizeObserver(() => this._fit());
    this._ro.observe(this.wrap);
    this._syncToolbar();
    this._renderPanel();
    this._fit();
  }

  _syncToolbar() {
    this.host.querySelectorAll('[data-pen]').forEach((b) => b.classList.toggle('active', +b.dataset.pen === this.pen.color));
    const u = this.host.querySelector('[data-a="undo"]'), r = this.host.querySelector('[data-a="redo"]');
    u.disabled = !this.undo.length; r.disabled = !this.redo.length;
    this.host.querySelector('.ls-count').textContent = `${this.bm.count()} white px`;
  }

  _fit() {
    const r = this.wrap.getBoundingClientRect();
    const s = Math.max(2, Math.floor(Math.min((r.width - 4) / OLED_W, (r.height - 4) / OLED_H)));
    if (s !== this.scale || !this.cv.width) { this.scale = s; }
    this._draw();
  }

  _draw() {
    let pen = null;
    if (this.hover && this.mode === 'export') pen = penCells(this.hover.x, this.hover.y, this.pen.size, this.pen.shape);
    renderBitmap(this.cv, this.bm, this.scale, { grid: this.view.grid, hover: this.hover, crosshair: this.view.crosshair, pen });
  }

  _changed() {
    this._draw();
    this._syncToolbar();
    if (this.mode === 'export') this._refreshExport();
    this.o.onChange?.(this.bm);
  }

  _pushUndo() {
    this.undo.push(this.bm.clone());
    if (this.undo.length > 100) this.undo.shift();
    this.redo = [];
  }

  // ---------- canvas input
  _bindCanvas() {
    let drawing = false, last = null, color = 1;
    const cell = (e) => {
      const r = this.cv.getBoundingClientRect();
      return { x: Math.floor(((e.clientX - r.left) / r.width) * OLED_W), y: Math.floor(((e.clientY - r.top) / r.height) * OLED_H) };
    };
    const paint = (p) => {
      const pts = last ? lineCells(last.x, last.y, p.x, p.y) : [[p.x, p.y]];
      for (const [x, y] of pts) for (const [cx, cy] of penCells(x, y, this.pen.size, this.pen.shape)) this.bm.set(cx, cy, color);
      last = p;
    };
    this.cv.addEventListener('contextmenu', (e) => e.preventDefault());
    this.cv.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'export') { this.o.toast?.('Apply or cancel the image/text first.', 'error'); return; }
      this.cv.focus();
      this.cv.setPointerCapture(e.pointerId);
      drawing = true; last = null;
      color = e.button === 2 ? 1 - this.pen.color : this.pen.color;
      this._pushUndo();
      paint(cell(e));
      this._draw();
    });
    this.cv.addEventListener('pointermove', (e) => {
      const p = cell(e);
      this.hover = p;
      this.host.querySelector('.ls-xy').textContent = `x ${p.x}, y ${p.y}`;
      if (drawing) paint(p);
      this._draw();
    });
    const end = () => {
      if (!drawing) return;
      drawing = false; last = null;
      if (this.undo.length && this.undo[this.undo.length - 1].equals(this.bm)) this.undo.pop();
      this._changed();
    };
    this.cv.addEventListener('pointerup', end);
    this.cv.addEventListener('pointercancel', end);
    this.cv.addEventListener('pointerleave', () => { this.hover = null; this._draw(); });
    this.cv.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 8 : 1;
      const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (map[e.key] && this.mode === 'export') { e.preventDefault(); this._shift(...map[e.key]); return; }
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); this._action(e.shiftKey ? 'redo' : 'undo'); }
      else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); this._action('redo'); }
    });
  }

  _shift(dx, dy) {
    if (this.mode !== 'export') return;
    this._pushUndo();
    this.bm.shift(dx, dy, this.wrapToggle.checked);
    this._changed();
  }

  async _action(a) {
    if (a === 'image') { this.fileInput.click(); return; }
    if (a === 'text') { this._enterLayer('text'); return; }
    if (a === 'import') { this._importDialog(); return; }
    if (this.mode !== 'export' && a !== 'undo' && a !== 'redo') { this.o.toast?.('Apply or cancel the image/text first.', 'error'); return; }
    if (a === 'undo' && this.undo.length && this.mode === 'export') { this.redo.push(this.bm.clone()); this.bm = this.undo.pop(); this._changed(); }
    else if (a === 'redo' && this.redo.length && this.mode === 'export') { this.undo.push(this.bm.clone()); this.bm = this.redo.pop(); this._changed(); }
    else if (a === 'clear') { this._pushUndo(); this.bm.clear(0); this._changed(); }
    else if (a === 'invert') { this._pushUndo(); this.bm.invert(); this._changed(); }
  }

  // ---------- image / text layers (live preview over a base snapshot)
  _enterLayer(kind) {
    if (this.mode === 'export') this.base = this.bm.clone();
    this.mode = kind;
    this._renderPanel();
    this._updateLayer();
  }

  _updateLayer() {
    if (!this.base) return;
    let layer;
    let merge;
    if (this.mode === 'image') {
      if (!this.source) return;
      layer = renderImageLayer(this.source.bitmap, this.img);
      merge = this.img.merge;
    } else {
      const t = this.txt;
      if (t.autoSize) t.size = fitTextSize(t.text, t, OLED_W - 6, OLED_H - 6);
      layer = renderTextLayer(t);
      merge = t.merge;
      const sz = this.panel.querySelector('[data-t="size"]');
      if (sz && t.autoSize) { sz.value = t.size; sz.nextElementSibling && (sz.nextElementSibling.textContent = t.size); }
    }
    const out = this.base.clone();
    out.merge(layer, merge);
    this.bm = out;
    this._draw();
    this._syncToolbar();
  }

  _applyLayer(ok) {
    if (!this.base) return;
    if (ok) {
      if (!this.base.equals(this.bm)) { this.undo.push(this.base); this.redo = []; }
    } else {
      this.bm = this.base;
    }
    this.base = null;
    this.mode = 'export';
    this._renderPanel();
    this._changed();
  }

  async _loadFile(file) {
    try {
      let bitmap, decoder = null, frames = 1;
      if (/gif$/i.test(file.type) && 'ImageDecoder' in window) {
        decoder = new ImageDecoder({ data: await file.arrayBuffer(), type: file.type });
        await decoder.tracks.ready;
        frames = decoder.tracks.selectedTrack?.frameCount ?? 1;
        const { image } = await decoder.decode({ frameIndex: 0 });
        bitmap = await createImageBitmap(image);
        image.close();
      } else {
        bitmap = await createImageBitmap(file);
      }
      this.source = { bitmap, decoder, frames, frame: 0, name: file.name };
      this._enterLayer('image');
      this.o.toast?.(`Loaded ${file.name} (${bitmap.width}x${bitmap.height}${frames > 1 ? `, ${frames} frames` : ''}).`, 'ok');
    } catch (e) {
      this.o.toast?.(`Could not load image: ${e?.message ?? e}`, 'error');
    }
  }

  async _selectFrame(i) {
    const s = this.source;
    if (!s?.decoder) return;
    const { image } = await s.decoder.decode({ frameIndex: i });
    s.bitmap.close?.();
    s.bitmap = await createImageBitmap(image);
    image.close();
    s.frame = i;
    this._updateLayer();
  }

  async _importDialog() {
    if (this.mode !== 'export') { this.o.toast?.('Apply or cancel the image/text first.', 'error'); return; }
    const ok = await this.o.modal({
      title: 'Import packed data',
      html: `<p>Paste a <code>const image</code>, an <code>int16</code>/<code>uint8</code> picture array (width, height, data) or <code>pixel_oled</code> lines.</p>
        <textarea id="lsImportText" class="ls-textarea" spellcheck="false" placeholder="const image logo = {128, 64, 0x00, ...};"></textarea>
        <label class="opt"><span>Merge with current drawing</span><input type="checkbox" id="lsImportMerge"></label>`,
      buttons: [{ label: 'Cancel', value: false }, { label: 'Import', value: true, primary: true }],
      dismiss: false,
    });
    if (!ok) return;
    try {
      const { bitmap, info } = importPacked(document.getElementById('lsImportText').value);
      this._pushUndo();
      if (document.getElementById('lsImportMerge').checked) this.bm.merge(bitmap, 'whites');
      else this.bm = bitmap;
      this._changed();
      this.o.toast?.(`Imported ${info}.`, 'ok');
    } catch (e) {
      this.o.toast?.(e?.message ?? String(e), 'error');
    }
  }

  // ---------- side panel
  _renderPanel() {
    if (this.mode === 'image') this._imagePanel();
    else if (this.mode === 'text') this._textPanel();
    else this._exportPanel();
  }

  _row(label, control) { return `<div class="ls-row"><span>${esc(label)}</span>${control}</div>`; }
  _range(key, min, max, val, step = 1) {
    return `<span class="ls-range"><input type="range" data-i="${key}" min="${min}" max="${max}" step="${step}" value="${val}"><output>${val}</output></span>`;
  }
  _select(key, list, val, attr = 'data-i') {
    return `<select class="ls-sel" ${attr}="${key}">${list.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  }
  _check(key, label, val, attr = 'data-i') {
    return `<label class="ls-chk"><input type="checkbox" ${attr}="${key}"${val ? ' checked' : ''}><span>${esc(label)}</span></label>`;
  }

  _bindInputs(attr, target, after) {
    this.panel.querySelectorAll(`[${attr}]`).forEach((el) => {
      const key = el.getAttribute(attr);
      const ev = el.type === 'range' || el.tagName === 'TEXTAREA' || el.type === 'text' || el.type === 'number' ? 'input' : 'change';
      el.addEventListener(ev, () => {
        let v;
        if (el.type === 'checkbox') v = el.checked;
        else if (el.type === 'range' || el.type === 'number') v = Number(el.value);
        else v = el.value;
        target[key] = v;
        if (el.type === 'range' && el.nextElementSibling) el.nextElementSibling.textContent = el.value;
        after(key);
      });
    });
  }

  _imagePanel() {
    const o = this.img, s = this.source;
    this.panel.innerHTML = `
      <div class="ls-panel-head"><span class="section-title">Image</span><span class="muted">${esc(s?.name ?? '')}</span></div>
      <div class="ls-scroll">
        ${s && s.frames > 1 ? this._row('GIF frame', `<span class="ls-range"><input type="range" data-frame min="0" max="${s.frames - 1}" value="${s.frame}"><output>${s.frame}</output></span>`) : ''}
        <div class="ls-sub">Size &amp; position</div>
        ${this._row('Scaling', this._select('fit', [['fit', 'Fit (keep ratio)'], ['fill', 'Fill (crop)'], ['stretch', 'Stretch'], ['none', 'Original size']], o.fit))}
        ${this._row('Position', this._select('pos', POSITIONS, o.pos))}
        ${this._row('Scale %', this._range('scale', 10, 400, o.scale))}
        ${this._row('Offset X', this._range('offX', -128, 128, o.offX))}
        ${this._row('Offset Y', this._range('offY', -64, 64, o.offY))}
        ${this._row('Margin top', this._range('mTop', 0, 32, o.mTop))}
        ${this._row('Margin bottom', this._range('mBottom', 0, 32, o.mBottom))}
        ${this._row('Margin left', this._range('mLeft', 0, 64, o.mLeft))}
        ${this._row('Margin right', this._range('mRight', 0, 64, o.mRight))}
        ${this._row('Rotate°', this._range('rotate', -180, 180, o.rotate))}
        <div class="ls-checks">${this._check('flipH', 'Flip H', o.flipH)}${this._check('flipV', 'Flip V', o.flipV)}${this._check('smooth', 'Smooth scaling', o.smooth)}</div>
        <div class="ls-sub">Black &amp; white</div>
        ${this._row('Dithering', this._select('dither', DITHER_OPTIONS, o.dither))}
        ${this._row('Threshold', this._range('threshold', 0, 255, o.threshold))}
        ${this._row('Brightness', this._range('brightness', -100, 100, o.brightness))}
        ${this._row('Contrast', this._range('contrast', -100, 100, o.contrast))}
        <div class="ls-checks">${this._check('invert', 'Invert B/W', o.invert)}${this._check('whiteBg', 'Transparent = white', o.whiteBg)}${this._check('hsl', 'HSL brightness', o.hsl)}</div>
        ${this._row('Combine', this._select('merge', [['replace', 'Replace drawing'], ['whites', 'Merge whites'], ['blacks', 'Merge blacks']], o.merge))}
      </div>
      <div class="ls-panel-foot">
        <button class="btn btn-sm" data-l="reset">Reset</button>
        <span class="spacer"></span>
        <button class="btn btn-sm" data-l="cancel">Cancel</button>
        <button class="btn btn-sm btn-primary" data-l="apply">Apply</button>
      </div>`;
    this._bindInputs('data-i', this.img, () => this._updateLayer());
    const fr = this.panel.querySelector('[data-frame]');
    fr?.addEventListener('input', () => { fr.nextElementSibling.textContent = fr.value; this._selectFrame(+fr.value); });
    this.panel.querySelector('[data-l="reset"]').addEventListener('click', () => { this.img = { ...IMAGE_DEFAULTS }; this._imagePanel(); this._updateLayer(); });
    this.panel.querySelector('[data-l="cancel"]').addEventListener('click', () => this._applyLayer(false));
    this.panel.querySelector('[data-l="apply"]').addEventListener('click', () => this._applyLayer(true));
  }

  _textPanel() {
    const t = this.txt;
    const fams = FONT_FAMILIES.map((f) => [f, f]);
    if (!FONT_FAMILIES.includes(t.family)) fams.unshift([t.family, t.family]);
    this.panel.innerHTML = `
      <div class="ls-panel-head"><span class="section-title">Text</span><span class="muted">Arabic works too</span></div>
      <div class="ls-scroll">
        <textarea class="ls-textarea" data-t="text" spellcheck="false" rows="2">${esc(t.text)}</textarea>
        ${this._row('Font', this._select('family', fams, t.family, 'data-t'))}
        ${this._row('Custom font', `<input class="ls-input" data-t="family" placeholder="Installed font name" value="">`)}
        <div class="ls-checks">${this._check('autoSize', 'Auto size', t.autoSize, 'data-t')}${this._check('bold', 'Bold', t.bold, 'data-t')}${this._check('italic', 'Italic', t.italic, 'data-t')}</div>
        ${this._row('Size', `<span class="ls-range"><input type="range" data-t="size" min="4" max="96" value="${t.size}"><output>${t.size}</output></span>`)}
        ${this._row('Letter spacing', `<span class="ls-range"><input type="range" data-t="spacing" min="-4" max="12" value="${t.spacing}"><output>${t.spacing}</output></span>`)}
        ${this._row('Align lines', this._select('align', [['left', 'Left'], ['center', 'Center'], ['right', 'Right']], t.align, 'data-t'))}
        ${this._row('Position', this._select('pos', POSITIONS, t.pos, 'data-t'))}
        ${this._row('Offset X', `<span class="ls-range"><input type="range" data-t="offX" min="-128" max="128" value="${t.offX}"><output>${t.offX}</output></span>`)}
        ${this._row('Offset Y', `<span class="ls-range"><input type="range" data-t="offY" min="-64" max="64" value="${t.offY}"><output>${t.offY}</output></span>`)}
        ${this._row('Sharpness', `<span class="ls-range"><input type="range" data-t="threshold" min="10" max="250" value="${t.threshold}"><output>${t.threshold}</output></span>`)}
        <div class="ls-checks">${this._check('black', 'Black text', t.black, 'data-t')}</div>
        ${this._row('Combine', this._select('merge', [['whites', 'Merge whites (on top)'], ['blacks', 'Merge blacks'], ['replace', 'Replace drawing']], t.merge, 'data-t'))}
      </div>
      <div class="ls-panel-foot">
        <span class="spacer"></span>
        <button class="btn btn-sm" data-l="cancel">Cancel</button>
        <button class="btn btn-sm btn-primary" data-l="apply">Apply</button>
      </div>`;
    this._bindInputs('data-t', this.txt, (key) => {
      if (key === 'size') { this.txt.autoSize = false; const a = this.panel.querySelector('[data-t="autoSize"]'); if (a) a.checked = false; }
      if (key === 'family' && !this.txt.family) this.txt.family = 'Segoe UI';
      this._updateLayer();
    });
    this.panel.querySelector('[data-l="cancel"]').addEventListener('click', () => this._applyLayer(false));
    this.panel.querySelector('[data-l="apply"]').addEventListener('click', () => this._applyLayer(true));
    document.fonts?.ready?.then(() => this.mode === 'text' && this._updateLayer());
  }

  _exportPanel() {
    const e = this.exp;
    this.panel.innerHTML = `
      <div class="ls-panel-head"><span class="section-title">Export to GPC</span><span class="ls-badge" data-x="status">…</span></div>
      <div class="ls-scroll">
        ${this._row('Format', this._select('format', EXPORT_FORMATS, e.format, 'data-e'))}
        ${this._row('Pixels to store', this._select('color', [['auto', 'Auto (fewest)'], ['white', 'White pixels'], ['black', 'Black pixels']], e.color, 'data-e'))}
        <div class="ls-checks">${this._check('trim', 'Trim to content', e.trim, 'data-e')}${this._check('invertSupport', 'Invert support', e.invertSupport, 'data-e')}</div>
        <div class="ls-stats" data-x="stats"></div>
        <textarea class="ls-code" data-x="code" readonly spellcheck="false"></textarea>
        <p class="muted">Draw with the pen (left = selected colour, right = the other). Arrow keys shift, Ctrl+Z / Ctrl+Y undo and redo.</p>
      </div>
      <div class="ls-panel-foot">
        <button class="btn btn-sm" data-l="copy">Copy</button>
        <span class="spacer"></span>
        <button class="btn btn-sm btn-primary" data-l="open">Open in Compiler</button>
      </div>`;
    this._bindInputs('data-e', this.exp, () => { this.o.onExportChange?.({ ...this.exp }); this._refreshExport(); });
    this.panel.querySelector('[data-l="copy"]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(this._lastExport?.code ?? ''); this.o.toast?.('GPC copied.', 'ok'); } catch (err) { this.o.toast?.(`Copy failed: ${err?.message ?? err}`, 'error'); }
    });
    this.panel.querySelector('[data-l="open"]').addEventListener('click', () => {
      const ex = this._lastExport;
      if (ex) this.o.openInCompiler?.(`${ex.name}_LOGO.gpc`, previewScript(ex, `${this.o.name || ex.name} logo`));
    });
    this._refreshExport();
  }

  _refreshExport() {
    const code = this.panel.querySelector('[data-x="code"]');
    if (!code) return;
    const ex = exportBitmap(this.bm, { ...this.exp, name: this.o.name || 'LOGO' });
    this._lastExport = ex;
    code.value = ex.code;
    const stats = this.panel.querySelector('[data-x="stats"]');
    stats.innerHTML = `<span>Area <b>${ex.region.w}×${ex.region.h}</b> at ${ex.region.x},${ex.region.y}</span><span>Data <b>${ex.bytes} B</b></span><span>Call <code>${esc(ex.call)}</code></span>`;
    clearTimeout(this._checkTimer);
    const status = this.panel.querySelector('[data-x="status"]');
    status.textContent = '…'; status.className = 'ls-badge';
    this._checkTimer = setTimeout(() => {
      if (!this.o.compile) { status.textContent = ''; return; }
      try {
        const r = this.o.compile(previewScript(ex));
        status.textContent = `Compiles · ${r.bytes} B`;
        status.className = 'ls-badge ok';
      } catch (err) {
        status.textContent = 'Compile error';
        status.className = 'ls-badge err';
        status.title = err?.message ?? String(err);
      }
    }, 350);
  }
}

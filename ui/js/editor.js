// Lightweight GPC code editor: a transparent textarea over a highlighted layer,
// with a line-number gutter and per-line diagnostic markers.

const LINE_H = 21;
const PAD_TOP = 10;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export class CodeEditor {
  constructor(host, { onChange, onCursor } = {}) {
    this.onChange = onChange;
    this.onCursor = onCursor;
    this.words = { kw: new Set(), fn: new Set(), cn: new Set() };
    this.diags = [];

    this.root = document.createElement('div');
    this.root.className = 'ce';
    this.root.innerHTML = `
      <div class="ce-gutter"><div class="ce-lines"></div></div>
      <div class="ce-main">
        <div class="ce-marks"></div>
        <pre class="ce-layer"><code></code></pre>
        <textarea class="ce-input" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off"></textarea>
      </div>`;
    host.appendChild(this.root);
    this.gutter = this.root.querySelector('.ce-gutter');
    this.lines = this.root.querySelector('.ce-lines');
    this.marks = this.root.querySelector('.ce-marks');
    this.layer = this.root.querySelector('.ce-layer');
    this.code = this.layer.querySelector('code');
    this.input = this.root.querySelector('.ce-input');

    this._raf = 0;
    this.input.addEventListener('input', () => { this._schedule(); this.onChange?.(this.value); });
    this.input.addEventListener('scroll', () => this._syncScroll());
    this.input.addEventListener('keydown', (e) => this._keys(e));
    for (const ev of ['click', 'keyup', 'select']) this.input.addEventListener(ev, () => this._cursor());
    this._render();
  }

  setVocabulary({ keywords = [], functions = [], constants = [], comboKeywords = [] }) {
    this.words.kw = new Set([...keywords, ...comboKeywords]);
    this.words.fn = new Set(functions);
    this.words.cn = new Set(constants);
    this._render();
  }

  get value() { return this.input.value; }
  set value(v) {
    this.input.value = v ?? '';
    this._render();
  }

  getView() { return { start: this.input.selectionStart, end: this.input.selectionEnd, top: this.input.scrollTop, left: this.input.scrollLeft }; }
  setView(v) {
    if (!v) { this.input.setSelectionRange(0, 0); this.input.scrollTop = 0; this.input.scrollLeft = 0; return; }
    this.input.setSelectionRange(v.start, v.end);
    this.input.scrollTop = v.top;
    this.input.scrollLeft = v.left;
    this._syncScroll();
  }

  setReadOnly(ro) { this.input.readOnly = ro; }
  focus() { this.input.focus(); }

  setDiagnostics(diags) {
    this.diags = diags || [];
    this._renderMarks();
    this._renderGutter();
  }

  goTo(line, column = 1) {
    const lines = this.value.split('\n');
    line = Math.max(1, Math.min(line, lines.length));
    let pos = 0;
    for (let i = 0; i < line - 1; i++) pos += lines[i].length + 1;
    pos += Math.max(0, Math.min(column - 1, lines[line - 1].length));
    this.input.focus();
    this.input.setSelectionRange(pos, pos);
    const target = (line - 1) * LINE_H;
    const h = this.input.clientHeight;
    if (target < this.input.scrollTop || target > this.input.scrollTop + h - LINE_H * 3) {
      this.input.scrollTop = Math.max(0, target - h / 3);
    }
    this._syncScroll();
    this._cursor();
  }

  // ---- internals ----

  _schedule() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this._render(); });
  }

  _render() {
    // Trailing newline keeps the layer height in step with the textarea.
    this.code.innerHTML = this._highlight(this.value) + '\n';
    this._renderGutter();
    this._renderMarks();
    this._syncScroll();
  }

  _highlight(src) {
    const re = /(\/\/[^\n]*)|(\/\*[\s\S]*?(?:\*\/|$))|("(?:\\.|[^"\\\n])*"?)|('(?:\\.|[^'\\\n])*'?)|(^[ \t]*#[^\n]*)|\b(0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?)\b|([A-Za-z_][A-Za-z0-9_]*)/gm;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(src))) {
      if (m.index > last) out += esc(src.slice(last, m.index));
      const t = m[0];
      let cls = null;
      if (m[1] || m[2]) cls = 't-cm';
      else if (m[3] || m[4]) cls = 't-str';
      else if (m[5]) cls = 't-pre';
      else if (m[6]) cls = 't-num';
      else if (m[7]) {
        if (this.words.kw.has(t)) cls = 't-kw';
        else if (this.words.fn.has(t)) cls = 't-fn';
        else if (this.words.cn.has(t) || /^[A-Z][A-Z0-9_]*[A-Z0-9]$/.test(t)) cls = 't-const';
      }
      out += cls ? `<span class="${cls}">${esc(t)}</span>` : esc(t);
      last = m.index + t.length;
      if (t.length === 0) re.lastIndex++;
    }
    return out + esc(src.slice(last));
  }

  _lineCount() {
    let n = 1;
    const v = this.value;
    for (let i = 0; i < v.length; i++) if (v.charCodeAt(i) === 10) n++;
    return n;
  }

  _curLine() {
    const v = this.value;
    const p = this.input.selectionStart;
    let n = 1;
    for (let i = 0; i < p; i++) if (v.charCodeAt(i) === 10) n++;
    return n;
  }

  _severityByLine() {
    const map = new Map();
    for (const d of this.diags) {
      const prev = map.get(d.line);
      if (prev === 'err') continue;
      map.set(d.line, d.severity === 'Error' ? 'err' : prev ?? (d.severity === 'Warning' ? 'warn' : prev));
    }
    return map;
  }

  _renderGutter() {
    const n = this._lineCount();
    const sev = this._severityByLine();
    const cur = this._curLine();
    let html = '';
    for (let i = 1; i <= n; i++) {
      const c = sev.get(i);
      html += `<div class="ln${c ? ' ' + c : ''}${i === cur ? ' cur' : ''}">${i}</div>`;
    }
    this.lines.innerHTML = html;
  }

  _renderMarks() {
    const sev = this._severityByLine();
    let html = '';
    const cur = this._curLine();
    html += `<div class="ce-mark cur" style="top:${PAD_TOP + (cur - 1) * LINE_H}px"></div>`;
    for (const [line, c] of sev) {
      if (!c) continue;
      html += `<div class="ce-mark ${c}" style="top:${PAD_TOP + (line - 1) * LINE_H}px"></div>`;
    }
    this.marks.innerHTML = html;
  }

  _syncScroll() {
    this.layer.scrollTop = this.input.scrollTop;
    this.layer.scrollLeft = this.input.scrollLeft;
    this.lines.style.transform = `translateY(${-this.input.scrollTop}px)`;
    this.marks.style.transform = `translateY(${-this.input.scrollTop}px)`;
  }

  _cursor() {
    this._renderGutter();
    this._renderMarks();
    this._syncScroll();
    const v = this.value;
    const p = this.input.selectionStart;
    const before = v.slice(0, p);
    const line = before.split('\n').length;
    const col = p - before.lastIndexOf('\n');
    this.onCursor?.(line, col);
  }

  _insert(text, selectStart, selectEnd) {
    // execCommand keeps the native undo stack working.
    this.input.focus();
    document.execCommand('insertText', false, text);
    if (selectStart != null) this.input.setSelectionRange(selectStart, selectEnd ?? selectStart);
  }

  _keys(e) {
    const ta = this.input;
    if (ta.readOnly) return;
    const { selectionStart: s, selectionEnd: en, value: v } = ta;

    if (e.key === 'Tab') {
      e.preventDefault();
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      if (s === en && !e.shiftKey) { this._insert('\t'); return; }
      const lineEnd = en > s && v[en - 1] === '\n' ? en - 1 : en;
      const block = v.slice(lineStart, lineEnd);
      const lines = block.split('\n');
      const changed = e.shiftKey
        ? lines.map((l) => l.replace(/^(\t| {1,4})/, ''))
        : lines.map((l) => '\t' + l);
      const text = changed.join('\n');
      ta.setSelectionRange(lineStart, lineEnd);
      this._insert(text, lineStart, lineStart + text.length);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const indent = v.slice(lineStart, s).match(/^[\t ]*/)[0];
      const prev = v.slice(lineStart, s).trimEnd();
      const next = v.slice(en, en + 1);
      if (prev.endsWith('{') && next === '}') {
        const inner = '\n' + indent + '\t';
        this._insert(inner + '\n' + indent, s + inner.length);
        return;
      }
      this._insert('\n' + indent + (prev.endsWith('{') ? '\t' : ''));
      return;
    }

    if (e.key === '}' && s === en) {
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const before = v.slice(lineStart, s);
      if (/^[\t ]+$/.test(before)) {
        e.preventDefault();
        const trimmed = before.replace(/(\t| {1,4})$/, '');
        ta.setSelectionRange(lineStart, s);
        this._insert(trimmed + '}');
      }
    }
  }
}

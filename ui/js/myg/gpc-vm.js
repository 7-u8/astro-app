// A small GPC interpreter used only for the live OLED preview in MAKE YOUR GPC.
// It runs the code our generator writes (globals, const arrays/strings/images, functions,
// init/main/combos with wait) against a simulated controller, OLED, LEDs, rumble and SPVARs.
// It is not a full GPC implementation: unsupported syntax raises a clear error.
import { Bitmap } from './oled.js';
import { drawChar, FONT_CELLS } from './oled-font.js';

// ---------------------------------------------------------------------- constants

const BTN = {
  PS4_PS: 0, PS4_SHARE: 1, PS4_OPTIONS: 2, PS4_R1: 3, PS4_R2: 4, PS4_R3: 5, PS4_L1: 6, PS4_L2: 7, PS4_L3: 8,
  PS4_RX: 9, PS4_RY: 10, PS4_LX: 11, PS4_LY: 12, PS4_UP: 13, PS4_DOWN: 14, PS4_LEFT: 15, PS4_RIGHT: 16,
  PS4_TRIANGLE: 17, PS4_CIRCLE: 18, PS4_CROSS: 19, PS4_SQUARE: 20, PS4_TOUCH: 27,
};
const XB = {
  XB1_XBOX: 0, XB1_VIEW: 1, XB1_MENU: 2, XB1_RB: 3, XB1_RT: 4, XB1_RS: 5, XB1_LB: 6, XB1_LT: 7, XB1_LS: 8,
  XB1_RX: 9, XB1_RY: 10, XB1_LX: 11, XB1_LY: 12, XB1_UP: 13, XB1_DOWN: 14, XB1_LEFT: 15, XB1_RIGHT: 16,
  XB1_Y: 17, XB1_B: 18, XB1_A: 19, XB1_X: 20,
};
export const BUILTIN_CONSTS = {
  TRUE: 1, FALSE: 0, OLED_WHITE: 1, OLED_BLACK: 0, OLED_WIDTH: 128, OLED_HEIGHT: 64,
  OLED_FONT_SMALL: 0, OLED_FONT_MEDIUM: 1, OLED_FONT_LARGE: 2,
  OLED_FONT_SMALL_WIDTH: 7, OLED_FONT_SMALL_HEIGHT: 10, OLED_FONT_MEDIUM_WIDTH: 11, OLED_FONT_MEDIUM_HEIGHT: 18,
  OLED_FONT_LARGE_WIDTH: 16, OLED_FONT_LARGE_HEIGHT: 26,
  RUMBLE_A: 0, RUMBLE_B: 1, RUMBLE_RT: 2, RUMBLE_LT: 3,
  LED_1: 0, LED_2: 1, LED_3: 2, LED_4: 3,
  PIO_PS4: 2, PIO_PS5: 3, PIO_XB1: 4, PIO_XB360: 5,
  PS5_R2: 4, PS5_L2: 7, POLAR_RS: 40, POLAR_LS: 41, POLAR_ANGLE: 0, POLAR_RADIUS: 1,
  TRACE_1: 30, TRACE_2: 31, TRACE_3: 32, TRACE_4: 33, TRACE_5: 34, TRACE_6: 35,
  ...BTN, ...XB,
};
for (let i = 1; i <= 64; i++) BUILTIN_CONSTS[`SPVAR_${i}`] = i;
for (let i = 1; i <= 16; i++) BUILTIN_CONSTS[`PVAR_${i}`] = 100 + i;

// ---------------------------------------------------------------------- lexer

const OPS = ['<<=', '>>=', '&&', '||', '==', '!=', '<=', '>=', '<<', '>>', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
  '+', '-', '*', '/', '%', '<', '>', '=', '!', '~', '&', '|', '^', '(', ')', '{', '}', '[', ']', ',', ';', '?', ':'];

function lex(src) {
  const toks = [];
  let i = 0, line = 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (src.startsWith('/*', i)) {
      const e = src.indexOf('*/', i + 2);
      const end = e < 0 ? src.length : e + 2;
      for (let k = i; k < end; k++) if (src[k] === '\n') line++;
      i = end; continue;
    }
    if (/[0-9]/.test(c)) {
      const m = /^(0[xX][0-9a-fA-F]+|[0-9]+)/.exec(src.slice(i, i + 20));
      toks.push({ t: 'num', v: Number(m[0]) | 0, line });
      i += m[0].length; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i, i + 80));
      toks.push({ t: 'id', v: m[0], line });
      i += m[0].length; continue;
    }
    if (c === '"') {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== '"') { s += src[j] === '\\' ? src[++j] : src[j]; j++; }
      toks.push({ t: 'str', v: s, line });
      i = j + 1; continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new Error(`Line ${line}: unexpected character '${c}'`);
    toks.push({ t: 'op', v: op, line });
    i += op.length;
  }
  toks.push({ t: 'eof', v: '', line });
  return toks;
}

// ---------------------------------------------------------------------- parser

const BIN_PREC = [['||'], ['&&'], ['|'], ['^'], ['&'], ['==', '!='], ['<', '>', '<=', '>='], ['<<', '>>'], ['+', '-'], ['*', '/', '%']];
const ASSIGN = ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='];
const TYPES = ['int', 'int8', 'int16', 'int32', 'uint8', 'uint16', 'uint32', 'byte', 'string', 'image', 'fix32'];

class Parser {
  constructor(src) { this.t = lex(src); this.p = 0; }
  get cur() { return this.t[this.p]; }
  next() { return this.t[this.p++]; }
  is(v) { return this.cur.v === v && this.cur.t !== 'str'; }
  eat(v) { if (this.is(v)) { this.p++; return true; } return false; }
  want(v) { if (!this.eat(v)) throw new Error(`Line ${this.cur.line}: expected '${v}' but found '${this.cur.v}'`); }
  ident() { const t = this.next(); if (t.t !== 'id') throw new Error(`Line ${t.line}: expected a name, found '${t.v}'`); return t.v; }

  program() {
    const prog = { defines: [], consts: [], globals: [], funcs: new Map(), combos: new Map(), init: null, main: null, data: [] };
    while (this.cur.t !== 'eof') {
      const t = this.cur;
      if (this.eat(';')) continue;
      if (t.v === 'define') {
        this.next();
        do { const n = this.ident(); this.want('='); prog.defines.push({ n, e: this.expr() }); } while (this.eat(','));
        this.eat(';');
      } else if (t.v === 'enum') {
        this.next(); this.want('{');
        let auto = 0;
        while (!this.eat('}')) {
          const n = this.ident();
          const e = this.eat('=') ? this.expr() : null;
          prog.defines.push({ n, e, auto: e ? null : auto, enumPrev: true });
          auto++;
          this.eat(',');
        }
        this.eat(';');
      } else if (t.v === 'const') {
        this.next();
        const type = this.ident();
        const n = this.ident();
        let dims = 0;
        while (this.eat('[')) { this.want(']'); dims++; }
        this.want('=');
        const init = this.initList();
        prog.consts.push({ n, type, dims, init });
        this.eat(';');
      } else if (t.v === 'data') {
        this.next(); this.want('(');
        if (!this.is(')')) do { prog.data.push(this.expr()); } while (this.eat(','));
        this.want(')'); this.eat(';');
      } else if (TYPES.includes(t.v)) {
        this.next();
        do {
          const n = this.ident();
          let size = null, e = null;
          if (this.eat('[')) { size = this.expr(); this.want(']'); }
          if (this.eat('=')) e = this.expr();
          prog.globals.push({ n, size, e });
        } while (this.eat(','));
        this.eat(';');
      } else if (t.v === 'function') {
        this.next();
        const n = this.ident();
        this.want('(');
        const params = [];
        while (!this.eat(')')) {
          if (TYPES.includes(this.cur.v) && this.t[this.p + 1].t === 'id') this.next();
          params.push(this.ident());
          this.eat(',');
        }
        prog.funcs.set(n, { n, params, body: this.block() });
      } else if (t.v === 'combo') {
        this.next();
        const n = this.ident();
        prog.combos.set(n, { n, body: this.block() });
      } else if (t.v === 'init') { this.next(); prog.init = this.block(); }
      else if (t.v === 'main') { this.next(); prog.main = this.block(); }
      else throw new Error(`Line ${t.line}: unexpected '${t.v}' at file scope`);
    }
    return prog;
  }

  initList() {
    if (this.cur.t === 'str') return { k: 'str', v: this.next().v };
    if (!this.eat('{')) return this.expr();
    const items = [];
    while (!this.eat('}')) {
      items.push(this.initList());
      this.eat(',');
    }
    return { k: 'list', items };
  }

  block() {
    this.want('{');
    const b = [];
    while (!this.eat('}')) b.push(this.stmt());
    return { k: 'block', b };
  }

  stmt() {
    const t = this.cur;
    if (this.is('{')) return this.block();
    if (this.eat(';')) return { k: 'block', b: [] };
    if (this.eat('if')) {
      this.want('('); const c = this.expr(); this.want(')');
      const th = this.stmt();
      const el = this.eat('else') ? this.stmt() : null;
      return { k: 'if', c, th, el };
    }
    if (this.eat('while')) { this.want('('); const c = this.expr(); this.want(')'); return { k: 'while', c, b: this.stmt() }; }
    if (this.eat('do')) {
      const b = this.stmt(); this.want('while'); this.want('('); const c = this.expr(); this.want(')'); this.eat(';');
      return { k: 'do', b, c };
    }
    if (this.eat('for')) {
      this.want('(');
      const i = this.is(';') ? null : this.expr(); this.want(';');
      const c = this.is(';') ? null : this.expr(); this.want(';');
      const s = this.is(')') ? null : this.expr(); this.want(')');
      return { k: 'for', i, c, s, b: this.stmt() };
    }
    if (this.eat('return')) { const e = this.is(';') || this.is('}') ? null : this.expr(); this.eat(';'); return { k: 'ret', e }; }
    if (this.eat('break')) { this.eat(';'); return { k: 'break' }; }
    if (this.eat('continue')) { this.eat(';'); return { k: 'cont' }; }
    if (TYPES.includes(t.v) && this.t[this.p + 1].t === 'id') throw new Error(`Line ${t.line}: local variables are not allowed in GPC (declare '${this.t[this.p + 1].v}' at the top)`);
    const e = this.expr();
    this.eat(';');
    return { k: 'expr', e, line: t.line };
  }

  expr() {
    const l = this.binary(0);
    if (this.cur.t === 'op' && ASSIGN.includes(this.cur.v)) {
      const op = this.next().v;
      if (l.k !== 'id' && l.k !== 'idx') throw new Error(`Line ${this.cur.line}: cannot assign to this expression`);
      return { k: 'assign', op, t: l, e: this.expr() };
    }
    return l;
  }

  binary(level) {
    if (level >= BIN_PREC.length) return this.unary();
    let l = this.binary(level + 1);
    while (this.cur.t === 'op' && BIN_PREC[level].includes(this.cur.v)) {
      const op = this.next().v;
      l = { k: 'bin', op, l, r: this.binary(level + 1) };
    }
    return l;
  }

  unary() {
    if (this.cur.t === 'op' && ['!', '-', '~', '+'].includes(this.cur.v)) { const op = this.next().v; return { k: 'un', op, e: this.unary() }; }
    if (this.cur.t === 'op' && (this.cur.v === '++' || this.cur.v === '--')) { const op = this.next().v; return { k: 'pre', op, t: this.unary() }; }
    return this.postfix();
  }

  postfix() {
    let e = this.primary();
    for (;;) {
      if (this.eat('[')) { const i = this.expr(); this.want(']'); e = { k: 'idx', a: e, i }; }
      else if (this.cur.t === 'op' && (this.cur.v === '++' || this.cur.v === '--')) e = { k: 'post', op: this.next().v, t: e };
      else return e;
    }
  }

  primary() {
    const t = this.next();
    if (t.t === 'num') return { k: 'num', v: t.v };
    if (t.t === 'str') return { k: 'str', v: t.v };
    if (t.t === 'id') {
      if (this.eat('(')) {
        const args = [];
        while (!this.eat(')')) { args.push(this.expr()); this.eat(','); }
        return { k: 'call', n: t.v, args, line: t.line };
      }
      return { k: 'id', n: t.v, line: t.line };
    }
    if (t.v === '(') { const e = this.expr(); this.want(')'); return e; }
    throw new Error(`Line ${t.line}: unexpected '${t.v}'`);
  }
}

// ---------------------------------------------------------------------- runtime

const I32 = (v) => v | 0;
const BRK = 1, CNT = 2, RET = 3;

class StrRef { constructor(s) { this.s = s; } }
class ImgRef { constructor(d) { this.d = d; } }

export class GpcVM {
  constructor(source) {
    this.prog = new Parser(source).program();
    this.oled = new Bitmap();
    this.leds = [0, 0, 0, 0];
    this.rumble = [0, 0, 0, 0];
    this.pvars = new Map();
    this.inputs = new Map();   // button -> value 0..100 (what the user holds)
    this.outputs = new Map();  // what the script sends to the console this frame
    this.adt = new Map();      // trigger -> 11 adaptive trigger bytes (simulated weapon)
    this.prev = new Map();
    this.changedAt = new Map();
    this.clock = 0;
    this.rtime = 10;
    this.putc = [];
    this.combos = new Map();   // name -> { gen, wait }
    this.frameCount = 0;
    this.vm = 0;
    this._link();
  }

  // ---- linking: consts, globals, functions
  _link() {
    const P = this.prog;
    this.defs = new Map(Object.entries(BUILTIN_CONSTS));
    let lastEnum = -1;
    for (const d of P.defines) {
      let v;
      if (d.e) v = this._constEval(d.e);
      else v = lastEnum + 1;
      if (d.enumPrev) lastEnum = v;
      this.defs.set(d.n, v);
    }
    this.data = P.data.map((e) => this._constEval(e) & 0xFF);
    this.consts = new Map();
    for (const c of P.consts) {
      const build = (node) => {
        if (node.k === 'list') return node.items.map(build);
        if (node.k === 'str') return new StrRef(node.v);
        return this._constEval(node);
      };
      let v = build(c.init);
      if (c.type === 'image') v = [new ImgRef(Array.isArray(v) ? v.flat(Infinity) : [v])];
      else if (c.type === 'string' && v instanceof StrRef) v = [v];
      this.consts.set(c.n, v);
    }
    this.globals = new Map();
    for (const g of P.globals) {
      const size = g.size ? this._constEval(g.size) : null;
      this.globals.set(g.n, size !== null ? new Int32Array(Math.max(1, size)) : { v: g.e ? this._constEval(g.e) : 0 });
    }
    this.comboDefs = new Map();
    for (const [n, c] of P.combos) this.comboDefs.set(n, c.body);
    this.funcs = new Map();
    for (const [n, f] of P.funcs) this.funcs.set(n, { ...f, run: null });
    for (const [, f] of this.funcs) {
      const scope = new Map(f.params.map((p, i) => [p, i]));
      f.run = this._stmt(f.body, scope);
    }
    this.initRun = P.init ? this._stmt(P.init, new Map()) : null;
    this.mainRun = P.main ? this._stmt(P.main, new Map()) : null;
  }

  _constEval(node) {
    switch (node.k) {
      case 'num': return node.v;
      case 'id':
        if (this.defs?.has(node.n)) return this.defs.get(node.n);
        throw new Error(`Line ${node.line}: '${node.n}' is not a constant`);
      case 'un': { const v = this._constEval(node.e); return node.op === '-' ? I32(-v) : node.op === '!' ? +!v : node.op === '~' ? ~v : v; }
      case 'bin': return this._bin(node.op, this._constEval(node.l), this._constEval(node.r));
      case 'call':
        if (node.n === 'inv') return I32(-this._constEval(node.args[0]));
        throw new Error(`Line ${node.line}: '${node.n}()' cannot be used in a constant`);
      default: throw new Error('Unsupported constant expression');
    }
  }

  _bin(op, a, b) {
    switch (op) {
      case '+': return I32(a + b); case '-': return I32(a - b); case '*': return Math.imul(a, b);
      case '/': return b === 0 ? 0 : I32(Math.trunc(a / b)); case '%': return b === 0 ? 0 : I32(a % b);
      case '<': return +(a < b); case '>': return +(a > b); case '<=': return +(a <= b); case '>=': return +(a >= b);
      case '==': return +(a === b); case '!=': return +(a !== b);
      case '&': return a & b; case '|': return a | b; case '^': return a ^ b;
      case '<<': return a << b; case '>>': return a >> b;
      default: throw new Error(`Operator ${op}`);
    }
  }

  // Compiles an expression to (frame) => value.
  _expr(n, scope) {
    switch (n.k) {
      case 'num': { const v = n.v; return () => v; }
      case 'str': { const r = new StrRef(n.v); return () => r; }
      case 'id': {
        if (scope.has(n.n)) { const i = scope.get(n.n); return (f) => f[i]; }
        const g = this.globals.get(n.n);
        if (g && !(g instanceof Int32Array)) return () => g.v;
        if (g) return () => g;
        if (this.consts.has(n.n)) { const c = this.consts.get(n.n); return () => c; }
        if (this.defs.has(n.n)) { const v = this.defs.get(n.n); return () => v; }
        if (this.comboDefs.has(n.n)) { const name = n.n; return () => name; }
        throw new Error(`Line ${n.line}: unknown name '${n.n}'`);
      }
      case 'idx': {
        const a = this._expr(n.a, scope), i = this._expr(n.i, scope);
        return (f) => { const arr = a(f); const v = arr?.[i(f)]; return v === undefined ? 0 : v; };
      }
      case 'un': {
        const e = this._expr(n.e, scope);
        if (n.op === '-') return (f) => I32(-e(f));
        if (n.op === '!') return (f) => +!e(f);
        if (n.op === '~') return (f) => ~e(f);
        return e;
      }
      case 'bin': {
        const l = this._expr(n.l, scope), r = this._expr(n.r, scope), op = n.op;
        if (op === '&&') return (f) => +(!!l(f) && !!r(f));
        if (op === '||') return (f) => +(!!l(f) || !!r(f));
        return (f) => this._bin(op, l(f), r(f));
      }
      case 'assign': case 'pre': case 'post': return this._assign(n, scope);
      case 'call': return this._call(n, scope);
      default: throw new Error(`Unsupported expression ${n.k}`);
    }
  }

  _lvalue(t, scope) {
    if (t.k === 'id') {
      if (scope.has(t.n)) { const i = scope.get(t.n); return { get: (f) => f[i], set: (f, v) => { f[i] = v; } }; }
      const g = this.globals.get(t.n);
      if (!g || g instanceof Int32Array) throw new Error(`Line ${t.line}: cannot assign to '${t.n}'`);
      return { get: () => g.v, set: (_f, v) => { g.v = v; } };
    }
    const a = this._expr(t.a, scope), i = this._expr(t.i, scope);
    return {
      get: (f) => a(f)[i(f)] ?? 0,
      set: (f, v) => { const arr = a(f); const k = i(f); if (arr instanceof Int32Array && k >= 0 && k < arr.length) arr[k] = v; },
    };
  }

  _assign(n, scope) {
    const lv = this._lvalue(n.t, scope);
    if (n.k === 'pre') { const d = n.op === '++' ? 1 : -1; return (f) => { const v = I32(lv.get(f) + d); lv.set(f, v); return v; }; }
    if (n.k === 'post') { const d = n.op === '++' ? 1 : -1; return (f) => { const v = lv.get(f); lv.set(f, I32(v + d)); return v; }; }
    const e = this._expr(n.e, scope);
    if (n.op === '=') return (f) => { const v = e(f); lv.set(f, typeof v === 'number' ? I32(v) : v); return v; };
    const op = n.op.slice(0, -1);
    return (f) => { const v = this._bin(op, lv.get(f), e(f)); lv.set(f, v); return v; };
  }

  _call(n, scope) {
    const args = n.args.map((a) => this._expr(a, scope));
    const user = this.funcs.get(n.n);
    if (user) {
      return (f) => {
        const frame = args.map((a) => a(f));
        while (frame.length < user.params.length) frame.push(0);
        frame.ret = 0;
        if (++this.depth > 64) throw new Error(`Recursion too deep in ${n.n}()`);
        try { user.run(frame); } finally { this.depth--; }
        return frame.ret;
      };
    }
    const b = this._builtin(n.n);
    if (!b) throw new Error(`Line ${n.line}: unknown function '${n.n}()'`);
    return (f) => b(...args.map((a) => a(f)));
  }

  // Compiles a statement to (frame) => control code.
  _stmt(s, scope) {
    switch (s.k) {
      case 'block': {
        const list = s.b.map((x) => this._stmt(x, scope));
        return (f) => { for (const st of list) { const r = st(f); if (r) return r; } return 0; };
      }
      case 'expr': {
        if (s.e.k === 'call' && s.e.n === 'wait') throw new Error(`Line ${s.line}: wait() is only allowed inside a combo`);
        const e = this._expr(s.e, scope);
        return (f) => { e(f); return 0; };
      }
      case 'if': {
        const c = this._expr(s.c, scope), t = this._stmt(s.th, scope), e = s.el ? this._stmt(s.el, scope) : null;
        return (f) => (c(f) ? t(f) : e ? e(f) : 0);
      }
      case 'while': case 'do': case 'for': {
        const c = s.c ? this._expr(s.c, scope) : () => 1;
        const b = this._stmt(s.b, scope);
        const init = s.i ? this._expr(s.i, scope) : null;
        const step = s.s ? this._expr(s.s, scope) : null;
        const isDo = s.k === 'do';
        return (f) => {
          if (init) init(f);
          let guard = 0;
          if (isDo || c(f)) {
            do {
              if (++guard > 200000) throw new Error('Loop ran too long');
              const r = b(f);
              if (r === BRK) break;
              if (r === RET) return RET;
              if (step) step(f);
            } while (c(f));
          }
          return 0;
        };
      }
      case 'ret': {
        const e = s.e ? this._expr(s.e, scope) : null;
        return (f) => { f.ret = e ? e(f) : 0; return RET; };
      }
      case 'break': return () => BRK;
      case 'cont': return () => CNT;
      default: throw new Error(`Unsupported statement ${s.k}`);
    }
  }

  // Combos run as generators so wait() can suspend them.
  *_comboGen(s, scope) {
    switch (s.k) {
      case 'block': for (const x of s.b) yield* this._comboGen(x, scope); return;
      case 'expr':
        if (s.e.k === 'call' && s.e.n === 'wait') { yield Math.max(0, this._expr(s.e.args[0], scope)([])); return; }
        this._expr(s.e, scope)([]); return;
      case 'if': if (this._expr(s.c, scope)([])) yield* this._comboGen(s.th, scope); else if (s.el) yield* this._comboGen(s.el, scope); return;
      case 'while': while (this._expr(s.c, scope)([])) yield* this._comboGen(s.b, scope); return;
      default: this._stmt(s, scope)([]);
    }
  }

  // ---- builtins
  _builtin(name) {
    const vm = this;
    const B = {
      // input
      get_val: (b) => vm.outputs.get(b) ?? 0,
      get_ival: (b) => vm.inputs.get(b) ?? 0,
      get_lval: (b) => vm.prev.get(b) ?? 0,
      set_val: (b, v) => { vm.outputs.set(b, I32(v)); vm.curCombo?.sets.set(b, I32(v)); return 0; },
      event_press: (b) => +(!!vm.inputs.get(b) && !vm.prev.get(b)),
      event_release: (b) => +(!vm.inputs.get(b) && !!vm.prev.get(b)),
      get_ptime: (b) => vm.clock - (vm.changedAt.get(b) ?? 0),
      get_brtime: (b) => vm.clock - (vm.changedAt.get(b) ?? 0),
      block_all_inputs: () => { for (const k of vm.outputs.keys()) vm.outputs.set(k, 0); return 0; },
      block: () => 0, sensitivity: () => 0, deadzone: () => 0,
      swap: (a, b) => { const va = vm.outputs.get(a) ?? 0; vm.outputs.set(a, vm.outputs.get(b) ?? 0); vm.outputs.set(b, va); return 0; },
      get_adt: (trig, i) => vm.adt.get(trig)?.[i] ?? 0,
      adt_cmp: () => 0, adt_off: () => 0, set_adt: () => 0, addr: (v) => v,
      get_battery: () => 10, get_info: () => 0,
      get_rtime: () => vm.rtime,
      get_controller: () => BUILTIN_CONSTS.PIO_PS5, get_console: () => BUILTIN_CONSTS.PIO_PS5,
      vm_tctrl: (v) => { vm.vm = v; return 0; },
      get_slot: () => 1,
      // math
      abs: (v) => Math.abs(v) | 0, inv: (v) => I32(-v), min: (a, b) => Math.min(a, b), max: (a, b) => Math.max(a, b),
      clamp: (v, lo, hi) => Math.min(Math.max(v, lo), hi), pow: (a, b) => I32(a ** b), isqrt: (v) => Math.floor(Math.sqrt(Math.max(0, v))),
      test_bit: (v, b) => (v >> b) & 1, set_bit: (v, b) => v | (1 << b), clear_bit: (v, b) => v & ~(1 << b),
      random: (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1)),
      duint8: (i) => vm.data[i] ?? 0, dint8: (i) => ((vm.data[i] ?? 0) << 24) >> 24,
      // persistence
      get_pvar: (slot, lo, hi, def) => { const v = vm.pvars.has(slot) ? vm.pvars.get(slot) : def; return v < lo || v > hi ? def : v; },
      set_pvar: (slot, v) => { vm.pvars.set(slot, I32(v)); return 0; },
      // feedback
      set_rumble: (m, v) => { vm.rumble[m] = v; return 0; },
      reset_rumble: () => { vm.rumble.fill(0); return 0; },
      block_rumble: () => 0, get_rumble: (m) => Math.max(vm.rumble[m] ?? 0, vm.gameRumble ?? 0),
      set_led: (i, v) => { vm.leds[i] = v; return 0; },
      set_rgb: (r, g, b) => { vm.leds = [b ? 2 : 0, r ? 2 : 0, g ? 2 : 0, 0]; vm.rgb = [r, g, b]; return 0; },
      reset_leds: () => { vm.leds = [0, 0, 0, 0]; vm.rgb = null; return 0; },
      // combos
      combo_run: (c) => { if (!vm.combos.has(c)) vm._startCombo(c); return 0; },
      combo_restart: (c) => { vm._startCombo(c); return 0; },
      combo_stop: (c) => { vm.combos.delete(c); return 0; },
      combo_running: (c) => +vm.combos.has(c),
      // oled
      cls_oled: (c) => { vm.oled.clear(c ? 1 : 0); return 0; },
      pixel_oled: (x, y, c) => { vm.oled.set(x, y, c); return 0; },
      rect_oled: (x, y, w, h, fill, c) => { vm._rect(x, y, w, h, fill, c); return 0; },
      line_oled: (x0, y0, x1, y1, t, c) => { vm._line(x0, y0, x1, y1, t, c); return 0; },
      print: (x, y, font, c, s) => { vm._print(x, y, font, c, s instanceof StrRef ? s.s : String(s)); return 0; },
      putc_oled: (pos, ch) => { vm.putc[pos] = ch; return 0; },
      puts_oled: (x, y, font, len, c) => { vm._print(x, y, font, c, vm.putc.slice(1, len + 1).map((ch) => String.fromCharCode(ch ?? 32)).join('')); return 0; },
      image_oled: (x, y, c, clear, img) => { vm._image(x, y, c, clear, img); return 0; },
    };
    return B[name] ?? null;
  }

  _rect(x, y, w, h, fill, c) {
    if (fill) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.oled.set(i, j, c); return; }
    for (let i = x; i < x + w; i++) { this.oled.set(i, y, c); this.oled.set(i, y + h - 1, c); }
    for (let j = y; j < y + h; j++) { this.oled.set(x, j, c); this.oled.set(x + w - 1, j, c); }
  }

  _line(x0, y0, x1, y1, t, c) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const th = Math.max(1, t | 0);
    for (let guard = 0; guard < 1000; guard++) {
      for (let k = 0; k < th; k++) this.oled.set(dx >= -dy ? x0 : x0 + k, dx >= -dy ? y0 + k : y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  _print(x, y, font, c, s) {
    const set = (px, py, col) => this.oled.set(px, py, col);
    let cx = x;
    for (const ch of s) cx += drawChar(set, cx, y, font, c, ch.charCodeAt(0));
  }

  _image(x, y, c, clear, img) {
    const d = img instanceof ImgRef ? img.d : [];
    const [w, h] = d;
    let pos = 2, bit = 0, byte = 0;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (!bit) { bit = 8; byte = d[pos++] ?? 0; }
        bit--;
        if ((byte >> bit) & 1) this.oled.set(x + i, y + j, c);
        else if (clear) this.oled.set(x + i, y + j, c ? 0 : 1);
      }
    }
  }

  _startCombo(name) {
    const body = this.comboDefs.get(name);
    if (body) this.combos.set(name, { gen: this._comboGen(body, new Map()), wait: 0, sets: new Map() });
  }

  // ---- execution
  start() {
    this.depth = 0;
    if (this.initRun) this.initRun([]);
    this.started = true;
  }

  /** Runs one main iteration with the held buttons (Map button -> value) after `dt` ms. */
  frame(dt, held) {
    if (!this.started) this.start();
    this.rtime = Math.max(1, Math.round(dt));
    this.clock += this.rtime;
    this.prev = this.inputs;
    this.inputs = new Map(held);
    this.outputs = new Map(held);
    const all = new Set([...this.prev.keys(), ...this.inputs.keys()]);
    for (const b of all) if (!!this.prev.get(b) !== !!this.inputs.get(b)) this.changedAt.set(b, this.clock);
    this.depth = 0;
    if (this.mainRun) this.mainRun([]);
    // Combos: values a combo has set stay applied while it waits, like on the device.
    for (const [name, c] of [...this.combos]) {
      c.wait -= this.rtime;
      this.curCombo = c;
      try {
        while (c.wait <= 0) {
          const r = c.gen.next();
          if (r.done) { this.combos.delete(name); break; }
          c.wait += r.value;
        }
      } finally { this.curCombo = null; }
      if (this.combos.has(name)) for (const [b, v] of c.sets) this.outputs.set(b, v);
    }
    this.frameCount++;
  }

  global(name) { const g = this.globals.get(name); return g instanceof Int32Array ? g : g?.v; }
}

export { FONT_CELLS };

// Simulated Cronus Zen: runs a generated script in the GPC preview VM with an on-screen controller.
import { renderBitmap } from './oled.js';
import { GpcVM, BUILTIN_CONSTS as K } from './gpc-vm.js';
import { MENU_COMBOS } from './menu-gen.js';

const KEYMAP = {
  ArrowUp: 'PS4_UP', ArrowDown: 'PS4_DOWN', ArrowLeft: 'PS4_LEFT', ArrowRight: 'PS4_RIGHT',
  Enter: 'PS4_CROSS', ' ': 'PS4_CROSS', x: 'PS4_CROSS',
  Escape: 'PS4_CIRCLE', Backspace: 'PS4_CIRCLE', c: 'PS4_CIRCLE',
  v: 'PS4_TRIANGLE', z: 'PS4_SQUARE',
  q: 'PS4_L2', l: 'PS4_L2', f: 'PS4_R2', o: 'PS4_OPTIONS', r: 'PS4_R1', e: 'PS4_L1', s: 'PS4_SHARE', t: 'PS4_TOUCH',
};

const PAD = [
  ['PS4_L2', 'L2', 'pad-l2'], ['PS4_L1', 'L1', 'pad-l1'], ['PS4_R1', 'R1', 'pad-r1'], ['PS4_R2', 'R2', 'pad-r2'],
  ['PS4_SHARE', 'SHARE', 'pad-share'], ['PS4_TOUCH', 'TOUCH', 'pad-touch'], ['PS4_OPTIONS', 'OPTIONS', 'pad-opt'],
  ['PS4_UP', '&#x25B2;', 'pad-up'], ['PS4_DOWN', '&#x25BC;', 'pad-down'], ['PS4_LEFT', '&#x25C0;', 'pad-left'], ['PS4_RIGHT', '&#x25B6;', 'pad-right'],
  ['PS4_TRIANGLE', '&#x25B3;', 'pad-tri'], ['PS4_CIRCLE', '&#x25CB;', 'pad-cir'], ['PS4_CROSS', '&#x2715;', 'pad-x'], ['PS4_SQUARE', '&#x25A1;', 'pad-sq'],
];

// Simulated PS5 adaptive-trigger signatures, so WEAPON AR (AUTO PS5) can be tried.
const SIM_WEAPONS = [
  ['none', 'No trigger effect', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  ['a', 'Weapon A (rifle)', [0x26, 0xF0, 0x03, 0, 0xB0, 0x6D, 0x1B, 0, 0, 0x0C, 0]],
  ['b', 'Weapon B (SMG)', [0x26, 0xF0, 0x03, 0, 0x20, 0x49, 0x12, 0, 0, 0x0A, 0]],
  ['c', 'Weapon C (sniper)', [0x21, 0xFF, 0x05, 0, 0x90, 0x22, 0x10, 0, 0, 0x08, 0]],
];

const OUT_BUTTONS = ['PS4_R2', 'PS4_L2', 'PS4_R1', 'PS4_L1', 'PS4_CROSS', 'PS4_CIRCLE', 'PS4_SQUARE', 'PS4_TRIANGLE', 'PS4_L3', 'PS4_R3', 'PS4_UP', 'PS4_DOWN', 'PS4_LEFT', 'PS4_RIGHT'];
const OUT_NAMES = { PS4_R2: 'R2', PS4_L2: 'L2', PS4_R1: 'R1', PS4_L1: 'L1', PS4_CROSS: '✕', PS4_CIRCLE: '○', PS4_SQUARE: '□', PS4_TRIANGLE: '△', PS4_L3: 'L3', PS4_R3: 'R3', PS4_UP: '↑', PS4_DOWN: '↓', PS4_LEFT: '←', PS4_RIGHT: '→' };

/**
 * host: element to render into.
 * ctx: { project, persist, toast, getCode() -> string, combo() -> menu combo id, compact }
 */
export function createSimulator(host, ctx) {
  let vm = null;
  let timer = 0;
  let last = performance.now();
  let lastFrameKey = '';
  const held = new Set();
  const trail = [];

  host.innerHTML = `
    <div class="mst-device">
      <div class="zen-body">
        <div class="zen-screen"><canvas class="mst-oled" tabindex="0"></canvas></div>
        <div class="mst-indicators">
          <span class="mst-led" title="LED colour"></span>
          <span class="mst-rumble" title="Rumble">RUMBLE</span>
          <span class="mst-state"></span>
        </div>
      </div>
      <div class="pad">${PAD.map(([b, l, cls]) => `<button class="pad-btn ${cls}" data-btn="${b}">${l}</button>`).join('')}</div>
      <div class="mst-keys muted">Click the screen, then use the keyboard: arrows = D-pad · Enter = &#x2715; · Esc = &#x25CB; · V = &#x25B3; · hold Q = L2 · hold F = R2 · E = L1 · O = OPTIONS · R = R1 · S = SHARE</div>
      ${ctx.compact ? '' : `<div class="mst-out">
        <div class="mst-stick"><canvas width="96" height="96"></canvas><small>RIGHT STICK OUT</small></div>
        <div class="mst-btns">${OUT_BUTTONS.map((b) => `<span class="mst-ob" data-ob="${b}">${OUT_NAMES[b]}</span>`).join('')}</div>
      </div>
      <div class="mst-sim-opts">
        <label class="ls-chk"><input type="checkbox" data-sim="rumble" checked><span>Game rumbles while firing</span></label>
        <label class="ls-row"><span>PS5 trigger</span><select class="ls-sel" data-sim="weapon">${SIM_WEAPONS.map(([id, l]) => `<option value="${id}">${l}</option>`).join('')}</select></label>
      </div>`}
      <div class="mst-actions">
        <button class="btn btn-sm" data-act="open">Open menu (combo)</button>
        <button class="btn btn-sm" data-act="reset">Restart</button>
        <button class="btn btn-sm" data-act="wipe">Clear saved settings</button>
      </div>
    </div>`;
  const $ = (s) => host.querySelector(s);
  const canvas = $('.mst-oled');
  const stickCv = host.querySelector('.mst-stick canvas');

  function rebuild(keepSaves = true) {
    const pv = keepSaves && vm ? vm.pvars : (ctx.project.simPvars ? new Map(ctx.project.simPvars) : new Map());
    const code = ctx.getCode();
    if (!code) { vm = null; return; }
    try {
      vm = new GpcVM(code);
      vm.pvars = pv;
      lastFrameKey = '';
    } catch (e) {
      vm = null;
      ctx.toast?.(`Preview error: ${e.message}`, 'error');
    }
  }

  function drawOutputs() {
    if (!stickCv) return;
    const g = stickCv.getContext('2d');
    const x = vm.outputs.get(K.PS4_RX) ?? 0, y = vm.outputs.get(K.PS4_RY) ?? 0;
    trail.push([x, y]);
    if (trail.length > 40) trail.shift();
    g.clearRect(0, 0, 96, 96);
    g.strokeStyle = '#33363f';
    g.beginPath(); g.arc(48, 48, 44, 0, Math.PI * 2); g.moveTo(4, 48); g.lineTo(92, 48); g.moveTo(48, 4); g.lineTo(48, 92); g.stroke();
    g.fillStyle = 'rgba(120,170,255,.35)';
    for (const [tx, ty] of trail) g.fillRect(48 + tx * 0.44 - 1, 48 + ty * 0.44 - 1, 2, 2);
    g.fillStyle = '#eef3ff';
    g.beginPath(); g.arc(48 + x * 0.44, 48 + y * 0.44, 4, 0, Math.PI * 2); g.fill();
    for (const b of OUT_BUTTONS) host.querySelector(`[data-ob="${b}"]`)?.classList.toggle('on', (vm.outputs.get(K[b]) ?? 0) > 0);
  }

  function tick() {
    const now = performance.now();
    let dt = now - last;
    last = now;
    if (!vm) return;
    if (dt > 100) dt = 100;
    const rum = host.querySelector('[data-sim="rumble"]');
    vm.gameRumble = (!rum || rum.checked) && held.has('PS4_R2') ? 55 : 0;
    const wsel = host.querySelector('[data-sim="weapon"]');
    vm.adt.set(K.PS5_R2, (SIM_WEAPONS.find(([id]) => id === wsel?.value) ?? SIM_WEAPONS[0])[2]);
    try {
      // Run at the device's 10 ms loop rate.
      while (dt >= 10) { vm.frame(10, new Map([...held].map((b) => [K[b], 100]))); dt -= 10; }
      last -= dt;
    } catch (e) {
      ctx.toast?.(`Simulator stopped: ${e.message}`, 'error');
      vm = null;
      return;
    }
    const key = vm.oled.encode();
    if (key !== lastFrameKey) { lastFrameKey = key; renderBitmap(canvas, vm.oled, 3, { on: '#eef3ff', off: '#030305' }); }
    drawOutputs();
    $('.mst-rumble').classList.toggle('on', vm.rumble.some((v) => v > 0));
    const led = $('.mst-led');
    if (vm.rgb) {
      const [r, g, b] = vm.rgb;
      led.style.background = `rgb(${r},${g},${b})`;
      led.style.boxShadow = r + g + b ? `0 0 10px rgb(${r},${g},${b})` : 'none';
    }
    const lvl = vm.global('m_boot') > 0 ? 'Boot' : vm.global('m_open') ? ['', 'Categories', 'Mods', 'Values'][vm.global('m_lvl')] : (vm.global('m_msg') > 0 ? 'Message' : 'Home');
    const prof = vm.global('m_prof');
    $('.mst-state').textContent = `${lvl}${typeof prof === 'number' && vm.defs.get('PROF_N') > 1 ? ` · P${prof + 1}` : ''}`;
    ctx.project.simPvars = [...vm.pvars];
  }

  function press(b, down) {
    if (down) held.add(b); else held.delete(b);
    host.querySelectorAll(`[data-btn="${b}"]`).forEach((el) => el.classList.toggle('down', down));
  }

  host.querySelectorAll('[data-btn]').forEach((el) => {
    const b = el.dataset.btn;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic or already released pointer */ }
      press(b, true);
      canvas.focus();
    });
    el.addEventListener('pointerup', () => press(b, false));
    el.addEventListener('pointercancel', () => press(b, false));
  });
  const keyBtn = (e) => KEYMAP[e.key] ?? KEYMAP[e.key.toLowerCase()];
  canvas.addEventListener('keydown', (e) => { const b = keyBtn(e); if (b) { e.preventDefault(); press(b, true); } });
  canvas.addEventListener('keyup', (e) => { const b = keyBtn(e); if (b) { e.preventDefault(); press(b, false); } });
  canvas.addEventListener('blur', () => { for (const b of [...held]) press(b, false); });

  $('[data-act="open"]').addEventListener('click', () => {
    const c = MENU_COMBOS.find((m) => m.id === ctx.combo?.()) ?? MENU_COMBOS[0];
    press(c.hold, true);
    setTimeout(() => press(c.press, true), 60);
    setTimeout(() => { press(c.press, false); press(c.hold, false); }, 160);
    canvas.focus();
  });
  $('[data-act="reset"]').addEventListener('click', () => { rebuild(true); canvas.focus(); });
  $('[data-act="wipe"]').addEventListener('click', () => {
    ctx.project.simPvars = null;
    if (vm) vm.pvars = new Map();
    rebuild(false);
    ctx.persist?.();
    ctx.toast?.('Simulated saved settings cleared.', 'ok');
  });

  rebuild(true);
  timer = setInterval(tick, 16);
  setTimeout(() => canvas.focus(), 50);

  return {
    rebuild,
    dispose() { clearInterval(timer); },
  };
}

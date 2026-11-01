// Usage: node tools/test-controls-screen.mjs — profiles, quick toggles, boot/home/saver modes and LED:
// compiles combinations with libgpc and checks behaviour in the preview VM.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.btoa ??= (s) => Buffer.from(s, 'binary').toString('base64');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const M = await imp('ui/js/myg/mods.js');
const G = await imp('ui/js/myg/menu-gen.js');
const { GpcVM, BUILTIN_CONSTS: K } = await imp('ui/js/myg/gpc-vm.js');
const { Bitmap } = await imp('ui/js/myg/oled.js');
const { compileSource } = await imp('tools/gpc-check.mjs');

const logo = new Bitmap();
for (let x = 20; x < 108; x++) for (let y = 20; y < 44; y++) if ((x + y) % 2) logo.set(x, y, 1);
const sel = M.defaultModSelection();
for (const id of ['aa_polar', 'ar_basic', 'sh_rapid', 'ctl_hair', 'ut_kill']) sel.picked[id] = {};

function gen(extra) {
  return G.generateMenuScript({
    name: 'Astro Test', style: 'tree', combo: 'l2opt', logoBitmap: logo,
    model: M.buildModel(sel), selection: sel, ...extra,
  });
}

let bad = 0;
const check = (label, ok, info = '') => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${info ? ` ${info}` : ''}`); if (!ok) bad++; };

// ---- compile matrix
for (const P of [1, 2, 3]) {
  for (const quick of [[], [{ key: 'sh_rapid', hold: 'PS4_L1', press: 'PS4_UP' }, { key: 'ar_basic', hold: 'PS4_L1', press: 'PS4_DOWN' }]]) {
    for (const [boot] of G.BOOT_MODES) {
      for (const [home] of G.HOME_MODES) {
        const out = gen({ profiles: { count: P }, quick, screen: { boot, home, saver: P === 2 ? 'move' : 'blank', saverSec: 10, led: { on: P !== 3 } } });
        const r = compileSource(out.code);
        if (!r.ok) {
          check(`compile P=${P} quick=${quick.length} boot=${boot} home=${home}`, false);
          for (const d of r.diagnostics.filter((x) => x.severity !== 'Warning').slice(0, 4)) console.log('     Ln', d.line ?? d.range?.start?.line, d.message);
        }
      }
    }
    check(`compile matrix P=${P} quick=${quick.length}`, true, '(all boot x home modes)');
  }
}

// ---- behaviour
const press = (vm, btns, n = 1) => { for (let i = 0; i < n; i++) vm.frame(10, new Map(btns.map((b) => [K[b], 100]))); };
{
  const out = gen({ profiles: { count: 2, hold: 'PS4_L2', press: 'PS4_TRIANGLE' }, quick: [{ key: 'sh_rapid', hold: 'PS4_L1', press: 'PS4_UP' }], screen: { boot: 'wipe', bootMs: 600 } });
  const vm = new GpcVM(out.code);
  press(vm, [], 20);
  check('boot animation running at start', vm.global('m_boot') > 0);
  press(vm, [], 60);
  check('boot animation finished', vm.global('m_boot') === 0);
  check('LED set to profile 1 colour (blue)', JSON.stringify(vm.rgb) === '[0,0,255]', JSON.stringify(vm.rgb));

  const ST = vm.global('ST'), VL = vm.global('VL');
  const v0 = VL[2];
  VL[2] = 77; // BASIC AR VERTICAL in profile 1
  press(vm, ['PS4_L2'], 1); press(vm, ['PS4_L2', 'PS4_TRIANGLE'], 1); press(vm, [], 2);
  check('profile switched to 2', vm.global('m_prof') === 1);
  check('profile 2 has its own value', VL[2] === v0, `VL=${VL[2]}`);
  check('LED changed to profile 2 colour (red)', JSON.stringify(vm.rgb) === '[255,0,0]', JSON.stringify(vm.rgb));
  press(vm, ['PS4_L2'], 1); press(vm, ['PS4_L2', 'PS4_TRIANGLE'], 1); press(vm, [], 2);
  check('back to profile 1 keeps 77', vm.global('m_prof') === 0 && VL[2] === 77);

  // quick toggle rapid fire
  const rf = vm.global('ST')[2];
  press(vm, ['PS4_L1'], 1); press(vm, ['PS4_L1', 'PS4_UP'], 1); press(vm, [], 1);
  check('quick toggle flips RAPID FIRE', vm.global('ST')[2] !== rf, `${rf} -> ${vm.global('ST')[2]}`);
  check('quick toggle shows a 2-line popup', vm.global('m_plen2') > 0);

  // save via menu close and reload
  press(vm, ['PS4_L2'], 1); press(vm, ['PS4_L2', 'PS4_OPTIONS'], 1); press(vm, [], 2);
  check('menu LED colour (white)', JSON.stringify(vm.rgb) === '[255,255,255]');
  press(vm, ['PS4_CIRCLE'], 1); press(vm, [], 1); press(vm, ['PS4_CIRCLE'], 1); press(vm, [], 3);
  const vm2 = new GpcVM(out.code);
  vm2.pvars = vm.pvars;
  press(vm2, [], 2);
  check('reload restores profile 1 values', vm2.global('VL')[2] === 77 && vm2.global('m_prof') === vm.global('m_prof'));
  check('reload restores quick-toggled state', vm2.global('ST')[2] === vm.global('ST')[2]);
}
{
  const out = gen({ screen: { boot: 'static', home: 'logo', saver: 'move', saverSec: 1 } });
  const vm = new GpcVM(out.code);
  press(vm, [], 150);
  const a = vm.oled.encode();
  press(vm, [], 160);
  check('moving screen saver changes the screen', vm.oled.encode() !== a);
  check('saver keeps the OLED mostly dark', vm.oled.count() < 200, `${vm.oled.count()} px lit`);
}
{
  const out = gen({ screen: { boot: 'static', home: 'status' } });
  const vm = new GpcVM(out.code);
  press(vm, [], 3);
  check('status home screen draws', vm.oled.count() > 100);
}
process.exit(bad ? 1 : 0);

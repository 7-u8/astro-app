// Usage: node tools/test-mods.mjs  — compiles every mod alone and all mods together (libgpc), then runs them in the preview VM.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.btoa ??= (s) => Buffer.from(s, 'binary').toString('base64');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const M = await imp('ui/js/myg/mods.js');
const G = await imp('ui/js/myg/menu-gen.js');
const { GpcVM, BUILTIN_CONSTS: K } = await imp('ui/js/myg/gpc-vm.js');
const { compileSource } = await imp('tools/gpc-check.mjs');

function build(ids, style = 'tree', combo = 'l2opt') {
  const selection = M.defaultModSelection();
  selection.picked = M.withRequirements(Object.fromEntries(ids.map((id) => [id, {}])));
  return G.generateMenuScript({ name: 'Test', style, combo, model: M.buildModel(selection), selection });
}
function drive(code) {
  const vm = new GpcVM(code);
  vm.adt.set(K.PS5_R2, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const hold = (btns, n = 30, extra = {}) => { for (let i = 0; i < n; i++) vm.frame(10, new Map([...btns.map((b) => [K[b], 100]), ...Object.entries(extra).map(([k, v]) => [K[k], v])])); };
  hold([], 5);
  hold(['PS4_L2', 'PS4_R2'], 60);
  hold(['PS4_L2'], 3); hold(['PS4_L2', 'PS4_DOWN'], 2); hold(['PS4_L2', 'PS4_RIGHT'], 2); hold(['PS4_L2', 'PS4_SHARE'], 2);
  hold(['PS4_CIRCLE'], 2, { PS4_LY: -100 }); hold([], 2, { PS4_LY: -100 }); hold(['PS4_CROSS'], 40); hold(['PS4_TRIANGLE'], 40);
  hold(['PS4_R1'], 3); hold([], 3); hold(['PS4_R3'], 30);
  return vm;
}
let bad = 0;
for (const mod of M.MODS) {
  const { code } = build([mod.id]);
  const r = compileSource(code);
  let vmErr = '';
  try { drive(code); } catch (e) { vmErr = ' VM: ' + e.message; bad++; }
  if (!r.ok) bad++;
  console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${mod.id.padEnd(11)} ${String(r.bytes).padStart(6)} B${vmErr}`);
  if (!r.ok) for (const d of r.diagnostics.filter((x) => x.severity !== 'Warning').slice(0, 5)) console.log('     Ln', d.line ?? d.range?.start?.line, d.message);
}
for (const style of G.MENU_STYLES) {
  const { code, stats } = build(M.MODS.map((m) => m.id), style.id, 'l2share');
  const r = compileSource(code);
  let vmErr = '';
  try { const vm = drive(code); vmErr = ` kill=${vm.global('k_kill')}`; } catch (e) { vmErr = ' VM: ' + e.message; bad++; }
  if (!r.ok) bad++;
  console.log(`${r.ok ? 'OK  ' : 'FAIL'} ALL MODS ${style.id.padEnd(9)} ${r.bytes} B, ${stats.items} mods, ${stats.values} values, ${stats.slots}/${stats.maxSlots} SPVARs${vmErr}`);
  if (!r.ok) for (const d of r.diagnostics.filter((x) => x.severity !== 'Warning').slice(0, 5)) console.log('     Ln', d.line ?? d.range?.start?.line, d.message);
}
process.exit(bad ? 1 : 0);

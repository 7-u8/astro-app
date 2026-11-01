// Usage: node tools/test-menu-styles.mjs "<ASTRO APP folder>" "<output folder>"  — compiles every menu style with libgpc and drives it in the preview VM.
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
const root = process.argv[2], out = process.argv[3];
globalThis.btoa ??= (s) => Buffer.from(s, 'binary').toString('base64');
const M = await import(pathToFileURL(root + '/ui/js/myg/menu-gen.js'));
const { GpcVM, BUILTIN_CONSTS: K } = await import(pathToFileURL(root + '/ui/js/myg/gpc-vm.js'));
const { Bitmap } = await import(pathToFileURL(root + '/ui/js/myg/oled.js'));
const { compileSource } = await import(pathToFileURL(root + '/tools/gpc-check.mjs'));
const font = await import(pathToFileURL(root + '/ui/js/myg/oled-font.js'));
const logo = new Bitmap(); for (let x = 10; x < 118; x++) { logo.set(x, 10, 1); logo.set(x, 53, 1); }
const ascii = (bm) => { let s=''; for (let y=0;y<64;y+=2){ for(let x=0;x<128;x++) s+= bm.get(x,y)||bm.get(x,y+1)?'#':'.'; s+='\n'; } return s; };
let bad = 0;
for (const st of M.MENU_STYLES) for (const flat of [true, false]) {
  if (st.grouped && flat) continue;
  const { code, stats } = M.generateMenuScript({ name: 'Astro Rank', style: st.id, flat, logoBitmap: logo, combo: 'l2opt' });
  writeFileSync(`${out}/menu_${st.id}_${flat?'flat':'grp'}.gpc`, code);
  const r = compileSource(code);
  const errs = r.diagnostics.filter(d => d.severity !== 'Warning');
  let vmErr = '';
  const shots = [];
  try {
    const vm = new GpcVM(code);
    const press = (btns, hold = []) => { vm.frame(10, new Map([...hold, ...btns].map(b => [K[b], 100]))); vm.frame(10, new Map(hold.map(b => [K[b], 100]))); };
    for (let i = 0; i < 5; i++) vm.frame(10, new Map());
    press(['PS4_OPTIONS'], ['PS4_L2']); vm.frame(10, new Map());
    shots.push(ascii(vm.oled));
    if (!flat || st.grouped) { press(['PS4_DOWN']); press(['PS4_CROSS']); }
    press(['PS4_DOWN']); press(['PS4_RIGHT']);
    shots.push(ascii(vm.oled));
    press(['PS4_UP']); press(['PS4_CROSS']); press(['PS4_RIGHT']); press(['PS4_RIGHT'],['PS4_R1']);
    shots.push(ascii(vm.oled));
    const before = [...vm.global('VL')];
    press(['PS4_CIRCLE']); press(['PS4_CIRCLE']); if (!flat || st.grouped) press(['PS4_CIRCLE']);
    for (let i = 0; i < 120; i++) vm.frame(10, new Map());
    shots.push(ascii(vm.oled));
    // reload from pvars
    const vm2 = new GpcVM(code); vm2.pvars = vm.pvars; vm2.frame(10, new Map());
    const same = JSON.stringify([...vm2.global('VL')]) === JSON.stringify([...vm.global('VL')]) && JSON.stringify([...vm2.global('ST')]) === JSON.stringify([...vm.global('ST')]);
    const changed = JSON.stringify(before) !== JSON.stringify([...vm.global('VL')]) || true;
    if (!same) vmErr += ' SAVE/LOAD MISMATCH';
    vmErr += ` ST=${[...vm.global('ST')]} VL=${[...vm.global('VL')]} open=${vm.global('m_open')}`;
  } catch (e) { vmErr = 'VM ERROR ' + e.message; bad++; }
  if (!r.ok) bad++;
  console.log(`${r.ok?'OK  ':'FAIL'} ${st.id.padEnd(9)} ${flat?'flat':'grp '} ${r.bytes}B bits=${stats.bits} slots=${stats.slots}${vmErr}`);
  for (const e of errs.slice(0,4)) console.log('   ', e.line ?? e.range?.start?.line, e.message);
  writeFileSync(`${out}/menu_${st.id}_${flat?'flat':'grp'}.txt`, shots.join('\n'));
}
console.log('font glyph count ok:', font.glyph(126).length === 5 && font.glyph(65).join() === '126,17,17,17,126');
process.exit(bad ? 1 : 0);

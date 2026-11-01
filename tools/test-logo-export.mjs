// Usage: node tools/test-logo-export.mjs "<ASTRO APP folder>"  — compiles every logo export format and checks import round-trips.
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
const { Bitmap } = await import(pathToFileURL(root + '/ui/js/myg/oled.js'));
const G = await import(pathToFileURL(root + '/ui/js/myg/gpc-image.js'));
const { compileSource } = await import(pathToFileURL(root + '/tools/gpc-check.mjs'));
globalThis.btoa ??= (s) => Buffer.from(s, 'binary').toString('base64');
const bm = new Bitmap();
for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) if (((x - 64) ** 2) / 900 + ((y - 32) ** 2) / 300 < 1 && (x + y) % 3) bm.set(x, y, 1);
const full = new Bitmap(); full.clear(1); full.set(5, 5, 0);
let bad = 0;
for (const [label, img] of [['ellipse', bm], ['mostlyWhite', full]]) for (const [fmt] of G.EXPORT_FORMATS) for (const inv of [false, true]) for (const trim of [true, false]) {
  const e = G.exportBitmap(img, { format: fmt, name: 'My Script!', invertSupport: inv, trim });
  const r = compileSource(G.previewScript(e));
  let rt = '';
  if (fmt !== 'pixels') {
    const back = G.importPacked(e.code).bitmap; const exp = new Bitmap();
    for (let y = 0; y < e.region.h; y++) for (let x = 0; x < e.region.w; x++) exp.set(x, y, img.get(e.region.x + x, e.region.y + y) === e.color ? 1 : 0);
    rt = back.equals(exp) ? 'roundtrip ok' : 'ROUNDTRIP FAIL';
    if (!back.equals(exp)) bad++;
  }
  if (!r.ok) { bad++; console.log(r.diagnostics.filter(d=>d.severity!=='Warning').slice(0,3)); }
  console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${label} ${fmt} inv=${inv} trim=${trim} gpcBytes=${r.bytes} est=${e.bytes} ${e.region.w}x${e.region.h} color=${e.color} ${rt}`);
}
process.exit(bad ? 1 : 0);

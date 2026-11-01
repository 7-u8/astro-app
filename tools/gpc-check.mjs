// Compiles GPC files with the app's libgpc (same WASM the UI uses) and prints diagnostics.
// Usage: node tools/gpc-check.mjs <file.gpc> [more.gpc ...]   (exit code 1 if any fails)
// Also usable as a module: import { compileSource } from './gpc-check.mjs'.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const jsDir = path.join(here, '..', 'ui', 'js');
const bg = await import(pathToFileURL(path.join(jsDir, 'libgpc_bg.js')).href);

const glue = {};
for (const [k, v] of Object.entries(bg)) {
  if (k.startsWith('__wbg_') || k.startsWith('__wbindgen_')) glue[k] = v;
}
const { instance } = await WebAssembly.instantiate(readFileSync(path.join(jsDir, 'libgpc.wasm')), {
  './libgpc_wasm_bg.js': glue,
});
bg.__wbg_set_wasm(instance.exports);
instance.exports.__wbindgen_start();
bg.init();

export function compileSource(source, target = 'cronuszen32') {
  const session = new bg.GpcSession(target);
  try {
    const res = session.compile(source);
    const payload = res?.data ?? res?.payload;
    const diagnostics = res?.diagnostics ?? [];
    const ok = !!(res?.success && payload?.success !== false && payload?.bytecode);
    return { ok, bytes: ok ? payload.bytecode.length / 2 : 0, diagnostics };
  } finally {
    session.free();
  }
}

export function hover(source, line, column, target = 'cronuszen32') {
  const session = new bg.GpcSession(target);
  try { return session.hover(source, line, column); } finally { session.free(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let failed = 0;
  for (const file of process.argv.slice(2)) {
    const r = compileSource(readFileSync(file, 'utf8'));
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${file}${r.ok ? ` (${r.bytes} bytes)` : ''}`);
    for (const d of r.diagnostics) {
      const ln = d.line ?? d.range?.start?.line ?? '?';
      console.log(`     ${d.severity ?? 'Error'} Ln ${ln}: ${d.message}`);
    }
    if (!r.ok) failed++;
  }
  process.exit(failed ? 1 : 0);
}

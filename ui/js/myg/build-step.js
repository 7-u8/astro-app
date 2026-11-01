// BUILD step: review the whole script, run the checks, then save it, open it, or queue it on a BOOT slot.
import { renderBitmap } from './oled.js';
import { MENU_STYLES, MENU_COMBOS, BOOT_MODES, HOME_MODES, SAVER_MODES, generateMenuScript } from './menu-gen.js';
import { MOD_BY_ID, MODS, MOD_CATEGORIES, effectiveMod } from './mods.js';
import { scriptOptions, hasMods, ensureSelection } from './mods-step.js';
import { ensureControls, listCombos } from './controls-step.js';
import { ensureScreen } from './screen-step.js';
import { MENU_DEFAULTS } from './menu-step.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtSize = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);
const label = (list, id) => list.find(([v]) => v === id)?.[1] ?? id;
const BTN = (b) => String(b).replace('PS4_', '').replace('OPTIONS', 'OPTIONS').replace('TRIANGLE', 'TRIANGLE');

export function scriptFileName(project) {
  const base = String(project.name || 'MY SCRIPT').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'MY SCRIPT';
  return `${base}.gpc`;
}

/** Plain-text "how to use" for the finished script. */
function instructions(project) {
  const lines = [];
  const menu = { ...MENU_DEFAULTS, ...(project.menu ?? {}) };
  const combo = MENU_COMBOS.find((c) => c.id === menu.combo) ?? MENU_COMBOS[0];
  lines.push(`${(project.name || 'MY SCRIPT').toUpperCase()} - how to use`, '');
  lines.push(`Open the menu: hold ${combo.name.split(' + ')[0]} and press ${combo.name.split(' + ')[1]}.`);
  lines.push('In the menu: UP / DOWN select, LEFT / RIGHT change, CROSS edits the values, CIRCLE goes back. Settings save when the menu closes.');
  for (const c of listCombos(project).slice(1)) lines.push(`${c.what}: hold ${BTN(c.hold)} and press ${BTN(c.press)}${c.note ? ` (${c.note})` : ''}.`);
  if (ensureControls(project).profiles.count > 1) lines.push('In the menu, TRIANGLE switches profile.');
  return lines.join('\n');
}

export function renderBuildStep(host, ctx) {
  const { project, persist, logo } = ctx;
  ensureSelection(project);
  const controls = ensureControls(project);
  const screen = ensureScreen(project);
  const menu = { ...MENU_DEFAULTS, ...(project.menu ?? {}) };
  let code = '';
  let stats = null;
  let compiled = null;

  host.innerHTML = `
    <div class="bst">
      <div class="bst-left">
        <section class="cst-card">
          <div class="cst-head"><span class="section-title">Review</span></div>
          <div class="bst-review"></div>
        </section>
        <section class="cst-card">
          <div class="cst-head"><span class="section-title">Checks</span></div>
          <div class="bst-checks"></div>
        </section>
        <section class="cst-card">
          <div class="cst-head"><span class="section-title">How to use</span><button class="btn btn-sm" data-act="copyhelp">Copy</button></div>
          <pre class="bst-help"></pre>
        </section>
      </div>
      <div class="bst-right">
        <section class="cst-card bst-out">
          <div class="cst-head"><span class="section-title">Your script</span><span class="bst-size"></span></div>
          <textarea class="ls-code bst-code" readonly spellcheck="false"></textarea>
          <div class="bst-actions">
            <label class="bst-file"><span>File name</span><input class="ls-input" data-f="file" value="${esc(project.build?.file ?? scriptFileName(project))}"></label>
            <button class="btn btn-primary" data-act="save">Save to library</button>
            <button class="btn" data-act="compiler">Open in Compiler</button>
            <button class="btn" data-act="copy">Copy</button>
          </div>
        </section>
        <section class="cst-card">
          <div class="cst-head"><span class="section-title">Send to the Zen</span><span class="muted bst-dev"></span></div>
          <div class="bst-slots"></div>
          <p class="muted">The script is placed on the slot in BOOT. Press START there: the app compiles it and asks you to confirm before flashing.</p>
        </section>
      </div>
    </div>`;
  const $ = (s) => host.querySelector(s);

  // ---------- review
  function renderReview() {
    const style = MENU_STYLES.find((s) => s.id === menu.style) ?? MENU_STYLES[0];
    const combo = MENU_COMBOS.find((c) => c.id === menu.combo) ?? MENU_COMBOS[0];
    const picked = project.mods?.picked ?? {};
    const byCat = MOD_CATEGORIES.map((c) => [c, MODS.filter((m) => m.cat === c && picked[m.id]).map((m) => effectiveMod(m, picked[m.id]).name)]).filter(([, l]) => l.length);
    const p = controls.profiles;
    const row = (k, v, step) => `<div class="bst-row"><span class="k">${esc(k)}</span><span class="v">${v}</span><button class="link" data-goto="${step}">Edit</button></div>`;
    $('.bst-review').innerHTML = `
      <div class="bst-logo"><canvas></canvas></div>
      ${row('Name', `<b>${esc(project.name || '—')}</b>`, 'start')}
      ${row('Logo', project.logo.mode === 'image' ? 'Picture from Logo Studio' : 'Script name as text', 'start')}
      ${row('Menu', `${esc(style.name)} · open with ${esc(combo.name)}`, 'menu')}
      ${row('Mods', byCat.length ? byCat.map(([c, l]) => `<div class="bst-modcat"><small>${esc(c)}</small> ${l.map((n) => `<span class="chip">${esc(n)}</span>`).join(' ')}</div>`).join('') : '<span class="warn">No mods picked</span>', 'mods')}
      ${row('Profiles', p.count > 1 ? `${p.count}: ${p.names.slice(0, p.count).map(esc).join(', ')}` : 'One', 'controls')}
      ${row('Quick toggles', String(controls.quick.length || 'None'), 'controls')}
      ${row('Screen', `${esc(label(BOOT_MODES, screen.boot))} · home: ${esc(label(HOME_MODES, screen.home))} · saver: ${screen.saverSec ? `${screen.saverSec}s, ${esc(label(SAVER_MODES, screen.saver).split(' (')[0].toLowerCase())}` : 'off'}`, 'screen')}
      ${row('LED', screen.led.on ? 'On' : 'Off', 'screen')}`;
    renderBitmap($('.bst-logo canvas'), logo, 2, { on: '#eef3ff', off: '#030305' });
    host.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => ctx.go(b.dataset.goto)));
  }

  // ---------- generate + checks
  function build() {
    const checks = [];
    code = '';
    stats = null;
    compiled = null;
    if (!project.name.trim()) checks.push(['err', 'The script has no name (step 1).']);
    if (!hasMods(project)) checks.push(['err', 'No mods picked yet (step 3).']);
    if (hasMods(project)) {
      try {
        const out = generateMenuScript(scriptOptions(project, logo));
        code = out.code;
        stats = out.stats;
        try {
          compiled = ctx.compile(code);
          checks.push(['ok', `Compiles with libgpc: ${fmtSize(compiled.bytes)} of bytecode.`]);
        } catch (e) {
          checks.push(['err', `Compile error: ${e.message}`]);
        }
        checks.push(['ok', `Saved settings use ${stats.slots} of ${stats.maxSlots} SPVARs (${stats.bits} bits).`]);
      } catch (e) {
        checks.push(['err', e.message]);
      }
    }
    const conflicts = listCombos(project).filter((c) => c.conflict);
    if (conflicts.length) checks.push(['err', `Button combo conflicts: ${conflicts.map((c) => `${c.what} (${c.conflict})`).join('; ')}.`]);
    else checks.push(['ok', 'No button combo conflicts.']);
    if (/[^\x20-\x7E]/.test(project.name)) checks.push(['warn', 'The name has non-English letters; the OLED text uses only the English ones (your picture logo is not affected).']);
    if (!screen.saverSec || screen.home === 'blank') checks.push(['warn', screen.home === 'blank' ? 'Home screen is blank, so the OLED stays off.' : 'Screen saver is off: a static logo can burn into the OLED over time.']);
    else checks.push(['ok', `Screen saver after ${screen.saverSec} s.`]);
    if (project.mods?.picked?.ar_weapon && (project.mods.picked.ar_weapon.def ?? 1) >= 1) checks.push(['info', 'WEAPON AR AUTO PS5 reads the DualSense adaptive-trigger data; it has not been tried on a real PS5 yet.']);
    checks.push(['info', 'Mod timings are written for Call of Duty style games; tune the values in the menu for your game.']);

    $('.bst-checks').innerHTML = checks.map(([k, t]) => `<div class="bst-check ${k}"><span class="i">${{ ok: '✓', err: '✕', warn: '!', info: 'i' }[k]}</span><span>${esc(t)}</span></div>`).join('');
    $('.bst-code').value = code || '// Fix the checks above to generate the script.';
    $('.bst-size').innerHTML = compiled ? `<span class="ls-badge ok">${fmtSize(compiled.bytes)} · ${stats.items} mods · ${stats.values} values</span>` : '<span class="ls-badge err">Not ready</span>';
    const ready = !!(code && compiled && !checks.some(([k]) => k === 'err'));
    host.querySelectorAll('[data-act="save"], [data-act="compiler"], [data-act="copy"], .bst-slot').forEach((b) => { b.disabled = !ready; });
    $('.bst-help').textContent = instructions(project);
    return ready;
  }

  // ---------- slots
  function renderSlots() {
    const dev = ctx.deviceSlots?.() ?? { connected: false, slots: [], pending: [] };
    $('.bst-dev').textContent = dev.connected ? 'Cronus Zen connected' : 'Not connected: you can still queue it and connect later';
    $('.bst-slots').innerHTML = Array.from({ length: 8 }, (_, i) => {
      const s = dev.slots?.[i];
      const what = dev.pending?.includes(i + 1) ? 'waiting for START' : dev.connected ? (s && !s.empty ? esc(s.name || 'Script') : 'Empty') : '—';
      return `<button class="bst-slot" data-slot="${i + 1}"><b>SLOT ${i + 1}</b><small>${what}</small></button>`;
    }).join('');
    host.querySelectorAll('[data-slot]').forEach((b) => b.addEventListener('click', async () => {
      const n = +b.dataset.slot;
      const s = dev.slots?.[n - 1];
      const ok = await ctx.modal({
        title: `Put ${esc(project.name || 'the script')} on Slot ${n}?`,
        html: `<p>The script goes to <b>Slot ${n}</b> on the BOOT page${dev.connected && s && !s.empty ? `, replacing <b>${esc(s.name || 'the current script')}</b> when you flash` : ''}.</p><p class="muted">Nothing is written to the Zen until you press START there and confirm.</p>`,
        buttons: [{ label: 'Cancel', value: false }, { label: `Go to Slot ${n}`, value: true, primary: true }],
        dismiss: false,
      });
      if (!ok) return;
      ctx.sendToSlot(n, $('[data-f="file"]').value.trim() || scriptFileName(project), code);
    }));
  }

  // ---------- actions
  const fileName = () => {
    let f = $('[data-f="file"]').value.trim() || scriptFileName(project);
    if (!/\.gpc$/i.test(f)) f += '.gpc';
    return f;
  };
  $('[data-f="file"]').addEventListener('change', () => { project.build = { ...(project.build ?? {}), file: fileName() }; persist(); });
  $('[data-act="save"]').addEventListener('click', async () => {
    const name = fileName();
    try {
      const existing = (await ctx.libraryList?.()) ?? [];
      if (existing.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
        const ok = await ctx.modal({
          title: `Replace ${esc(name)}?`,
          html: '<p>A script with this name is already in your library. Saving replaces it.</p>',
          buttons: [{ label: 'Cancel', value: false }, { label: 'Replace', value: true, danger: true }],
          dismiss: false,
        });
        if (!ok) return;
      }
      const path = await ctx.librarySave(name, code);
      project.build = { ...(project.build ?? {}), file: name, savedAt: Date.now() };
      persist();
      ctx.toast(`Saved to ${path}`, 'ok');
    } catch (e) {
      ctx.toast(`Save failed: ${e?.message ?? e}`, 'error');
    }
  });
  $('[data-act="compiler"]').addEventListener('click', () => ctx.openInCompiler(fileName(), code));
  $('[data-act="copy"]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(code); ctx.toast('GPC copied.', 'ok'); } catch (e) { ctx.toast(String(e), 'error'); }
  });
  $('[data-act="copyhelp"]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(instructions(project)); ctx.toast('Instructions copied.', 'ok'); } catch (e) { ctx.toast(String(e), 'error'); }
  });

  renderReview();
  renderSlots();
  build();
  return { dispose() { persist(); } };
}

export { MOD_BY_ID };

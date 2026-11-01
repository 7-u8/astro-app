// CONTROLS step: profiles, quick toggles and an overview of every button combo in the script.
import { MOD_BY_ID, MODS, MOD_CATEGORIES, PHYSICAL_BUTTONS, effectiveMod } from './mods.js';
import { MENU_COMBOS, PROFILE_DEFAULTS, DEMO_MODEL, generateMenuScript } from './menu-gen.js';
import { MENU_DEFAULTS } from './menu-step.js';
import { scriptOptions, hasMods, ensureSelection } from './mods-step.js';
import { createSimulator } from './sim.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const COMBO_BUTTONS = [...PHYSICAL_BUTTONS, ['PS4_OPTIONS', 'OPTIONS / MENU'], ['PS4_SHARE', 'SHARE / VIEW']];
const label = (b) => (COMBO_BUTTONS.find(([id]) => id === b)?.[1] ?? String(b).replace('PS4_', ''));

// Fills in missing fields in place, so every step keeps working on the same objects.
export function ensureControls(project) {
  const c = (project.controls ??= {});
  c.profiles = Object.assign({ ...PROFILE_DEFAULTS }, c.profiles ?? {});
  if (!Array.isArray(c.profiles.names)) c.profiles.names = [...PROFILE_DEFAULTS.names];
  if (!Array.isArray(c.quick)) c.quick = [];
  c.quickSave = c.quickSave !== false;
  return c;
}

/** Every hold + press combo the generated script reacts to (for the overview and conflict check). */
export function listCombos(project) {
  const menu = { ...MENU_DEFAULTS, ...(project.menu ?? {}) };
  const ctl = ensureControls(project);
  const mc = MENU_COMBOS.find((c) => c.id === menu.combo) ?? MENU_COMBOS[0];
  const out = [{ what: 'Open / close the menu', hold: mc.hold, press: mc.press }];
  const picked = project.mods?.picked ?? {};
  if (ctl.profiles.count > 1 && ctl.profiles.hold && ctl.profiles.press) out.push({ what: 'Next profile', hold: ctl.profiles.hold, press: ctl.profiles.press });
  if (picked.ut_kill) out.push({ what: 'Kill switch', hold: 'PS4_L2', press: mc.press === 'PS4_SHARE' ? 'PS4_TOUCH' : 'PS4_SHARE', note: 'hold = your ADS button' });
  if (picked.ar_weapon) {
    out.push({ what: 'Weapon AR: next weapon', hold: 'PS4_L2', press: 'PS4_RIGHT', note: 'hold = your ADS button' });
    out.push({ what: 'Weapon AR: previous weapon', hold: 'PS4_L2', press: 'PS4_LEFT', note: 'hold = your ADS button' });
    out.push({ what: 'Weapon AR: learn trigger (AUTO PS5)', hold: 'PS4_L2', press: 'PS4_DOWN', note: 'hold = your ADS button' });
  }
  for (const q of ctl.quick) {
    const mod = MOD_BY_ID.get(q.key);
    if (mod && picked[q.key]) out.push({ what: `Quick toggle: ${effectiveMod(mod, picked[q.key]).name}`, hold: q.hold, press: q.press });
  }
  const seen = new Map();
  for (const c of out) {
    const k = `${c.hold}+${c.press}`;
    c.conflict = c.hold === c.press ? 'Hold and press are the same button' : seen.has(k) ? `Same combo as "${seen.get(k)}"` : '';
    if (!seen.has(k)) seen.set(k, c.what);
  }
  return out;
}

export function renderControlsStep(host, ctx) {
  const { project, persist, logo } = ctx;
  ensureSelection(project);
  const ctl = ensureControls(project);
  let checkTimer = 0;

  host.innerHTML = `
    <div class="cst">
      <div class="cst-left">
        <section class="cst-card">
          <div class="cst-head"><span class="section-title">Profiles</span><span class="muted">Separate settings for different loadouts or games</span></div>
          <div class="cst-seg" data-prof-count>${[1, 2, 3].map((n) => `<button data-n="${n}">${n === 1 ? 'One profile' : `${n} profiles`}</button>`).join('')}</div>
          <div class="cst-prof"></div>
        </section>
        <section class="cst-card">
          <div class="cst-head"><span class="section-title">Quick toggles</span><span class="muted">Turn a mod on or off in game without opening the menu</span></div>
          <div class="cst-quick"></div>
          <div class="cst-row-actions">
            <button class="btn btn-sm" data-act="addq">Add quick toggle</button>
            <label class="ls-chk"><input type="checkbox" data-q="save"${ctl.quickSave ? ' checked' : ''}><span>Remember quick toggle changes after restart</span></label>
          </div>
        </section>
        <section class="cst-card">
          <div class="cst-head"><span class="section-title">All button combos</span><span class="cst-status"></span></div>
          <div class="cst-combos"></div>
        </section>
      </div>
      <div class="cst-right"><div class="cst-sim"></div></div>
    </div>`;
  const $ = (s) => host.querySelector(s);
  const btnSelect = (attr, val, allowNone = false) => `<select class="ls-sel" ${attr}>${allowNone ? '<option value="">None</option>' : ''}${COMBO_BUTTONS.map(([b, l]) => `<option value="${b}"${b === val ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;

  const sim = createSimulator($('.cst-sim'), {
    project, persist, toast: ctx.toast, compact: false,
    getCode: () => { try { return generateMenuScript(scriptOptions(project, logo, DEMO_MODEL)).code; } catch { return ''; } },
    combo: () => project.menu?.combo,
  });

  const changed = (rebuild = true) => { persist(); renderCombos(); if (rebuild) { clearTimeout(checkTimer); checkTimer = setTimeout(() => { sim.rebuild(true); compileCheck(); }, 200); } };

  // ---------- profiles
  function renderProfiles() {
    const p = ctl.profiles;
    host.querySelectorAll('[data-prof-count] button').forEach((b) => b.classList.toggle('active', +b.dataset.n === p.count));
    $('.cst-prof').innerHTML = p.count > 1 ? `
      <div class="cst-names">${Array.from({ length: p.count }, (_, i) => `<label><span>Profile ${i + 1}</span><input class="ls-input" data-pname="${i}" maxlength="12" value="${esc(p.names[i] ?? '')}"></label>`).join('')}</div>
      <div class="ls-row"><span>Switch in game: hold</span>${btnSelect('data-p="hold"', p.hold, true)}</div>
      <div class="ls-row"><span>and press</span>${btnSelect('data-p="press"', p.press, true)}</div>
      <p class="muted">CONTROLLER and UTILITY mods are shared by all profiles; every other mod keeps its own settings per profile. In the menu, TRIANGLE switches profile too. The LED colour of each profile is set in step 5.</p>`
      : '<p class="muted">One set of settings. Choose 2 or 3 profiles to keep, for example, separate recoil values for different loadouts.</p>';
    host.querySelectorAll('[data-pname]').forEach((inp) => inp.addEventListener('input', () => {
      const v = inp.value.replace(/[^\x20-\x7E]/g, '').toUpperCase();
      if (v !== inp.value) inp.value = v;
      p.names[+inp.dataset.pname] = v;
      changed();
    }));
    host.querySelectorAll('[data-p]').forEach((s) => s.addEventListener('change', () => { p[s.dataset.p] = s.value; changed(); }));
  }
  host.querySelectorAll('[data-prof-count] button').forEach((b) => b.addEventListener('click', () => {
    ctl.profiles.count = +b.dataset.n;
    renderProfiles();
    changed();
  }));

  // ---------- quick toggles
  function pickedMods() {
    const picked = project.mods?.picked ?? {};
    return MOD_CATEGORIES.flatMap((c) => MODS.filter((m) => m.cat === c && picked[m.id] && m.id !== 'ut_kill'))
      .map((m) => [m.id, effectiveMod(m, picked[m.id]).name]);
  }
  function renderQuick() {
    const mods = pickedMods();
    const box = $('.cst-quick');
    if (!hasMods(project)) { box.innerHTML = '<p class="muted">Pick mods in step 3 first.</p>'; return; }
    box.innerHTML = ctl.quick.length ? ctl.quick.map((q, i) => `
      <div class="cst-q" data-qi="${i}">
        <select class="ls-sel" data-qk="key">${mods.map(([id, n]) => `<option value="${id}"${id === q.key ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
        <span class="muted">hold</span>${btnSelect('data-qk="hold"', q.hold)}
        <span class="muted">press</span>${btnSelect('data-qk="press"', q.press)}
        <button class="icon-btn" data-qk="del" title="Remove">&#x2715;</button>
      </div>`).join('') : '<p class="muted">No quick toggles yet.</p>';
    box.querySelectorAll('[data-qi]').forEach((row) => {
      const q = ctl.quick[+row.dataset.qi];
      row.querySelectorAll('select').forEach((s) => s.addEventListener('change', () => { q[s.dataset.qk] = s.value; changed(); }));
      row.querySelector('[data-qk="del"]').addEventListener('click', () => { ctl.quick.splice(+row.dataset.qi, 1); renderQuick(); changed(); });
    });
  }
  $('[data-act="addq"]').addEventListener('click', () => {
    const mods = pickedMods();
    if (!mods.length) { ctx.toast('Pick mods in step 3 first.', 'error'); return; }
    if (ctl.quick.length >= 8) { ctx.toast('Up to 8 quick toggles.', 'error'); return; }
    const used = new Set(ctl.quick.map((q) => q.key));
    const key = (mods.find(([id]) => !used.has(id)) ?? mods[0])[0];
    const presses = ['PS4_UP', 'PS4_DOWN', 'PS4_LEFT', 'PS4_RIGHT', 'PS4_CROSS', 'PS4_SQUARE', 'PS4_TRIANGLE', 'PS4_CIRCLE'];
    ctl.quick.push({ key, hold: 'PS4_L1', press: presses[ctl.quick.length % presses.length] });
    renderQuick();
    changed();
  });
  $('[data-q="save"]').addEventListener('change', (e) => { ctl.quickSave = e.target.checked; changed(); });

  // ---------- combos overview
  function renderCombos() {
    const list = listCombos(project);
    const conflicts = list.filter((c) => c.conflict).length;
    $('.cst-status').innerHTML = conflicts ? `<span class="ls-badge err">${conflicts} conflict${conflicts > 1 ? 's' : ''}</span>` : '<span class="ls-badge ok">No conflicts</span>';
    $('.cst-combos').innerHTML = `<table class="mds-vals cst-table">
      <tr><th>Action</th><th>Hold</th><th>Press</th><th></th></tr>
      ${list.map((c) => `<tr class="${c.conflict ? 'bad' : ''}"><td>${esc(c.what)}</td><td>${esc(label(c.hold))}</td><td>${esc(label(c.press))}</td><td class="muted">${esc(c.conflict || c.note || '')}</td></tr>`).join('')}
    </table>`;
  }

  function compileCheck() {
    try {
      const out = generateMenuScript(scriptOptions(project, logo, DEMO_MODEL));
      const r = ctx.compile(out.code);
      $('.cst-status').insertAdjacentHTML('beforeend', ` <span class="ls-badge ok">Compiles · ${r.bytes} B · ${out.stats.slots}/${out.stats.maxSlots} SPVARs</span>`);
    } catch (e) {
      $('.cst-status').insertAdjacentHTML('beforeend', ` <span class="ls-badge err" title="${esc(e.message)}">Compile error</span>`);
    }
  }

  renderProfiles();
  renderQuick();
  renderCombos();
  compileCheck();
  return { dispose() { clearTimeout(checkTimer); sim.dispose(); persist(); } };
}

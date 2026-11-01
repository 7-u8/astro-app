// MODS step: pick mods from the catalogue, set their defaults and ranges, and see the result compile.
import {
  MODS, MOD_BY_ID, MOD_CATEGORIES, GROUP_RULES, LAYOUTS, ACTIONS, PHYSICAL_BUTTONS,
  defaultModSelection, effectiveMod, buildModel, withRequirements,
} from './mods.js';
import { generateMenuScript, SCREEN_DEFAULTS, PROFILE_DEFAULTS } from './menu-gen.js';
import { MENU_DEFAULTS } from './menu-step.js';
import { sectionsFor, idsFor } from './games.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const STARTER_PACK = ['aa_polar', 'aa_hip', 'ar_basic', 'sh_rapid', 'mv_slide', 'ctl_layout', 'ctl_hair', 'ctl_dz', 'ut_kill'];

// Fills in missing fields in place, so every step keeps working on the same objects.
export function ensureSelection(project) {
  const m = (project.mods ??= defaultModSelection());
  m.picked ??= {};
  if (!Array.isArray(m.layoutCustom) || m.layoutCustom.length !== ACTIONS.length) m.layoutCustom = LAYOUTS[0][1].slice();
  return m;
}

// Only the mods of the chosen game count. The choice is kept across games, so other games' mods are ignored.
export function gamePicked(project) {
  const picked = project.mods?.picked ?? {};
  if (!project.game) return picked;
  const ids = new Set(idsFor(project.game));
  return Object.fromEntries(Object.entries(picked).filter(([id]) => ids.has(id)));
}

export function hasMods(project) { return Object.keys(gamePicked(project)).length > 0; }

/** Options for generateMenuScript from the whole project. */
export function scriptOptions(project, logo, demoModel) {
  const menu = { ...MENU_DEFAULTS, ...(project.menu ?? {}) };
  const sel = { ...project.mods, picked: withRequirements(gamePicked(project)) };
  const useMods = hasMods(project);
  const controls = project.controls ?? {};
  const screen = { ...SCREEN_DEFAULTS, saverSec: menu.saverSec ?? SCREEN_DEFAULTS.saverSec, ...(project.screen ?? {}) };
  return {
    name: project.name,
    logoBitmap: logo,
    logoExport: project.logo.export,
    style: menu.style,
    valueStyle: menu.valueStyle ?? 'std',
    flat: menu.flat ?? undefined,
    combo: menu.combo,
    fast: menu.fast,
    rumble: menu.rumble,
    model: useMods ? buildModel(sel) : demoModel,
    selection: useMods ? sel : null,
    profiles: { ...PROFILE_DEFAULTS, ...(controls.profiles ?? {}) },
    quick: useMods ? (controls.quick ?? []) : [],
    quickSave: controls.quickSave !== false,
    screen,
  };
}

export function renderModsStep(host, ctx) {
  const { project, persist, logo } = ctx;
  const sel = ensureSelection(project);
  // Tabs come from the game (CALL OF DUTY sections, or the general categories when no game is chosen).
  const sections = sectionsFor(project.game);
  let tab = 0;
  const tabIds = () => sections[tab]?.ids ?? [];
  let editing = null;
  let checkTimer = 0;

  host.innerHTML = `
    <div class="mds">
      <div class="mds-left">
        <div class="mds-cats"></div>
        <div class="mds-rule muted"></div>
        <div class="mds-list"></div>
      </div>
      <aside class="mds-right">
        <div class="mds-right-head">
          <span class="section-title">Your script</span>
          <div class="mds-head-actions">
            <button class="btn btn-sm" data-act="starter">Starter pack</button>
            <button class="btn btn-sm" data-act="clear">Clear</button>
          </div>
        </div>
        <div class="mds-picked"></div>
        <div class="mds-editor"></div>
        <div class="mds-summary"></div>
      </aside>
    </div>`;
  const $ = (s) => host.querySelector(s);

  const groupCount = (g) => MODS.filter((m) => m.group === g && sel.picked[m.id]).length;
  const changed = () => { persist(); renderList(); renderPicked(); scheduleCheck(); };

  function toggle(id, on) {
    const mod = MOD_BY_ID.get(id);
    if (on) {
      if (mod.group && GROUP_RULES[mod.group] && groupCount(mod.group) >= GROUP_RULES[mod.group].max) {
        ctx.toast(GROUP_RULES[mod.group].label, 'error');
        return;
      }
      sel.picked[id] = sel.picked[id] ?? {};
      editing = id;
    } else {
      delete sel.picked[id];
      if (editing === id) editing = null;
    }
    changed();
  }

  // ---------- catalogue
  function renderCats() {
    $('.mds-cats').innerHTML = sections.map((s, i) => {
      const n = s.ids.filter((id) => sel.picked[id]).length;
      return `<button class="mds-cat${i === tab ? ' active' : ''}" data-tab="${i}">${esc(s.title)}${n ? ` <span class="mds-n">${n}</span>` : ''}</button>`;
    }).join('');
    host.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = Number(b.dataset.tab); renderList(); }));
  }

  function renderList() {
    renderCats();
    const shown = tabIds().map((id) => MOD_BY_ID.get(id)).filter(Boolean);
    const note = sections[tab]?.note;
    const rules = [...new Set(shown.filter((m) => m.group).map((m) => m.group))].map((g) => GROUP_RULES[g]?.label).filter(Boolean);
    $('.mds-rule').textContent = rules.join(' ');
    if (!sections.length) {
      $('.mds-list').innerHTML = '<div class="lib-empty">The mods for this game are not built yet. Pick CALL OF DUTY in step 1 for its mods.</div>';
      return;
    }
    $('.mds-list').innerHTML = (note ? `<div class="lib-empty">${esc(note)}</div>` : '') + shown.map((m) => {
      const on = !!sel.picked[m.id];
      const full = !on && m.group && GROUP_RULES[m.group] && groupCount(m.group) >= GROUP_RULES[m.group].max;
      return `
        <div class="mds-card${on ? ' on' : ''}${full ? ' full' : ''}" data-id="${m.id}">
          <label class="mds-check"><input type="checkbox" ${on ? 'checked' : ''} ${full ? 'disabled' : ''}><span></span></label>
          <div class="mds-card-body">
            <div class="mds-card-title"><b>${esc(m.name)}</b>${m.control ? '<span class="badge">always on top</span>' : ''}</div>
            <div class="mds-desc">${esc(m.desc)}</div>
            <div class="mds-chips">${m.options.slice(1).map((o) => `<span class="chip">${esc(o)}</span>`).join('')}${m.values.map((v) => `<span class="chip ghost">${esc(v.name)}</span>`).join('')}</div>
          </div>
        </div>`;
    }).join('');
    host.querySelectorAll('.mds-card').forEach((card) => {
      const id = card.dataset.id;
      card.querySelector('input').addEventListener('change', (e) => toggle(id, e.target.checked));
      card.addEventListener('click', (e) => {
        if (e.target.closest('.mds-check')) return;
        if (sel.picked[id]) { editing = id; renderPicked(); }
      });
    });
  }

  // ---------- picked list + editor
  function renderPicked() {
    const ids = sections.flatMap((s) => s.ids).filter((id) => sel.picked[id]);
    $('.mds-picked').innerHTML = ids.length
      ? ids.map((id) => {
        const e = effectiveMod(MOD_BY_ID.get(id), sel.picked[id]);
        return `<button class="mds-pick${id === editing ? ' active' : ''}" data-pick="${id}"><span>${esc(e.name)}</span><small>${esc(e.options[e.def] ?? '')}</small></button>`;
      }).join('')
      : '<div class="lib-empty">No mods yet. Tick mods on the left or press Starter pack.</div>';
    host.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => { editing = b.dataset.pick; renderPicked(); }));
    renderEditor();
  }

  function renderEditor() {
    const ed = $('.mds-editor');
    if (!editing || !sel.picked[editing]) { ed.innerHTML = ''; return; }
    const mod = MOD_BY_ID.get(editing);
    const pick = sel.picked[editing];
    const e = effectiveMod(mod, pick);
    ed.innerHTML = `
      <div class="mds-ed-head"><b>${esc(mod.name)}</b><button class="icon-btn" data-ed="remove" title="Remove">&#x2715;</button></div>
      <div class="ls-row"><span>Menu name</span><input class="ls-input" data-ed="name" maxlength="16" value="${esc(e.name)}"></div>
      <div class="ls-row"><span>Starts as</span><select class="ls-sel" data-ed="def">${mod.options.map((o, i) => `<option value="${i}"${i === e.def ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
      ${e.values.length ? `<table class="mds-vals">
        <tr><th>Value</th><th>Min</th><th>Max</th><th>Start</th><th>Step</th><th>Big</th></tr>
        ${e.values.map((val) => `<tr data-v="${val.id}">
          <td>${esc(val.name)}</td>
          ${['min', 'max', 'def', 'step', 'big'].map((k) => `<td><input type="number" data-k="${k}" value="${val[k]}"></td>`).join('')}
        </tr>`).join('')}
      </table>` : '<p class="muted">This mod has no values to edit, only its options.</p>'}
      ${mod.hasConfig === 'layout' ? `<div class="mds-sub">CUSTOM buttons (used when the layout is set to CUSTOM)</div>
        <div class="mds-layout">${ACTIONS.map((a, i) => `<label><span>${a}</span><select class="ls-sel" data-lay="${i}">${PHYSICAL_BUTTONS.map(([b, l]) => `<option value="${b}"${sel.layoutCustom[i] === b ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`).join('')}</div>` : ''}
      <p class="muted">${esc(mod.desc)}</p>`;
    ed.querySelector('[data-ed="remove"]').addEventListener('click', () => toggle(editing, false));
    ed.querySelector('[data-ed="name"]').addEventListener('input', (ev) => {
      const v = ev.target.value.replace(/[^\x20-\x7E]/g, '').toUpperCase();
      if (v !== ev.target.value) ev.target.value = v;
      pick.name = v.trim() || undefined;
      persist(); renderPickedOnly(); scheduleCheck();
    });
    ed.querySelector('[data-ed="def"]').addEventListener('change', (ev) => { pick.def = Number(ev.target.value); persist(); renderPickedOnly(); scheduleCheck(); });
    ed.querySelectorAll('tr[data-v] input').forEach((inp) => inp.addEventListener('change', () => {
      const vid = inp.closest('tr').dataset.v;
      const base = mod.values.find((x) => x.id === vid);
      const cur = { ...base, ...(pick.values?.[vid] ?? {}) };
      let n = Math.trunc(Number(inp.value));
      if (!Number.isFinite(n)) n = base[inp.dataset.k];
      cur[inp.dataset.k] = n;
      // Keep the numbers consistent: min < max, start inside, steps positive and within 16-bit.
      cur.min = Math.max(-32000, Math.min(cur.min, 32000));
      cur.max = Math.max(cur.min + 1, Math.min(cur.max, 32000));
      cur.def = Math.min(Math.max(cur.def, cur.min), cur.max);
      cur.step = Math.max(1, cur.step);
      cur.big = Math.max(cur.step, cur.big);
      pick.values = { ...(pick.values ?? {}), [vid]: { min: cur.min, max: cur.max, def: cur.def, step: cur.step, big: cur.big } };
      persist(); renderEditor(); scheduleCheck();
    }));
    ed.querySelectorAll('[data-lay]').forEach((s) => s.addEventListener('change', () => { sel.layoutCustom[+s.dataset.lay] = s.value; persist(); scheduleCheck(); }));
  }

  function renderPickedOnly() {
    const keep = editing;
    $('.mds-picked').querySelectorAll('[data-pick]').forEach((b) => {
      const e = effectiveMod(MOD_BY_ID.get(b.dataset.pick), sel.picked[b.dataset.pick]);
      b.querySelector('span').textContent = e.name;
      b.querySelector('small').textContent = e.options[e.def] ?? '';
      b.classList.toggle('active', b.dataset.pick === keep);
    });
  }

  // ---------- summary + compile check
  function scheduleCheck() {
    clearTimeout(checkTimer);
    const box = $('.mds-summary');
    if (!hasMods(project)) { box.innerHTML = '<span class="muted">Pick at least one mod to build your script.</span>'; return; }
    box.innerHTML = '<span class="ls-badge">checking…</span>';
    checkTimer = setTimeout(() => {
      try {
        const out = generateMenuScript(scriptOptions(project, logo));
        const s = out.stats;
        let status;
        try { const r = ctx.compile(out.code); status = `<span class="ls-badge ok">Compiles · ${r.bytes} B</span>`; } catch (e) { status = `<span class="ls-badge err" title="${esc(e.message)}">Compile error</span>`; }
        box.innerHTML = `${status}<span>${s.items} mods · ${s.values} values · saves in ${s.slots}/${s.maxSlots} SPVARs</span>${s.killBtn ? `<span class="muted">Kill switch: hold ADS + ${s.killBtn === 'PS4_TOUCH' ? 'TOUCHPAD' : 'SHARE'}</span>` : ''}`;
      } catch (e) {
        box.innerHTML = `<span class="warn">${esc(e.message)}</span>`;
      }
    }, 250);
  }

  $('[data-act="starter"]').addEventListener('click', () => {
    const allowed = new Set(sections.flatMap((x) => x.ids));
    for (const id of STARTER_PACK) if (allowed.has(id)) sel.picked[id] = sel.picked[id] ?? {};
    editing = STARTER_PACK[0];
    changed();
    ctx.toast('Starter pack added. Change anything you like.', 'ok');
  });
  $('[data-act="clear"]').addEventListener('click', async () => {
    if (!hasMods(project)) return;
    const ok = await ctx.modal({
      title: 'Remove all mods?',
      html: '<p>Your mod choices and their custom values will be cleared.</p>',
      buttons: [{ label: 'Cancel', value: false }, { label: 'Remove all', value: true, danger: true }],
      dismiss: false,
    });
    if (!ok) return;
    sel.picked = {};
    editing = null;
    changed();
  });

  renderList();
  renderPicked();
  scheduleCheck();
  return { dispose() { clearTimeout(checkTimer); persist(); } };
}

// MENU step: pick a menu style and try it on a simulated Zen that runs the generated GPC.
import { renderBitmap } from './oled.js';
import { GpcVM, BUILTIN_CONSTS as K } from './gpc-vm.js';
import { MENU_STYLES, VALUE_STYLES, MENU_COMBOS, FAST_BUTTONS, DEMO_MODEL, generateMenuScript } from './menu-gen.js';
import { scriptOptions, hasMods } from './mods-step.js';
import { createSimulator } from './sim.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const MENU_DEFAULTS = { style: 'classic', valueStyle: 'std', flat: null, combo: 'l2opt', fast: 'PS4_R1', rumble: true, saverSec: 10 };

/** Like snapshot(), but opens the first value screen (for the VALUE MENU thumbnails). */
function snapshotValue(opts, combo) {
  const vm = new GpcVM(generateMenuScript({ ...opts, screen: { ...(opts.screen ?? {}), boot: 'static' } }).code);
  for (let i = 0; i < 3; i++) vm.frame(10, new Map());
  const c = MENU_COMBOS.find((m) => m.id === combo) ?? MENU_COMBOS[0];
  vm.frame(10, new Map([[K[c.hold], 100], [K[c.press], 100]]));
  vm.frame(10, new Map());
  const style = MENU_STYLES.find((s) => s.id === opts.style);
  const flat = style.grouped ? false : (opts.flat ?? style.flat);
  // flat menus open on the mods; the others open on the categories first.
  const presses = flat ? 1 : 2;
  for (let i = 0; i < presses; i++) { vm.frame(10, new Map([[K.PS4_CROSS, 100]])); vm.frame(10, new Map()); }
  return vm.oled;
}

/** Runs a style for a few frames with the menu opened and returns the OLED bitmap (gallery thumbnails). */
function snapshot(opts, combo) {
  const vm = new GpcVM(generateMenuScript({ ...opts, screen: { ...(opts.screen ?? {}), boot: 'static' } }).code);
  for (let i = 0; i < 3; i++) vm.frame(10, new Map());
  const c = MENU_COMBOS.find((m) => m.id === combo) ?? MENU_COMBOS[0];
  vm.frame(10, new Map([[K[c.hold], 100], [K[c.press], 100]]));
  vm.frame(10, new Map());
  const style = MENU_STYLES.find((s) => s.id === opts.style);
  const flat = style.grouped ? false : (opts.flat ?? style.flat);
  if (!flat) { vm.frame(10, new Map([[K.PS4_CROSS, 100]])); vm.frame(10, new Map()); }
  return vm.oled;
}

export function renderMenuStep(host, ctx) {
  const { project, persist, logo } = ctx;
  project.menu = { ...MENU_DEFAULTS, ...(project.menu ?? {}) };
  const menu = project.menu;
  let code = '';
  const opts = (style = menu.style) => ({ ...scriptOptions(project, logo, DEMO_MODEL), style });

  host.innerHTML = `
    <div class="mst">
      <div class="mst-gallery"></div>
      <div class="mst-sim">
        <div class="mst-sim-host"></div>
        <div class="mst-opts">
          <div class="section-title">Menu settings</div>
          <div class="ls-row"><span>Open combo</span><select class="ls-sel" data-o="combo">${MENU_COMBOS.map((c) => `<option value="${c.id}"${c.id === menu.combo ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="ls-row"><span>Big steps button</span><select class="ls-sel" data-o="fast">${FAST_BUTTONS.map((c) => `<option value="${c.id}"${c.id === menu.fast ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="ls-checks">
            <label class="ls-chk"><input type="checkbox" data-o="group"><span>Group mods into categories</span></label>
            <label class="ls-chk"><input type="checkbox" data-o="rumble"${menu.rumble ? ' checked' : ''}><span>Rumble feedback</span></label>
          </div>
          <div class="mst-stats"></div>
          <div class="mst-code-actions">
            <button class="btn btn-sm" data-act="code">Show GPC</button>
            <button class="btn btn-sm btn-primary" data-act="compiler">Open in Compiler</button>
          </div>
          <p class="muted">${hasMods(project) ? 'The preview uses the mods you picked in step 3.' : 'Demo mods are used until you pick your own in step 3.'} It runs the real generated GPC; only the letter shapes of the OLED font are approximated. Screen saver and boot options are in step 5.</p>
        </div>
      </div>
    </div>`;
  const $ = (s) => host.querySelector(s);

  function regenerate() {
    try {
      const out = generateMenuScript(opts());
      code = out.code;
      const style = MENU_STYLES.find((s) => s.id === menu.style);
      $('.mst-stats').innerHTML = `<span>${out.stats.items} mods · ${out.stats.values} values</span><span>Save uses <b>${out.stats.bits} bits</b> in ${out.stats.slots} SPVAR${out.stats.slots > 1 ? 's' : ''}</span><span>${esc(style.name)} · ${out.stats.flat ? 'single list' : 'categories'}</span><span class="ls-badge" data-x="compile">checking…</span>`;
      setTimeout(() => {
        const b = host.querySelector('[data-x="compile"]');
        if (!b) return;
        try { const r = ctx.compile(code); b.textContent = `Compiles · ${r.bytes} B`; b.className = 'ls-badge ok'; } catch (e) { b.textContent = 'Compile error'; b.className = 'ls-badge err'; b.title = e.message; }
      }, 30);
    } catch (e) {
      code = '';
      $('.mst-stats').innerHTML = `<span class="warn">${esc(e.message)}</span>`;
    }
    return code;
  }

  const sim = createSimulator($('.mst-sim-host'), {
    project, persist, toast: ctx.toast, getCode: () => regenerate(), combo: () => menu.combo,
  });

  function renderGallery() {
    const g = $('.mst-gallery');
    const card = (s, attr, active) => `
      <button class="mst-card${active ? ' active' : ''}" ${attr}>
        <canvas></canvas>
        <b>${esc(s.name)}</b>
        <small>${esc(s.desc)}</small>
      </button>`;
    g.innerHTML = MENU_STYLES.map((s) => card(s, `data-style="${s.id}"`, s.id === menu.style)).join('')
      + `<div class="section-title mst-vhead" style="grid-column:1/-1">VALUE MENU</div>`
      + VALUE_STYLES.map((v) => card(v, `data-vstyle="${v.id}"`, v.id === menu.valueStyle)).join('');
    g.querySelectorAll('[data-vstyle]').forEach((el) => {
      const id = el.dataset.vstyle;
      try {
        renderBitmap(el.querySelector('canvas'), snapshotValue({ ...opts(menu.style), valueStyle: id }, menu.combo), 1, { on: '#eef3ff', off: '#030305' });
      } catch (e) {
        el.querySelector('small').textContent = `Preview error: ${e.message}`;
      }
      el.addEventListener('click', () => {
        menu.valueStyle = id;
        persist();
        g.querySelectorAll('[data-vstyle]').forEach((c) => c.classList.toggle('active', c === el));
        sim.rebuild(true);
      });
    });
    g.querySelectorAll('[data-style]').forEach((card) => {
      const id = card.dataset.style;
      try {
        renderBitmap(card.querySelector('canvas'), snapshot({ ...opts(id), flat: undefined }, menu.combo), 1, { on: '#eef3ff', off: '#030305' });
      } catch (e) {
        card.querySelector('small').textContent = `Preview error: ${e.message}`;
      }
      card.addEventListener('click', () => {
        menu.style = id;
        menu.flat = null;
        persist();
        g.querySelectorAll('[data-style]').forEach((c) => c.classList.toggle('active', c === card));
        syncOptions();
        sim.rebuild(true);
      });
    });
  }

  function syncOptions() {
    const style = MENU_STYLES.find((s) => s.id === menu.style);
    const grp = $('[data-o="group"]');
    grp.checked = style.grouped ? true : !(menu.flat ?? style.flat);
    grp.disabled = !!style.grouped;
  }
  host.querySelectorAll('[data-o]').forEach((el) => el.addEventListener('change', () => {
    const k = el.dataset.o;
    if (k === 'group') menu.flat = !el.checked;
    else if (k === 'rumble') menu.rumble = el.checked;
    else menu[k] = el.value;
    persist();
    sim.rebuild(true);
  }));

  const fileName = () => `${(project.name || 'MY_SCRIPT').replace(/[^\w-]+/g, '_')}.gpc`;
  $('[data-act="code"]').addEventListener('click', async () => {
    const choice = await ctx.modal({
      title: 'Generated GPC',
      html: `<textarea class="ls-code tall" readonly spellcheck="false">${esc(code)}</textarea>`,
      buttons: [{ label: 'Close', value: 'close' }, { label: 'Copy', value: 'copy' }, { label: 'Open in Compiler', value: 'open', primary: true }],
      dismiss: 'close',
    });
    if (choice === 'copy') { try { await navigator.clipboard.writeText(code); ctx.toast('GPC copied.', 'ok'); } catch (e) { ctx.toast(String(e), 'error'); } }
    if (choice === 'open') ctx.openInCompiler(fileName(), code);
  });
  $('[data-act="compiler"]').addEventListener('click', () => ctx.openInCompiler(fileName(), code));

  syncOptions();
  renderGallery();

  return {
    dispose() { sim.dispose(); persist(); },
  };
}

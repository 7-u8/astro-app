// SCREEN step: boot animation, home screen, screen saver and LED colours.
import { LED_COLORS, BOOT_MODES, HOME_MODES, SAVER_MODES, SCREEN_DEFAULTS, DEMO_MODEL, generateMenuScript } from './menu-gen.js';
import { MENU_DEFAULTS } from './menu-step.js';
import { scriptOptions } from './mods-step.js';
import { ensureControls } from './controls-step.js';
import { createSimulator } from './sim.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Fills in missing fields in place, so every step keeps working on the same objects.
export function ensureScreen(project) {
  const s = (project.screen ??= {});
  for (const [k, v] of Object.entries(SCREEN_DEFAULTS)) if (k !== 'led' && s[k] === undefined) s[k] = k === 'saverSec' ? (project.menu?.saverSec ?? MENU_DEFAULTS.saverSec) : v;
  s.led = Object.assign({ ...SCREEN_DEFAULTS.led }, s.led ?? {});
  if (!Array.isArray(s.led.profiles)) s.led.profiles = [...SCREEN_DEFAULTS.led.profiles];
  return s;
}

export function renderScreenStep(host, ctx) {
  const { project, persist, logo } = ctx;
  const scr = ensureScreen(project);
  const profiles = ensureControls(project).profiles;
  let timer = 0;

  const swatches = (attr, val) => `<div class="sst-swatches" ${attr}>${LED_COLORS.map(([id, name, [r, g, b]]) => `<button class="sst-sw${id === val ? ' active' : ''}" data-c="${id}" title="${esc(name)}" style="background: rgb(${r},${g},${b})"></button>`).join('')}</div>`;
  const select = (key, list, val) => `<select class="ls-sel" data-s="${key}">${list.map(([v, l]) => `<option value="${v}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;

  host.innerHTML = `
    <div class="cst">
      <div class="cst-left">
        <section class="cst-card">
          <div class="cst-head"><span class="section-title">Boot</span><span class="muted">What the screen shows when the script starts</span></div>
          <div class="ls-row"><span>Animation</span>${select('boot', BOOT_MODES, scr.boot)}</div>
          <div class="ls-row"><span>Length</span><span class="ls-range"><input type="range" data-s="bootMs" min="300" max="5000" step="100" value="${scr.bootMs}"><output>${(scr.bootMs / 1000).toFixed(1)} s</output></span></div>
        </section>
        <section class="cst-card">
          <div class="cst-head"><span class="section-title">Home screen</span><span class="muted">Shown while the menu is closed</span></div>
          <div class="ls-row"><span>Shows</span>${select('home', HOME_MODES, scr.home)}</div>
        </section>
        <section class="cst-card">
          <div class="cst-head"><span class="section-title">Screen saver</span><span class="muted">Protects the OLED from burn-in</span></div>
          <div class="ls-row"><span>Start after</span>${select('saverSec', [[0, 'Never (not recommended)'], [5, '5 seconds'], [10, '10 seconds'], [20, '20 seconds'], [30, '30 seconds'], [60, '1 minute']], scr.saverSec)}</div>
          <div class="ls-row"><span>Then</span>${select('saver', SAVER_MODES, scr.saver)}</div>
          <p class="muted">A static picture left on for hours burns into the OLED. Both saver types keep the panel almost dark.</p>
        </section>
        <section class="cst-card">
          <div class="cst-head"><span class="section-title">LED</span><label class="ls-chk"><input type="checkbox" data-s="ledOn"${scr.led.on ? ' checked' : ''}><span>Control the controller light</span></label></div>
          <div class="sst-led">
            ${Array.from({ length: profiles.count }, (_, i) => `<div class="sst-led-row"><span>${profiles.count > 1 ? esc(profiles.names[i] || `PROFILE ${i + 1}`) : 'Normal'}</span>${swatches(`data-led="p${i}"`, scr.led.profiles[i])}</div>`).join('')}
            <div class="sst-led-row"><span>Menu open</span>${swatches('data-led="menu"', scr.led.menu)}</div>
            <div class="sst-led-row"><span>Mods off (kill switch)</span>${swatches('data-led="kill"', scr.led.kill)}</div>
          </div>
        </section>
      </div>
      <div class="cst-right"><div class="cst-sim"></div><p class="muted">Press <b>Restart</b> to watch the boot animation again. The dot under the screen shows the LED colour.</p></div>
    </div>`;
  const $ = (s) => host.querySelector(s);

  const sim = createSimulator($('.cst-sim'), {
    project, persist, toast: ctx.toast, compact: true,
    getCode: () => { try { return generateMenuScript(scriptOptions(project, logo, DEMO_MODEL)).code; } catch (e) { ctx.toast(e.message, 'error'); return ''; } },
    combo: () => project.menu?.combo,
  });
  const changed = () => { persist(); clearTimeout(timer); timer = setTimeout(() => sim.rebuild(true), 150); };

  host.querySelectorAll('[data-s]').forEach((el) => el.addEventListener(el.type === 'range' ? 'input' : 'change', () => {
    const k = el.dataset.s;
    if (k === 'ledOn') scr.led.on = el.checked;
    else if (k === 'bootMs') { scr.bootMs = Number(el.value); el.nextElementSibling.textContent = `${(scr.bootMs / 1000).toFixed(1)} s`; }
    else if (k === 'saverSec') scr.saverSec = Number(el.value);
    else scr[k] = el.value;
    changed();
  }));
  host.querySelectorAll('[data-led]').forEach((row) => row.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => {
    const which = row.dataset.led;
    if (which === 'menu') scr.led.menu = b.dataset.c;
    else if (which === 'kill') scr.led.kill = b.dataset.c;
    else scr.led.profiles[+which.slice(1)] = b.dataset.c;
    row.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('active', x === b));
    changed();
  })));

  return { dispose() { clearTimeout(timer); sim.dispose(); persist(); } };
}

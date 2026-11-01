// MAKE YOUR GPC: step-by-step script builder. Phase 1-2: project, wizard shell, START step with Logo Studio.
import { Bitmap, OLED_W, OLED_H, renderBitmap } from './oled.js';
import { LogoStudio, FONT_FAMILIES, FRAME_STYLES, renderTextLayer, fitTextSize, drawFrame } from './logo-studio.js';
import { exportBitmap, previewScript, gpcIdent } from './gpc-image.js';
import { renderMenuStep } from './menu-step.js';
import { renderModsStep } from './mods-step.js';
import { renderControlsStep } from './controls-step.js';
import { renderScreenStep } from './screen-step.js';
import { renderBuildStep } from './build-step.js';

const STORE_KEY = 'astro.myg.project';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STEPS = [
  { id: 'game', title: 'GAME', sub: 'Pick your game' },
  { id: 'start', title: 'START', sub: 'Name & logo' },
  { id: 'menu', title: 'MENU', sub: 'Menu style' },
  { id: 'mods', title: 'MODS', sub: 'Pick your mods' },
  { id: 'controls', title: 'CONTROLS', sub: 'Profiles & quick toggles' },
  { id: 'screen', title: 'SCREEN', sub: 'Boot, home, saver, LED' },
  { id: 'build', title: 'BUILD', sub: 'Save & send to the Zen' },
];

const TEXT_LOGO_DEFAULTS = { family: 'Segoe UI Black', bold: false, italic: false, frame: 'double', subtitle: '', spacing: 1, upper: true };

// Games shown in the GAME step (the name is the card).
export const GAMES = [
  { id: 'cod', name: 'CALL OF DUTY' },
  { id: 'fortnite', name: 'FORTNITE' },
  { id: 'overwatch', name: 'OVERWATCH' },
  { id: 'fc', name: 'FC (FIFA)' },
];

function defaultProject() {
  return {
    version: 1,
    step: 'game',
    game: null,
    name: '',
    logo: { mode: null, bits: null, text: { ...TEXT_LOGO_DEFAULTS }, export: { format: 'image', color: 'auto', trim: true, invertSupport: false } },
  };
}

function loadProject() {
  try {
    const p = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    if (p?.version === 1) {
      const d = defaultProject();
      return { ...d, ...p, logo: { ...d.logo, ...p.logo, text: { ...d.logo.text, ...p.logo?.text }, export: { ...d.logo.export, ...p.logo?.export } } };
    }
  } catch { /* fall through */ }
  return defaultProject();
}

/** The script name rendered as the logo (used when the user does not want a picture). */
export function makeTextLogo(name, t) {
  const bm = new Bitmap();
  const text = (t.upper ? String(name).toUpperCase() : String(name)).trim() || 'MY SCRIPT';
  const framed = t.frame && t.frame !== 'none';
  const pad = framed ? 7 : 2;
  const sub = String(t.subtitle ?? '').trim();
  const subH = sub ? 12 : 0;
  const style = { family: t.family, bold: t.bold, italic: t.italic, spacing: t.spacing, align: 'center' };
  const size = fitTextSize(text, style, OLED_W - pad * 2, OLED_H - pad * 2 - subH);
  bm.merge(renderTextLayer({ ...style, text, size, pos: 'cc', offX: 0, offY: sub ? -subH / 2 : 0, threshold: 110 }), 'whites');
  if (sub) {
    const s2 = { family: 'Segoe UI', bold: true, italic: false, spacing: 1, align: 'center' };
    const subSize = Math.min(10, fitTextSize(sub, s2, OLED_W - pad * 2, 11));
    bm.merge(renderTextLayer({ ...s2, text: sub, size: subSize, pos: 'bc', offX: 0, offY: -(pad - 1), threshold: 110 }), 'whites');
  }
  if (framed) drawFrame(bm, t.frame);
  return bm;
}

export function initMakeYourGpc(ctx) {
  const root = ctx.root;
  let project = loadProject();
  let studio = null;
  let stepView = null;
  let saveTimer = 0;

  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(project)); } catch { /* storage unavailable */ } }, 250);
  };

  root.innerHTML = `
    <div class="myg">
      <nav class="myg-steps"></nav>
      <section class="myg-main">
        <header class="myg-head">
          <div><div class="myg-title"></div><div class="myg-sub"></div></div>
          <div class="myg-head-actions"><button class="btn btn-sm" data-act="new">New project</button></div>
        </header>
        <div class="myg-content"></div>
        <footer class="myg-foot">
          <button class="btn" data-act="back">BACK</button>
          <span class="myg-foot-info"></span>
          <button class="btn btn-primary" data-act="next">NEXT</button>
        </footer>
      </section>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const content = $('.myg-content');

  $('[data-act="new"]').addEventListener('click', async () => {
    const ok = await ctx.modal({
      title: 'Start a new project?',
      html: '<p>This clears the script name and logo of the current project.</p>',
      buttons: [{ label: 'Cancel', value: false }, { label: 'New project', value: true, danger: true }],
      dismiss: false,
    });
    if (!ok) return;
    project = defaultProject();
    persist();
    go('start');
  });
  $('[data-act="back"]').addEventListener('click', () => {
    const i = STEPS.findIndex((s) => s.id === project.step);
    if (i > 0) go(STEPS[i - 1].id);
  });
  $('[data-act="next"]').addEventListener('click', () => {
    const i = STEPS.findIndex((s) => s.id === project.step);
    if (!canLeave(project.step)) return;
    if (i < STEPS.length - 1) go(STEPS[i + 1].id);
  });

  function canLeave(step) {
    if (step === 'start') {
      if (!project.name.trim()) { ctx.toast('Give your script a name first.', 'error'); $('#mygName')?.focus(); return false; }
      if (!project.logo.mode) { ctx.toast('Choose whether you want a logo.', 'error'); return false; }
    }
    return true;
  }

  function renderSteps() {
    const nav = $('.myg-steps');
    const cur = STEPS.findIndex((s) => s.id === project.step);
    nav.innerHTML = `<div class="myg-brand">MAKE YOUR GPC</div>${STEPS.map((s, i) => `
      <button class="myg-step${s.id === project.step ? ' active' : ''}${i < cur ? ' done' : ''}" data-step="${s.id}">
        <span class="n">${i < cur ? '&#x2713;' : i + 1}</span>
        <span class="t"><b>${s.title}</b><small>${esc(s.sub)}</small></span>
      </button>`).join('')}`;
    nav.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      const target = STEPS.findIndex((s) => s.id === b.dataset.step);
      if (target > cur && !canLeave(project.step)) return;
      go(b.dataset.step);
    }));
  }

  function go(step) {
    studio?.destroy();
    studio = null;
    stepView?.dispose();
    stepView = null;
    project.step = step;
    persist();
    const i = STEPS.findIndex((s) => s.id === step);
    const s = STEPS[i];
    $('.myg-title').textContent = `${i + 1}. ${s.title}`;
    $('.myg-sub').textContent = s.sub;
    $('[data-act="back"]').disabled = i === 0;
    $('[data-act="next"]').textContent = i === STEPS.length - 1 ? 'FINISH' : 'NEXT';
    $('[data-act="next"]').disabled = i === STEPS.length - 1;
    renderSteps();
    $('.myg-foot-info').textContent = '';
    if (step === 'game') renderGame();
    else if (step === 'start') renderStart();
    else if (step === 'menu') {
      stepView = renderMenuStep(content, {
        project, persist, logo: currentLogo(),
        toast: ctx.toast, modal: ctx.modal, compile: ctx.compile, openInCompiler: ctx.openInCompiler,
      });
    } else if (step === 'mods') {
      stepView = renderModsStep(content, {
        project, persist, logo: currentLogo(),
        toast: ctx.toast, modal: ctx.modal, compile: ctx.compile, openInCompiler: ctx.openInCompiler,
      });
      $('.myg-foot-info').textContent = 'Try your mods in step 2 (MENU): hold F to fire, Q to aim.';
    } else if (step === 'controls' || step === 'screen') {
      const render = step === 'controls' ? renderControlsStep : renderScreenStep;
      stepView = render(content, {
        project, persist, logo: currentLogo(),
        toast: ctx.toast, modal: ctx.modal, compile: ctx.compile, openInCompiler: ctx.openInCompiler,
      });
    } else if (step === 'build') {
      stepView = renderBuildStep(content, {
        project, persist, logo: currentLogo(), go,
        toast: ctx.toast, modal: ctx.modal, compile: ctx.compile, openInCompiler: ctx.openInCompiler,
        libraryList: ctx.libraryList, librarySave: ctx.librarySave, deviceSlots: ctx.deviceSlots, sendToSlot: ctx.sendToSlot,
      });
    } else renderSoon(s);
  }

  // ------------------------------------------------------------------ GAME

  function renderGame() {
    content.innerHTML = `
      <div class="myg-game">
        <div class="myg-label">Choose the game this script is for</div>
        <div class="game-grid">
          ${GAMES.map((g) => `
            <button class="game-card${project.game === g.id ? ' active' : ''}" data-game="${g.id}">
              <span class="game-img"><span class="game-title">${esc(g.name)}</span></span>
            </button>`).join('')}
        </div>
      </div>`;
    content.querySelectorAll('[data-game]').forEach((b) => b.addEventListener('click', () => {
      project.game = b.dataset.game;
      persist();
      if (project.game === 'cod' || project.game === 'fortnite' || project.game === 'fc' || project.game === 'overwatch') {
        // CALL OF DUTY goes straight into its own steps (START, MENU, MODS with its features ...).
        go('start');
        return;
      }
      content.querySelectorAll('[data-game]').forEach((x) => x.classList.toggle('active', x === b));
    }));
  }

  // ------------------------------------------------------------------ START

  function currentLogo() {
    if (project.logo.mode === 'image' && project.logo.bits) return Bitmap.decode(project.logo.bits);
    return makeTextLogo(project.name, project.logo.text);
  }

  function renderStart() {
    const lg = project.logo;
    content.innerHTML = `
      <div class="myg-start">
        <div class="myg-top">
        <div class="myg-q myg-q-name">
          <label class="myg-label" for="mygName">Name of the Script</label>
          <input id="mygName" class="myg-input" maxlength="40" spellcheck="false" placeholder="e.g. ASTRO RANK" value="${esc(project.name)}">
          <div class="myg-hint" id="mygNameHint"></div>
        </div>
        <div class="myg-q">
          <span class="myg-label">Want a logo on it?</span>
          <div class="seg">
            <button data-logo="image" class="${lg.mode === 'image' ? 'active' : ''}"><b>Yes</b><small>Design it in Logo Studio from a picture or text</small></button>
            <button data-logo="text" class="${lg.mode === 'text' ? 'active' : ''}"><b>No</b><small>Use the script name as the logo</small></button>
          </div>
        </div>
        </div>
        <div class="myg-logo-area"></div>
      </div>`;
    const nameIn = $('#mygName');
    const hint = () => {
      const bad = /[^\x20-\x7E]/.test(nameIn.value);
      $('#mygNameHint').innerHTML = bad
        ? '<span class="warn">Non-English letters cannot be printed by the OLED font. They still work inside a picture logo.</span>'
        : `Identifier in the code: <code>${esc(gpcIdent(nameIn.value, 'MY_SCRIPT'))}</code>`;
    };
    hint();
    nameIn.addEventListener('input', () => {
      project.name = nameIn.value;
      persist();
      hint();
      if (project.logo.mode === 'text') updateTextLogo();
      studio?.setName(project.name);
    });
    content.querySelectorAll('[data-logo]').forEach((b) => b.addEventListener('click', () => {
      const mode = b.dataset.logo;
      if (mode === 'image' && !project.logo.bits) project.logo.bits = makeTextLogo(project.name, project.logo.text).encode();
      project.logo.mode = mode;
      persist();
      renderStart();
    }));
    if (lg.mode === 'image') renderStudio();
    else if (lg.mode === 'text') renderTextLogo();
    $('.myg-foot-info').textContent = '';
  }

  function renderStudio() {
    const area = content.querySelector('.myg-logo-area');
    area.innerHTML = '<div class="myg-studio-host"></div>';
    studio = new LogoStudio(area.querySelector('.myg-studio-host'), {
      bitmap: currentLogo(),
      name: project.name,
      exportOptions: project.logo.export,
      toast: ctx.toast,
      modal: ctx.modal,
      compile: ctx.compile,
      openInCompiler: ctx.openInCompiler,
      onChange: (bm) => { project.logo.bits = bm.encode(); persist(); },
      onExportChange: (e) => { project.logo.export = e; persist(); },
    });
  }

  function renderTextLogo() {
    const t = project.logo.text;
    const area = content.querySelector('.myg-logo-area');
    const fams = FONT_FAMILIES.includes(t.family) ? FONT_FAMILIES : [t.family, ...FONT_FAMILIES];
    area.innerHTML = `
      <div class="myg-textlogo">
        <div class="myg-tl-opts">
          <div class="ls-row"><span>Font</span><select class="ls-sel" data-tl="family">${fams.map((f) => `<option${f === t.family ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select></div>
          <div class="ls-row"><span>Frame</span><select class="ls-sel" data-tl="frame">${FRAME_STYLES.map(([v, l]) => `<option value="${v}"${v === t.frame ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
          <div class="ls-row"><span>Second line</span><input class="ls-input" data-tl="subtitle" maxlength="24" placeholder="e.g. BY ABUSHADAD" value="${esc(t.subtitle)}"></div>
          <div class="ls-row"><span>Letter spacing</span><span class="ls-range"><input type="range" data-tl="spacing" min="-2" max="8" value="${t.spacing}"><output>${t.spacing}</output></span></div>
          <div class="ls-checks">
            <label class="ls-chk"><input type="checkbox" data-tl="upper"${t.upper ? ' checked' : ''}><span>UPPERCASE</span></label>
            <label class="ls-chk"><input type="checkbox" data-tl="bold"${t.bold ? ' checked' : ''}><span>Bold</span></label>
            <label class="ls-chk"><input type="checkbox" data-tl="italic"${t.italic ? ' checked' : ''}><span>Italic</span></label>
          </div>
          <div class="myg-tl-actions">
            <button class="btn btn-sm" data-tl-act="code">Show GPC</button>
            <button class="btn btn-sm" data-tl-act="edit">Edit in Logo Studio</button>
          </div>
          <div class="muted" data-tl-info></div>
        </div>
        <div class="myg-device">
          <div class="zen-body"><div class="zen-screen"><canvas class="myg-preview"></canvas></div><div class="zen-label">CRONUS ZEN</div></div>
        </div>
      </div>`;
    area.querySelectorAll('[data-tl]').forEach((el) => {
      const ev = el.type === 'range' || el.type === 'text' || el.tagName === 'INPUT' && el.type !== 'checkbox' ? 'input' : 'change';
      el.addEventListener(ev, () => {
        const k = el.dataset.tl;
        t[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
        if (el.type === 'range') el.nextElementSibling.textContent = el.value;
        persist();
        updateTextLogo();
      });
    });
    area.querySelector('[data-tl-act="edit"]').addEventListener('click', () => {
      project.logo.bits = makeTextLogo(project.name, t).encode();
      project.logo.mode = 'image';
      persist();
      renderStart();
    });
    area.querySelector('[data-tl-act="code"]').addEventListener('click', async () => {
      const ex = exportBitmap(makeTextLogo(project.name, t), { ...project.logo.export, name: project.name || 'LOGO' });
      const choice = await ctx.modal({
        title: `${ex.name} logo · ${ex.bytes} bytes of data`,
        html: `<textarea class="ls-code tall" readonly spellcheck="false">${esc(ex.code)}</textarea>`,
        buttons: [{ label: 'Close', value: 'close' }, { label: 'Copy', value: 'copy' }, { label: 'Open in Compiler', value: 'open', primary: true }],
        dismiss: 'close',
      });
      if (choice === 'copy') { try { await navigator.clipboard.writeText(ex.code); ctx.toast('GPC copied.', 'ok'); } catch (e) { ctx.toast(String(e), 'error'); } }
      if (choice === 'open') ctx.openInCompiler(`${ex.name}_LOGO.gpc`, previewScript(ex, `${project.name} logo`));
    });
    updateTextLogo();
    document.fonts?.ready?.then(updateTextLogo);
  }

  function updateTextLogo() {
    const cv = content.querySelector('.myg-preview');
    if (!cv) return;
    const bm = makeTextLogo(project.name, project.logo.text);
    renderBitmap(cv, bm, 3, { on: '#eef3ff', off: '#030305' });
    const ex = exportBitmap(bm, { ...project.logo.export, name: project.name || 'LOGO' });
    const info = content.querySelector('[data-tl-info]');
    if (info) info.textContent = `${ex.region.w}×${ex.region.h} px · ${ex.bytes} bytes as const image`;
  }

  // ------------------------------------------------------------------ later steps

  function renderSoon(s) {
    content.innerHTML = `
      <div class="myg-soon">
        <div class="myg-soon-card">
          <div class="section-title">Coming in the next phase</div>
          <h2>${esc(s.title)} · ${esc(s.sub)}</h2>
          <ul>${(s.soon ?? []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>
        <div class="myg-device">
          <div class="zen-body"><div class="zen-screen"><canvas class="myg-preview"></canvas></div><div class="zen-label">${esc(project.name || 'CRONUS ZEN')}</div></div>
        </div>
      </div>`;
    renderBitmap(content.querySelector('.myg-preview'), currentLogo(), 3, { on: '#eef3ff', off: '#030305' });
    $('.myg-foot-info').textContent = 'Your name and logo are saved. This step is built next.';
  }

  go(STEPS.some((s) => s.id === project.step) ? project.step : 'start');

  return {
    onShow() {
      if (project.step === 'start' && project.logo.mode === 'text') updateTextLogo();
      if (['menu', 'mods', 'controls', 'screen', 'build'].includes(project.step) && !stepView) go(project.step);
    },
    // Stops the simulator while another tab is shown.
    onHide() { stepView?.dispose(); stepView = null; },
  };
}

export { OLED_W, OLED_H };

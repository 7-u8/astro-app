import { CodeEditor } from './editor.js';
import { GPC_KEYWORDS, GPC_FUNCTIONS } from './gpc-lang.js';
import { numbersToHex, obfuscateVariables, oneLine, hexToNumbers, beautify, stringsToData } from './gpc-tools.js';
import { initMakeYourGpc } from './myg/myg.js';
import { renderBestValues } from './myg/best-values.js';

// The GPC compiler (libgpc) is third-party software and is not part of this repository.
// If its files are in ui/js/ they are loaded as usual; if not, the app still opens and compiling reports the problem.
const NO_COMPILER = 'No GPC compiler is installed (see "Compiler" in README.md).';
let GpcSession, gpcInit, gpcListTargets;
try {
  ({ GpcSession, init: gpcInit, list_targets: gpcListTargets } = await import('./libgpc.js'));
} catch {
  GpcSession = class { constructor() { throw new Error(NO_COMPILER); } };
  gpcInit = () => ({ success: false, error: NO_COMPILER });
  gpcListTargets = () => ({ success: false, error: NO_COMPILER });
}

const invoke = (cmd, args) => window.__TAURI__.core.invoke(cmd, args);

const SLOT_COUNT = 8;
const FLASH_CAPACITY = 262144;

// ======================================================================
// libgpc — GPC compiler (Cronus Zen target)
// ======================================================================

// WASM is loaded by the time this module evaluates (top-level await in libgpc.js).
// init() initialises the GPC compiler state (start() is NOT called — it is
// invoked automatically via __wbindgen_start during WASM instantiation).
let _gpcInitErr = null;
try {
  const r = gpcInit();
  if (r && !r.success) {
    _gpcInitErr = `gpcInit failed: ${r.error ?? JSON.stringify(r)}`;
  }
} catch (e) {
  _gpcInitErr = `gpcInit threw: ${e?.message ?? e}`;
}

function compileGpc(source) {
  if (_gpcInitErr) throw new Error(_gpcInitErr);

  // Find the right target — list_targets() returns ['cronuszen32', 'cronuszen', 'cronusmaxplus', 'xaim'].
  let target = 'cronuszen32';
  try {
    const tr = gpcListTargets();
    const list = tr?.data ?? tr?.payload ?? [];
    if (list.length > 0 && !list.includes(target)) {
      target = list.find((t) => t.includes('zen32') || t.includes('zen')) ?? list[0];
    }
  } catch (_) { /* use default */ }

  let session;
  try {
    session = new GpcSession(target);
  } catch (e) {
    let info = '';
    try { info = ` — targets: ${JSON.stringify(gpcListTargets()?.data ?? gpcListTargets()?.payload)}`; } catch (_) {}
    throw new Error(`${e?.message ?? e}${info}`);
  }

  let res;
  try {
    res = session.compile(source);
  } finally {
    session.free();
  }

  const payload = res?.data ?? res?.payload;
  const diags = res?.diagnostics ?? [];
  const errors = diags.filter((d) => d.severity === 'Error' || !d.severity);

  if (!res?.success || payload?.success === false || !payload?.bytecode) {
    const relevant = errors.length > 0 ? errors : diags;
    const msgs = relevant
      .map((d) => {
        const ln = d.line ?? d.range?.start?.line ?? '?';
        const col = d.column ?? d.range?.start?.column;
        const loc = col != null ? `Ln ${ln}, Col ${col}` : `Ln ${ln}`;
        return `  ${loc}: ${d.message}${d.code ? ` (${d.code})` : ''}`;
      })
      .join('\n');
    throw new Error(msgs || res?.error || 'Compilation failed');
  }

  return payload.bytecode;
}

// pendingSlots: slot index (1–8) → { name, source }  (bytecode produced on START)
const pendingSlots = new Map();

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtSize = (n) => (n >= 1024 ? `${(n / 1024).toFixed(n >= 10240 ? 0 : 1)} KB` : `${n} B`);
const baseName = (n) => String(n ?? '').replace(/\.gpc$/i, '');
const errorText = (e) => (typeof e === 'string' ? e : e?.message ?? String(e));

// ======================================================================
// Toasts & modals
// ======================================================================

function toast(message, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), kind === 'error' ? 7000 : 3500);
}

let modalResolve = null;
function modal({ title, html, buttons = [{ label: 'OK', value: true, primary: true }], dismiss = null }) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = html;
  const actions = $('#modalActions');
  actions.innerHTML = '';
  return new Promise((resolve) => {
    modalResolve = (v) => { modalResolve = null; $('#modal').classList.add('hidden'); resolve(v); };
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.className = `btn${b.primary ? ' btn-primary' : ''}${b.danger ? ' btn-danger' : ''}`;
      btn.textContent = b.label;
      btn.onclick = () => modalResolve?.(b.value);
      actions.appendChild(btn);
    }
    $('#modal').dataset.dismiss = JSON.stringify(dismiss);
    $('#modal').classList.remove('hidden');
    actions.lastElementChild?.focus();
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalResolve) modalResolve(JSON.parse($('#modal').dataset.dismiss));
  // F12 opens DevTools in debug builds (Tauri v2 WebviewWindow API)
  if (e.key === 'F12') {
    try { window.__TAURI__?.webviewWindow?.getCurrentWebviewWindow?.()?.openDevtools?.(); } catch (_) {}
  }
});

function busyModal(title, text) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = `<div class="progress-label">${esc(text)}</div><div class="progress indeterminate"><div></div></div>`;
  $('#modalActions').innerHTML = '';
  $('#modal').classList.remove('hidden');
  return { close() { $('#modal').classList.add('hidden'); } };
}

// ======================================================================
// Navigation
// ======================================================================

let currentView = 'boot';
function showView(v) {
  currentView = v;
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  document.querySelectorAll('.view').forEach((s) => s.classList.toggle('active', s.id === `view-${v}`));
  if (v === 'compiler') editor.focus();
  if (v === 'boot') renderLibrary();
  if (v === 'myg') myg?.onShow();
  else myg?.onHide();
}
document.querySelectorAll('.nav-btn').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));

// ======================================================================
// BOOT — device
// ======================================================================

const device = {
  status: 'disconnected', // disconnected | connecting | ready | busy
  present: false,
  info: null,
  slots: [],
};

function typeLabel(slot) {
  switch (slot.contentType) {
    case 'Script': return slot.flags.remap && !slot.flags.script ? 'Remap' : 'Script';
    case 'Gamepack': return 'Game Pack';
    case 'Marketplace': return 'Marketplace';
    default: return 'Unknown';
  }
}

function setStatus(s) {
  device.status = s;
  renderBoot();
}

function renderPill() {
  const pill = $('#devicePill');
  pill.classList.remove('on', 'busy');
  let text;
  switch (device.status) {
    case 'connecting': text = 'Connecting…'; pill.classList.add('busy'); break;
    case 'busy': text = 'Working…'; pill.classList.add('busy'); break;
    case 'ready': text = `Cronus Zen · FW ${device.info?.firmware ?? '?'}`; pill.classList.add('on'); break;
    default: text = device.present ? 'Cronus Zen detected' : 'No device';
  }
  $('#devicePillText').textContent = text;
}

function renderBoot() {
  const connected = device.status === 'ready' || device.status === 'busy';
  const busy = device.status !== 'ready' && device.status !== 'disconnected';
  const btnC = $('#btnConnect');
  btnC.textContent = connected ? 'DISCONNECT' : device.status === 'connecting' ? 'CONNECTING…' : 'CONNECT';
  btnC.classList.toggle('btn-primary', !connected);
  btnC.disabled = busy;
  $('#btnRefresh').disabled = !connected || busy;
  $('#btnRestart').disabled = !connected || busy;

  const filled = device.slots.filter((s) => !s.empty);
  const used = filled.reduce((a, s) => a + ((s.size + 15) & -16), 0);
  $('#statSlots').textContent = connected ? `${filled.length} / ${SLOT_COUNT}` : '— / 8';
  $('#statStorage').textContent = connected ? `${fmtSize(used)} / ${FLASH_CAPACITY / 1024} KB` : '—';
  $('#statFirmware').textContent = device.info?.firmware ?? '—';
  $('#statSerial').textContent = device.info?.serial ?? '—';
  $('#statSerial').title = device.info?.serial ?? '';

  renderSlots(connected);
  renderPill();
}

// Slot bytecode cache persisted in localStorage so flashed slots are preserved across flashes and sessions
function loadSlotCache() {
  try { return JSON.parse(localStorage.getItem('astro.slot_cache') ?? '{}'); } catch (_) { return {}; }
}
function saveSlotCache(cache) {
  try { localStorage.setItem('astro.slot_cache', JSON.stringify(cache)); } catch (_) {}
}

function renderSlots(connected) {
  const host = $('#slots');
  host.innerHTML = '';
  for (let i = 0; i < SLOT_COUNT; i++) {
    const slotNum = i + 1;
    const s = connected ? device.slots[i] : null;
    const pending = pendingSlots.get(slotNum);
    const el = document.createElement('div');

    if (pending) {
      el.className = 'slot pending';
      el.innerHTML = `
        <div class="slot-top">
          <span class="slot-num">SLOT ${slotNum}</span>
          <div class="slot-top-actions">
            <span class="slot-pending-label">READY</span>
            <button class="slot-x-btn" title="Remove">✕</button>
          </div>
        </div>
        <div class="slot-pending-name" title="${esc(pending.name)}">${esc(baseName(pending.name))}</div>
        <div class="slot-pending-size">${fmtSize(new Blob([pending.source]).size)} source</div>
        <button class="slot-compile-btn">START</button>`;
      el.querySelector('.slot-x-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        pendingSlots.delete(slotNum);
        renderSlots(connected);
      });
      const startBtn = el.querySelector('.slot-compile-btn');
      startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startFlowForSlot(slotNum, connected);
      });
    } else if (s && !s.empty) {
      el.className = 'slot filled';
      el.innerHTML = `
        <div class="slot-top">
          <span class="slot-num">SLOT ${slotNum}</span>
          <div class="slot-top-actions">
            <span class="badge">${s.flags.enabled ? 'Enabled' : 'Disabled'}</span>
            <button class="slot-x-btn" title="Clear slot">✕</button>
          </div>
        </div>
        <div class="slot-name" title="${esc(s.name)}">${esc(s.name || `Slot ${slotNum}`)}</div>
        <dl class="slot-meta">
          <dt>Type</dt><dd>${esc(typeLabel(s))}</dd>
          <dt>Size</dt><dd>${fmtSize(s.size)}</dd>
          <dt>Format</dt><dd>${s.contentType === 'Marketplace' ? 'BIN · protected' : 'BIN (compiled)'}</dd>
          <dt>CRC32</dt><dd class="mono">${s.crc32.toString(16).toUpperCase().padStart(8, '0')}</dd>
        </dl>`;

      el.querySelector('.slot-x-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        clearSlotFlow(slotNum, connected);
      });

      // Right-click context menu (كليك يمين)
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showSlotContextMenu(e.clientX, e.clientY, slotNum, s.name || `Slot_${slotNum}`, connected);
      });
    } else {
      el.className = `slot empty${connected ? '' : ' offline'}`;
      el.innerHTML = `
        <div class="slot-top"><span class="slot-num">SLOT ${slotNum}</span></div>
        <div class="slot-empty-text">${connected ? 'Drop a GPC script here' : 'Connect to read'}</div>`;
    }

    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop-hint'); });
    el.addEventListener('dragleave', () => el.classList.remove('drop-hint'));
    el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('drop-hint'); assignScriptToSlot(slotNum, e); });
    host.appendChild(el);
  }
}

async function assignScriptToSlot(slotNum, e) {
  let name = '';
  let source = null;

  // OS file drop
  const file = e.dataTransfer.files?.[0];
  if (file) {
    if (!file.name.toLowerCase().endsWith('.gpc')) {
      toast('Only .gpc files can be dropped onto slots.', 'error');
      return;
    }
    name = file.name;
    source = await file.text();
  } else {
    // Library panel drag
    let data = null;
    try { data = JSON.parse(e.dataTransfer.getData('application/x-astro')); } catch { /* not an astro drag */ }
    if (!data) return;
    name = data.name;
    if (data.kind === 'tab') {
      const doc = docs.find((d) => d.id === data.id || d.name === data.name);
      source = doc?.content ?? null;
    } else if (data.path) {
      try { source = await invoke('file_read_text', { path: data.path }); } catch (err) {
        toast(`Could not read "${name}": ${errorText(err)}`, 'error');
        return;
      }
    }
  }

  if (!source) {
    toast(`Could not get source for "${name}".`, 'error');
    return;
  }

  // Store source for compilation when START is pressed.
  pendingSlots.set(slotNum, { name, source });
  renderSlots(device.status === 'ready' || device.status === 'busy');
  toast(`"${baseName(name)}" assigned to Slot ${slotNum}. Press START to compile and flash.`, 'ok');
}

async function startFlowForSlot(slotNum, connected) {
  const pending = pendingSlots.get(slotNum);
  if (!pending) return;

  if (!connected) {
    toast('Connect the Cronus Zen before flashing.', 'error');
    return;
  }

  // Step 1 — Compile
  const compileBusy = busyModal('Compiling…', `Compiling ${baseName(pending.name)} with libgpc…`);
  let bytecode;
  try {
    bytecode = compileGpc(pending.source);
  } catch (err) {
    compileBusy.close();
    await modal({
      title: 'Compile error',
      html: `<pre style="white-space:pre-wrap;font-size:12px;color:var(--err)">${esc(errorText(err))}</pre>`,
    });
    return;
  }
  compileBusy.close();

  // Load existing slot cache
  const cache = loadSlotCache();

  // Add newly compiled slot to cache
  cache[slotNum] = {
    name: baseName(pending.name),
    bytecodeHex: bytecode,
    size: bytecode.length / 2,
  };

  saveSlotCache(cache);

  const slotsToFlash = Object.entries(cache)
    .map(([num, data]) => ({
      slot: Number(num),
      name: data.name,
      bytecodeHex: data.bytecodeHex,
    }))
    .sort((a, b) => a.slot - b.slot);

  // Step 2 — Confirm flash with preservation guarantee
  const byteLen = bytecode.length / 2;
  const otherSlots = slotsToFlash.filter((s) => s.slot !== slotNum);
  const preservedHtml = otherSlots.length > 0
    ? `<p style="margin-top:8px;font-size:13px;color:var(--text-dim)">Preserving existing slot${otherSlots.length > 1 ? 's' : ''}: <b>${otherSlots.map((s) => `Slot ${s.slot} (${esc(s.name)})`).join(', ')}</b>.</p>`
    : '';

  const ok = await modal({
    title: `Flash Slot ${slotNum}?`,
    html: `<p>Compiled <b>${esc(baseName(pending.name))}</b> → <b>${fmtSize(byteLen)}</b>.</p>
           <p>This will write it to <b>Slot ${slotNum}</b> on the Cronus Zen.</p>
           ${preservedHtml}`,
    buttons: [
      { label: 'Cancel', value: false },
      { label: `Flash (${slotsToFlash.length} slot${slotsToFlash.length > 1 ? 's' : ''})`, value: true, primary: true },
    ],
    dismiss: false,
  });
  if (!ok) return;

  // Step 3 — Flash all active slots together
  setStatus('busy');
  const flashBusy = busyModal(
    'Flashing…',
    `Programming ${slotsToFlash.length} slot${slotsToFlash.length > 1 ? 's' : ''} to Cronus Zen — keep device plugged in…`
  );
  try {
    const slots = await invoke('zen_flash_slots', { slots: slotsToFlash });
    pendingSlots.delete(slotNum);
    applySlots(slots);
    flashBusy.close();
    setStatus('ready');
    toast(`Flashing successful! ${slotsToFlash.length} slot(s) programmed.`, 'ok');
  } catch (err) {
    flashBusy.close();
    await afterError(err, 'Flash failed');
  }
}

async function clearSlotFlow(slotNum, connected) {
  if (!connected) {
    toast('Connect the device first.', 'error');
    return;
  }
  const ok = await modal({
    title: `Clear Slot ${slotNum}?`,
    html: `<p>Are you sure you want to remove the script from <b>Slot ${slotNum}</b>?</p>
           <p class="muted">Other slots on your Cronus Zen will not be affected.</p>`,
    buttons: [
      { label: 'Cancel', value: false },
      { label: `Clear Slot ${slotNum}`, value: true, danger: true },
    ],
    dismiss: false,
  });
  if (!ok) return;

  const cache = loadSlotCache();
  delete cache[slotNum];
  saveSlotCache(cache);
  pendingSlots.delete(slotNum);

  const remaining = Object.entries(cache)
    .map(([num, data]) => ({
      slot: Number(num),
      name: data.name,
      bytecodeHex: data.bytecodeHex,
    }))
    .sort((a, b) => a.slot - b.slot);

  setStatus('busy');
  const busy = busyModal('Clearing Slot…', `Updating slots on Cronus Zen…`);
  try {
    let updatedSlots;
    if (remaining.length === 0) {
      updatedSlots = await invoke('zen_format');
    } else {
      updatedSlots = await invoke('zen_flash_slots', { slots: remaining });
    }
    applySlots(updatedSlots);
    busy.close();
    setStatus('ready');
    toast(`Slot ${slotNum} cleared.`, 'ok');
  } catch (err) {
    busy.close();
    await afterError(err, 'Clear failed');
  }
}

// ---- Context Menu & Extraction from Device Hardware ----

let activeSlotContextMenu = null;

function closeSlotContextMenu() {
  if (activeSlotContextMenu) {
    activeSlotContextMenu.remove();
    activeSlotContextMenu = null;
  }
}

document.addEventListener('click', closeSlotContextMenu);
window.addEventListener('blur', closeSlotContextMenu);

function showSlotContextMenu(x, y, slotNum, slotName, connected) {
  closeSlotContextMenu();
  const menu = document.createElement('div');
  menu.className = 'slot-context-menu';
  menu.innerHTML = `
    <button class="slot-context-item" data-action="export-bin">
      <span>💾</span> <span>Export Bytecode (.bin)</span>
    </button>
    <div class="slot-context-divider"></div>
    <button class="slot-context-item danger" data-action="clear">
      <span>✕</span> <span>Clear Slot ${slotNum}</span>
    </button>
  `;

  menu.addEventListener('click', (e) => e.stopPropagation());

  menu.querySelector('[data-action="export-bin"]').addEventListener('click', () => {
    closeSlotContextMenu();
    exportBytecodeSlot(slotNum, slotName);
  });

  menu.querySelector('[data-action="clear"]').addEventListener('click', () => {
    closeSlotContextMenu();
    clearSlotFlow(slotNum, connected);
  });

  document.body.appendChild(menu);
  activeSlotContextMenu = menu;

  const rect = menu.getBoundingClientRect();
  const posX = Math.min(x, window.innerWidth - rect.width - 10);
  const posY = Math.min(y, window.innerHeight - rect.height - 10);
  menu.style.left = `${posX}px`;
  menu.style.top = `${posY}px`;
}

async function exportBytecodeSlot(slotNum, slotName) {
  setStatus('busy');
  const busy = busyModal(
    'Reading Bytecode…',
    `Extracting raw binary bytecode for Slot ${slotNum} from Cronus Zen…`
  );

  try {
    const bytecodeHex = await invoke('zen_read_bytecode', { slot: slotNum });
    busy.close();
    setStatus('ready');

    const clean = bytecodeHex.trim();
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) {
      bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
    }

    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName(slotName)}.bin`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Raw bytecode for Slot ${slotNum} exported successfully.`, 'ok');
  } catch (err) {
    busy.close();
    await afterError(err, 'Export failed');
  }
}

function applySlots(slots) {
  device.slots = Array.from({ length: SLOT_COUNT }, (_, i) => slots?.[i] ?? { empty: true });
  renderBoot();
}

$('#btnConnect').addEventListener('click', async () => {
  if (device.status === 'ready') {
    await invoke('zen_disconnect').catch(() => {});
    device.info = null;
    applySlots([]);
    setStatus('disconnected');
    toast('Disconnected.');
    return;
  }
  setStatus('connecting');
  try {
    const res = await invoke('zen_connect');
    device.info = res.info;
    applySlots(res.slots);
    device.present = true;
    setStatus('ready');
    const n = res.slots.filter((s) => !s.empty).length;
    toast(`Connected — ${n} script${n === 1 ? '' : 's'} on the device.`, 'ok');
    if (!res.info.firmwareSupported) {
      toast(`Firmware ${res.info.firmware} is older than ${res.info.minFirmware}. Update it with Zen Studio.`, 'error');
    }
  } catch (e) {
    device.info = null;
    applySlots([]);
    setStatus('disconnected');
    toast(`Connect failed: ${errorText(e)}`, 'error');
  }
});

$('#btnRefresh').addEventListener('click', async () => {
  setStatus('busy');
  try {
    applySlots(await invoke('zen_read_slots'));
    setStatus('ready');
    toast('Slots refreshed.', 'ok');
  } catch (e) {
    await afterError(e, 'Read failed');
  }
});

$('#btnRestart').addEventListener('click', async () => {
  const filled = device.slots.filter((s) => !s.empty);
  const list = filled.map((s) => `<li>Slot ${s.index}: ${esc(s.name || 'Unnamed')}</li>`).join('');
  const ok = await modal({
    title: 'Format device?',
    html: `<p>This erases <b>all 8 slots</b> on the Cronus Zen.${filled.length ? '</p><ul>' + list + '</ul><p>' : ' '}Scripts saved on this PC are not affected.</p>`,
    buttons: [{ label: 'Cancel', value: false }, { label: 'Erase all', value: true, danger: true }],
    dismiss: false,
  });
  if (!ok) return;
  setStatus('busy');
  const busy = busyModal('Formatting Cronus Zen', 'Erasing all slots — keep the device plugged in…');
  try {
    localStorage.removeItem('astro.slot_cache');
    pendingSlots.clear();
    applySlots(await invoke('zen_format'));
    busy.close();
    setStatus('ready');
    const left = device.slots.filter((s) => !s.empty).length;
    if (left === 0) toast('All slots erased.', 'ok');
    else toast(`Format finished, but ${left} slot(s) still report content. Try REFRESH.`, 'error');
  } catch (e) {
    busy.close();
    await afterError(e, 'Format failed');
  }
});

async function afterError(e, prefix) {
  toast(`${prefix}: ${errorText(e)}`, 'error');
  const p = await invoke('zen_presence').catch(() => ({ present: false, connected: false }));
  device.present = p.present;
  if (!p.connected) {
    device.info = null;
    applySlots([]);
    setStatus('disconnected');
  } else {
    setStatus('ready');
  }
}

// Detect plug / unplug.
setInterval(async () => {
  if (device.status === 'connecting' || device.status === 'busy') return;
  const p = await invoke('zen_presence').catch(() => null);
  if (!p) return;
  const changed = p.present !== device.present;
  device.present = p.present;
  if (device.status === 'ready' && !p.connected) {
    device.info = null;
    applySlots([]);
    setStatus('disconnected');
    toast('Cronus Zen disconnected.', 'error');
  } else if (changed) {
    renderPill();
  }
}, 1500);

// ---- library panel ----

async function libraryItems() {
  const tabs = docs.filter((d) => !d.path).map((d) => ({ kind: 'tab', id: d.id, name: d.name, size: new Blob([d.content]).size }));
  let files = [];
  try { files = (await invoke('library_list')).map((f) => ({ kind: 'lib', ...f })); } catch (e) { console.warn(e); }
  return [...tabs, ...files];
}

async function renderLibrary() {
  const q = $('#libSearch').value.trim().toLowerCase();
  const items = (await libraryItems()).filter((it) => !q || it.name.toLowerCase().includes(q));
  const list = $('#libraryList');
  list.innerHTML = '';
  const groups = [['Open in Compiler', items.filter((x) => x.kind === 'tab')], ['Saved scripts', items.filter((x) => x.kind === 'lib')]];
  let any = false;
  for (const [title, arr] of groups) {
    if (arr.length === 0) continue;
    any = true;
    const g = document.createElement('div');
    g.className = 'lib-group';
    g.textContent = title;
    list.appendChild(g);
    for (const it of arr) {
      const el = document.createElement('div');
      el.className = 'lib-item';
      el.draggable = true;
      el.addEventListener('dragstart', (e) => e.dataTransfer.setData('application/x-astro', JSON.stringify({ name: it.name, kind: it.kind, path: it.path ?? null, id: it.id ?? null })));
      el.title = it.path ?? `${it.name} (not saved yet)`;
      el.innerHTML = `<span class="ext">${it.kind === 'tab' ? 'TAB' : 'GPC'}</span><span class="nm">${esc(baseName(it.name))}</span><span class="sz">${fmtSize(it.size ?? 0)}</span>`;
      el.addEventListener('dblclick', async () => {
        try {
          if (it.kind === 'tab') activateDoc(it.id);
          else await openPath(it.path, it.name);
          showView('compiler');
        } catch (e) { toast(errorText(e), 'error'); }
      });
      list.appendChild(el);
    }
  }
  if (!any) list.innerHTML = `<div class="lib-empty">${q ? 'No matches.' : 'No saved scripts yet.<br>Write one in the COMPILER and save it.'}</div>`;
}
$('#libSearch').addEventListener('input', renderLibrary);
$('#btnLibRefresh').addEventListener('click', renderLibrary);
$('#btnLibFolder').addEventListener('click', async () => {
  try { await invoke('open_in_explorer', { path: await invoke('library_path') }); } catch (e) { toast(errorText(e), 'error'); }
});

// ======================================================================
// COMPILER (editor + files)
// ======================================================================

const NEW_TEMPLATE = '// ASTRO APP — GPC script\n\nmain {\n\t\n}\n';
let docs = [];
let activeId = null;
let seq = 1;

const editor = new CodeEditor($('#editorHost'), {
  onChange: (v) => {
    const d = activeDoc();
    if (!d) return;
    d.content = v;
    renderTabs();
    persistDocs();
  },
  onCursor: (line, col) => { $('#statusPos').textContent = `Ln ${line}, Col ${col}`; },
});
editor.setVocabulary({ keywords: GPC_KEYWORDS, functions: GPC_FUNCTIONS });

const activeDoc = () => docs.find((d) => d.id === activeId) ?? null;
const isDirty = (d) => (d.saved == null ? d.content.length > 0 : d.content !== d.saved);

function openDoc({ name, path = null, content = '', saved = null }) {
  const doc = { id: `d${seq++}`, name, path, content, saved, view: null };
  docs.push(doc);
  activateDoc(doc.id);
  persistDocs();
  return doc;
}

function activateDoc(id) {
  const prev = activeDoc();
  if (prev) prev.view = editor.getView();
  activeId = id;
  const d = activeDoc();
  $('.editor-empty')?.remove();
  if (!d) {
    editor.value = '';
    editor.setReadOnly(true);
    $('#editorHost').insertAdjacentHTML('beforeend', '<div class="editor-empty">File → New or File → Open to start</div>');
  } else {
    editor.setReadOnly(false);
    editor.value = d.content;
    editor.setView(d.view);
  }
  renderTabs();
}

function renderTabs() {
  const host = $('#tabs');
  host.innerHTML = '';
  for (const d of docs) {
    const el = document.createElement('div');
    el.className = `tab${d.id === activeId ? ' active' : ''}${isDirty(d) ? ' dirty' : ''}`;
    el.title = d.path ?? 'Not saved yet';
    el.innerHTML = `<span class="tn">${esc(d.name)}</span><button class="x" title="Close"><span>&#x2715;</span></button>`;
    el.addEventListener('mousedown', (e) => { if (e.button === 1) { e.preventDefault(); closeDoc(d.id); } });
    el.addEventListener('click', () => activateDoc(d.id));
    el.querySelector('.x').addEventListener('click', (e) => { e.stopPropagation(); closeDoc(d.id); });
    host.appendChild(el);
  }
  const d = activeDoc();
  $('#statusFile').textContent = d ? (d.path ?? `${d.name} (not saved)`) : '';
}

async function openPath(path, name) {
  const existing = docs.find((d) => d.path && d.path.toLowerCase() === path.toLowerCase());
  if (existing) { activateDoc(existing.id); return existing; }
  const content = await invoke('file_read_text', { path });
  return openDoc({ name: name ?? path.split(/[\\/]/).pop(), path, content, saved: content });
}

async function saveDoc(d, as = false) {
  if (!d) return false;
  let path = d.path;
  if (!path || as) {
    path = await invoke('dialog_save', { defaultName: d.name.toLowerCase().endsWith('.gpc') ? d.name : `${d.name}.gpc` });
    if (!path) return false;
  }
  await invoke('file_write_text', { path, content: d.content });
  d.path = path;
  d.name = path.split(/[\\/]/).pop();
  d.saved = d.content;
  renderTabs();
  persistDocs();
  renderLibrary();
  toast(`Saved ${d.name}`, 'ok');
  return true;
}

async function closeDoc(id) {
  const d = docs.find((x) => x.id === id);
  if (!d) return;
  if (isDirty(d)) {
    const choice = await modal({
      title: `Save changes to ${d.name}?`,
      html: '<p>Your changes will be lost if you don\'t save them.</p>',
      buttons: [{ label: 'Cancel', value: 'cancel' }, { label: "Don't save", value: 'discard' }, { label: 'Save', value: 'save', primary: true }],
      dismiss: 'cancel',
    });
    if (choice === 'cancel') return;
    if (choice === 'save' && !(await saveDoc(d))) return;
  }
  const idx = docs.indexOf(d);
  docs.splice(idx, 1);
  if (activeId === id) activateDoc(docs[Math.min(idx, docs.length - 1)]?.id ?? null);
  else renderTabs();
  persistDocs();
}

const commands = {
  new: () => {
    let n = 1;
    while (docs.some((d) => d.name === `untitled-${n}.gpc`)) n++;
    openDoc({ name: `untitled-${n}.gpc`, content: NEW_TEMPLATE });
    editor.focus();
  },
  open: async () => {
    try {
      const files = await invoke('dialog_open_gpc');
      for (const f of files) {
        const existing = docs.find((d) => d.path && d.path.toLowerCase() === f.path.toLowerCase());
        if (existing) activateDoc(existing.id);
        else openDoc({ name: f.name, path: f.path, content: f.content, saved: f.content });
      }
    } catch (e) { toast(errorText(e), 'error'); }
  },
  save: async () => { try { await saveDoc(activeDoc()); } catch (e) { toast(errorText(e), 'error'); } },
  saveAs: async () => { try { await saveDoc(activeDoc(), true); } catch (e) { toast(errorText(e), 'error'); } },
  exportGpc: async () => {
    const d = activeDoc();
    if (!d) return;
    try {
      const path = await invoke('dialog_save', { defaultName: `${baseName(d.name)}.gpc` });
      if (!path) return;
      await invoke('file_write_text', { path, content: d.content });
      toast(`Exported ${path.split(/[\\/]/).pop()}`, 'ok');
      renderLibrary();
    } catch (e) { toast(errorText(e), 'error'); }
  },
  close: () => activeId && closeDoc(activeId),
};

// ---- menus ----

const menus = [...document.querySelectorAll('.menu')];
const closeMenus = () => menus.forEach((m) => m.classList.remove('open'));
for (const m of menus) {
  m.querySelector('.menu-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const was = m.classList.contains('open');
    closeMenus();
    if (!was) m.classList.add('open');
  });
  m.querySelector('.menu-btn').addEventListener('mouseenter', () => {
    if (menus.some((x) => x.classList.contains('open')) && !m.classList.contains('open')) { closeMenus(); m.classList.add('open'); }
  });
  m.querySelector('.menu-pop').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cmd]');
    if (!b) return;
    closeMenus();
    commands[b.dataset.cmd]?.();
  });
}
document.addEventListener('click', closeMenus);

/** Tools registry: the tools you send later plug in here. */
function registerTool({ label, run }) {
  const pop = $('#toolsMenu');
  pop.querySelector('.menu-empty')?.remove();
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', () => { closeMenus(); run({ editor, activeDoc, openDoc, toast, modal }); });
  pop.appendChild(b);
}
window.astro = { registerTool };

// ---- built-in tools (from gpc_cipher.py and the q77 multi-tool) ----

const optRow = (id, label, checked = true) =>
  `<label class="opt"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span>${esc(label)}</span></label>`;

function needDoc() {
  const d = activeDoc();
  if (!d || !d.content.trim()) { toast('Open or write a GPC script first.', 'error'); return null; }
  return d;
}

function openResult(d, suffix, text) {
  openDoc({ name: `${baseName(d.name)}_${suffix}.gpc`, content: text });
  showView('compiler');
}

registerTool({
  label: 'Encoder…',
  run: async () => {
    const d = needDoc();
    if (!d) return;
    const go = await modal({
      title: 'Encoder',
      html: `<p>Encodes <b>${esc(d.name)}</b> into a new tab. The original stays unchanged.</p>
        ${optRow('tHex', 'Numbers to HEX (positive only)')}
        ${optRow('tObf', 'Obfuscate variables')}
        ${optRow('tLine', '1-Line mode + header')}`,
      buttons: [{ label: 'Cancel', value: false }, { label: 'START ENCODING', value: true, primary: true }],
      dismiss: false,
    });
    if (!go) return;
    let text = d.content;
    const notes = [];
    if ($('#tHex').checked) { const r = numbersToHex(text); text = r.text; notes.push(`${r.count} numbers → HEX`); }
    if ($('#tObf').checked) { const r = obfuscateVariables(text); text = r.text; notes.push(`${r.mapping.size} names obfuscated`); }
    if ($('#tLine').checked) { text = oneLine(text); notes.push('1 line'); }
    if (notes.length === 0) return;
    openResult(d, 'ENCODED', text);
    toast(`Encoded: ${notes.join(', ')}.`, 'ok');
  },
});

registerTool({
  label: 'Decoder…',
  run: async () => {
    const d = needDoc();
    if (!d) return;
    const go = await modal({
      title: 'Decoder',
      html: `<p>Decodes <b>${esc(d.name)}</b> into a new tab. The original stays unchanged.</p>
        ${optRow('tUnhex', 'Convert HEX to normal numbers')}
        ${optRow('tBeauty', 'Beautify & fix new lines')}
        <p class="muted">Obfuscated names cannot be restored: the originals are not stored in the script.</p>`,
      buttons: [{ label: 'Cancel', value: false }, { label: 'START DECODING', value: true, primary: true }],
      dismiss: false,
    });
    if (!go) return;
    let text = d.content;
    const notes = [];
    if ($('#tUnhex').checked) { const r = hexToNumbers(text); text = r.text; notes.push(`${r.count} HEX → numbers`); }
    if ($('#tBeauty').checked) { text = beautify(text); notes.push('beautified'); }
    if (notes.length === 0) return;
    openResult(d, 'DECODED', text);
    toast(`Decoded: ${notes.join(', ')}.`, 'ok');
  },
});

registerTool({
  label: 'Strings → data() (Cipher)…',
  run: async () => {
    const d = needDoc();
    if (!d) return;
    const go = await modal({
      title: 'Strings → data()',
      html: `<p>Moves every <code>const string</code> in <b>${esc(d.name)}</b> into one <code>data()</code> section and replaces each name with a lookup call.</p>
        <label class="opt"><span>Strings per lookup function</span><input type="number" id="tGroup" value="8" min="1" max="64"></label>`,
      buttons: [{ label: 'Cancel', value: false }, { label: 'Convert', value: true, primary: true }],
      dismiss: false,
    });
    if (!go) return;
    const group = Math.max(1, Math.min(64, parseInt($('#tGroup').value, 10) || 8));
    const r = stringsToData(d.content, group);
    if (r.table.length === 0) { toast('No const string declarations found.', 'error'); return; }
    openResult(d, 'CIPHER', r.text);
    const rows = r.table.map((t) => `<tr><td>${esc(t.name)}</td><td>${t.offset}</td><td><code>${t.func}(${t.idx})</code></td><td>"${esc(t.value)}"</td></tr>`).join('');
    await modal({
      title: `${r.table.length} string${r.table.length > 1 ? 's' : ''} from ${r.declCount} declaration${r.declCount > 1 ? 's' : ''} → data() (${r.bytes} bytes)`,
      html: `${r.merged ? `<p>Added to the script's existing <code>data()</code> section, starting at offset ${r.base}, so its own values keep their offsets.</p>` : ''}
        ${r.warnings.map((w) => `<p class="warn">${esc(w)}</p>`).join('')}
        <div class="tbl"><table><tr><th>Name</th><th>Offset</th><th>Lookup</th><th>Value</th></tr>${rows}</table></div>`,
    });
  },
});

// ---- keyboard ----

document.addEventListener('keydown', (e) => {
  if (modalResolve || currentView !== 'compiler') return;
  const ctrl = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  let cmd = null;
  if (ctrl && k === 'n') cmd = 'new';
  else if (ctrl && k === 'o') cmd = 'open';
  else if (ctrl && e.shiftKey && k === 's') cmd = 'saveAs';
  else if (ctrl && k === 's') cmd = 'save';
  else if (ctrl && k === 'w') cmd = 'close';
  if (cmd) { e.preventDefault(); commands[cmd](); }
});

// ---- persistence of open tabs ----

function snapshot() {
  return JSON.stringify({
    active: docs.findIndex((d) => d.id === activeId),
    docs: docs.map(({ name, path, content, saved }) => ({ name, path, content, saved })),
  });
}
let persistTimer = 0;
function persistDocs() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => { try { localStorage.setItem('astro.docs', snapshot()); } catch { /* unavailable */ } }, 300);
}
window.addEventListener('beforeunload', () => { try { localStorage.setItem('astro.docs', snapshot()); } catch { /* ignore */ } });

function restoreDocs() {
  let state = null;
  try { state = JSON.parse(localStorage.getItem('astro.docs') ?? 'null'); } catch { state = null; }
  if (state?.docs?.length) {
    for (const d of state.docs) docs.push({ id: `d${seq++}`, ...d, view: null });
    activateDoc(docs[Math.max(0, Math.min(state.active, docs.length - 1))].id);
  } else {
    commands.new();
  }
}

// ======================================================================
// Startup
// ======================================================================

// ======================================================================
// MAKE YOUR GPC
// ======================================================================

// BEST VALUES: its own page in the top bar (reads a script and suggests aim assist values).
renderBestValues($('#view-bestvalues'));

const myg = initMakeYourGpc({
  root: $('#view-myg'),
  toast,
  modal,
  compile: (source) => ({ bytes: compileGpc(source).length / 2 }),
  openInCompiler: (name, content) => { openDoc({ name, content }); showView('compiler'); },
  libraryList: () => invoke('library_list'),
  librarySave: async (name, content) => { const path = await invoke('library_save', { name, content }); renderLibrary(); return path; },
  // What BOOT knows about the device, so BUILD can show what each slot holds.
  deviceSlots: () => ({ connected: device.status === 'ready' || device.status === 'busy', slots: device.slots, pending: [...pendingSlots.keys()] }),
  // Queues a script on a slot; the user confirms with START on the BOOT page (compile + flash).
  sendToSlot: (slotNum, name, source) => {
    pendingSlots.set(slotNum, { name, source });
    renderSlots(device.status === 'ready' || device.status === 'busy');
    showView('boot');
    toast(`"${baseName(name)}" is ready on Slot ${slotNum}. ${device.status === 'ready' ? 'Press START to compile and flash.' : 'Connect the Zen, then press START.'}`, 'ok');
  },
});

applySlots([]);
restoreDocs();
renderBoot();
renderLibrary();
invoke('zen_presence').then((p) => { device.present = p.present; renderPill(); }).catch(() => {});

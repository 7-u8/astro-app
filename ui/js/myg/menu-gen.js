// Menu engine + menu styles -> GPC source.
// One shared engine (navigation, edit, save/load, home screen, screen saver); each style only
// supplies the three draw functions st_cats(), st_items(), st_vals().
import { exportBitmap, gpcIdent } from './gpc-image.js';
import { composeMods } from './mods.js';

// ---------------------------------------------------------------------- catalogue of choices

export const MENU_STYLES = [
  { id: 'classic', name: 'Classic Toggle', desc: 'Title bar, one mod at a time, big ON/OFF state. UP/DOWN picks the mod.', flat: true },
  { id: 'tree', name: 'Category Tree', desc: 'Scrolling list with a highlighted row, values shown on the right.', flat: false },
  { id: 'inverted', name: 'Inverted List', desc: 'White screen with three boxed rows, the selected box is filled.', flat: false },
  { id: 'node', name: 'Node Panel', desc: 'Numbered rail on the left, details panel on the right.', flat: false },
  { id: 'valuebar', name: 'Value Bar Pro', desc: 'State pill for mods, big number with min / max and a bar when editing.', flat: true },
  { id: 'carousel', name: 'Carousel', desc: 'Previous and next items around a large highlighted centre item.', flat: true },
  { id: 'tabs', name: 'Tabs', desc: 'Category tabs across the top, the mods of the tab listed below.', flat: false, grouped: true },
  { id: 'clean', name: 'Clean List', desc: 'Header bar, four rows of names, and the selected option in a footer line. Never overlaps.', flat: false },
  { id: 'focus', name: 'Focus Card', desc: 'One mod per screen: name on top, the option in a big box, dots for the position.', flat: true },
  { id: 'frame', name: 'Double Frame', desc: 'Double border around three rows, the option in the footer.', flat: false },
  { id: 'rail', name: 'Timeline Rail', desc: 'A vertical rail with a dot for every row; the selected dot is filled.', flat: false },
  { id: 'terminal', name: 'Terminal', desc: 'Console look: a > marker on the selected row, the option in the footer.', flat: false },
  { id: 'scoreboard', name: 'Scoreboard', desc: 'The option or number in big type, with the position at the bottom.', flat: true },
  { id: 'minimal', name: 'Minimal Centre', desc: 'Name and option in the middle of the screen, arrows at the bottom.', flat: true },
  { id: 'pill', name: 'Pill Footer', desc: 'Four rows of names, and the option in a filled pill at the bottom.', flat: false },
  { id: 'dividers', name: 'Divider Rows', desc: 'Rows split by thin lines, the selected row filled, the option in the footer.', flat: false },
  { id: 'cards', name: 'Two Cards', desc: 'Two cards per screen: the name and option (or value) inside each card.', flat: false },
];

export const MENU_COMBOS = [
  { id: 'l2opt', name: 'L2 / LT + OPTIONS', hold: 'PS4_L2', press: 'PS4_OPTIONS' },
  { id: 'l1opt', name: 'L1 / LB + OPTIONS', hold: 'PS4_L1', press: 'PS4_OPTIONS' },
  { id: 'r2opt', name: 'R2 / RT + OPTIONS', hold: 'PS4_R2', press: 'PS4_OPTIONS' },
  { id: 'l2share', name: 'L2 / LT + SHARE', hold: 'PS4_L2', press: 'PS4_SHARE' },
  { id: 'l2touch', name: 'L2 / LT + TOUCHPAD', hold: 'PS4_L2', press: 'PS4_TOUCH' },
];

export const FAST_BUTTONS = [
  { id: 'PS4_R1', name: 'R1 / RB' },
  { id: 'PS4_L1', name: 'L1 / LB' },
  { id: 'PS4_R2', name: 'R2 / RT' },
];

/** Stand-in mods used until the MODS step is built. */
export const DEMO_MODEL = {
  categories: [
    {
      name: 'AIM ASSIST',
      items: [
        { name: 'POLAR AA', options: ['OFF', 'ON'], def: 1, values: [{ name: 'SPEED', min: 1, max: 50, def: 12, step: 1, big: 5 }, { name: 'SIZE', min: 1, max: 40, def: 15, step: 1, big: 5 }] },
        { name: 'TAYLOR AA', options: ['OFF', 'CIRCLE', 'SPIRAL'], def: 0, values: [{ name: 'SPEED', min: 1, max: 50, def: 10, step: 1, big: 5 }, { name: 'SIZE', min: 1, max: 40, def: 12, step: 1, big: 5 }] },
        { name: 'HIP AA', options: ['OFF', 'ON'], def: 0, values: [{ name: 'SIZE', min: 1, max: 30, def: 8, step: 1, big: 5 }] },
      ],
    },
    {
      name: 'ANTI RECOIL',
      items: [
        { name: 'BASIC AR', options: ['OFF', 'ON'], def: 1, values: [{ name: 'VERTICAL', min: 0, max: 99, def: 28, step: 1, big: 10 }, { name: 'HORIZONTAL', min: -50, max: 50, def: 0, step: 1, big: 10 }] },
        { name: 'PROGRESSIVE AR', options: ['OFF', 'ON'], def: 0, values: [{ name: 'START', min: 0, max: 99, def: 30, step: 1, big: 10 }, { name: 'END', min: 0, max: 99, def: 20, step: 1, big: 10 }, { name: 'TIME MS', min: 100, max: 3000, def: 800, step: 50, big: 500 }] },
      ],
    },
    {
      name: 'SETTINGS',
      items: [
        { name: 'RAPID FIRE', options: ['OFF', 'ON'], def: 0, values: [{ name: 'SHOTS/SEC', min: 1, max: 25, def: 12, step: 1, big: 5 }] },
        { name: 'VM SPEED', options: ['0', '-2', '-4', '-6', '-8'], def: 0, values: [] },
        { name: 'VIBRATION', options: ['OFF', 'ON'], def: 1, values: [] },
      ],
    },
  ],
};

// ---------------------------------------------------------------------- helpers

const ascii = (s) => String(s ?? '').replace(/[^\x20-\x7E]/g, '').replace(/["\\]/g, '').trim();
const q = (s) => `"${ascii(s)}"`;
const list = (arr, per = 12) => {
  const out = [];
  for (let i = 0; i < arr.length; i += per) out.push(`    ${arr.slice(i, i + per).join(', ')}`);
  return out.join(',\n');
};
const strArr = (name, arr) => `const string ${name}[] = {\n${list(arr.map(q), 6)}\n};`;
const numArr = (name, type, arr) => `const ${type} ${name}[] = {\n${list(arr.length ? arr : [0])}\n};`;

function hash8(text) {
  let h = 7;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 251) + 1;
}

/** Flattens a category/item model into the parallel tables the engine reads. */
export function flattenModel(model) {
  const t = { cats: [], items: [], opts: [], vals: [] };
  for (const c of model.categories) {
    if (!c.items?.length) continue;
    const cat = { name: ascii(c.name).slice(0, 14) || 'MODS', first: t.items.length, count: 0 };
    t.cats.push(cat);
    for (const it of c.items) {
      const options = (it.options?.length >= 2 ? it.options : ['OFF', 'ON']).map((o) => ascii(o).slice(0, 10) || '-');
      const item = {
        key: it.key ?? null,
        glob: !!it.glob,
        name: ascii(it.name).slice(0, 16) || 'MOD', cat: t.cats.length - 1,
        opt0: t.opts.length, optn: options.length, def: Math.min(Math.max(it.def ?? 0, 0), options.length - 1),
        v0: t.vals.length, vn: 0,
      };
      t.opts.push(...options);
      for (const v of it.values ?? []) {
        const min = Math.trunc(v.min), max = Math.max(Math.trunc(v.max), Math.trunc(v.min) + 1);
        t.vals.push({
          id: v.id ?? null,
          name: ascii(v.name).slice(0, 14) || 'VALUE', min, max,
          def: Math.min(Math.max(Math.trunc(v.def ?? min), min), max),
          step: Math.max(1, Math.trunc(v.step ?? 1)), big: Math.max(1, Math.trunc(v.big ?? 10)),
        });
        item.vn++;
      }
      t.items.push(item);
      cat.count++;
    }
  }
  return t;
}

// Bits the save needs: signature + profile index + shared entries once + per-profile entries P times.
function saveBits(t, P = 1) {
  const bits = (n) => Math.max(1, Math.ceil(Math.log2(n + 1)));
  let total = 8 + (P > 1 ? bits(P - 1) : 0);
  for (const it of t.items) {
    const n = bits(it.optn - 1) + t.vals.slice(it.v0, it.v0 + it.vn).reduce((a, v) => a + bits(v.max - v.min), 0);
    total += P > 1 && !it.glob ? n * P : n;
  }
  return total;
}

/** Save/load functions; with profiles, shared (controller) entries are stored once and the rest per profile. */
function saveLoadCode(P) {
  if (P <= 1) {
    return `function m_defaults() {
    for (m_i = 0; m_i < N_ITEM; m_i++) ST[m_i] = ITEM_DEF[m_i];
    for (m_i = 0; m_i < N_VAL; m_i++) VL[m_i] = VAL_DEF[m_i];
}

function m_save() {
    sv_slot = SPVAR_1; sv_bit = 0; sv_acc = 0;
    sv_put(SAVE_SIG, 0, 255);
    for (m_i = 0; m_i < N_ITEM; m_i++) sv_put(ST[m_i], 0, ITEM_OPTN[m_i] - 1);
    for (m_i = 0; m_i < N_VAL; m_i++) sv_put(VL[m_i], VAL_MIN[m_i], VAL_MAX[m_i]);
    if (sv_bit > 0) set_pvar(sv_slot, sv_acc);
}

function m_load() {
    m_defaults();
    sv_slot = SPVAR_1; sv_bit = 0; sv_acc = 0;
    if (sv_get(0, 255) != SAVE_SIG) return;
    for (m_i = 0; m_i < N_ITEM; m_i++) {
        m_t = sv_get(0, ITEM_OPTN[m_i] - 1);
        if (m_t < ITEM_OPTN[m_i]) ST[m_i] = m_t;
    }
    for (m_i = 0; m_i < N_VAL; m_i++) {
        m_t = sv_get(VAL_MIN[m_i], VAL_MAX[m_i]);
        if (m_t <= VAL_MAX[m_i]) VL[m_i] = m_t;
    }
}`;
  }
  return `// ---------- profiles: ST / VL hold the active profile, PST / PVL keep every profile
function pf_store() {
    for (m_i = 0; m_i < N_ITEM; m_i++) if (!ITEM_GLOB[m_i]) PST[m_prof * N_ITEM + m_i] = ST[m_i];
    for (m_i = 0; m_i < N_VAL; m_i++) if (!VAL_GLOB[m_i]) PVL[m_prof * N_VAL_A + m_i] = VL[m_i];
}

function pf_load() {
    for (m_i = 0; m_i < N_ITEM; m_i++) if (!ITEM_GLOB[m_i]) ST[m_i] = PST[m_prof * N_ITEM + m_i];
    for (m_i = 0; m_i < N_VAL; m_i++) if (!VAL_GLOB[m_i]) VL[m_i] = PVL[m_prof * N_VAL_A + m_i];
}

function pf_switch(f_p) {
    pf_store();
    m_prof = f_p;
    pf_load();
    m_pop(PROF_NAME[m_prof], PROF_LEN[m_prof], -1);
    m_fx(1);
    m_led();
}

function m_defaults() {
    for (m_i = 0; m_i < N_ITEM; m_i++) ST[m_i] = ITEM_DEF[m_i];
    for (m_i = 0; m_i < N_VAL; m_i++) VL[m_i] = VAL_DEF[m_i];
    for (m_j = 0; m_j < PROF_N; m_j++) {
        for (m_i = 0; m_i < N_ITEM; m_i++) PST[m_j * N_ITEM + m_i] = ITEM_DEF[m_i];
        for (m_i = 0; m_i < N_VAL; m_i++) PVL[m_j * N_VAL_A + m_i] = VAL_DEF[m_i];
    }
    m_prof = 0;
}

function m_save() {
    pf_store();
    sv_slot = SPVAR_1; sv_bit = 0; sv_acc = 0;
    sv_put(SAVE_SIG, 0, 255);
    sv_put(m_prof, 0, PROF_N - 1);
    for (m_i = 0; m_i < N_ITEM; m_i++) if (ITEM_GLOB[m_i]) sv_put(ST[m_i], 0, ITEM_OPTN[m_i] - 1);
    for (m_i = 0; m_i < N_VAL; m_i++) if (VAL_GLOB[m_i]) sv_put(VL[m_i], VAL_MIN[m_i], VAL_MAX[m_i]);
    for (m_j = 0; m_j < PROF_N; m_j++) {
        for (m_i = 0; m_i < N_ITEM; m_i++) if (!ITEM_GLOB[m_i]) sv_put(PST[m_j * N_ITEM + m_i], 0, ITEM_OPTN[m_i] - 1);
        for (m_i = 0; m_i < N_VAL; m_i++) if (!VAL_GLOB[m_i]) sv_put(PVL[m_j * N_VAL_A + m_i], VAL_MIN[m_i], VAL_MAX[m_i]);
    }
    if (sv_bit > 0) set_pvar(sv_slot, sv_acc);
}

function m_load() {
    m_defaults();
    sv_slot = SPVAR_1; sv_bit = 0; sv_acc = 0;
    if (sv_get(0, 255) != SAVE_SIG) { pf_load(); return; }
    m_t = sv_get(0, PROF_N - 1);
    if (m_t < PROF_N) m_prof = m_t;
    for (m_i = 0; m_i < N_ITEM; m_i++) if (ITEM_GLOB[m_i]) { m_t = sv_get(0, ITEM_OPTN[m_i] - 1); if (m_t < ITEM_OPTN[m_i]) ST[m_i] = m_t; }
    for (m_i = 0; m_i < N_VAL; m_i++) if (VAL_GLOB[m_i]) { m_t = sv_get(VAL_MIN[m_i], VAL_MAX[m_i]); if (m_t <= VAL_MAX[m_i]) VL[m_i] = m_t; }
    for (m_j = 0; m_j < PROF_N; m_j++) {
        for (m_i = 0; m_i < N_ITEM; m_i++) if (!ITEM_GLOB[m_i]) {
            m_t = sv_get(0, ITEM_OPTN[m_i] - 1);
            if (m_t < ITEM_OPTN[m_i]) PST[m_j * N_ITEM + m_i] = m_t;
        }
        for (m_i = 0; m_i < N_VAL; m_i++) if (!VAL_GLOB[m_i]) {
            m_t = sv_get(VAL_MIN[m_i], VAL_MAX[m_i]);
            if (m_t <= VAL_MAX[m_i]) PVL[m_j * N_VAL_A + m_i] = m_t;
        }
    }
    pf_load();
}`;
}

// ---------------------------------------------------------------------- screen + LED choices

export const LED_COLORS = [
  ['off', 'Off', [0, 0, 0]], ['blue', 'Blue', [0, 0, 255]], ['red', 'Red', [255, 0, 0]], ['green', 'Green', [0, 255, 0]],
  ['pink', 'Pink', [255, 0, 140]], ['cyan', 'Cyan', [0, 200, 255]], ['yellow', 'Yellow', [255, 200, 0]],
  ['white', 'White', [255, 255, 255]], ['purple', 'Purple', [140, 0, 255]], ['orange', 'Orange', [255, 90, 0]],
];
export const BOOT_MODES = [['static', 'No animation'], ['wipe', 'Wipe reveal'], ['flash', 'Flash'], ['title', 'Title then logo']];
export const HOME_MODES = [['logo', 'Logo'], ['logo_profile', 'Logo + profile bar'], ['status', 'Status screen'], ['blank', 'Blank (OLED off)']];
export const SAVER_MODES = [['blank', 'Turn the screen off'], ['move', 'Moving title (keeps a sign of life)']];
export const SCREEN_DEFAULTS = {
  boot: 'wipe', bootMs: 1500, home: 'logo', saver: 'blank', saverSec: 10,
  led: { on: true, profiles: ['blue', 'red', 'green'], menu: 'white', kill: 'red' },
};
export const PROFILE_DEFAULTS = { count: 1, names: ['PRIMARY', 'SECONDARY', 'CUSTOM'], hold: 'PS4_L2', press: 'PS4_TRIANGLE' };

// ---------------------------------------------------------------------- shared GPC

const ENGINE_VARS = `int ST[N_ITEM_A];
int VL[N_VAL_A];
int m_open, m_lvl, m_cat, m_item, m_val, m_dirty, m_rep, m_msg, m_saver, m_tmr;
int m_pstr, m_plen, m_pnum, m_pstr2, m_plen2;
int m_prof, m_boot, m_btmr, m_stmr, m_lc;
int m_i, m_j, m_t, m_n, m_x, m_y, m_a, m_b;
int sv_slot, sv_bit, sv_acc, sv_n, sv_i, sv_v, sv_t;
int nb_len, nb_v, nb_i;`;

const HELPERS = `// ---------- drawing helpers
function fw(f_font) {
    if (f_font == 0) return 7;
    if (f_font == 1) return 11;
    return 16;
}

function txt_c(f_y, f_font, f_col, f_str, f_len) {
    print(64 - (f_len * fw(f_font)) / 2, f_y, f_font, f_col, f_str);
}

function txt_r(f_x, f_y, f_font, f_col, f_str, f_len) {
    print(f_x - f_len * fw(f_font), f_y, f_font, f_col, f_str);
}

function nb_count(f_v) {
    nb_len = 1;
    if (f_v < 0) { nb_len++; f_v = abs(f_v); }
    while (f_v >= 10) { nb_len++; f_v = f_v / 10; }
    return nb_len;
}

function num(f_x, f_y, f_font, f_col, f_v) {
    nb_len = nb_count(f_v);
    nb_v = abs(f_v);
    for (nb_i = nb_len; nb_i >= 1; nb_i--) {
        putc_oled(nb_i, 48 + nb_v % 10);
        nb_v = nb_v / 10;
    }
    if (f_v < 0) putc_oled(1, 45);
    puts_oled(f_x, f_y, f_font, nb_len, f_col);
}

function num_c(f_y, f_font, f_col, f_v) {
    num(64 - (nb_count(f_v) * fw(f_font)) / 2, f_y, f_font, f_col, f_v);
}

function num_r(f_x, f_y, f_font, f_col, f_v) {
    num(f_x - nb_count(f_v) * fw(f_font), f_y, f_font, f_col, f_v);
}

function bar(f_x, f_y, f_w, f_h, f_v, f_lo, f_hi) {
    rect_oled(f_x, f_y, f_w, f_h, 0, 1);
    m_t = 0;
    if (f_hi > f_lo) m_t = ((f_v - f_lo) * (f_w - 2)) / (f_hi - f_lo);
    if (m_t > 0) rect_oled(f_x + 1, f_y + 1, m_t, f_h - 2, 1, 1);
}

function opt_s(f_item) { return OPT_NAME[ITEM_OPT0[f_item] + ST[f_item]]; }
function opt_n(f_item) { return OPT_LEN[ITEM_OPT0[f_item] + ST[f_item]]; }

// Prints a name in the medium font when it fits the width, otherwise in the small font.
function name_c(f_y, f_col, f_str, f_len) {
    if (f_len * 11 <= 124) txt_c(f_y, 1, f_col, f_str, f_len);
    else txt_c(f_y + 4, 0, f_col, f_str, f_len);
}

// Index of the first and last selectable item for the current category.
function m_first() {
    if (MENU_FLAT) return 0;
    return CAT_FIRST[m_cat];
}

function m_last() {
    if (MENU_FLAT) return N_ITEM - 1;
    return CAT_FIRST[m_cat] + CAT_COUNT[m_cat] - 1;
}

// The heading shown while browsing mods: the category, or the title in a flat menu.
function head_s() { return CAT_NAME[ITEM_CAT[m_item]]; }
function head_n() { return CAT_LEN[ITEM_CAT[m_item]]; }`;

// ---------------------------------------------------------------------- styles

// Helpers shared by the new styles (names start with ns_, so they never clash with the engine).
// Rule for every new style: a name and an option are never printed on the same line when they could overlap.
const NS_COMMON = `// ---------- shared by the new styles
// A name or option in the biggest font that fits 124 px (16 px, then 11 px, then 7 px).
function ns_big(f_y, f_col, f_str, f_len) {
    if (f_len * 16 <= 124) txt_c(f_y, 2, f_col, f_str, f_len);
    else if (f_len * 11 <= 124) txt_c(f_y + 2, 1, f_col, f_str, f_len);
    else txt_c(f_y + 4, 0, f_col, f_str, f_len);
}

// First index of the page that holds f_cur; a page has f_rows rows and starts at f_first.
function ns_page(f_first, f_cur, f_rows) {
    return f_first + ((f_cur - f_first) / f_rows) * f_rows;
}

// Footer: the selected option between two arrows, on its own line.
function ns_foot(f_y, f_item) {
    print(6, f_y, 0, 1, TX[TX_PREV]);
    print(117, f_y, 0, 1, TX[TX_NEXT]);
    txt_c(f_y, 0, 1, opt_s(f_item), opt_n(f_item));
}

// Footer for a value: its number, centred.
function ns_vfoot(f_y) {
    num_c(f_y, 0, 1, VL[m_val]);
}
`;

const STYLE_CODE = {
  classic: `// ---------- style: Classic Toggle
function st_frame(f_str, f_len) {
    cls_oled(0);
    rect_oled(0, 0, 128, 13, 1, 1);
    txt_c(2, 0, 0, f_str, f_len);
}

function st_cats() {
    st_frame(TITLE[0], TITLE_LEN);
    name_c(20, 1, CAT_NAME[m_cat], CAT_LEN[m_cat]);
    print(4, 25, 0, 1, TX[TX_PREV]);
    print(117, 25, 0, 1, TX[TX_NEXT]);
    line_oled(0, 50, 127, 50, 1, 1);
    num(4, 53, 0, 1, m_cat + 1);
    txt_r(124, 53, 0, 1, TX[TX_OPEN], TX_OPEN_N);
}

function st_items() {
    st_frame(head_s(), head_n());
    name_c(16, 1, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    rect_oled(22, 33, 84, 15, 0, 1);
    txt_c(36, 0, 1, opt_s(m_item), opt_n(m_item));
    print(10, 36, 0, 1, TX[TX_PREV]);
    print(111, 36, 0, 1, TX[TX_NEXT]);
    num(4, 53, 0, 1, m_item - m_first() + 1);
    if (ITEM_VN[m_item]) txt_r(124, 53, 0, 1, TX[TX_EDIT], TX_EDIT_N);
}

function st_vals() {
    st_frame(ITEM_NAME[m_item], ITEM_LEN[m_item]);
    txt_c(16, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    num_c(26, 1, 1, VL[m_val]);
    bar(14, 45, 100, 7, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
    num(2, 54, 0, 1, VAL_MIN[m_val]);
    num_r(126, 54, 0, 1, VAL_MAX[m_val]);
}`,

  tree: `// ---------- style: Category Tree
function st_head(f_str, f_len, f_pos, f_cnt) {
    cls_oled(0);
    rect_oled(0, 0, 128, 64, 0, 1);
    print(4, 2, 0, 1, f_str);
    num_r(124, 2, 0, 1, f_cnt);
    m_x = 124 - nb_count(f_cnt) * 7;
    print(m_x - 7, 2, 0, 1, TX[TX_SLASH]);
    num_r(m_x - 7, 2, 0, 1, f_pos);
    line_oled(0, 12, 127, 12, 1, 1);
}

// Row r (0..3): returns its y and paints the highlight when selected.
function st_row(f_r, f_sel) {
    m_y = 15 + f_r * 12;
    if (f_sel) rect_oled(2, m_y - 1, 124, 11, 1, 1);
    return m_y;
}

function st_cats() {
    st_head(TITLE[0], TITLE_LEN, m_cat + 1, N_CAT);
    m_a = m_cat - m_cat % 4;
    for (m_i = 0; m_i < 4 && m_a + m_i < N_CAT; m_i++) {
        m_j = m_a + m_i;
        m_y = st_row(m_i, m_j == m_cat);
        print(6, m_y, 0, m_j != m_cat, CAT_NAME[m_j]);
        print(116, m_y, 0, m_j != m_cat, TX[TX_NEXT]);
    }
}

function st_items() {
    st_head(head_s(), head_n(), m_item - m_first() + 1, m_last() - m_first() + 1);
    m_a = m_first() + (m_item - m_first()) - (m_item - m_first()) % 4;
    for (m_i = 0; m_i < 4 && m_a + m_i <= m_last(); m_i++) {
        m_j = m_a + m_i;
        m_y = st_row(m_i, m_j == m_item);
        print(6, m_y, 0, m_j != m_item, ITEM_NAME[m_j]);
        txt_r(123, m_y, 0, m_j != m_item, opt_s(m_j), opt_n(m_j));
    }
}

function st_vals() {
    st_head(ITEM_NAME[m_item], ITEM_LEN[m_item], m_val - ITEM_V0[m_item] + 1, ITEM_VN[m_item]);
    m_a = ITEM_V0[m_item] + (m_val - ITEM_V0[m_item]) - (m_val - ITEM_V0[m_item]) % 4;
    for (m_i = 0; m_i < 4 && m_a + m_i < ITEM_V0[m_item] + ITEM_VN[m_item]; m_i++) {
        m_j = m_a + m_i;
        m_y = st_row(m_i, m_j == m_val);
        print(6, m_y, 0, m_j != m_val, VAL_NAME[m_j]);
        num_r(123, m_y, 0, m_j != m_val, VL[m_j]);
    }
}`,

  inverted: `// ---------- style: Inverted List
function st_head(f_str) {
    cls_oled(1);
    print(4, 1, 0, 0, f_str);
    line_oled(4, 11, 123, 11, 1, 0);
}

function st_box(f_r, f_sel) {
    m_y = 14 + f_r * 16;
    rect_oled(4, m_y, 120, 15, f_sel, 0);
    return m_y + 3;
}

function st_cats() {
    st_head(TITLE[0]);
    m_a = m_cat - m_cat % 3;
    for (m_i = 0; m_i < 3 && m_a + m_i < N_CAT; m_i++) {
        m_j = m_a + m_i;
        m_y = st_box(m_i, m_j == m_cat);
        txt_c(m_y, 0, m_j == m_cat, CAT_NAME[m_j], CAT_LEN[m_j]);
    }
}

function st_items() {
    st_head(head_s());
    m_a = m_first() + (m_item - m_first()) - (m_item - m_first()) % 3;
    for (m_i = 0; m_i < 3 && m_a + m_i <= m_last(); m_i++) {
        m_j = m_a + m_i;
        m_y = st_box(m_i, m_j == m_item);
        print(9, m_y, 0, m_j == m_item, ITEM_NAME[m_j]);
        txt_r(120, m_y, 0, m_j == m_item, opt_s(m_j), opt_n(m_j));
    }
}

function st_vals() {
    st_head(ITEM_NAME[m_item]);
    txt_c(16, 0, 0, VAL_NAME[m_val], VAL_LEN[m_val]);
    rect_oled(24, 27, 80, 20, 1, 0);
    num_c(28, 1, 1, VL[m_val]);
    num(4, 52, 0, 0, VAL_MIN[m_val]);
    num_r(124, 52, 0, 0, VAL_MAX[m_val]);
}`,

  node: `// ---------- style: Node Panel
function st_frame(f_str, f_pos, f_cnt) {
    cls_oled(0);
    rect_oled(0, 0, 128, 64, 0, 1);
    print(4, 2, 0, 1, TX[TX_SLASH]);
    print(11, 2, 0, 1, f_str);
    num_r(124, 2, 0, 1, f_cnt);
    m_x = 124 - nb_count(f_cnt) * 7;
    print(m_x - 7, 2, 0, 1, TX[TX_SLASH]);
    num_r(m_x - 7, 2, 0, 1, f_pos);
    line_oled(3, 12, 124, 12, 1, 1);
    line_oled(38, 15, 38, 50, 1, 1);
    rect_oled(42, 15, 82, 36, 0, 1);
    line_oled(3, 53, 124, 53, 1, 1);
}

// Rail of numbered nodes; f_base is the first index of the list, f_sel the selection.
function st_rail(f_base, f_sel, f_cnt) {
    m_a = f_sel - f_base - (f_sel - f_base) % 4;
    for (m_i = 0; m_i < 4 && m_a + m_i < f_cnt; m_i++) {
        m_y = 16 + m_i * 9;
        if (m_a + m_i == f_sel - f_base) {
            rect_oled(3, m_y - 1, 32, 9, 0, 1);
            print(6, m_y, 0, 1, TX[TX_NEXT]);
        }
        num(15, m_y, 0, 1, m_a + m_i + 1);
    }
}

function st_cats() {
    st_frame(TITLE[0], m_cat + 1, N_CAT);
    st_rail(0, m_cat, N_CAT);
    print(46, 18, 0, 1, CAT_NAME[m_cat]);
    line_oled(46, 29, 119, 29, 1, 1);
    num(46, 36, 0, 1, CAT_COUNT[m_cat]);
    print(60, 36, 0, 1, TX[TX_MODS]);
    txt_r(124, 55, 0, 1, TX[TX_OPEN], TX_OPEN_N);
}

function st_items() {
    st_frame(head_s(), m_item - m_first() + 1, m_last() - m_first() + 1);
    st_rail(m_first(), m_item, m_last() - m_first() + 1);
    print(46, 18, 0, 1, ITEM_NAME[m_item]);
    line_oled(46, 29, 119, 29, 1, 1);
    if (ST[m_item]) rect_oled(46, 34, 10, 8, 1, 1);
    else rect_oled(46, 34, 10, 8, 0, 1);
    print(60, 34, 0, 1, opt_s(m_item));
    if (ITEM_VN[m_item]) txt_r(124, 55, 0, 1, TX[TX_EDIT], TX_EDIT_N);
}

function st_vals() {
    st_frame(ITEM_NAME[m_item], m_val - ITEM_V0[m_item] + 1, ITEM_VN[m_item]);
    st_rail(ITEM_V0[m_item], m_val, ITEM_VN[m_item]);
    print(46, 18, 0, 1, VAL_NAME[m_val]);
    line_oled(46, 29, 119, 29, 1, 1);
    num(46, 34, 0, 1, VL[m_val]);
    bar(46, 44, 74, 5, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
}`,

  valuebar: `// ---------- style: Value Bar Pro
function st_frame(f_str, f_len) {
    cls_oled(0);
    rect_oled(1, 1, 126, 14, 0, 1);
    txt_c(3, 0, 1, f_str, f_len);
}

function st_cats() {
    st_frame(TITLE[0], TITLE_LEN);
    name_c(22, 1, CAT_NAME[m_cat], CAT_LEN[m_cat]);
    for (m_i = 0; m_i < N_CAT; m_i++) {
        m_x = 64 - N_CAT * 5 + m_i * 10;
        rect_oled(m_x, 50, 6, 6, m_i == m_cat, 1);
    }
}

function st_items() {
    st_frame(ITEM_NAME[m_item], ITEM_LEN[m_item]);
    txt_c(18, 0, 1, head_s(), head_n());
    m_n = opt_n(m_item) * 11 + 16;
    rect_oled(64 - m_n / 2, 30, m_n, 20, 1, 1);
    txt_c(31, 1, 0, opt_s(m_item), opt_n(m_item));
    if (ITEM_VN[m_item]) txt_c(54, 0, 1, TX[TX_EDIT], TX_EDIT_N);
}

function st_vals() {
    st_frame(ITEM_NAME[m_item], ITEM_LEN[m_item]);
    num(4, 18, 0, 1, VAL_MIN[m_val]);
    num_r(124, 18, 0, 1, VAL_MAX[m_val]);
    num_c(18, 1, 1, VL[m_val]);
    bar(14, 38, 100, 13, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
    txt_c(54, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
}`,

  carousel: `// ---------- style: Carousel
// Draws the previous / current / next entries; f_kind 1 = categories, 2 = mods, 3 = values.
function st_entry(f_kind, f_i, f_y, f_sel) {
    if (f_kind == 1) {
        if (f_sel) name_c(f_y, 0, CAT_NAME[f_i], CAT_LEN[f_i]);
        else txt_c(f_y, 0, 1, CAT_NAME[f_i], CAT_LEN[f_i]);
    } else if (f_kind == 2) {
        if (f_sel) name_c(f_y, 0, ITEM_NAME[f_i], ITEM_LEN[f_i]);
        else txt_c(f_y, 0, 1, ITEM_NAME[f_i], ITEM_LEN[f_i]);
    } else {
        txt_c(f_y, 0, !f_sel, VAL_NAME[f_i], VAL_LEN[f_i]);
    }
}

function st_wheel(f_kind, f_sel, f_lo, f_hi) {
    cls_oled(0);
    m_a = f_sel - 1;
    if (m_a < f_lo) m_a = f_hi;
    m_b = f_sel + 1;
    if (m_b > f_hi) m_b = f_lo;
    if (f_hi > f_lo) st_entry(f_kind, m_a, 1, 0);
    rect_oled(0, 13, 128, 24, 1, 1);
    st_entry(f_kind, f_sel, 16, 1);
    if (f_hi > f_lo + 1) st_entry(f_kind, m_b, 54, 0);
}

function st_cats() {
    st_wheel(1, m_cat, 0, N_CAT - 1);
    txt_c(41, 0, 1, TX[TX_OPEN], TX_OPEN_N);
}

function st_items() {
    st_wheel(2, m_item, m_first(), m_last());
    m_n = opt_n(m_item);
    print(64 - m_n * 7 / 2 - 12, 41, 0, 1, TX[TX_PREV]);
    txt_c(41, 0, 1, opt_s(m_item), m_n);
    print(64 + m_n * 7 / 2 + 5, 41, 0, 1, TX[TX_NEXT]);
}

function st_vals() {
    st_wheel(3, m_val, ITEM_V0[m_item], ITEM_V0[m_item] + ITEM_VN[m_item] - 1);
    rect_oled(0, 13, 128, 24, 1, 1);
    txt_c(14, 0, 0, VAL_NAME[m_val], VAL_LEN[m_val]);
    num_c(24, 0, 0, VL[m_val]);
    bar(14, 41, 100, 7, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
}`,

  tabs: `// ---------- style: Tabs
function st_tabs() {
    cls_oled(0);
    m_n = 128 / N_CAT;
    for (m_i = 0; m_i < N_CAT; m_i++) {
        m_x = m_i * m_n;
        if (m_i == m_cat) rect_oled(m_x, 0, m_n, 12, 1, 1);
        else rect_oled(m_x, 0, m_n, 12, 0, 1);
        print(m_x + m_n / 2 - CAT_TAB_LEN[m_i] * 7 / 2, 1, 0, m_i != m_cat, CAT_TAB[m_i]);
    }
}

// Lists the mods of the current tab; f_hl highlights the selected row.
function st_list(f_hl) {
    m_a = m_first();
    if (f_hl) m_a = m_first() + (m_item - m_first()) - (m_item - m_first()) % 4;
    for (m_i = 0; m_i < 4 && m_a + m_i <= m_last(); m_i++) {
        m_j = m_a + m_i;
        m_y = 15 + m_i * 12;
        if (f_hl && m_j == m_item) rect_oled(0, m_y - 1, 128, 11, 1, 1);
        print(3, m_y, 0, !(f_hl && m_j == m_item), ITEM_NAME[m_j]);
        txt_r(125, m_y, 0, !(f_hl && m_j == m_item), opt_s(m_j), opt_n(m_j));
    }
}

function st_cats() {
    st_tabs();
    st_list(0);
}

function st_items() {
    st_tabs();
    st_list(1);
}

function st_vals() {
    st_tabs();
    rect_oled(0, 14, 128, 11, 1, 1);
    txt_c(15, 0, 0, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    txt_c(28, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    num_c(38, 0, 1, VL[m_val]);
    bar(14, 50, 100, 7, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
}`,


  clean: NS_COMMON + `// ---------- style: Clean List
function st_cats() {
    cls_oled(0);
    rect_oled(0, 0, 128, 12, 1, 1);
    txt_c(2, 0, 0, TITLE[0], TITLE_LEN);
    m_a = ns_page(0, m_cat, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i < N_CAT; m_i++) {
        m_j = m_a + m_i;
        m_y = 14 + m_i * 9;
        if (m_j == m_cat) rect_oled(2, m_y - 2, 124, 11, 1, 1);
        print(6, m_y, 0, m_j != m_cat, CAT_NAME[m_j]);
    }
    line_oled(0, 52, 127, 52, 1, 1);
    txt_c(55, 0, 1, TX[TX_OPEN], TX_OPEN_N);
}

function st_items() {
    cls_oled(0);
    rect_oled(0, 0, 128, 12, 1, 1);
    txt_c(2, 0, 0, head_s(), head_n());
    m_a = ns_page(m_first(), m_item, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i <= m_last(); m_i++) {
        m_j = m_a + m_i;
        m_y = 14 + m_i * 9;
        if (m_j == m_item) rect_oled(2, m_y - 2, 124, 11, 1, 1);
        print(6, m_y, 0, m_j != m_item, ITEM_NAME[m_j]);
    }
    line_oled(0, 52, 127, 52, 1, 1);
    ns_foot(55, m_item);
}

function st_vals() {
    cls_oled(0);
    rect_oled(0, 0, 128, 12, 1, 1);
    txt_c(2, 0, 0, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    m_a = ns_page(ITEM_V0[m_item], m_val, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i < ITEM_V0[m_item] + ITEM_VN[m_item]; m_i++) {
        m_j = m_a + m_i;
        m_y = 14 + m_i * 9;
        if (m_j == m_val) rect_oled(2, m_y - 2, 124, 11, 1, 1);
        print(6, m_y, 0, m_j != m_val, VAL_NAME[m_j]);
    }
    line_oled(0, 52, 127, 52, 1, 1);
    ns_vfoot(55);
}`,

  focus: NS_COMMON + `// ---------- style: Focus Card
function st_cats() {
    cls_oled(0);
    txt_c(4, 0, 1, TITLE[0], TITLE_LEN);
    ns_big(20, 1, CAT_NAME[m_cat], CAT_LEN[m_cat]);
    txt_c(50, 0, 1, TX[TX_OPEN], TX_OPEN_N);
}

function st_items() {
    cls_oled(0);
    txt_c(2, 0, 1, head_s(), head_n());
    ns_big(12, 1, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    rect_oled(4, 34, 120, 20, 0, 1);
    txt_c(36, 1, 1, opt_s(m_item), opt_n(m_item));
    m_n = m_last() - m_first() + 1;
    if (m_n <= 20) {
        m_x = 64 - m_n * 3;
        for (m_i = 0; m_i < m_n; m_i++) rect_oled(m_x + m_i * 6, 58, 4, 4, m_first() + m_i == m_item, 1);
    }
}

function st_vals() {
    cls_oled(0);
    txt_c(2, 0, 1, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    ns_big(12, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    num_c(36, 2, 1, VL[m_val]);
    bar(14, 58, 100, 4, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
}`,

  frame: NS_COMMON + `// ---------- style: Double Frame
function ns_frame() {
    cls_oled(0);
    rect_oled(0, 0, 128, 64, 0, 1);
    rect_oled(2, 2, 124, 60, 0, 1);
}

function st_cats() {
    ns_frame();
    txt_c(5, 0, 1, TITLE[0], TITLE_LEN);
    line_oled(3, 15, 124, 15, 1, 1);
    m_a = ns_page(0, m_cat, 3);
    for (m_i = 0; m_i < 3 && m_a + m_i < N_CAT; m_i++) {
        m_j = m_a + m_i;
        m_y = 19 + m_i * 9;
        if (m_j == m_cat) rect_oled(5, m_y - 2, 118, 11, 1, 1);
        print(8, m_y, 0, m_j != m_cat, CAT_NAME[m_j]);
    }
    line_oled(3, 47, 124, 47, 1, 1);
    txt_c(51, 0, 1, TX[TX_OPEN], TX_OPEN_N);
}

function st_items() {
    ns_frame();
    txt_c(5, 0, 1, head_s(), head_n());
    line_oled(3, 15, 124, 15, 1, 1);
    m_a = ns_page(m_first(), m_item, 3);
    for (m_i = 0; m_i < 3 && m_a + m_i <= m_last(); m_i++) {
        m_j = m_a + m_i;
        m_y = 19 + m_i * 9;
        if (m_j == m_item) rect_oled(5, m_y - 2, 118, 11, 1, 1);
        print(8, m_y, 0, m_j != m_item, ITEM_NAME[m_j]);
    }
    line_oled(3, 47, 124, 47, 1, 1);
    ns_foot(51, m_item);
}

function st_vals() {
    ns_frame();
    txt_c(5, 0, 1, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    line_oled(3, 15, 124, 15, 1, 1);
    m_a = ns_page(ITEM_V0[m_item], m_val, 3);
    for (m_i = 0; m_i < 3 && m_a + m_i < ITEM_V0[m_item] + ITEM_VN[m_item]; m_i++) {
        m_j = m_a + m_i;
        m_y = 19 + m_i * 9;
        if (m_j == m_val) rect_oled(5, m_y - 2, 118, 11, 1, 1);
        print(8, m_y, 0, m_j != m_val, VAL_NAME[m_j]);
    }
    line_oled(3, 47, 124, 47, 1, 1);
    ns_vfoot(51);
}`,

  rail: NS_COMMON + `// ---------- style: Timeline Rail
function st_cats() {
    cls_oled(0);
    txt_c(2, 0, 1, TITLE[0], TITLE_LEN);
    line_oled(8, 13, 8, 49, 1, 1);
    m_a = ns_page(0, m_cat, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i < N_CAT; m_i++) {
        m_j = m_a + m_i;
        m_y = 14 + m_i * 9;
        rect_oled(6, m_y + 1, 5, 5, m_j == m_cat, 1);
        print(16, m_y, 0, 1, CAT_NAME[m_j]);
    }
    line_oled(0, 52, 127, 52, 1, 1);
    txt_c(55, 0, 1, TX[TX_OPEN], TX_OPEN_N);
}

function st_items() {
    cls_oled(0);
    txt_c(2, 0, 1, head_s(), head_n());
    line_oled(8, 13, 8, 49, 1, 1);
    m_a = ns_page(m_first(), m_item, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i <= m_last(); m_i++) {
        m_j = m_a + m_i;
        m_y = 14 + m_i * 9;
        rect_oled(6, m_y + 1, 5, 5, m_j == m_item, 1);
        print(16, m_y, 0, 1, ITEM_NAME[m_j]);
    }
    line_oled(0, 52, 127, 52, 1, 1);
    ns_foot(55, m_item);
}

function st_vals() {
    cls_oled(0);
    txt_c(2, 0, 1, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    line_oled(8, 13, 8, 49, 1, 1);
    m_a = ns_page(ITEM_V0[m_item], m_val, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i < ITEM_V0[m_item] + ITEM_VN[m_item]; m_i++) {
        m_j = m_a + m_i;
        m_y = 14 + m_i * 9;
        rect_oled(6, m_y + 1, 5, 5, m_j == m_val, 1);
        print(16, m_y, 0, 1, VAL_NAME[m_j]);
    }
    line_oled(0, 52, 127, 52, 1, 1);
    ns_vfoot(55);
}`,

  terminal: NS_COMMON + `// ---------- style: Terminal
function st_cats() {
    cls_oled(0);
    txt_c(2, 0, 1, TITLE[0], TITLE_LEN);
    m_a = ns_page(0, m_cat, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i < N_CAT; m_i++) {
        m_j = m_a + m_i;
        m_y = 14 + m_i * 9;
        if (m_j == m_cat) print(4, m_y, 0, 1, TX[TX_NEXT]);
        print(14, m_y, 0, 1, CAT_NAME[m_j]);
    }
    line_oled(0, 52, 127, 52, 1, 1);
    txt_c(55, 0, 1, TX[TX_OPEN], TX_OPEN_N);
}

function st_items() {
    cls_oled(0);
    txt_c(2, 0, 1, head_s(), head_n());
    m_a = ns_page(m_first(), m_item, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i <= m_last(); m_i++) {
        m_j = m_a + m_i;
        m_y = 14 + m_i * 9;
        if (m_j == m_item) print(4, m_y, 0, 1, TX[TX_NEXT]);
        print(14, m_y, 0, 1, ITEM_NAME[m_j]);
    }
    line_oled(0, 52, 127, 52, 1, 1);
    ns_foot(55, m_item);
}

function st_vals() {
    cls_oled(0);
    txt_c(2, 0, 1, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    m_a = ns_page(ITEM_V0[m_item], m_val, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i < ITEM_V0[m_item] + ITEM_VN[m_item]; m_i++) {
        m_j = m_a + m_i;
        m_y = 14 + m_i * 9;
        if (m_j == m_val) print(4, m_y, 0, 1, TX[TX_NEXT]);
        print(14, m_y, 0, 1, VAL_NAME[m_j]);
    }
    line_oled(0, 52, 127, 52, 1, 1);
    ns_vfoot(55);
}`,

  scoreboard: NS_COMMON + `// ---------- style: Scoreboard
function st_cats() {
    cls_oled(0);
    txt_c(2, 0, 1, TITLE[0], TITLE_LEN);
    ns_big(22, 1, CAT_NAME[m_cat], CAT_LEN[m_cat]);
    print(6, 44, 0, 1, TX[TX_PREV]);
    print(117, 44, 0, 1, TX[TX_NEXT]);
    num(6, 53, 0, 1, m_cat + 1);
    num_r(122, 53, 0, 1, N_CAT);
}

function st_items() {
    cls_oled(0);
    txt_c(2, 0, 1, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    line_oled(0, 12, 127, 12, 1, 1);
    ns_big(22, 1, opt_s(m_item), opt_n(m_item));
    print(6, 44, 0, 1, TX[TX_PREV]);
    print(117, 44, 0, 1, TX[TX_NEXT]);
    num(6, 53, 0, 1, m_item - m_first() + 1);
    num_r(122, 53, 0, 1, m_last() - m_first() + 1);
}

function st_vals() {
    cls_oled(0);
    txt_c(2, 0, 1, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    line_oled(0, 12, 127, 12, 1, 1);
    txt_c(14, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    num_c(24, 2, 1, VL[m_val]);
    bar(14, 46, 100, 5, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
    num(6, 53, 0, 1, VAL_MIN[m_val]);
    num_r(122, 53, 0, 1, VAL_MAX[m_val]);
}`,

  minimal: NS_COMMON + `// ---------- style: Minimal Centre
function st_cats() {
    cls_oled(0);
    ns_big(22, 1, CAT_NAME[m_cat], CAT_LEN[m_cat]);
    txt_c(42, 0, 1, TX[TX_OPEN], TX_OPEN_N);
    print(6, 53, 0, 1, TX[TX_PREV]);
    print(117, 53, 0, 1, TX[TX_NEXT]);
}

function st_items() {
    cls_oled(0);
    ns_big(16, 1, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    txt_c(38, 0, 1, opt_s(m_item), opt_n(m_item));
    print(6, 53, 0, 1, TX[TX_PREV]);
    print(117, 53, 0, 1, TX[TX_NEXT]);
}

function st_vals() {
    cls_oled(0);
    txt_c(4, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    num_c(18, 2, 1, VL[m_val]);
    bar(14, 40, 100, 6, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
    print(6, 53, 0, 1, TX[TX_PREV]);
    print(117, 53, 0, 1, TX[TX_NEXT]);
}`,

  pill: NS_COMMON + `// ---------- style: Pill Footer
function st_cats() {
    cls_oled(0);
    txt_c(2, 0, 1, TITLE[0], TITLE_LEN);
    line_oled(0, 11, 127, 11, 1, 1);
    m_a = ns_page(0, m_cat, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i < N_CAT; m_i++) {
        m_j = m_a + m_i;
        m_y = 14 + m_i * 9;
        if (m_j == m_cat) rect_oled(2, m_y - 2, 124, 11, 1, 1);
        print(6, m_y, 0, m_j != m_cat, CAT_NAME[m_j]);
    }
    m_n = nb_count(CAT_COUNT[m_cat]) * 7 + 12;
    rect_oled(64 - m_n / 2, 50, m_n, 11, 1, 1);
    num_c(52, 0, 0, CAT_COUNT[m_cat]);
}

function st_items() {
    cls_oled(0);
    txt_c(2, 0, 1, head_s(), head_n());
    line_oled(0, 11, 127, 11, 1, 1);
    m_a = ns_page(m_first(), m_item, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i <= m_last(); m_i++) {
        m_j = m_a + m_i;
        m_y = 14 + m_i * 9;
        if (m_j == m_item) rect_oled(2, m_y - 2, 124, 11, 1, 1);
        print(6, m_y, 0, m_j != m_item, ITEM_NAME[m_j]);
    }
    m_n = opt_n(m_item) * 7 + 12;
    rect_oled(64 - m_n / 2, 50, m_n, 11, 1, 1);
    txt_c(52, 0, 0, opt_s(m_item), opt_n(m_item));
}

function st_vals() {
    cls_oled(0);
    txt_c(2, 0, 1, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    line_oled(0, 11, 127, 11, 1, 1);
    m_a = ns_page(ITEM_V0[m_item], m_val, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i < ITEM_V0[m_item] + ITEM_VN[m_item]; m_i++) {
        m_j = m_a + m_i;
        m_y = 14 + m_i * 9;
        if (m_j == m_val) rect_oled(2, m_y - 2, 124, 11, 1, 1);
        print(6, m_y, 0, m_j != m_val, VAL_NAME[m_j]);
    }
    m_n = nb_count(VL[m_val]) * 7 + 12;
    rect_oled(64 - m_n / 2, 50, m_n, 11, 1, 1);
    num_c(52, 0, 0, VL[m_val]);
}`,

  dividers: NS_COMMON + `// ---------- style: Divider Rows
function st_cats() {
    cls_oled(0);
    txt_c(2, 0, 1, TITLE[0], TITLE_LEN);
    line_oled(0, 11, 127, 11, 1, 1);
    m_a = ns_page(0, m_cat, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i < N_CAT; m_i++) {
        m_j = m_a + m_i;
        m_y = 13 + m_i * 10;
        if (m_j == m_cat) rect_oled(0, m_y - 2, 128, 11, 1, 1);
        print(6, m_y, 0, m_j != m_cat, CAT_NAME[m_j]);
        line_oled(0, m_y + 9, 127, m_y + 9, 1, 1);
    }
    txt_c(55, 0, 1, TX[TX_OPEN], TX_OPEN_N);
}

function st_items() {
    cls_oled(0);
    txt_c(2, 0, 1, head_s(), head_n());
    line_oled(0, 11, 127, 11, 1, 1);
    m_a = ns_page(m_first(), m_item, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i <= m_last(); m_i++) {
        m_j = m_a + m_i;
        m_y = 13 + m_i * 10;
        if (m_j == m_item) rect_oled(0, m_y - 2, 128, 11, 1, 1);
        print(6, m_y, 0, m_j != m_item, ITEM_NAME[m_j]);
        line_oled(0, m_y + 9, 127, m_y + 9, 1, 1);
    }
    ns_foot(55, m_item);
}

function st_vals() {
    cls_oled(0);
    txt_c(2, 0, 1, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    line_oled(0, 11, 127, 11, 1, 1);
    m_a = ns_page(ITEM_V0[m_item], m_val, 4);
    for (m_i = 0; m_i < 4 && m_a + m_i < ITEM_V0[m_item] + ITEM_VN[m_item]; m_i++) {
        m_j = m_a + m_i;
        m_y = 13 + m_i * 10;
        if (m_j == m_val) rect_oled(0, m_y - 2, 128, 11, 1, 1);
        print(6, m_y, 0, m_j != m_val, VAL_NAME[m_j]);
        line_oled(0, m_y + 9, 127, m_y + 9, 1, 1);
    }
    ns_vfoot(55);
}`,

  cards: NS_COMMON + `// ---------- style: Two Cards
function st_cats() {
    cls_oled(0);
    m_a = ns_page(0, m_cat, 2);
    for (m_i = 0; m_i < 2 && m_a + m_i < N_CAT; m_i++) {
        m_j = m_a + m_i;
        m_y = 2 + m_i * 32;
        rect_oled(2, m_y, 124, 29, m_j == m_cat, 1);
        print(7, m_y + 4, 0, m_j != m_cat, CAT_NAME[m_j]);
        num(7, m_y + 16, 0, m_j != m_cat, CAT_COUNT[m_j]);
        m_x = 7 + nb_count(CAT_COUNT[m_j]) * 7 + 5;
        print(m_x, m_y + 16, 0, m_j != m_cat, TX[TX_MODS]);
    }
}

function st_items() {
    cls_oled(0);
    m_a = ns_page(m_first(), m_item, 2);
    for (m_i = 0; m_i < 2 && m_a + m_i <= m_last(); m_i++) {
        m_j = m_a + m_i;
        m_y = 2 + m_i * 32;
        rect_oled(2, m_y, 124, 29, m_j == m_item, 1);
        print(7, m_y + 4, 0, m_j != m_item, ITEM_NAME[m_j]);
        print(7, m_y + 16, 0, m_j != m_item, opt_s(m_j));
    }
}

function st_vals() {
    cls_oled(0);
    m_a = ns_page(ITEM_V0[m_item], m_val, 2);
    for (m_i = 0; m_i < 2 && m_a + m_i < ITEM_V0[m_item] + ITEM_VN[m_item]; m_i++) {
        m_j = m_a + m_i;
        m_y = 2 + m_i * 32;
        rect_oled(2, m_y, 124, 29, m_j == m_val, 1);
        print(7, m_y + 4, 0, m_j != m_val, VAL_NAME[m_j]);
        num(7, m_y + 16, 0, m_j != m_val, VL[m_j]);
    }
}`,
};

const ENGINE = `// ---------- save / load (bit packed into SPVAR_1..)
function sv_bits(f_n) {
    sv_t = 0;
    while (f_n > 0) { sv_t++; f_n = f_n >> 1; }
    if (sv_t == 0) sv_t = 1;
    return sv_t;
}

function sv_put(f_v, f_lo, f_hi) {
    sv_n = sv_bits(f_hi - f_lo);
    f_v = clamp(f_v, f_lo, f_hi) - f_lo;
    for (sv_i = 0; sv_i < sv_n; sv_i++) {
        if (test_bit(f_v, sv_i)) sv_acc = sv_acc | (1 << sv_bit);
        sv_bit++;
        if (sv_bit >= 31) { set_pvar(sv_slot, sv_acc); sv_slot++; sv_bit = 0; sv_acc = 0; }
    }
}

function sv_get(f_lo, f_hi) {
    sv_n = sv_bits(f_hi - f_lo);
    sv_v = 0;
    for (sv_i = 0; sv_i < sv_n; sv_i++) {
        if (sv_bit == 0) sv_acc = get_pvar(sv_slot, 0, 2147483647, 0);
        if (test_bit(sv_acc, sv_bit)) sv_v = sv_v | (1 << sv_i);
        sv_bit++;
        if (sv_bit >= 31) { sv_slot++; sv_bit = 0; }
    }
    return sv_v + f_lo;
}

@@SAVELOAD@@

// ---------- navigation
// True on a press, then repeatedly while the button is held.
function m_rep_press(f_btn) {
    if (event_press(f_btn)) { m_rep = 0; return 1; }
    if (get_ival(f_btn) && get_ptime(f_btn) > 380) {
        m_rep += get_rtime();
        if (m_rep >= 90) { m_rep = 0; return 1; }
    }
    return 0;
}

function m_fx(f_on) {
    if (!MENU_RUMBLE) return;
    if (f_on) combo_run(m_tick);
    else combo_run(m_tick2);
}

function m_open_menu() {
    m_open = 1;
    m_dirty = 1;
    m_msg = 0;
    if (MENU_FLAT) { m_lvl = 2; m_item = 0; m_cat = 0; }
    else m_lvl = 1;
    m_boot = 0;
    m_fx(1);
    m_led();
}

// Shows a short message on the OLED (f_num < 0 hides the number).
function m_pop(f_str, f_len, f_num) {
    m_pstr = f_str;
    m_plen = f_len;
    m_pnum = f_num;
    m_plen2 = 0;
    m_msg = MSG_MS;
    m_dirty = 1;
}

// Two-line message: a name and its new state.
function m_pop2(f_str, f_len, f_str2, f_len2) {
    m_pop(f_str, f_len, -1);
    m_pstr2 = f_str2;
    m_plen2 = f_len2;
}

function m_close_menu() {
    m_save();
    m_open = 0;
    m_lvl = 0;
    m_plen = 0;
    m_msg = MSG_MS;
    m_dirty = 1;
    m_fx(1);
    m_led();
}`;

const ENGINE_INPUT = `

function m_input() {
    if (m_lvl == 1) {
        if (m_rep_press(PS4_UP)) { m_cat--; if (m_cat < 0) m_cat = N_CAT - 1; m_dirty = 1; }
        if (m_rep_press(PS4_DOWN)) { m_cat++; if (m_cat >= N_CAT) m_cat = 0; m_dirty = 1; }
        if (event_press(PS4_CROSS)) { m_lvl = 2; m_item = CAT_FIRST[m_cat]; m_dirty = 1; }
        else if (event_press(PS4_CIRCLE)) m_close_menu();
    } else if (m_lvl == 2) {
        if (m_rep_press(PS4_UP)) { m_item--; if (m_item < m_first()) m_item = m_last(); m_dirty = 1; }
        if (m_rep_press(PS4_DOWN)) { m_item++; if (m_item > m_last()) m_item = m_first(); m_dirty = 1; }
        if (m_rep_press(PS4_RIGHT)) {
            ST[m_item]++;
            if (ST[m_item] >= ITEM_OPTN[m_item]) ST[m_item] = 0;
            m_dirty = 1;
            m_fx(ST[m_item]);
        }
        if (m_rep_press(PS4_LEFT)) {
            ST[m_item]--;
            if (ST[m_item] < 0) ST[m_item] = ITEM_OPTN[m_item] - 1;
            m_dirty = 1;
            m_fx(ST[m_item]);
        }
        if (event_press(PS4_CROSS) && ITEM_VN[m_item] > 0) { m_lvl = 3; m_val = ITEM_V0[m_item]; m_dirty = 1; }
        else if (event_press(PS4_CIRCLE)) {
            if (MENU_FLAT) m_close_menu();
            else { m_lvl = 1; m_cat = ITEM_CAT[m_item]; m_dirty = 1; }
        }
    } else if (m_lvl == 3) {
        if (m_rep_press(PS4_UP)) { m_val--; if (m_val < ITEM_V0[m_item]) m_val = ITEM_V0[m_item] + ITEM_VN[m_item] - 1; m_dirty = 1; }
        if (m_rep_press(PS4_DOWN)) { m_val++; if (m_val >= ITEM_V0[m_item] + ITEM_VN[m_item]) m_val = ITEM_V0[m_item]; m_dirty = 1; }
        m_t = VAL_STEP[m_val];
        if (get_ival(MENU_FAST)) m_t = VAL_BIG[m_val];
        if (m_rep_press(PS4_RIGHT)) { VL[m_val] = clamp(VL[m_val] + m_t, VAL_MIN[m_val], VAL_MAX[m_val]); m_dirty = 1; }
        if (m_rep_press(PS4_LEFT)) { VL[m_val] = clamp(VL[m_val] - m_t, VAL_MIN[m_val], VAL_MAX[m_val]); m_dirty = 1; }
        if (event_press(PS4_CIRCLE) || event_press(PS4_CROSS)) { m_lvl = 2; m_dirty = 1; }
    }
}

// ---------- screens
function m_saved() {
    cls_oled(0);
    rect_oled(14, 16, 100, 32, 0, 1);
    rect_oled(16, 18, 96, 28, 0, 1);
    txt_c(23, 1, 1, TX[TX_SAVED], TX_SAVED_N);
}

function m_popup() {
    cls_oled(0);
    rect_oled(6, 10, 116, 44, 0, 1);
    if (m_plen2) {
        txt_c(16, 0, 1, m_pstr, m_plen);
        name_c(29, 1, m_pstr2, m_plen2);
    } else if (m_pnum >= 0) {
        txt_c(17, 0, 1, m_pstr, m_plen);
        num_c(29, 1, 1, m_pnum);
    } else name_c(23, 1, m_pstr, m_plen);
}

function m_draw() {
    if (m_boot > 0 && !m_open) m_boot_draw();
    else if (m_msg > 0 && m_plen) m_popup();
    else if (m_msg > 0) m_saved();
    else if (!m_open) m_home();
    else if (m_lvl == 1) st_cats();
    else if (m_lvl == 2) st_items();
    else st_vals();
}`;

// ---------------------------------------------------------------------- VALUE MENU (the screen where a value is changed)
// A value design replaces only the st_vals() of the menu style. 'std' keeps the style's own screen.
export const VALUE_STYLES = [
  { id: 'std', name: 'MENU STYLE', desc: 'The value screen of the chosen menu style (default).' },
  { id: 'v01', name: 'BIG NUMBER', desc: 'Name on top, the value in big type, a bar and min / max.' },
  { id: 'v02', name: 'BAR FOCUS', desc: 'A wide bar as the main element, the number under it.' },
  { id: 'v03', name: 'SLIDER TRACK', desc: 'A track with a knob that slides to the value.' },
  { id: 'v04', name: 'LEVEL METER', desc: 'A tall meter on the left, the value on the right.' },
  { id: 'v05', name: 'SEGMENTS', desc: 'Twenty blocks, the filled ones show the value.' },
  { id: 'v06', name: 'STEPPER', desc: 'Arrows on both sides, the step size shown under the number.' },
  { id: 'v07', name: 'MIN MAX ENDS', desc: 'The number in big type, a line with a pointer and the ends.' },
  { id: 'v08', name: 'NAME PILL', desc: 'The value name in a filled pill, the number under it.' },
  { id: 'v09', name: 'NOW VS DEFAULT', desc: 'Current value next to the default value, and the bar.' },
  { id: 'v10', name: 'PERCENT', desc: 'The position of the value as a percent (0 to 100), and the bar.' },
  { id: 'v11', name: 'RULER', desc: 'A ruler with ticks, a pointer shows the value.' },
  { id: 'v12', name: 'SPLIT PANEL', desc: 'Min and max on the left, the value on the right of a divider.' },
  { id: 'v13', name: 'INVERTED FULL', desc: 'White screen, black value and a black progress bar.' },
  { id: 'v14', name: 'FRAME NUMBER', desc: 'The value inside a double frame, min and max at the bottom.' },
  { id: 'v15', name: 'GAUGE', desc: 'Ticks above a bar, the value in big type below.' },
  { id: 'v16', name: 'NEIGHBOURS', desc: 'The value in big type with the previous and next value names.' },
  { id: 'v17', name: 'DUAL BARS', desc: 'Two bars: the current value and the default value.' },
  { id: 'v18', name: 'MINIMAL LINE', desc: 'Name, number and a thin line with a filled part.' },
];

// Helpers for the value designs (vs_ names, so they never clash with the style helpers).
const VS_COMMON = `// ---------- value screen helpers (vs_)
// Sets m_n to the value's position on a bar f_w px long (0 at the minimum).
function vs_pos(f_w) {
    m_n = 0;
    if (VAL_MAX[m_val] > VAL_MIN[m_val]) m_n = ((VL[m_val] - VAL_MIN[m_val]) * f_w) / (VAL_MAX[m_val] - VAL_MIN[m_val]);
}

// Header with the mod name and a line under it.
function vs_head() {
    cls_oled(0);
    txt_c(2, 0, 1, ITEM_NAME[m_item], ITEM_LEN[m_item]);
    line_oled(0, 11, 127, 11, 1, 1);
}

// Min and max on the bottom line, left and right.
function vs_range(f_y) {
    num(4, f_y, 0, 1, VAL_MIN[m_val]);
    num_r(124, f_y, 0, 1, VAL_MAX[m_val]);
}
`;

const VALUE_CODE = {
  v01: `// ---------- value: Big Number
function st_vals() {
    vs_head();
    txt_c(15, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    num_c(26, 2, 1, VL[m_val]);
    bar(14, 48, 100, 5, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
    vs_range(56);
}`,
  v02: `// ---------- value: Bar Focus
function st_vals() {
    vs_head();
    txt_c(16, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    bar(8, 26, 112, 14, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
    num_c(46, 0, 1, VL[m_val]);
    vs_range(56);
}`,
  v03: `// ---------- value: Slider Track
function st_vals() {
    vs_head();
    txt_c(15, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    num_c(24, 1, 1, VL[m_val]);
    line_oled(8, 44, 120, 44, 1, 1);
    vs_pos(112);
    rect_oled(6 + m_n, 39, 5, 11, 1, 1);
    vs_range(56);
}`,
  v04: `// ---------- value: Level Meter
function st_vals() {
    cls_oled(0);
    txt_c(2, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    line_oled(0, 11, 127, 11, 1, 1);
    vs_pos(44);
    rect_oled(8, 15, 14, 47, 0, 1);
    rect_oled(10, 60 - m_n, 10, m_n, 1, 1);
    num(28, 22, 2, 1, VL[m_val]);
    num(28, 56, 0, 1, VAL_MIN[m_val]);
    num_r(124, 56, 0, 1, VAL_MAX[m_val]);
}`,
  v05: `// ---------- value: Segments
function st_vals() {
    vs_head();
    txt_c(15, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    m_n = ((VL[m_val] - VAL_MIN[m_val]) * 20) / (VAL_MAX[m_val] - VAL_MIN[m_val]);
    for (m_i = 0; m_i < 20; m_i++) rect_oled(4 + m_i * 6, 26, 5, 9, m_i < m_n, 1);
    num_c(40, 1, 1, VL[m_val]);
    vs_range(56);
}`,
  v06: `// ---------- value: Stepper
function st_vals() {
    vs_head();
    txt_c(15, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    print(6, 28, 1, 1, TX[TX_PREV]);
    print(114, 28, 1, 1, TX[TX_NEXT]);
    num_c(24, 2, 1, VL[m_val]);
    num_c(55, 0, 1, VAL_STEP[m_val]);
    vs_range(56);
}`,
  v07: `// ---------- value: Min Max Ends
function st_vals() {
    vs_head();
    txt_c(15, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    num_c(26, 2, 1, VL[m_val]);
    line_oled(8, 48, 120, 48, 1, 1);
    vs_pos(112);
    rect_oled(8 + m_n, 44, 3, 8, 1, 1);
    vs_range(55);
}`,
  v08: `// ---------- value: Name Pill
function st_vals() {
    vs_head();
    m_n = VAL_LEN[m_val] * 7 + 10;
    rect_oled(64 - m_n / 2, 15, m_n, 11, 1, 1);
    txt_c(17, 0, 0, VAL_NAME[m_val], VAL_LEN[m_val]);
    num_c(32, 2, 1, VL[m_val]);
    vs_range(56);
}`,
  v09: `// ---------- value: Now vs Default
function st_vals() {
    vs_head();
    txt_c(15, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    num(10, 30, 1, 1, VL[m_val]);
    print(60, 30, 1, 1, TX[TX_SLASH]);
    num_r(118, 30, 1, 1, VAL_DEF[m_val]);
    bar(14, 48, 100, 5, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
    vs_range(56);
}`,
  v10: `// ---------- value: Percent
function st_vals() {
    vs_head();
    txt_c(15, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    m_n = ((VL[m_val] - VAL_MIN[m_val]) * 100) / (VAL_MAX[m_val] - VAL_MIN[m_val]);
    num_c(26, 2, 1, m_n);
    bar(14, 48, 100, 5, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
    vs_range(56);
}`,
  v11: `// ---------- value: Ruler
function st_vals() {
    vs_head();
    txt_c(15, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    num_c(22, 1, 1, VL[m_val]);
    vs_pos(120);
    rect_oled(4 + m_n, 38, 3, 7, 1, 1);
    line_oled(4, 46, 124, 46, 1, 1);
    for (m_i = 0; m_i <= 24; m_i++) {
        m_j = 4 + m_i * 5;
        if (m_i % 4 == 0) line_oled(m_j, 46, m_j, 53, 1, 1);
        else line_oled(m_j, 46, m_j, 49, 1, 1);
    }
    vs_range(56);
}`,
  v12: `// ---------- value: Split Panel
function st_vals() {
    cls_oled(0);
    txt_c(2, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    line_oled(0, 11, 127, 11, 1, 1);
    line_oled(64, 14, 64, 63, 1, 1);
    num(6, 22, 1, 1, VAL_MIN[m_val]);
    num(6, 44, 1, 1, VAL_MAX[m_val]);
    num(70, 30, 1, 1, VL[m_val]);
}`,
  v13: `// ---------- value: Inverted Full
function st_vals() {
    cls_oled(1);
    txt_c(3, 0, 0, VAL_NAME[m_val], VAL_LEN[m_val]);
    line_oled(0, 13, 127, 13, 1, 0);
    num_c(24, 2, 0, VL[m_val]);
    rect_oled(12, 50, 104, 7, 0, 0);
    vs_pos(100);
    rect_oled(14, 52, m_n, 3, 1, 0);
}`,
  v14: `// ---------- value: Frame Number
function st_vals() {
    cls_oled(0);
    rect_oled(0, 0, 128, 64, 0, 1);
    rect_oled(3, 3, 122, 58, 0, 1);
    txt_c(7, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    line_oled(3, 18, 124, 18, 1, 1);
    num_c(26, 2, 1, VL[m_val]);
    line_oled(3, 50, 124, 50, 1, 1);
    num(7, 53, 0, 1, VAL_MIN[m_val]);
    num_r(121, 53, 0, 1, VAL_MAX[m_val]);
}`,
  v15: `// ---------- value: Gauge
function st_vals() {
    cls_oled(0);
    txt_c(2, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    line_oled(0, 11, 127, 11, 1, 1);
    for (m_i = 0; m_i <= 10; m_i++) {
        m_j = 10 + m_i * 11;
        line_oled(m_j, 16, m_j, 19, 1, 1);
    }
    bar(10, 23, 108, 8, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
    num_c(38, 2, 1, VL[m_val]);
}`,
  v16: `// ---------- value: Neighbours
function st_vals() {
    cls_oled(0);
    txt_c(2, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    line_oled(0, 11, 127, 11, 1, 1);
    num_c(16, 2, 1, VL[m_val]);
    if (m_val > ITEM_V0[m_item]) {
        print(4, 40, 0, 1, TX[TX_PREV]);
        print(14, 40, 0, 1, VAL_NAME[m_val - 1]);
    }
    if (m_val < ITEM_V0[m_item] + ITEM_VN[m_item] - 1) {
        print(4, 50, 0, 1, TX[TX_NEXT]);
        print(14, 50, 0, 1, VAL_NAME[m_val + 1]);
    }
}`,
  v17: `// ---------- value: Dual Bars
function st_vals() {
    vs_head();
    num(4, 16, 0, 1, VL[m_val]);
    num_r(124, 16, 0, 1, VAL_DEF[m_val]);
    bar(4, 26, 120, 6, VL[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
    bar(4, 38, 120, 6, VAL_DEF[m_val], VAL_MIN[m_val], VAL_MAX[m_val]);
    txt_c(50, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
}`,
  v18: `// ---------- value: Minimal Line
function st_vals() {
    cls_oled(0);
    txt_c(4, 0, 1, VAL_NAME[m_val], VAL_LEN[m_val]);
    num_c(18, 2, 1, VL[m_val]);
    line_oled(8, 46, 120, 46, 1, 1);
    vs_pos(112);
    rect_oled(8, 44, m_n, 5, 1, 1);
    vs_range(56);
}`,
};

/** The style's source with the chosen value screen in place of its own st_vals(). */
function styleSource(styleId, valueId) {
  const base = STYLE_CODE[styleId];
  if (!VALUE_CODE[valueId]) return base;
  return base.replace('function st_vals()', 'function st_vals_style()') + '\n\n' + VS_COMMON + VALUE_CODE[valueId];
}

// ---------------------------------------------------------------------- generator

const btnName = (b) => String(b).replace(/^PS4_/, '').replace('OPTIONS', 'OPT').replace('TRIANGLE', 'TRI').replace('CIRCLE', 'CIR').replace('SQUARE', 'SQR');

/**
 * opts: {
 *   name, logoBitmap, logoExport, style, flat, combo, fast, rumble,
 *   model (categories/items/values), selection (mods), modLogic,
 *   profiles: { count, names[], hold, press },
 *   quick: [{ key, hold, press }], quickSave,
 *   screen: { boot, bootMs, home, saver, saverSec, led: { on, profiles[], menu, kill } }
 * }
 * Returns { code, stats }.
 */
export function generateMenuScript(opts) {
  const style = MENU_STYLES.find((s) => s.id === opts.style) ?? MENU_STYLES[0];
  const combo = MENU_COMBOS.find((c) => c.id === opts.combo) ?? MENU_COMBOS[0];
  const fast = FAST_BUTTONS.find((b) => b.id === opts.fast) ?? FAST_BUTTONS[0];
  const flat = style.grouped ? false : (opts.flat ?? style.flat);
  const t = flattenModel(opts.model ?? DEMO_MODEL);
  if (!t.items.length) throw new Error('The menu needs at least one mod.');
  const killBtn = combo.press === 'PS4_SHARE' ? 'PS4_TOUCH' : 'PS4_SHARE';
  const mods = composeMods(t, { selection: opts.selection, killBtn });

  const prof = { ...PROFILE_DEFAULTS, ...(opts.profiles ?? {}) };
  const P = Math.min(3, Math.max(1, Math.trunc(prof.count) || 1));
  const profNames = Array.from({ length: P }, (_, i) => ascii(prof.names?.[i] || PROFILE_DEFAULTS.names[i]).toUpperCase().slice(0, 12) || `PROFILE ${i + 1}`);
  const profSwitch = P > 1 && prof.hold && prof.press && prof.hold !== prof.press;

  const quick = (opts.quick ?? [])
    .map((q) => ({ ...q, item: t.items.findIndex((it) => it.key === q.key) }))
    .filter((q) => q.item >= 0 && q.hold && q.press && q.hold !== q.press)
    .slice(0, 8);

  const scr = { ...SCREEN_DEFAULTS, ...(opts.screen ?? {}), led: { ...SCREEN_DEFAULTS.led, ...(opts.screen?.led ?? {}) } };
  const saverMs = Math.max(0, Math.trunc((opts.screen?.saverSec ?? (opts.saverMs != null ? opts.saverMs / 1000 : scr.saverSec)) * 1000));
  const bootModes = ['static', 'wipe', 'flash', 'title'];
  const bootMode = Math.max(0, bootModes.indexOf(scr.boot));
  const bootMs = bootMode ? Math.min(6000, Math.max(300, Math.trunc(scr.bootMs))) : 0;
  const homeMode = Math.max(0, HOME_MODES.findIndex(([id]) => id === scr.home));
  const saverMode = scr.saver === 'move' ? 2 : 1;
  const colorIdx = (id) => Math.max(0, LED_COLORS.findIndex(([c]) => c === id));
  const ledOn = scr.led.on !== false;

  const bits = saveBits(t, P);
  const slots = Math.ceil(bits / 31);
  const maxSlots = 64 - (mods?.reserve ?? 0);
  if (slots > maxSlots) throw new Error(`Too many saved settings (${slots} SPVARs needed, ${maxSlots} available). Remove some mods, values or profiles.`);
  const title = ascii(opts.name).toUpperCase().slice(0, 17) || 'MY SCRIPT';
  const sig = hash8(JSON.stringify([P, t.items.map((i) => [i.name, i.optn, i.glob]), t.vals.map((v) => [v.min, v.max])]));
  const ident = gpcIdent(opts.name, 'MY_SCRIPT');

  const TX = ['SAVED', 'X: EDIT', 'X: OPEN', '<', '>', '/', 'MODS', 'MODS ON', 'MODS OFF', `${btnName(combo.hold)}+${btnName(combo.press)}: MENU`];
  const TX_NAMES = ['SAVED', 'EDIT', 'OPEN', 'PREV', 'NEXT', 'SLASH', 'MODS', 'MODSON', 'MODSOFF', 'HINT'];
  const modStrings = Object.entries(mods?.strings ?? {});
  const txBase = TX.length;
  TX.push(...modStrings.map(([, s]) => s));
  // Tab labels: the first word of the category, cut to what fits in the tab width.
  const tabs = t.cats.map((c) => {
    const w = Math.max(1, Math.min(6, Math.floor((128 / t.cats.length - 2) / 7)));
    return (c.name.split(/\s+/)[0] || c.name).slice(0, w);
  });

  // Logo (the text logo is passed in as a bitmap too) with invert support for the flash boot.
  let logoCode = '';
  let logoDraw = 'm_title_screen';
  if (opts.logoBitmap) {
    const ex = exportBitmap(opts.logoBitmap, { ...(opts.logoExport ?? {}), invertSupport: true, name: `${ident}_LOGO` });
    logoCode = ex.code;
    logoDraw = ex.draw;
  }
  const killRef = mods ? 'k_kill' : '0';

  const screenCode = `// ---------- screens: home, boot animation, LED
function m_title_screen(f_inv) {
    cls_oled(f_inv);
    name_c(22, !f_inv, TITLE[0], TITLE_LEN);
}

function m_home() {
    if (HOME_MODE == 3) { cls_oled(0); return; }
    if (HOME_MODE == 2) {
        cls_oled(0);
        rect_oled(0, 0, 128, 64, 0, 1);
        name_c(4, 1, TITLE[0], TITLE_LEN);
        line_oled(4, 25, 123, 25, 1, 1);
        ${P > 1 ? 'txt_c(29, 0, 1, PROF_NAME[m_prof], PROF_LEN[m_prof]);' : ''}
        if (${killRef}) txt_c(40, 0, 1, TX[TX_MODSOFF], ${'MODS OFF'.length});
        else txt_c(40, 0, 1, TX[TX_MODSON], ${'MODS ON'.length});
        txt_c(52, 0, 1, TX[TX_HINT], TX_HINT_N);
        return;
    }
    ${logoDraw}(0);
    if (HOME_MODE == 1) {
        rect_oled(0, 53, 128, 11, 1, 1);
        ${P > 1 ? 'txt_c(54, 0, 0, PROF_NAME[m_prof], PROF_LEN[m_prof]);' : 'txt_c(54, 0, 0, TITLE[0], TITLE_LEN);'}
    }
}

function m_boot_draw() {
    if (BOOT_MODE == 1) {
        ${logoDraw}(0);
        m_lc = (64 * m_boot) / BOOT_MS;
        if (m_lc > 0) rect_oled(0, 64 - m_lc, 128, m_lc, 1, 0);
    } else if (BOOT_MODE == 2) ${logoDraw}((m_boot / 180) % 2);
    else if (m_boot > BOOT_MS / 2) m_title_screen(0);
    else ${logoDraw}(0);
}

function m_led() {
    if (!LED_ON) return;
    if (m_open) m_lc = LED_MENU;
    else if (${killRef}) m_lc = LED_KILL;
    else m_lc = PROF_LED[m_prof];
    set_rgb(LED_RGB[m_lc * 3], LED_RGB[m_lc * 3 + 1], LED_RGB[m_lc * 3 + 2]);
}`;

  const quickCode = quick.length ? `// ---------- quick toggles (hold + press, outside the menu)
function qt_run() {
    for (m_j = 0; m_j < QT_N; m_j++) {
        if (get_ival(QT_HOLD[m_j]) && event_press(QT_PRESS[m_j])) {
            m_i = QT_ITEM[m_j];
            if (ST[m_i]) { QT_LAST[m_j] = ST[m_i]; ST[m_i] = 0; }
            else ST[m_i] = max(1, QT_LAST[m_j]);
            m_fx(ST[m_i]);
            m_pop2(ITEM_NAME[m_i], ITEM_LEN[m_i], opt_s(m_i), opt_n(m_i));
            if (QT_SAVE) m_save();
        }
        if (get_ival(QT_HOLD[m_j])) set_val(QT_PRESS[m_j], 0);
    }
}` : '';

  const lines = [];
  lines.push(
    '/*',
    `    ${title}`,
    '    Made with ASTRO APP - MAKE YOUR GPC',
    '',
    `    Menu style : ${style.name}`,
    `    Open menu  : hold ${combo.name.split(' + ')[0]} and press ${combo.name.split(' + ')[1]}`,
    '    Navigate   : UP / DOWN select, LEFT / RIGHT change, CROSS edit values, CIRCLE back',
    `    Big steps  : hold ${fast.name} while changing a value`,
    ...(P > 1 ? [`    Profiles   : ${profNames.join(', ')}${profSwitch ? ` - hold ${btnName(prof.hold)} + press ${btnName(prof.press)}` : ''}, or TRIANGLE in the menu`] : []),
    ...(mods ? [`    Kill switch: hold ADS + press ${btnName(killBtn)} (when the KILL SWITCH mod is on)`] : []),
    ...quick.map((q) => `    Quick      : hold ${btnName(q.hold)} + press ${btnName(q.press)} toggles ${t.items[q.item].name}`),
    '    Settings are saved when the menu closes.',
    '*/',
    '',
    `define MENU_HOLD   = ${combo.hold};`,
    `define MENU_PRESS  = ${combo.press};`,
    `define MENU_FAST   = ${fast.id};`,
    `define MENU_FLAT   = ${flat ? 1 : 0};`,
    `define MENU_RUMBLE = ${opts.rumble === false ? 0 : 1};`,
    `define SAVER_MS    = ${saverMs};`,
    `define SAVER_MODE  = ${saverMode};`,
    `define BOOT_MODE   = ${bootMode};`,
    `define BOOT_MS     = ${Math.max(1, bootMs)};`,
    `define HOME_MODE   = ${homeMode};`,
    `define LED_ON      = ${ledOn ? 1 : 0};`,
    `define LED_MENU    = ${colorIdx(scr.led.menu)};`,
    `define LED_KILL    = ${colorIdx(scr.led.kill)};`,
    'define MSG_MS      = 900;',
    `define SAVE_SIG    = ${sig};`,
    `define PROF_N      = ${P};`,
    `define N_CAT       = ${t.cats.length};`,
    `define N_ITEM      = ${t.items.length};`,
    `define N_ITEM_A    = ${t.items.length};`,
    `define N_VAL       = ${t.vals.length};`,
    `define N_VAL_A     = ${Math.max(1, t.vals.length)};`,
    `define TITLE_LEN   = ${title.length};`,
    ...TX_NAMES.map((n, i) => `define TX_${n} = ${i};`),
    `define TX_SAVED_N = ${TX[0].length};`,
    `define TX_EDIT_N  = ${TX[1].length};`,
    `define TX_OPEN_N  = ${TX[2].length};`,
    `define TX_HINT_N  = ${TX[9].length};`,
    ...modStrings.map(([k, s], i) => `define TXM_${k} = ${txBase + i};\ndefine TXM_${k}_N = ${s.length};`),
    ...(mods ? [`define KILL_BTN    = ${killBtn};`] : []),
    ...(profSwitch ? [`define PROF_HOLD   = ${prof.hold};`, `define PROF_PRESS  = ${prof.press};`] : []),
    ...(quick.length ? [`define QT_N        = ${quick.length};`, `define QT_SAVE     = ${opts.quickSave === false ? 0 : 1};`] : []),
    '',
    '// ---------- menu data (generated)',
    `const string TITLE[] = {${q(title)}};`,
    strArr('TX', TX),
    strArr('CAT_NAME', t.cats.map((c) => c.name)),
    numArr('CAT_LEN', 'uint8', t.cats.map((c) => c.name.length)),
    numArr('CAT_FIRST', 'uint8', t.cats.map((c) => c.first)),
    numArr('CAT_COUNT', 'uint8', t.cats.map((c) => c.count)),
  );
  if (style.id === 'tabs') lines.push(strArr('CAT_TAB', tabs), numArr('CAT_TAB_LEN', 'uint8', tabs.map((s) => s.length)));
  lines.push(
    strArr('ITEM_NAME', t.items.map((i) => i.name)),
    numArr('ITEM_LEN', 'uint8', t.items.map((i) => i.name.length)),
    numArr('ITEM_CAT', 'uint8', t.items.map((i) => i.cat)),
    numArr('ITEM_OPT0', 'uint16', t.items.map((i) => i.opt0)), // option index: more than 255 options in all
    numArr('ITEM_OPTN', 'uint8', t.items.map((i) => i.optn)),
    numArr('ITEM_DEF', 'uint8', t.items.map((i) => i.def)),
    numArr('ITEM_V0', 'uint8', t.items.map((i) => i.v0)),
    numArr('ITEM_VN', 'uint8', t.items.map((i) => i.vn)),
    strArr('OPT_NAME', t.opts),
    numArr('OPT_LEN', 'uint8', t.opts.map((o) => o.length)),
    t.vals.length ? strArr('VAL_NAME', t.vals.map((v) => v.name)) : 'const string VAL_NAME[] = {"-"};',
    numArr('VAL_LEN', 'uint8', t.vals.map((v) => v.name.length)),
    numArr('VAL_MIN', 'int16', t.vals.map((v) => v.min)),
    numArr('VAL_MAX', 'int16', t.vals.map((v) => v.max)),
    numArr('VAL_DEF', 'int16', t.vals.map((v) => v.def)),
    numArr('VAL_STEP', 'int16', t.vals.map((v) => v.step)),
    numArr('VAL_BIG', 'int16', t.vals.map((v) => v.big)),
    numArr('LED_RGB', 'uint8', LED_COLORS.flatMap(([, , rgb]) => rgb)),
    numArr('PROF_LED', 'uint8', Array.from({ length: P }, (_, i) => colorIdx(scr.led.profiles?.[i] ?? SCREEN_DEFAULTS.led.profiles[i]))),
  );
  if (P > 1) {
    const valGlob = [];
    for (const it of t.items) for (let k = 0; k < it.vn; k++) valGlob.push(it.glob ? 1 : 0);
    lines.push(
      strArr('PROF_NAME', profNames),
      numArr('PROF_LEN', 'uint8', profNames.map((n) => n.length)),
      numArr('ITEM_GLOB', 'uint8', t.items.map((i) => (i.glob ? 1 : 0))),
      numArr('VAL_GLOB', 'uint8', valGlob),
    );
  }
  if (quick.length) {
    lines.push(
      numArr('QT_ITEM', 'uint8', quick.map((q) => q.item)),
      numArr('QT_HOLD', 'uint8', quick.map((q) => q.hold)),
      numArr('QT_PRESS', 'uint8', quick.map((q) => q.press)),
    );
  }
  lines.push('', ENGINE_VARS);
  if (P > 1) lines.push(`int PST[${t.items.length * P}];`, `int PVL[${Math.max(1, t.vals.length) * P}];`);
  if (quick.length) lines.push(`int QT_LAST[${quick.length}];`);
  lines.push('');
  if (mods) lines.push(mods.runtime, '', '// ---------- mod variables', mods.vars, '');
  if (logoCode) lines.push('// ---------- logo', logoCode, '');
  lines.push(HELPERS, '', styleSource(style.id, opts.valueStyle ?? 'std'), '', screenCode, '', ENGINE.replace('@@SAVELOAD@@', saveLoadCode(P)), ENGINE_INPUT, '');
  if (quickCode) lines.push(quickCode, '');
  if (mods) lines.push('// ---------- mod functions', mods.funcs, '');
  lines.push(
    'init {',
    '    m_load();',
    ...(quick.length ? ['    for (m_j = 0; m_j < QT_N; m_j++) QT_LAST[m_j] = 1;'] : []),
    ...(mods?.init ? mods.init.split('\n').map((l) => `    ${l}`) : []),
    '    m_boot = BOOT_MS;',
    '    if (BOOT_MODE == 0) m_boot = 0;',
    '    m_dirty = 1;',
    '    m_led();',
    '}',
    '',
    'main {',
    '    if (!m_open) {',
    '        if (get_ival(MENU_HOLD) && event_press(MENU_PRESS)) m_open_menu();',
    '        if (get_ival(MENU_HOLD)) set_val(MENU_PRESS, 0);',
    ...(profSwitch ? [
      '        if (get_ival(PROF_HOLD) && event_press(PROF_PRESS)) pf_switch((m_prof + 1) % PROF_N);',
      '        if (get_ival(PROF_HOLD)) set_val(PROF_PRESS, 0);',
    ] : []),
    ...(quick.length ? ['        qt_run();'] : []),
    '    } else {',
    '        block_all_inputs();',
    '        if (get_ival(MENU_HOLD) && event_press(MENU_PRESS)) m_close_menu();',
    ...(P > 1 ? ['        else if (event_press(PS4_TRIANGLE)) pf_switch((m_prof + 1) % PROF_N);'] : []),
    '        else m_input();',
    '    }',
    '',
    '    // boot animation',
    '    if (m_boot > 0) {',
    '        m_boot -= get_rtime();',
    '        m_btmr += get_rtime();',
    '        if (m_boot <= 0) { m_boot = 0; m_dirty = 1; }',
    '        else if (m_btmr >= 40) { m_btmr = 0; m_dirty = 1; }',
    '    }',
    '    if (m_msg > 0) {',
    '        m_msg -= get_rtime();',
    '        if (m_msg <= 0) { m_msg = 0; m_plen = 0; m_dirty = 1; }',
    '    }',
    '    if (m_dirty) {',
    '        m_dirty = 0;',
    '        m_draw();',
    '        m_saver = 0;',
    '    } else if (!m_open && m_msg == 0 && m_boot == 0 && SAVER_MS > 0 && HOME_MODE != 3) {',
    '        if (m_saver < SAVER_MS) {',
    '            m_saver += get_rtime();',
    '            if (m_saver >= SAVER_MS) { cls_oled(0); m_stmr = 0; }',
    '        } else if (SAVER_MODE == 2) {',
    '            m_stmr += get_rtime();',
    '            if (m_stmr >= 1500) {',
    '                m_stmr = 0;',
    '                cls_oled(0);',
    '                print(random(0, 127 - TITLE_LEN * 7), random(0, 53), 0, 1, TITLE[0]);',
    '            }',
    '        }',
    '    }',
    '',
    '    if (!m_open) {',
    '        // ---------- mods',
    ...(mods ? mods.logic.split('\n').map((l) => `        ${l}`) : []),
    ...(opts.modLogic ? String(opts.modLogic).split('\n').map((l) => `        ${l}`) : []),
    '    }',
    '}',
    '',
    ...(mods?.combos ? [mods.combos, ''] : []),
    'combo m_tick {',
    '    set_rumble(RUMBLE_A, 45);',
    '    wait(70);',
    '    reset_rumble();',
    '}',
    '',
    'combo m_tick2 {',
    '    set_rumble(RUMBLE_B, 60);',
    '    wait(50);',
    '    reset_rumble();',
    '    wait(60);',
    '    set_rumble(RUMBLE_B, 60);',
    '    wait(50);',
    '    reset_rumble();',
    '}',
    '',
  );
  return {
    code: lines.join('\n'),
    stats: { items: t.items.length, values: t.vals.length, bits, slots, maxSlots, sig, flat, killBtn: mods ? killBtn : null, profiles: P, quick: quick.length },
  };
}

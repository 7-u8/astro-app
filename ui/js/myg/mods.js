// MODS catalogue: every mod the builder can add, with its menu entry and its GPC code.
// The code is written for ASTRO APP (patterns learned from public scripts, not copied).
//
// Placeholders in code strings, replaced by composeMods():
//   {ST}        state of the mod (ST[n]); 0 = OFF, 1.. = the chosen option
//   {V.id}      current value (VL[n]);   {VI.id} its index n (for VL[{VI.id} + k] tables)
//   {TX.KEY}    a UI string (TX[TXM_KEY]);  {TXN.KEY} its length
//   {KILL_BTN}  the button used by the kill switch combo
//   {BTN}       the button the user picked for a mod with `btn` (its option decides it)
//   {LAYOUT_CUSTOM} the custom button row from the app

export const MOD_CATEGORIES = ['AIM ASSIST', 'ANTI RECOIL', 'SHOOTING', 'MOVEMENT', 'CONTROLLER', 'HERO MODS', 'UTILITY'];
import { COD_MODS } from './mods-cod.js';
import { OW_MODS } from './mods-ow.js';
import { FORTNITE_MODS } from './mods-fortnite.js';
import { FORTNITE_MODS_EXTRA } from './mods-fortnite-extra.js';
import { FC_MODS } from './mods-fc.js';
import { FC_SKILL_MODS } from './mods-fc-skills.js';
import { FC_MODS_EXTRA } from './mods-fc-extra.js';
import { withButton } from './buttons.js';


export const ACTIONS = ['FIRE', 'ADS', 'JUMP', 'CROUCH', 'SPRINT', 'MELEE', 'RELOAD', 'SWAP', 'TACTICAL', 'LETHAL', 'PING'];
export const PHYSICAL_BUTTONS = [
  ['PS4_R2', 'R2 / RT'], ['PS4_L2', 'L2 / LT'], ['PS4_R1', 'R1 / RB'], ['PS4_L1', 'L1 / LB'],
  ['PS4_CROSS', 'CROSS / A'], ['PS4_CIRCLE', 'CIRCLE / B'], ['PS4_SQUARE', 'SQUARE / X'], ['PS4_TRIANGLE', 'TRIANGLE / Y'],
  ['PS4_R3', 'R3 / RS'], ['PS4_L3', 'L3 / LS'], ['PS4_UP', 'UP'], ['PS4_DOWN', 'DOWN'], ['PS4_LEFT', 'LEFT'], ['PS4_RIGHT', 'RIGHT'],
  ['PS4_TOUCH', 'TOUCHPAD / VIEW'],
];

// FIRE, ADS, JUMP, CROUCH, SPRINT, MELEE, RELOAD, SWAP, TACTICAL, LETHAL, PING
export const LAYOUTS = [
  ['DEFAULT', ['PS4_R2', 'PS4_L2', 'PS4_CROSS', 'PS4_CIRCLE', 'PS4_L3', 'PS4_R3', 'PS4_SQUARE', 'PS4_TRIANGLE', 'PS4_L1', 'PS4_R1', 'PS4_UP']],
  ['TACTICAL', ['PS4_R2', 'PS4_L2', 'PS4_CROSS', 'PS4_R3', 'PS4_L3', 'PS4_CIRCLE', 'PS4_SQUARE', 'PS4_TRIANGLE', 'PS4_L1', 'PS4_R1', 'PS4_UP']],
  ['LEFTY', ['PS4_L2', 'PS4_R2', 'PS4_CROSS', 'PS4_CIRCLE', 'PS4_R3', 'PS4_L3', 'PS4_SQUARE', 'PS4_TRIANGLE', 'PS4_R1', 'PS4_L1', 'PS4_UP']],
  ['BUMPER J', ['PS4_R2', 'PS4_L2', 'PS4_L1', 'PS4_CIRCLE', 'PS4_L3', 'PS4_R3', 'PS4_SQUARE', 'PS4_TRIANGLE', 'PS4_CROSS', 'PS4_R1', 'PS4_UP']],
  ['BUMPER J T', ['PS4_R2', 'PS4_L2', 'PS4_L1', 'PS4_R3', 'PS4_L3', 'PS4_CIRCLE', 'PS4_SQUARE', 'PS4_TRIANGLE', 'PS4_CROSS', 'PS4_R1', 'PS4_UP']],
  ['STICK MOVE', ['PS4_R2', 'PS4_L2', 'PS4_R3', 'PS4_CIRCLE', 'PS4_L3', 'PS4_CROSS', 'PS4_SQUARE', 'PS4_TRIANGLE', 'PS4_L1', 'PS4_R1', 'PS4_UP']],
  ['BRAWLER', ['PS4_R2', 'PS4_L2', 'PS4_CROSS', 'PS4_CIRCLE', 'PS4_L3', 'PS4_R1', 'PS4_SQUARE', 'PS4_TRIANGLE', 'PS4_L1', 'PS4_R3', 'PS4_UP']],
  ['NOMAD', ['PS4_R2', 'PS4_R1', 'PS4_CROSS', 'PS4_CIRCLE', 'PS4_L3', 'PS4_R3', 'PS4_SQUARE', 'PS4_TRIANGLE', 'PS4_L1', 'PS4_L2', 'PS4_UP']],
];

const v = (id, name, min, max, def, step = 1, big = 10) => ({ id, name, min, max, def, step, big });
const OFF_ON = ['OFF', 'ON'];

// ---------------------------------------------------------------------- the catalogue

const BASE_MODS = [
  // ======================================================== AIM ASSIST
  {
    id: 'aa_polar', cat: 'AIM ASSIST', name: 'POLAR AA', group: 'aa',
    desc: 'Rotates the right stick in a small circle while aiming or firing so the game\'s aim assist keeps re-engaging.',
    options: OFF_ON, def: 1,
    values: [v('speed', 'SPEED', 1, 60, 14, 1, 5), v('size', 'SIZE', 1, 40, 12, 1, 5)],
    vars: 'int aap_a;',
    logic: `if ({ST} && (is_ads() || is_fire())) {
    aap_a = (aap_a + {V.speed}) % 360;
    stk_add(s_rx, ({V.size} * f_cos(aap_a)) / 100);
    stk_add(s_ry, ({V.size} * f_sin(aap_a)) / 100);
}`,
  },
  {
    id: 'aa_adv', cat: 'AIM ASSIST', name: 'ADVANCE AA', group: 'aa',
    desc: 'Shaped rotation: circle, tall or wide oval, breathing spiral or diamond.',
    options: ['OFF', 'CIRCLE', 'TALL OVAL', 'WIDE OVAL', 'SPIRAL', 'DIAMOND'], def: 1,
    values: [v('speed', 'SPEED', 1, 60, 12, 1, 5), v('size', 'SIZE', 1, 40, 14, 1, 5)],
    vars: 'int aaa_a, aaa_r, aaa_rx, aaa_ry, aaa_x, aaa_y;',
    logic: `if ({ST} && (is_ads() || is_fire())) {
    aaa_a = (aaa_a + {V.speed}) % 360;
    aaa_rx = {V.size};
    aaa_ry = {V.size};
    if ({ST} == 2) aaa_rx = {V.size} / 2;
    else if ({ST} == 3) aaa_ry = {V.size} / 2;
    else if ({ST} == 4) {
        aaa_r = (aaa_r + 1) % 60;
        aaa_rx = ({V.size} * (20 + aaa_r)) / 80;
        aaa_ry = aaa_rx;
    }
    if ({ST} == 5) {
        aaa_x = (aaa_rx * (90 - abs(aaa_a - 180))) / 90;
        aaa_y = (aaa_ry * (90 - abs((aaa_a + 90) % 360 - 180))) / 90;
    } else {
        aaa_x = (aaa_rx * f_cos(aaa_a)) / 100;
        aaa_y = (aaa_ry * f_sin(aaa_a)) / 100;
    }
    stk_add(s_rx, aaa_x);
    stk_add(s_ry, aaa_y);
}`,
  },
  {
    id: 'aa_taylor', cat: 'AIM ASSIST', name: 'TAYLOR AA', group: 'aa',
    desc: 'Circle that shrinks as you move the stick yourself and spins faster while firing.',
    options: OFF_ON, def: 1,
    values: [v('speed', 'SPEED', 1, 60, 10, 1, 5), v('size', 'SIZE', 1, 40, 14, 1, 5)],
    vars: 'int aat_a, aat_m, aat_r;',
    logic: `if ({ST} && is_ads()) {
    aat_m = min(stk_mag(get_ival(s_rx), get_ival(s_ry)), 100);
    aat_r = ({V.size} * (100 - aat_m)) / 100;
    aat_a = aat_a + {V.speed};
    if (is_fire()) aat_a = aat_a + {V.speed};
    aat_a = aat_a % 360;
    stk_add(s_rx, (aat_r * f_cos(aat_a)) / 100);
    stk_add(s_ry, (aat_r * f_sin(aat_a)) / 100);
} else aat_a = 0;`,
  },
  {
    id: 'aa_dogz', cat: 'AIM ASSIST', name: 'DOGZ AA', group: 'aa',
    desc: 'Polar circle that grows with your stick input and lets go when you push the stick past the release point.',
    options: OFF_ON, def: 1,
    values: [v('speed', 'SPEED', 1, 60, 18, 1, 5), v('size', 'SIZE', 1, 40, 10, 1, 5), v('rel', 'RELEASE', 5, 80, 25, 1, 5)],
    vars: 'int aad_a, aad_r;',
    logic: `if ({ST} && is_ads() && abs(get_ival(s_rx)) <= {V.rel} && abs(get_ival(s_ry)) <= {V.rel}) {
    aad_a = (aad_a + {V.speed}) % 360;
    aad_r = {V.size} + (abs(get_ival(s_rx)) + abs(get_ival(s_ry))) / 4;
    stk_add(s_rx, (aad_r * f_cos(aad_a)) / 100);
    stk_add(s_ry, (aad_r * f_sin(aad_a)) / 100);
}`,
  },
  {
    id: 'aa_hip', cat: 'AIM ASSIST', name: 'HIP AA',
    desc: 'Small circle while firing from the hip (without aiming down sights). Works next to the other aim assists.',
    options: OFF_ON, def: 1,
    values: [v('speed', 'SPEED', 1, 60, 20, 1, 5), v('size', 'SIZE', 1, 40, 8, 1, 5)],
    vars: 'int aah_a;',
    logic: `if ({ST} && is_fire() && !is_ads()) {
    aah_a = (aah_a + {V.speed}) % 360;
    stk_add(s_rx, ({V.size} * f_cos(aah_a)) / 100);
    stk_add(s_ry, ({V.size} * f_sin(aah_a)) / 100);
}`,
  },
  {
    id: 'aa_head', cat: 'AIM ASSIST', name: 'HEADSHOT ASSIST',
    desc: 'Pulls the aim up for a short time at the start of every burst.',
    options: OFF_ON, def: 1,
    values: [v('str', 'STRENGTH', 1, 40, 10, 1, 5), v('time', 'TIME MS', 50, 1500, 250, 25, 100)],
    logic: `if ({ST} && is_fire() && get_ptime(b_fire) < {V.time}) stk_add(s_ry, 0 - {V.str} * ar_dir);`,
  },

  // ======================================================== ANTI RECOIL
  {
    id: 'ar_basic', cat: 'ANTI RECOIL', name: 'BASIC AR',
    desc: 'Constant pull down (and sideways) while shooting.',
    options: ['OFF', 'ADS+FIRE', 'FIRE ONLY'], def: 1,
    values: [v('v', 'VERTICAL', 0, 100, 25, 1, 10), v('h', 'HORIZONTAL', -50, 50, 0, 1, 5)],
    logic: `if ({ST} == 1 && is_ads() && is_fire() || {ST} == 2 && is_fire()) {
    stk_soft(s_ry, {V.v} * ar_dir);
    stk_soft(s_rx, {V.h});
}`,
  },
  {
    id: 'ar_prog', cat: 'ANTI RECOIL', name: 'PROGRESSIVE AR',
    desc: 'Recoil that changes over the magazine: blends from START to MID to END across TIME.',
    options: OFF_ON, def: 1,
    values: [v('start', 'START', 0, 100, 32, 1, 10), v('mid', 'MID', 0, 100, 25, 1, 10), v('end', 'END', 0, 100, 18, 1, 10),
      v('time', 'TIME MS', 300, 6000, 1800, 100, 500), v('h', 'HORIZONTAL', -50, 50, 0, 1, 5)],
    vars: 'int arp_t, arp_v, arp_half;',
    logic: `if ({ST} && is_ads() && is_fire()) {
    arp_half = {V.time} / 2;
    if (arp_t < {V.time}) arp_t += get_rtime();
    if (arp_t < arp_half) arp_v = {V.start} + (({V.mid} - {V.start}) * arp_t) / arp_half;
    else if (arp_t < {V.time}) arp_v = {V.mid} + (({V.end} - {V.mid}) * (arp_t - arp_half)) / arp_half;
    else arp_v = {V.end};
    stk_soft(s_ry, arp_v * ar_dir);
    stk_soft(s_rx, {V.h});
} else arp_t = 0;`,
  },
  {
    id: 'ar_rumble', cat: 'ANTI RECOIL', name: 'RUMBLE AR',
    desc: 'Reads the gun\'s vibration and adds more pull while the weapon kicks harder.',
    options: OFF_ON, def: 1,
    values: [v('base', 'BASE', 0, 100, 22, 1, 10), v('boost', 'BOOST', 0, 60, 12, 1, 5), v('h', 'HORIZONTAL', -50, 50, 0, 1, 5)],
    vars: 'int arr_r;',
    logic: `if ({ST} && is_ads() && is_fire()) {
    arr_r = max(get_rumble(RUMBLE_A), get_rumble(RUMBLE_B));
    stk_soft(s_ry, ({V.base} + ({V.boost} * arr_r) / 100) * ar_dir);
    stk_soft(s_rx, {V.h});
}`,
  },
  {
    id: 'ar_weapon', cat: 'ANTI RECOIL', name: 'WEAPON AR',
    desc: 'Four weapon profiles. MANUAL: hold ADS + LEFT/RIGHT to switch. AUTO PS5: hold ADS + DOWN with a weapon in hand to teach the profile its adaptive-trigger signature; the script then switches by itself. PS5 DualSense only for AUTO.',
    options: ['OFF', 'MANUAL', 'AUTO PS5'], def: 1,
    values: [
      v('w1v', 'W1 VERTICAL', 0, 100, 25), v('w1h', 'W1 HORIZONTAL', -50, 50, 0, 1, 5),
      v('w2v', 'W2 VERTICAL', 0, 100, 25), v('w2h', 'W2 HORIZONTAL', -50, 50, 0, 1, 5),
      v('w3v', 'W3 VERTICAL', 0, 100, 25), v('w3h', 'W3 HORIZONTAL', -50, 50, 0, 1, 5),
      v('w4v', 'W4 VERTICAL', 0, 100, 25), v('w4h', 'W4 HORIZONTAL', -50, 50, 0, 1, 5),
    ],
    reserve: 5, // SPVAR_60..64: 4 trigger signatures + selected weapon
    strings: { WEAPON: 'WEAPON', LEARNED: 'LEARNED' },
    vars: 'int wa_sel, wa_i, wa_k, wa_t, wa_cur, wa_tm;\nint wa_h[4];',
    funcs: `// Hash of the 11 adaptive-trigger bytes the game currently sets on R2.
function wa_hash() {
    wa_t = 0;
    for (wa_k = 0; wa_k < 11; wa_k++) wa_t = (wa_t * 31 + get_adt(PS5_R2, wa_k)) & 2147483647;
    return wa_t;
}`,
    init: `wa_sel = get_pvar(SPVAR_64, 0, 3, 0);
for (wa_i = 0; wa_i < 4; wa_i++) wa_h[wa_i] = get_pvar(SPVAR_60 + wa_i, 0, 2147483647, 0);`,
    logic: `if ({ST}) {
    if (get_ival(b_ads) && event_press(PS4_RIGHT)) {
        wa_sel = (wa_sel + 1) % 4;
        set_pvar(SPVAR_64, wa_sel);
        m_pop({TX.WEAPON}, {TXN.WEAPON}, wa_sel + 1);
    }
    if (get_ival(b_ads) && event_press(PS4_LEFT)) {
        wa_sel = (wa_sel + 3) % 4;
        set_pvar(SPVAR_64, wa_sel);
        m_pop({TX.WEAPON}, {TXN.WEAPON}, wa_sel + 1);
    }
    if ({ST} == 2) {
        if (get_ival(b_ads) && event_press(PS4_DOWN)) {
            wa_h[wa_sel] = wa_hash();
            set_pvar(SPVAR_60 + wa_sel, wa_h[wa_sel]);
            m_pop({TX.LEARNED}, {TXN.LEARNED}, wa_sel + 1);
        }
        wa_tm += get_rtime();
        if (wa_tm >= 250) {
            wa_tm = 0;
            wa_cur = wa_hash();
            for (wa_i = 0; wa_i < 4; wa_i++) {
                if (wa_h[wa_i] && wa_h[wa_i] == wa_cur && wa_sel != wa_i) {
                    wa_sel = wa_i;
                    m_pop({TX.WEAPON}, {TXN.WEAPON}, wa_sel + 1);
                }
            }
        }
    }
    if (get_ival(b_ads)) { set_val(PS4_LEFT, 0); set_val(PS4_RIGHT, 0); set_val(PS4_DOWN, 0); }
    if (is_ads() && is_fire()) {
        stk_soft(s_ry, VL[{VI.w1v} + wa_sel * 2] * ar_dir);
        stk_soft(s_rx, VL[{VI.w1h} + wa_sel * 2]);
    }
}`,
  },

  // ======================================================== SHOOTING
  {
    id: 'sh_rapid', cat: 'SHOOTING', name: 'RAPID FIRE', group: 'fire',
    desc: 'Turns semi-automatic weapons into automatic ones.',
    options: ['OFF', 'ON', 'ADS ONLY'], def: 1,
    values: [v('rate', 'SHOTS/SEC', 1, 25, 12, 1, 5)],
    vars: 'int rf_t;',
    combos: `combo c_rapid {
    set_val(b_fire, 100);
    wait(rf_t);
    set_val(b_fire, 0);
    wait(rf_t);
}`,
    logic: `if (({ST} == 1 || {ST} == 2 && is_ads()) && get_ival(b_fire)) {
    rf_t = 500 / {V.rate};
    combo_run(c_rapid);
} else combo_stop(c_rapid);`,
  },
  {
    id: 'sh_burst', cat: 'SHOOTING', name: 'BURST FIRE', group: 'fire',
    desc: 'Each trigger pull fires a fixed burst of shots.',
    options: OFF_ON, def: 1,
    values: [v('shots', 'SHOTS', 2, 8, 3, 1, 2), v('delay', 'DELAY MS', 20, 250, 60, 5, 25)],
    vars: 'int bf_n, bf_d;',
    combos: `combo c_burst {
    set_val(b_fire, 100);
    wait(bf_d);
    set_val(b_fire, 0);
    wait(bf_d);
}`,
    logic: `if ({ST}) {
    if (event_press(b_fire)) bf_n = {V.shots};
    bf_d = {V.delay};
    if (bf_n > 0 && !combo_running(c_burst)) { bf_n--; combo_run(c_burst); }
    if (!combo_running(c_burst)) set_val(b_fire, 0);
}`,
  },
  {
    id: 'sh_akimbo', cat: 'SHOOTING', name: 'AKIMBO RAPID', group: 'fire',
    desc: 'Rapid fires both guns when you hold FIRE with akimbo weapons.',
    options: OFF_ON, def: 1,
    values: [v('rate', 'SHOTS/SEC', 1, 25, 10, 1, 5)],
    vars: 'int ak_t;',
    combos: `combo c_akimbo {
    set_val(b_fire, 100);
    set_val(b_ads, 100);
    wait(ak_t);
    set_val(b_fire, 0);
    set_val(b_ads, 0);
    wait(ak_t);
}`,
    logic: `if ({ST} && get_ival(b_fire)) {
    ak_t = 500 / {V.rate};
    combo_run(c_akimbo);
} else combo_stop(c_akimbo);`,
  },
  {
    id: 'sh_qs', cat: 'SHOOTING', name: 'QUICK SCOPE',
    desc: 'Tap ADS: the script scopes in, waits, fires and scopes out.',
    options: OFF_ON, def: 1,
    values: [v('delay', 'DELAY MS', 100, 900, 300, 10, 50)],
    vars: 'int qs_d;',
    combos: `combo c_qs {
    set_val(b_ads, 100);
    wait(qs_d);
    set_val(b_ads, 100);
    set_val(b_fire, 100);
    wait(60);
    set_val(b_ads, 0);
    set_val(b_fire, 0);
}`,
    logic: `if ({ST} && event_release(b_ads) && get_ptime(b_ads) < 200) {
    qs_d = {V.delay};
    combo_run(c_qs);
}`,
  },
  {
    id: 'sh_breath', cat: 'SHOOTING', name: 'HOLD BREATH',
    desc: 'Holds the sprint button while aiming to steady sniper scopes.',
    options: OFF_ON, def: 1, values: [],
    logic: 'if ({ST} && is_ads() && !is_fire()) set_val(b_sprint, 100);',
  },
  {
    id: 'sh_strafe', cat: 'SHOOTING', name: 'STRAFE SHOT',
    desc: 'Moves left and right on its own while you shoot.',
    options: OFF_ON, def: 1,
    values: [v('time', 'TIME MS', 100, 1500, 400, 25, 100), v('power', 'POWER', 20, 100, 100, 5, 20)],
    vars: 'int ss_t;',
    logic: `if ({ST} && is_fire() && abs(get_ival(s_lx)) < 30) {
    ss_t = (ss_t + get_rtime()) % ({V.time} * 2);
    if (ss_t < {V.time}) set_val(s_lx, {V.power});
    else set_val(s_lx, 0 - {V.power});
} else ss_t = 0;`,
  },
  {
    id: 'sh_jump', cat: 'SHOOTING', name: 'JUMP SHOT',
    desc: 'Jumps when you start shooting.',
    options: ['OFF', 'ON', 'HIP ONLY'], def: 1, values: [],
    combos: `combo c_jumpshot {
    set_val(b_jump, 100);
    wait(60);
    set_val(b_jump, 0);
    wait(300);
}`,
    logic: 'if (({ST} == 1 || {ST} == 2 && !is_ads()) && event_press(b_fire)) combo_run(c_jumpshot);',
  },
  {
    id: 'sh_drop', cat: 'SHOOTING', name: 'DROP SHOT',
    desc: 'Drops to prone when you start shooting.',
    options: ['OFF', 'ON', 'HIP ONLY'], def: 1,
    values: [v('hold', 'HOLD MS', 100, 1200, 450, 25, 100)],
    vars: 'int ds_t;',
    combos: `combo c_drop {
    set_val(b_crouch, 100);
    wait(ds_t);
    set_val(b_crouch, 0);
}`,
    logic: `if (({ST} == 1 || {ST} == 2 && !is_ads()) && event_press(b_fire)) {
    ds_t = {V.hold};
    combo_run(c_drop);
}`,
  },
  {
    id: 'sh_crouch', cat: 'SHOOTING', name: 'CROUCH SHOT',
    desc: 'Crouches up and down while you shoot.',
    options: OFF_ON, def: 1,
    values: [v('delay', 'DELAY MS', 80, 900, 280, 10, 50)],
    vars: 'int cs_d;',
    combos: `combo c_crouch {
    set_val(b_crouch, 100);
    wait(80);
    set_val(b_crouch, 0);
    wait(cs_d);
}`,
    logic: `if ({ST} && is_fire()) {
    cs_d = {V.delay};
    combo_run(c_crouch);
} else combo_stop(c_crouch);`,
  },
  {
    id: 'sh_ping', cat: 'SHOOTING', name: 'AUTO PING',
    desc: 'Pings the enemy you shoot at.',
    options: ['OFF', 'ON', 'ADS ONLY'], def: 1, values: [],
    combos: `combo c_ping {
    set_val(b_ping, 100);
    wait(60);
    set_val(b_ping, 0);
    wait(40);
    set_val(b_ping, 100);
    wait(60);
    set_val(b_ping, 0);
}`,
    logic: 'if (({ST} == 1 || {ST} == 2 && is_ads()) && event_press(b_fire)) combo_run(c_ping);',
  },

  // ======================================================== MOVEMENT
  {
    id: 'mv_slide', cat: 'MOVEMENT', name: 'SLIDE CANCEL',
    desc: 'Tap crouch while sprinting: slides and cancels the slide. TYPE A crouch-crouch-jump, TYPE B crouch-jump.',
    options: ['OFF', 'TYPE A', 'TYPE B'], def: 1,
    values: [v('delay', 'DELAY MS', 20, 250, 80, 5, 20)],
    vars: 'int sc_d;',
    combos: `combo c_slide_a {
    set_val(b_crouch, 100);
    wait(sc_d);
    set_val(b_crouch, 0);
    wait(50);
    set_val(b_crouch, 100);
    wait(50);
    set_val(b_crouch, 0);
    set_val(b_jump, 100);
    wait(60);
    set_val(b_jump, 0);
}

combo c_slide_b {
    set_val(b_crouch, 100);
    wait(sc_d);
    set_val(b_crouch, 0);
    set_val(b_jump, 100);
    wait(60);
    set_val(b_jump, 0);
}`,
    logic: `if ({ST} && get_ival(s_ly) < -70 && event_press(b_crouch)) {
    sc_d = {V.delay};
    if ({ST} == 1) combo_run(c_slide_a);
    else combo_run(c_slide_b);
}`,
  },
  {
    id: 'mv_bhop', cat: 'MOVEMENT', name: 'BUNNY HOP',
    desc: 'Hold jump to keep jumping.',
    options: OFF_ON, def: 1,
    values: [v('delay', 'DELAY MS', 20, 300, 60, 5, 20)],
    vars: 'int bh_d;',
    combos: `combo c_bhop {
    set_val(b_jump, 100);
    wait(bh_d);
    set_val(b_jump, 0);
    wait(bh_d);
}`,
    logic: `if ({ST} && get_ival(b_jump) && get_ptime(b_jump) > 200) {
    bh_d = {V.delay};
    combo_run(c_bhop);
} else combo_stop(c_bhop);`,
  },
  {
    id: 'mv_sprint', cat: 'MOVEMENT', name: 'AUTO SPRINT',
    desc: 'Sprints (and tactical sprints) when the left stick is pushed fully forward.',
    options: ['OFF', 'SPRINT', 'TACTICAL'], def: 1,
    values: [v('push', 'PUSH %', 50, 100, 92, 1, 5)],
    combos: `combo c_sprint {
    set_val(b_sprint, 100);
    wait(60);
    set_val(b_sprint, 0);
    wait(80);
}

combo c_tac_sprint {
    set_val(b_sprint, 100);
    wait(60);
    set_val(b_sprint, 0);
    wait(80);
    set_val(b_sprint, 100);
    wait(60);
    set_val(b_sprint, 0);
}`,
    vars: 'int as_go;',
    logic: `if ({ST} && get_ival(s_ly) < 0 - {V.push} && !is_ads() && !is_fire()) {
    if (!as_go) {
        as_go = 1;
        if ({ST} == 2) combo_run(c_tac_sprint);
        else combo_run(c_sprint);
    }
} else as_go = 0;`,
  },
  {
    id: 'mv_yy', cat: 'MOVEMENT', name: 'YY SPAM',
    desc: 'Hold the weapon swap button to double-swap repeatedly (animation cancel).',
    options: OFF_ON, def: 1,
    values: [v('delay', 'DELAY MS', 20, 200, 40, 5, 20)],
    vars: 'int yy_d;',
    combos: `combo c_yy {
    set_val(b_swap, 100);
    wait(yy_d);
    set_val(b_swap, 0);
    wait(yy_d);
    set_val(b_swap, 100);
    wait(yy_d);
    set_val(b_swap, 0);
    wait(200);
}`,
    logic: `if ({ST} && get_ival(b_swap) && get_ptime(b_swap) > 250) {
    yy_d = {V.delay};
    combo_run(c_yy);
}`,
  },
  {
    id: 'mv_melee', cat: 'MOVEMENT', name: 'FAST MELEE',
    desc: 'Hold melee to attack as fast as possible.',
    options: OFF_ON, def: 1, values: [],
    combos: `combo c_melee {
    set_val(b_melee, 100);
    wait(40);
    set_val(b_melee, 0);
    wait(40);
}`,
    logic: `if ({ST} && get_ival(b_melee) && get_ptime(b_melee) > 150) combo_run(c_melee);
else combo_stop(c_melee);`,
  },
  {
    id: 'mv_drop', cat: 'MOVEMENT', name: 'INSTA DROP',
    desc: 'Double-tap crouch to go prone instantly.',
    options: OFF_ON, def: 1, values: [],
    vars: 'int idp_t;',
    combos: `combo c_insta {
    set_val(b_crouch, 100);
    wait(450);
    set_val(b_crouch, 0);
}`,
    logic: `if ({ST}) {
    if (idp_t > 0) idp_t -= get_rtime();
    if (event_press(b_crouch)) {
        if (idp_t > 0) { combo_run(c_insta); idp_t = 0; }
        else idp_t = 280;
    }
}`,
  },

  // ======================================================== CONTROLLER (runs before every other mod)
  {
    id: 'ctl_flip', cat: 'CONTROLLER', name: 'FLIPPED', control: true, order: 1,
    desc: 'Swaps bumpers and triggers (L1 <-> L2, R1 <-> R2).',
    options: OFF_ON, def: 0, values: [],
    logic: 'if ({ST}) { swap(PS4_L1, PS4_L2); swap(PS4_R1, PS4_R2); }',
  },
  {
    id: 'ctl_layout', cat: 'CONTROLLER', name: 'BUTTON LAYOUT', control: true, order: 2,
    desc: 'Tells the mods where your FIRE, ADS, JUMP... buttons are. CUSTOM uses the buttons you pick here in the app.',
    options: [...LAYOUTS.map(([n]) => n), 'CUSTOM'], def: 0, values: [],
    hasConfig: 'layout',
    vars: 'int lay_i;',
    funcs: '', // table and function are emitted by composeMods (they depend on the custom row)
    logic: 'ctl_layout({ST});',
  },
  {
    id: 'ctl_stick', cat: 'CONTROLLER', name: 'STICK LAYOUT', control: true, order: 3,
    desc: 'Which stick moves and which stick aims, to match the in-game stick layout.',
    options: ['DEFAULT', 'SOUTHPAW', 'LEGACY', 'LEGACY SP'], def: 0, values: [],
    logic: `if ({ST} == 1) { s_rx = PS4_LX; s_ry = PS4_LY; s_lx = PS4_RX; s_ly = PS4_RY; }
else if ({ST} == 2) { s_rx = PS4_LX; s_ry = PS4_RY; s_lx = PS4_RX; s_ly = PS4_LY; }
else if ({ST} == 3) { s_rx = PS4_RX; s_ry = PS4_LY; s_lx = PS4_LX; s_ly = PS4_RY; }`,
  },
  {
    id: 'ctl_inv', cat: 'CONTROLLER', name: 'INVERTED Y', control: true, order: 4,
    desc: 'Use this if you play with inverted look so recoil pulls the right way.',
    options: OFF_ON, def: 0, values: [],
    logic: 'if ({ST}) ar_dir = -1;',
  },
  {
    id: 'ctl_hair', cat: 'CONTROLLER', name: 'HAIR TRIGGER', control: true, order: 5,
    desc: 'Any touch of ADS or FIRE counts as a full press.',
    options: OFF_ON, def: 1, values: [],
    logic: `if ({ST}) {
    if (get_val(b_ads) > 1) set_val(b_ads, 100);
    if (get_val(b_fire) > 1) set_val(b_fire, 100);
}`,
  },
  {
    id: 'ctl_dz', cat: 'CONTROLLER', name: 'DEADZONE', control: true, order: 6,
    desc: 'Ignores small stick movement (stick drift). Set the in-game deadzone low when you use this.',
    options: OFF_ON, def: 1,
    values: [v('left', 'LEFT', 0, 40, 6, 1, 5), v('right', 'RIGHT', 0, 40, 6, 1, 5)],
    logic: `if ({ST}) {
    if (stk_mag(get_ival(s_lx), get_ival(s_ly)) <= {V.left}) { set_val(s_lx, 0); set_val(s_ly, 0); }
    if (stk_mag(get_ival(s_rx), get_ival(s_ry)) <= {V.right}) { set_val(s_rx, 0); set_val(s_ry, 0); }
}`,
  },
  {
    id: 'ctl_rumble', cat: 'CONTROLLER', name: 'BLOCK RUMBLE', control: true, order: 7,
    desc: 'Stops the controller from vibrating (Rumble AR still reads the game\'s vibration).',
    options: OFF_ON, def: 0, values: [],
    logic: 'if ({ST}) block_rumble();',
  },
  {
    id: 'ctl_vm', cat: 'CONTROLLER', name: 'VM SPEED', control: true, order: 8,
    desc: 'How often the script runs. Faster = smoother mods, more CPU.',
    options: ['0', '-2', '-4', '-6', '-8'], def: 0, values: [],
    logic: 'vm_tctrl(0 - {ST} * 2);',
  },
  {
    id: 'ctl_cross', cat: 'CONTROLLER', name: 'PS XB CROSSOVER', control: true, order: 9,
    desc: 'Xbox controller on PlayStation: VIEW works as TOUCHPAD, RS + VIEW takes a screenshot.',
    options: OFF_ON, def: 1, values: [],
    logic: `if ({ST} && get_console() == PIO_PS4 && get_controller() != PIO_PS4 && get_ival(PS4_SHARE)) {
    if (get_ival(PS4_R3)) { set_val(PS4_SHARE, 100); set_val(PS4_TOUCH, 0); set_val(PS4_R3, 0); }
    else { set_val(PS4_TOUCH, 100); set_val(PS4_SHARE, 0); }
}`,
  },

  // ======================================================== UTILITY
  {
    id: 'ut_kill', cat: 'UTILITY', name: 'KILL SWITCH', control: true, order: 20,
    desc: 'Hold ADS and press the kill button to turn every mod off or back on (controller settings stay). Shows MODS OFF / MODS ON.',
    options: OFF_ON, def: 1, values: [],
    strings: { MODS_OFF: 'MODS OFF', MODS_ON: 'MODS ON' },
    logic: `if ({ST} && get_ival(b_ads) && event_press({KILL_BTN})) {
    k_kill = !k_kill;
    if (k_kill) m_pop({TX.MODS_OFF}, {TXN.MODS_OFF}, -1);
    else m_pop({TX.MODS_ON}, {TXN.MODS_ON}, -1);
    m_led();
}
if ({ST} && get_ival(b_ads)) set_val({KILL_BTN}, 0);
if (!{ST}) k_kill = 0;`,
  },
];

export const MODS = [...BASE_MODS, ...COD_MODS, ...FORTNITE_MODS, ...FORTNITE_MODS_EXTRA, ...FC_MODS, ...FC_SKILL_MODS, ...FC_MODS_EXTRA, ...OW_MODS].map(withButton);

export const MOD_BY_ID = new Map(MODS.map((m) => [m.id, m]));

/** Adds the mods a picked mod needs (`requires`, e.g. the hero select for a hero feature). */
export function withRequirements(picked) {
  const out = { ...picked };
  for (const id of Object.keys(picked)) {
    for (const req of MOD_BY_ID.get(id)?.requires ?? []) if (!out[req]) out[req] = {};
  }
  return out;
}

/** Rules the picker enforces. */
export const GROUP_RULES = {
  aa: { max: 2, label: 'Pick up to 2 main aim assists (the ones marked AA group). HIP AA and AA BOOSTER can be added on top.' },
  fire: { max: 1, label: 'RAPID FIRE, BURST FIRE and AKIMBO RAPID all drive the trigger; pick one.' },
};

// ---------------------------------------------------------------------- selection -> model + code

export function defaultModSelection() {
  return {
    picked: {},          // id -> { def, name, values: { id: { min, max, def, step, big } } }
    layoutCustom: LAYOUTS[0][1].slice(),
  };
}

/** Returns the effective menu entry for a picked mod (overrides applied). */
export function effectiveMod(mod, pick = {}) {
  return {
    ...mod,
    name: (pick.name || mod.name).toUpperCase(),
    def: pick.def ?? mod.def,
    values: mod.values.map((val) => ({ ...val, ...(pick.values?.[val.id] ?? {}) })),
  };
}

/** Builds the menu model (categories in catalogue order) from the selection. */
export function buildModel(selection) {
  const categories = [];
  for (const cat of MOD_CATEGORIES) {
    const items = MODS.filter((m) => m.cat === cat && selection?.picked?.[m.id]).map((m) => {
      const e = effectiveMod(m, selection.picked[m.id]);
      // Controller and utility mods are shared by every profile.
      return { key: m.id, name: e.name, options: m.options, def: e.def, values: e.values, glob: !!m.control };
    });
    if (items.length) categories.push({ name: cat, items });
  }
  return { categories };
}

const SIN_TABLE = Array.from({ length: 91 }, (_, i) => Math.round(Math.sin((i * Math.PI) / 180) * 100));

const RUNTIME = `// ---------- mod runtime (buttons, sticks, helpers)
int b_fire, b_ads, b_jump, b_crouch, b_sprint, b_melee, b_reload, b_swap, b_tactical, b_lethal, b_ping;
int s_rx, s_ry, s_lx, s_ly;
int ar_dir, k_kill;
const int8 SIN_T[] = {${SIN_TABLE.join(', ')}};

function f_sin(f_a) {
    f_a = f_a % 360;
    if (f_a < 0) f_a = f_a + 360;
    if (f_a <= 90) return SIN_T[f_a];
    if (f_a <= 180) return SIN_T[180 - f_a];
    if (f_a <= 270) return 0 - SIN_T[f_a - 180];
    return 0 - SIN_T[360 - f_a];
}

function f_cos(f_a) { return f_sin(f_a + 90); }

function stk_add(f_s, f_v) { set_val(f_s, clamp(get_val(f_s) + f_v, -100, 100)); }
function stk_set(f_s, f_v) { set_val(f_s, clamp(get_ival(f_s) + f_v, -100, 100)); }

// Adds f_v but less of it the further the stick is already pushed (smooth recoil control).
function stk_soft(f_s, f_v) { set_val(f_s, clamp(get_val(f_s) + (f_v * (100 - abs(get_val(f_s)))) / 100, -100, 100)); }

function stk_mag(f_x, f_y) { return isqrt(f_x * f_x + f_y * f_y); }
function is_ads() { return get_val(b_ads) > 10; }
function is_fire() { return get_val(b_fire) > 10; }`;

/**
 * Turns the picked mods into GPC pieces.
 * t: flattened tables from flattenModel (items carry `key`, values carry `id`)
 * opts: { selection, killBtn }
 * Returns { strings: {KEY: text}, vars, funcs, combos, init, logic, reserve }.
 */
export function composeMods(t, opts) {
  const sel = opts.selection ?? defaultModSelection();
  const strings = {};
  const out = { vars: [], funcs: [], combos: [], init: [], control: [], logic: [], reserve: 0 };
  // A mod whose required mods are not in the menu is left out (its code would read a missing variable).
  const has = (key) => t.items.some((x) => x.key === key);
  const items = t.items.filter((it) => MOD_BY_ID.has(it.key) && (MOD_BY_ID.get(it.key).requires ?? []).every(has));
  if (!items.length) return null;

  for (const it of items) {
    const mod = MOD_BY_ID.get(it.key);
    Object.assign(strings, mod.strings ?? {});
    const valIndex = {};
    mod.values.forEach((val, k) => { valIndex[val.id] = it.v0 + k; });
    const si = t.items.indexOf(it);
    const sub = (code) => String(code ?? '')
      .replace(/\{ST\}/g, `ST[${si}]`)
      .replace(/\{BTN\}/g, `bt_${si}`)
      .replace(/\{BTN@(\w+)\}/g, (_, key) => `bt_${t.items.findIndex((x) => x.key === key)}`)
      .replace(/\{HERO\}/g, `ST[${t.items.findIndex((x) => x.key === 'ow_hero')}]`)
      .replace(/\{V\.(\w+)\}/g, (_, id) => `VL[${valIndex[id]}]`)
      .replace(/\{VI\.(\w+)\}/g, (_, id) => String(valIndex[id]))
      .replace(/\{TX\.(\w+)\}/g, (_, k) => `TX[TXM_${k}]`)
      .replace(/\{TXN\.(\w+)\}/g, (_, k) => `TXM_${k}_N`)
      .replace(/\{KILL_BTN\}/g, opts.killBtn ?? 'PS4_SHARE');
    const head = `// ${mod.name}`;
    // A button mod: its variable takes the button of the chosen option (option 0 = OFF).
    const btnSet = mod.btn ? `bt_${si} = BTN_${si}[{ST}];\n` : '';
    if (mod.btn) {
      out.vars.push(`int bt_${si};`);
      out.vars.push(`const int BTN_${si}[] = {0, ${mod.btn.list.join(', ')}};`);
    }
    if (mod.vars) out.vars.push(sub(mod.vars));
    if (mod.funcs) out.funcs.push(sub(mod.funcs));
    if (mod.combos) out.combos.push(sub(mod.combos));
    if (mod.init) out.init.push(sub(mod.init));
    (mod.control ? out.control : out.logic).push({ order: mod.order ?? 50, code: `${head}\n${sub(btnSet + mod.logic)}` });
    out.reserve = Math.max(out.reserve, mod.reserve ?? 0);
    if (mod.hasConfig === 'layout') {
      const rows = [...LAYOUTS.map(([, r]) => r), (sel.layoutCustom ?? LAYOUTS[0][1])];
      out.vars.push(`const uint8 LAYOUT_T[][] = {\n${rows.map((r, i) => `    {${r.join(', ')}}${i < rows.length - 1 ? ',' : ''}`).join('\n')}\n};`);
      out.funcs.push(`function ctl_layout(f_l) {
    b_fire = LAYOUT_T[f_l][0]; b_ads = LAYOUT_T[f_l][1]; b_jump = LAYOUT_T[f_l][2]; b_crouch = LAYOUT_T[f_l][3];
    b_sprint = LAYOUT_T[f_l][4]; b_melee = LAYOUT_T[f_l][5]; b_reload = LAYOUT_T[f_l][6]; b_swap = LAYOUT_T[f_l][7];
    b_tactical = LAYOUT_T[f_l][8]; b_lethal = LAYOUT_T[f_l][9]; b_ping = LAYOUT_T[f_l][10];
}`);
    }
  }
  out.control.sort((a, b) => a.order - b.order);

  const def = LAYOUTS[0][1];
  const defaults = `// Default buttons and sticks, set every loop so layout mods can change them.
function ctl_default() {
    b_fire = ${def[0]}; b_ads = ${def[1]}; b_jump = ${def[2]}; b_crouch = ${def[3]};
    b_sprint = ${def[4]}; b_melee = ${def[5]}; b_reload = ${def[6]}; b_swap = ${def[7]};
    b_tactical = ${def[8]}; b_lethal = ${def[9]}; b_ping = ${def[10]};
    s_rx = PS4_RX; s_ry = PS4_RY; s_lx = PS4_LX; s_ly = PS4_LY;
    ar_dir = 1;
}`;

  const logic = [
    'ctl_default();',
    ...out.control.map((c) => c.code),
    'if (!k_kill) {',
    ...out.logic.map((c) => c.code.split('\n').map((l) => `    ${l}`).join('\n')),
    '}',
  ].join('\n');

  return {
    strings,
    runtime: RUNTIME,
    vars: out.vars.join('\n'),
    funcs: [defaults, ...out.funcs].join('\n\n'),
    combos: out.combos.join('\n\n'),
    init: out.init.join('\n'),
    logic,
    reserve: out.reserve,
  };
}

// CALL OF DUTY mods added to the MODS catalogue (mods.js appends COD_MODS).
// Same format as the other mods: options, values, vars / combos / logic with {ST}, {V.id} placeholders.
// Features taken from the CALL OF DUTY scripts in GPCS (Legacy AA, Sticky AA, Rotate AA, AA Booster,
// Strafe Jitter, Cancel Reload, Crouch Jump, Snake Mod, Anti Wobble).

const v = (id, name, min, max, def, step = 1, big = 10) => ({ id, name, min, max, def, step, big });
const OFF_ON = ['OFF', 'ON'];

export const COD_MODS = [
  // ======================================================== AIM ASSIST
  {
    id: 'aa_sticky', cat: 'AIM ASSIST', name: 'STICKY AA', group: 'aa',
    desc: 'Pushes the right stick up, right, down and left in quick steps while aiming or firing (triple sticky).',
    options: OFF_ON, def: 1,
    values: [v('size', 'SIZE', 1, 40, 8, 1, 5), v('time', 'TIME MS', 5, 200, 30, 5, 20)],
    vars: 'int sa_t;',
    combos: `combo c_sticky {
    stk_set(s_ry, {V.size});
    wait(sa_t);
    stk_set(s_rx, {V.size});
    wait(sa_t);
    stk_set(s_ry, 0 - {V.size});
    wait(sa_t);
    stk_set(s_rx, 0 - {V.size});
    wait(sa_t);
}`,
    logic: `if ({ST} && (is_ads() || is_fire())) {
    sa_t = {V.time};
    if (!combo_running(c_sticky)) combo_run(c_sticky);
}`,
  },
  {
    id: 'aa_legacy', cat: 'AIM ASSIST', name: 'LEGACY AA', group: 'aa',
    desc: 'Older square pattern on the right stick: down, left, up, right, repeated while aiming or firing.',
    options: OFF_ON, def: 1,
    values: [v('size', 'SIZE', 1, 40, 12, 1, 5), v('time', 'TIME MS', 5, 200, 25, 5, 20)],
    vars: 'int lg_t;',
    combos: `combo c_legacy {
    stk_set(s_ry, 0 - {V.size});
    wait(lg_t);
    stk_set(s_rx, 0 - {V.size});
    wait(lg_t);
    stk_set(s_ry, {V.size});
    wait(lg_t);
    stk_set(s_rx, {V.size});
    wait(lg_t);
}`,
    logic: `if ({ST} && (is_ads() || is_fire())) {
    lg_t = {V.time};
    if (!combo_running(c_legacy)) combo_run(c_legacy);
}`,
  },
  {
    id: 'aa_rotate', cat: 'AIM ASSIST', name: 'ROTATE AA', group: 'aa',
    desc: 'Rocks the left stick left and right while aiming down sights and firing, so the aim keeps moving.',
    options: OFF_ON, def: 1,
    values: [v('str', 'STRENGTH', 1, 60, 20, 1, 5), v('spd', 'SPEED MS', 5, 200, 25, 5, 20)],
    combos: `combo c_rotate {
    stk_set(s_lx, {V.str});
    wait({V.spd});
    stk_set(s_lx, 0 - {V.str});
    wait({V.spd});
}`,
    logic: `if ({ST} && is_ads() && is_fire() && !combo_running(c_rotate)) combo_run(c_rotate);`,
  },
  {
    id: 'aa_boost', cat: 'AIM ASSIST', name: 'AA BOOSTER',
    desc: 'Second circle on the left stick, added on top of the right stick aim assist while aiming or firing.',
    options: OFF_ON, def: 1,
    values: [v('str', 'STRENGTH', 1, 40, 10, 1, 5), v('speed', 'SPEED', 1, 60, 14, 1, 5)],
    vars: 'int ab_a;',
    logic: `if ({ST} && (is_ads() || is_fire())) {
    ab_a = (ab_a + {V.speed}) % 360;
    stk_add(s_lx, ({V.str} * f_cos(ab_a)) / 100);
    stk_add(s_ly, ({V.str} * f_sin(ab_a)) / 100);
}`,
  },

  // ======================================================== ANTI RECOIL
  {
    id: 'ar_wobble', cat: 'ANTI RECOIL', name: 'ANTI WOBBLE',
    desc: 'Counters the view wobble that happens while you are hit: adds a small pull that cycles every 10 frames.',
    options: OFF_ON, def: 1,
    values: [v('v', 'VERTICAL', 0, 40, 6, 1, 5), v('h', 'HORIZONTAL', -40, 40, 0, 1, 5)],
    vars: 'int aw_b, aw_t;',
    logic: `if ({ST} && is_ads() && is_fire()) {
    aw_b = aw_b + 1;
    if (aw_b >= 10) aw_b = 0;
    aw_t = get_val(s_ry) + {V.v} + aw_b;
    if (aw_t > 100) aw_t = 100;
    set_val(s_ry, 0 - aw_t);
    set_val(s_rx, clamp(get_val(s_rx) + {V.h}, -100, 100));
}`,
  },

  // ======================================================== SHOOTING
  {
    id: 'sh_cancel_reload', cat: 'SHOOTING', name: 'CANCEL RELOAD',
    desc: 'Taps the swap button right after reload is pressed, so the reload animation is cancelled.',
    options: OFF_ON, def: 1,
    values: [v('d', 'DELAY MS', 10, 150, 25, 5, 10)],
    combos: `combo c_cancel_rl {
    set_val(b_swap, 100);
    wait({V.d});
    set_val(b_swap, 0);
    wait({V.d});
}`,
    logic: `if ({ST} && event_press(b_reload)) combo_run(c_cancel_rl);`,
  },

  // ======================================================== MOVEMENT
  {
    id: 'mv_crouch_jump', cat: 'MOVEMENT', name: 'CROUCH JUMP',
    desc: 'Pressing jump while moving forward crouches and then jumps (the crouch-jump used in several CoD scripts).',
    options: OFF_ON, def: 1,
    values: [v('d', 'DELAY MS', 20, 200, 60, 5, 20)],
    combos: `combo c_crouch_jump {
    set_val(b_crouch, 100);
    wait({V.d});
    set_val(b_crouch, 0);
    set_val(b_jump, 100);
    wait(50);
    set_val(b_jump, 0);
}`,
    logic: `if ({ST} && event_press(b_jump) && get_ival(s_ly) < -70 && !combo_running(c_crouch_jump)) combo_run(c_crouch_jump);`,
  },
  {
    id: 'mv_snake', cat: 'MOVEMENT', name: 'SNAKE MOD',
    desc: 'Short jump press = double hop. Long jump press (hold past HOLD MS) = crouch and walk forward.',
    options: OFF_ON, def: 1,
    values: [v('hold', 'HOLD MS', 200, 600, 300, 25, 50)],
    combos: `combo c_snake_short {
    set_val(b_jump, 100);
    wait(30);
    set_val(b_jump, 0);
    wait(40);
    set_val(b_jump, 100);
    wait(30);
    set_val(b_jump, 0);
}

combo c_snake_long {
    set_val(s_ly, 100);
    set_val(b_crouch, 100);
    wait(400);
    set_val(s_ly, 0);
    set_val(b_crouch, 0);
}`,
    logic: `if ({ST} && !is_ads()) {
    if (event_release(b_jump) && get_ptime(b_jump) <= {V.hold}) combo_run(c_snake_short);
    if (get_ival(b_jump) && get_ptime(b_jump) > {V.hold} && !combo_running(c_snake_long)) combo_run(c_snake_long);
}`,
  },
  {
    id: 'mv_jitter', cat: 'MOVEMENT', name: 'STRAFE JITTER',
    desc: 'Fast left-right jitter on the left stick while firing from the hip (not aiming).',
    options: OFF_ON, def: 1,
    values: [v('str', 'STRENGTH', 1, 100, 60, 1, 10)],
    combos: `combo c_jitter {
    stk_set(s_lx, {V.str});
    wait(5);
    stk_set(s_lx, 0 - {V.str});
    wait(5);
    stk_set(s_lx, {V.str});
    wait(5);
    stk_set(s_lx, 0 - {V.str});
    wait(5);
}`,
    logic: `if ({ST} && is_fire() && !is_ads() && !combo_running(c_jitter)) combo_run(c_jitter);`,
  },
  {
    id: 'aa_track', cat: 'AIM ASSIST', name: 'AUTO TRACK',
    desc: 'While aiming and firing, keeps pushing the right stick in the direction you are already moving it (tracking).',
    options: OFF_ON, def: 1,
    values: [v('str', 'STRENGTH', 1, 40, 8, 1, 5)],
    logic: `if ({ST} && is_ads() && is_fire()) {
    if (get_ival(s_rx) > 5) stk_add(s_rx, {V.str});
    else if (get_ival(s_rx) < 0 - 5) stk_add(s_rx, 0 - {V.str});
}`,
  },
  {
    id: 'mv_strafe', cat: 'MOVEMENT', name: 'STRAFE ASSIST',
    desc: 'While you move forward and fire, zig-zags the left stick left and right.',
    options: OFF_ON, def: 1,
    values: [v('str', 'STRENGTH', 1, 100, 40, 1, 10), v('spd', 'SPEED MS', 5, 200, 40, 5, 20)],
    combos: `combo c_strafe_as {
    stk_set(s_lx, {V.str});
    wait({V.spd});
    stk_set(s_lx, 0 - {V.str});
    wait({V.spd});
}`,
    logic: `if ({ST} && is_fire() && get_ival(s_ly) < -70 && !combo_running(c_strafe_as)) combo_run(c_strafe_as);`,
  },
  {
    id: 'sh_autoreload', cat: 'SHOOTING', name: 'AUTO RELOAD',
    desc: 'After you stop firing, waits the chosen time and presses reload by itself.',
    options: OFF_ON, def: 1,
    values: [v('d', 'DELAY MS', 300, 3000, 1200, 50, 100)],
    vars: 'int arl_t;',
    combos: `combo c_autoreload {
    wait(arl_t);
    set_val(b_reload, 100);
    wait(60);
    set_val(b_reload, 0);
}`,
    logic: `if ({ST} && event_release(b_fire) && !combo_running(c_autoreload)) {
    arl_t = {V.d};
    combo_run(c_autoreload);
}`,
  },
  {
    id: 'ctl_sens', cat: 'CONTROLLER', name: 'SENSITIVITY', control: true, order: 10,
    desc: 'Changes the right stick sensitivity: one value for normal aim and one for aiming down sights (100 = normal).',
    options: OFF_ON, def: 1,
    values: [v('gen', 'GENERAL %', 10, 200, 100, 5, 20), v('ads', 'ADS %', 10, 200, 100, 5, 20)],
    logic: `if ({ST}) {
    if (is_ads()) sensitivity(PS4_RX, 50, {V.ads});
    else sensitivity(PS4_RX, 50, {V.gen});
}`,
  },
];

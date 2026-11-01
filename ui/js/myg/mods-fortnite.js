// FORTNITE mods added to the catalogue (mods.js appends FORTNITE_MODS).
// Only features that no existing mod already builds. Others are shared with CALL OF DUTY (same behaviour).
const v = (id, name, min, max, def, step = 1, big = 10) => ({ id, name, min, max, def, step, big });
const OFF_ON = ['OFF', 'ON'];

export const FORTNITE_MODS = [
  {
    id: 'fn_ads_aa', cat: 'AIM ASSIST', name: 'ADS AA', group: 'aa',
    desc: 'While aiming down sights, moves the right stick in a small four-step loop (Brave Aim ADS assist).',
    options: OFF_ON, def: 1,
    values: [v('str', 'STRENGTH', 1, 40, 10, 1, 5), v('delay', 'DELAY MS', 5, 100, 20, 5, 10)],
    vars: 'int fa_d;',
    combos: `combo c_fn_adsaa {
    stk_set(s_ry, 0 - {V.str});
    wait(fa_d);
    stk_set(s_rx, {V.str});
    wait(fa_d);
    stk_set(s_ry, {V.str});
    wait(fa_d);
    stk_set(s_rx, 0 - {V.str});
    wait(fa_d);
}`,
    logic: `if ({ST} && is_ads() && !combo_running(c_fn_adsaa)) {
    fa_d = {V.delay};
    combo_run(c_fn_adsaa);
}`,
  },
  {
    id: 'fn_expo', cat: 'AIM ASSIST', name: 'EXPO AIM',
    desc: 'Simplified exponential curve: the further you push the right stick, the more extra aim it adds (ADS or fire).',
    options: OFF_ON, def: 1,
    values: [v('str', 'STRENGTH', 1, 60, 15, 1, 5)],
    logic: `if ({ST} && (is_ads() || is_fire())) stk_add(s_rx, (get_ival(s_rx) * {V.str}) / 100);`,
  },
  {
    id: 'fn_pulse', cat: 'AIM ASSIST', name: 'PULSE AIM',
    desc: 'Pulses the aim left and right every frame while aiming or firing (the Pulse script effect).',
    options: OFF_ON, def: 1,
    values: [v('str', 'STRENGTH', 1, 30, 8, 1, 5)],
    vars: 'int pl_c = 1;',
    logic: `if ({ST} && (is_ads() || is_fire())) {
    pl_c = inv(pl_c);
    stk_add(s_rx, (pl_c * {V.str}) / 10);
    stk_add(s_ry, (pl_c * {V.str}) / 10);
}`,
  },
  {
    id: 'fn_bloom', cat: 'SHOOTING', name: 'ANTI BLOOM',
    desc: 'While firing, swings the left stick left and right, with the swing getting longer each cycle (reduces bloom).',
    options: OFF_ON, def: 1,
    values: [v('str', 'SWING', 10, 60, 40, 1, 5), v('base', 'BASE MS', 50, 300, 100, 5, 20)],
    vars: 'int fb_t;',
    combos: `combo c_fn_bloom {
    set_val(s_lx, 0 - {V.str});
    wait(fb_t);
    set_val(s_lx, {V.str});
    wait(fb_t);
    if (fb_t < 160) fb_t = fb_t + 10;
    else fb_t = {V.base};
}`,
    logic: `if ({ST} && is_fire() && !combo_running(c_fn_bloom)) {
    if (fb_t < {V.base}) fb_t = {V.base};
    combo_run(c_fn_bloom);
}`,
  },
  {
    id: 'fn_pickup', cat: 'MOVEMENT', name: 'PICKUP MACRO',
    desc: 'Taps the square/X button quickly when you press D-PAD DOWN: picks up items without holding the button.',
    options: OFF_ON, def: 1,
    values: [v('d', 'DELAY MS', 5, 100, 10, 5, 10)],
    combos: `combo c_fn_pickup {
    set_val(PS4_SQUARE, 100);
    wait({V.d});
    set_val(PS4_SQUARE, 0);
    wait({V.d});
}`,
    logic: `if ({ST} && event_press(PS4_DOWN) && !combo_running(c_fn_pickup)) combo_run(c_fn_pickup);`,
  },
  {
    id: 'fn_auto_aim', cat: 'AIM ASSIST', name: 'AUTO AIM',
    desc: 'Left stick sweeps left and right by itself while it is resting in the middle (Brave Aim AUTO AIM). ALWAYS or ADS ONLY.',
    options: ['OFF', 'ALWAYS', 'ADS ONLY'], def: 1,
    values: [v('str', 'STRENGTH', 1, 100, 100, 1, 10), v('spd', 'SPEED MS', 10, 100, 10, 5, 10)],
    combos: `combo c_fn_autoaim {
    stk_set(s_lx, 0 - {V.str});
    wait({V.spd});
    stk_set(s_lx, {V.str});
    wait({V.spd});
}`,
    logic: `if ({ST} && ({ST} == 1 || is_ads()) && abs(get_ival(s_lx)) <= 35 && abs(get_ival(s_ly)) <= 35 && !combo_running(c_fn_autoaim)) combo_run(c_fn_autoaim);`,
  },
];

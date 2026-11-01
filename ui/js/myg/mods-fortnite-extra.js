// FORTNITE mods that the FORTNITE list needs and no other mod builds yet.
// Combos write absolute stick values on top of the real input (stk_set), so the steps show.
const v = (id, name, min, max, def, step = 1, big = 10) => ({ id, name, min, max, def, step, big });
const OFF_ON = ['OFF', 'ON'];

export const FORTNITE_MODS_EXTRA = [
  {
    id: 'fn_ads_sticky', cat: 'AIM ASSIST', name: 'ADS STICKY', group: 'aa',
    desc: 'While aiming down sights, a sticky pulse on the right stick and the left stick together (Brave Aim ADS Sticky Aim).',
    options: OFF_ON, def: 1,
    values: [v('size', 'SIZE', 1, 40, 8, 1, 5), v('time', 'TIME MS', 10, 200, 25, 5, 20)],
    vars: 'int fs_t;',
    combos: `combo c_fn_adssticky {
    stk_set(s_ry, {V.size});
    stk_set(s_rx, {V.size});
    stk_set(s_lx, {V.size});
    wait(fs_t);
    stk_set(s_ry, 0 - {V.size});
    stk_set(s_rx, 0 - {V.size});
    stk_set(s_lx, 0 - {V.size});
    wait(fs_t);
}`,
    logic: `if ({ST} && is_ads() && !combo_running(c_fn_adssticky)) {
    fs_t = {V.time};
    combo_run(c_fn_adssticky);
}`,
  },
  {
    id: 'fn_booster', cat: 'AIM ASSIST', name: 'BRAVE BOOST', group: 'aa',
    desc: 'Four steps on the right stick (right-up, left-down) while aiming or firing: Brave Aim booster.',
    options: OFF_ON, def: 1,
    values: [v('str', 'STRENGTH', 1, 40, 10, 1, 5), v('w', 'WAIT MS', 10, 100, 20, 5, 10)],
    combos: `combo c_fn_booster {
    stk_set(s_rx, {V.str});
    stk_set(s_ry, {V.str});
    wait({V.w});
    stk_set(s_rx, 0 - {V.str});
    wait({V.w});
    stk_set(s_ry, 0 - {V.str});
    wait({V.w});
}`,
    logic: `if ({ST} && (is_ads() || is_fire()) && !combo_running(c_fn_booster)) combo_run(c_fn_booster);`,
  },
  {
    id: 'fn_auto_track', cat: 'AIM ASSIST', name: 'AUTO TRACK',
    desc: 'While firing, the left stick swings left and right by itself (Brave Aim auto tracking).',
    options: OFF_ON, def: 1,
    values: [v('str', 'STRENGTH', 1, 100, 60, 1, 10), v('w', 'WAIT MS', 10, 100, 10, 5, 10)],
    combos: `combo c_fn_autotrack {
    stk_set(s_lx, 0 - {V.str});
    wait({V.w});
    stk_set(s_lx, {V.str});
    wait({V.w});
}`,
    logic: `if ({ST} && is_fire() && !combo_running(c_fn_autotrack)) combo_run(c_fn_autotrack);`,
  },
];

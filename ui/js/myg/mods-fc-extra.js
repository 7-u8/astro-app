// FC mods from the MF script: precision pass / through, defence sensitivity, auto target.
const v = (id, name, min, max, def, step = 1, big = 10) => ({ id, name, min, max, def, step, big });
const OFF_ON = ['OFF', 'ON'];

export const FC_MODS_EXTRA = [
  {
    id: 'fc_precision_pass', cat: 'MOVEMENT', name: 'PRECISION PASS',
    desc: 'Press CROSS (A): the pass waits a bit longer when the left stick is pushed hard (PrecisionPassPro), then nudges the stick forward.',
    options: OFF_ON, def: 1,
    values: [v('base', 'BASE MS', 0, 200, 25, 5, 10), v('extra', 'EXTRA MS', 0, 100, 20, 5, 10)],
    vars: 'int pp_d;',
    combos: `combo c_fc_pp {
    wait(pp_d);
    set_val(PS4_CROSS, 100);
    wait(90);
    set_val(PS4_CROSS, 0);
    set_val(PS4_LY, 10);
    wait(50);
    set_val(PS4_LY, 0);
}`,
    logic: `if ({ST} && event_press(PS4_CROSS) && !combo_running(c_fc_pp)) {
    pp_d = {V.base};
    if (abs(get_ival(PS4_LX)) > 30) pp_d = pp_d + {V.extra};
    combo_run(c_fc_pp);
}`,
  },
  {
    id: 'fc_precision_through', cat: 'MOVEMENT', name: 'PRECISION THROUGH',
    desc: 'Press TRIANGLE (Y): a through ball, timed longer when the left stick is pushed hard (PrecisionThroughPro).',
    options: OFF_ON, def: 1,
    values: [v('base', 'BASE MS', 0, 200, 40, 5, 10), v('extra', 'EXTRA MS', 0, 100, 20, 5, 10)],
    vars: 'int pt_d;',
    combos: `combo c_fc_pt {
    wait(pt_d);
    set_val(PS4_TRIANGLE, 100);
    wait(110);
    set_val(PS4_TRIANGLE, 0);
    set_val(PS4_LY, 0 - 10);
    wait(50);
    set_val(PS4_LY, 0);
}`,
    logic: `if ({ST} && event_press(PS4_TRIANGLE) && !combo_running(c_fc_pt)) {
    pt_d = {V.base};
    if (abs(get_ival(PS4_LX)) > 50) pt_d = pt_d + {V.extra};
    combo_run(c_fc_pt);
}`,
  },
  {
    id: 'fc_defence', cat: 'CONTROLLER', name: 'DEFENCE SENS', control: true, order: 12,
    desc: 'While R2 (sprint) is held, the left stick gets a lower sensitivity so you control the player better (Defence MOD).',
    options: OFF_ON, def: 1,
    values: [v('sens', 'SENS %', 10, 200, 110, 5, 20)],
    logic: `if ({ST} && get_ival(PS4_R2)) sensitivity(PS4_LX, 50, {V.sens});`,
  },
  {
    id: 'fc_auto_target', cat: 'AIM ASSIST', name: 'AUTO TARGET', group: 'aa',
    desc: 'Hold L2 and press CIRCLE: the right stick is pushed up and sideways (25 or -25 by left stick side) for 80 ms (AutoTarget).',
    options: OFF_ON, def: 1,
    values: [v('side', 'SIDE', 5, 50, 25, 1, 5), v('up', 'UP', 5, 60, 30, 1, 5)],
    vars: 'int at_x;',
    combos: `combo c_fc_at {
    set_val(PS4_RX, at_x);
    set_val(PS4_RY, 0 - {V.up});
    wait(80);
    set_val(PS4_RX, 0);
    set_val(PS4_RY, 0);
}`,
    logic: `if ({ST} && get_ival(PS4_L2) && event_press(PS4_CIRCLE) && !combo_running(c_fc_at)) {
    at_x = {V.side};
    if (get_ival(PS4_LX) < 0) at_x = 0 - {V.side};
    combo_run(c_fc_at);
}`,
  },
];

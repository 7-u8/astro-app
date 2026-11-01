import { SHOT_BUTTONS, TACKLE_BUTTONS } from './buttons.js';
// FC (EA FC / FIFA) mods. Sequences come from the FC scripts in GPCS (FC26 MF / DICTATOR / FC26 V2).
// Each description says which button starts the mod. Buttons are the PS names used by the engine.
const v = (id, name, min, max, def, step = 1, big = 10) => ({ id, name, min, max, def, step, big });
const OFF_ON = ['OFF', 'ON'];

export const FC_MODS = [
  // ======================================================== AIM ASSIST
  {
    id: 'fc_aa_normal', cat: 'AIM ASSIST', name: 'AIM ASSIST', group: 'aa',
    desc: 'While L2 (aim) is held, the right stick sweeps left and right (AimAssist_Normal).',
    options: OFF_ON, def: 1,
    values: [v('str', 'STRENGTH', 1, 30, 10, 1, 5), v('t', 'TIME MS', 10, 100, 30, 5, 10)],
    combos: `combo c_fc_aan {
    set_val(PS4_RX, {V.str});
    wait({V.t});
    set_val(PS4_RX, 0 - {V.str});
    wait({V.t});
}`,
    logic: `if ({ST} && get_ival(PS4_L2) && !combo_running(c_fc_aan)) combo_run(c_fc_aan);`,
  },
  {
    id: 'fc_aa_shot', cat: 'AIM ASSIST', name: 'SHOT ASSIST', group: 'aa',
    desc: 'While R2 is held, the right stick moves up and down (AimAssist_Shot). Pulls aim for a shot.',
    options: OFF_ON, def: 1,
    values: [v('str', 'STRENGTH', 1, 100, 25, 1, 10), v('t', 'TIME MS', 10, 100, 30, 5, 10)],
    combos: `combo c_fc_aas {
    set_val(PS4_RY, {V.str});
    wait({V.t});
    set_val(PS4_RY, 0 - {V.str});
    wait({V.t});
}`,
    logic: `if ({ST} && get_ival(PS4_R2) && !combo_running(c_fc_aas)) combo_run(c_fc_aas);`,
  },

  // ======================================================== SHOOTING
  {
    id: 'fc_timed_finish', cat: 'SHOOTING', name: 'TIMED FINISH',
    desc: 'Press SHOT button: presses it, waits the power time, then taps again for the timed finish. Starts with SHOT button.',
    btn: { list: SHOT_BUTTONS, def: 'PS4_CIRCLE' },
    values: [v('p', 'POWER MS', 50, 500, 200, 10, 50), v('q', 'PAUSE MS', 50, 500, 100, 10, 50)],
    combos: `combo c_fc_tf {
    set_val({BTN}, 100);
    wait({V.p});
    set_val({BTN}, 0);
    wait({V.q});
    set_val({BTN}, 100);
    wait({V.p});
    set_val({BTN}, 0);
}`,
    logic: `if ({ST} && event_press({BTN}) && !get_ival(PS4_R1) && !combo_running(c_fc_tf)) combo_run(c_fc_tf);`,
  },
  {
    id: 'fc_timed_finesse', cat: 'SHOOTING', name: 'TIMED FINESSE',
    desc: 'Hold R1 and press SHOT button: a finesse shot timed like TIMED FINISH.',
    btn: { list: SHOT_BUTTONS, def: 'PS4_CIRCLE' },
    values: [v('p', 'POWER MS', 50, 500, 200, 10, 50), v('q', 'PAUSE MS', 50, 500, 100, 10, 50)],
    combos: `combo c_fc_tff {
    set_val({BTN}, 100);
    wait({V.p});
    set_val({BTN}, 0);
    wait({V.q});
    set_val({BTN}, 100);
    wait({V.p});
    set_val({BTN}, 0);
}`,
    logic: `if ({ST} && event_press({BTN}) && get_ival(PS4_R1) && !combo_running(c_fc_tff)) combo_run(c_fc_tff);`,
  },
  {
    id: 'fc_low_driven', cat: 'SHOOTING', name: 'LOW DRIVEN',
    desc: 'Hold R1 with L1 and press SHOT button: low driven shot (RB + LB + SHOT button for a set time).',
    btn: { list: SHOT_BUTTONS, def: 'PS4_CIRCLE' },
    values: [v('d', 'DURATION MS', 100, 1000, 400, 10, 50)],
    combos: `combo c_fc_ld {
    set_val(PS4_R1, 100);
    set_val(PS4_L1, 100);
    set_val({BTN}, 100);
    wait({V.d});
    set_val(PS4_R1, 0);
    set_val(PS4_L1, 0);
    set_val({BTN}, 0);
}`,
    logic: `if ({ST} && event_press({BTN}) && get_ival(PS4_R1) && get_ival(PS4_L1) && !combo_running(c_fc_ld)) combo_run(c_fc_ld);`,
  },
  {
    id: 'fc_power_shot', cat: 'SHOOTING', name: 'POWER SHOT',
    desc: 'Hold L1 and L2, press SHOT button: power/driven shot for 200 ms.',
    btn: { list: SHOT_BUTTONS, def: 'PS4_CIRCLE' },
    values: [v('d', 'DURATION MS', 100, 500, 200, 10, 50)],
    combos: `combo c_fc_ps {
    set_val(PS4_L1, 100);
    set_val(PS4_L2, 100);
    set_val({BTN}, 100);
    wait({V.d});
    set_val({BTN}, 0);
    set_val(PS4_L1, 0);
    set_val(PS4_L2, 0);
}`,
    logic: `if ({ST} && event_press({BTN}) && get_ival(PS4_L1) && get_ival(PS4_L2) && !combo_running(c_fc_ps)) combo_run(c_fc_ps);`,
  },
  {
    id: 'fc_curved', cat: 'SHOOTING', name: 'CURVED SHOT',
    desc: 'Hold L2 and press SHOT button: two taps while L2 is held, which bends the shot.',
    btn: { list: SHOT_BUTTONS, def: 'PS4_CIRCLE' },
    values: [v('d', 'TAP MS', 50, 300, 140, 10, 20)],
    combos: `combo c_fc_cs {
    set_val(PS4_L2, 100);
    set_val({BTN}, 100);
    wait({V.d});
    set_val({BTN}, 0);
    wait(60);
    set_val(PS4_L2, 100);
    set_val({BTN}, 100);
    wait({V.d});
    set_val({BTN}, 0);
    set_val(PS4_L2, 0);
}`,
    logic: `if ({ST} && event_press({BTN}) && get_ival(PS4_L2) && !combo_running(c_fc_cs)) combo_run(c_fc_cs);`,
  },
  {
    id: 'fc_chip', cat: 'SHOOTING', name: 'CHIP SHOT',
    desc: 'Hold L1 and press SHOT button: SHOT button + L1 for a set time to lift the ball.',
    btn: { list: SHOT_BUTTONS, def: 'PS4_CIRCLE' },
    values: [v('d', 'DURATION MS', 50, 500, 200, 10, 50)],
    combos: `combo c_fc_chip {
    set_val({BTN}, 100);
    set_val(PS4_L1, 100);
    wait({V.d});
    set_val({BTN}, 0);
    set_val(PS4_L1, 0);
}`,
    logic: `if ({ST} && event_press({BTN}) && get_ival(PS4_L1) && !get_ival(PS4_L2) && !combo_running(c_fc_chip)) combo_run(c_fc_chip);`,
  },
  {
    id: 'fc_knuckle', cat: 'SHOOTING', name: 'KNUCKLEBALL',
    desc: 'Free kick: right stick pushes up, down, up, then returns (KNUCKLEBALL). Starts with R1.',
    options: OFF_ON, def: 1,
    values: [v('w', 'STEP MS', 10, 200, 60, 5, 20)],
    combos: `combo c_fc_kn {
    set_val(PS4_RY, 100);
    wait({V.w});
    set_val(PS4_RY, 0);
    wait({V.w});
    set_val(PS4_RY, 0 - 100);
    wait({V.w});
    set_val(PS4_RY, 0);
    wait({V.w});
    set_val(PS4_RY, 100);
    wait({V.w});
    set_val(PS4_RY, 0);
}`,
    logic: `if ({ST} && event_press(PS4_R1) && !combo_running(c_fc_kn)) combo_run(c_fc_kn);`,
  },

  // ======================================================== PASSING
  {
    id: 'fc_double_ground', cat: 'MOVEMENT', name: 'DOUBLE TAP PASS',
    desc: 'Taps CROSS (A) twice quickly on each press: double tap ground pass.',
    options: OFF_ON, def: 1,
    values: [v('d', 'GAP MS', 10, 100, 30, 5, 10)],
    combos: `combo c_fc_dp {
    set_val(PS4_CROSS, 0);
    wait({V.d});
    set_val(PS4_CROSS, 100);
    wait(60);
    set_val(PS4_CROSS, 0);
}`,
    logic: `if ({ST} && event_press(PS4_CROSS) && !combo_running(c_fc_dp)) combo_run(c_fc_dp);`,
  },
  {
    id: 'fc_double_trough', cat: 'MOVEMENT', name: 'DOUBLE TAP TROUGH',
    desc: 'Taps TRIANGLE (Y) twice quickly on each press: double tap trough pass.',
    options: OFF_ON, def: 1,
    values: [v('d', 'GAP MS', 10, 100, 30, 5, 10)],
    combos: `combo c_fc_dt {
    set_val(PS4_TRIANGLE, 0);
    wait({V.d});
    set_val(PS4_TRIANGLE, 100);
    wait(60);
    set_val(PS4_TRIANGLE, 0);
}`,
    logic: `if ({ST} && event_press(PS4_TRIANGLE) && !combo_running(c_fc_dt)) combo_run(c_fc_dt);`,
  },

  // ======================================================== SKILLS (right stick)

  // ======================================================== MOVEMENT
  {
    id: 'fc_sprint_spam', cat: 'MOVEMENT', name: 'SPRINT SPAM',
    desc: 'Press L3: taps the sprint button (R2) on and off quickly (Sprint_Spam).',
    options: OFF_ON, def: 1,
    values: [v('on', 'ON MS', 30, 200, 80, 5, 20), v('off', 'OFF MS', 30, 300, 120, 5, 20)],
    combos: `combo c_fc_ss {
    set_val(PS4_R2, 100);
    wait({V.on});
    set_val(PS4_R2, 0);
    wait({V.off});
}`,
    logic: `if ({ST} && event_press(PS4_L3) && !combo_running(c_fc_ss)) combo_run(c_fc_ss);`,
  },
  {
    id: 'fc_tackle', cat: 'MOVEMENT', name: 'TACKLE',
    desc: 'Press the TACKLE button (L1 by default): presses sprint (R2) and the tackle button (L2) together for 60 ms.',
    btn: { list: TACKLE_BUTTONS, def: 'PS4_L1' },
    values: [v('d', 'DURATION MS', 30, 200, 60, 5, 10)],
    combos: `combo c_fc_tk {
    set_val(PS4_R2, 100);
    set_val(PS4_L2, 100);
    wait({V.d});
    set_val(PS4_R2, 0);
    set_val(PS4_L2, 0);
}`,
    logic: `if ({ST} && event_press({BTN}) && !combo_running(c_fc_tk)) combo_run(c_fc_tk);`,
  },
  {
    id: 'fc_jockey', cat: 'MOVEMENT', name: 'JOCKEY',
    desc: 'Press R3 with L3: changes left stick sensitivity and presses L3 + the tackle button for 1.28 s (JoCKEY).',
    options: OFF_ON, def: 1,
    values: [v('d', 'DURATION MS', 200, 2000, 1280, 20, 100)],
    combos: `combo c_fc_jk {
    set_val(PS4_L3, 100);
    set_val(PS4_L2, 100);
    wait({V.d});
    set_val(PS4_L3, 0);
    set_val(PS4_L2, 0);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && get_ival(PS4_L3) && !combo_running(c_fc_jk)) combo_run(c_fc_jk);`,
  },
  {
    id: 'fc_auto_jockey', cat: 'MOVEMENT', name: 'AUTO JOCKEY',
    desc: 'After L3 + R3 is pressed, the left stick sweeps right then left by itself (AutoJockey).',
    options: OFF_ON, def: 1,
    values: [v('a', 'RIGHT', 0, 100, 40, 1, 10), v('b', 'LEFT', 0, 100, 40, 1, 10), v('w', 'STEP MS', 20, 200, 80, 5, 20)],
    combos: `combo c_fc_aj {
    set_val(PS4_LX, {V.a});
    wait({V.w});
    set_val(PS4_LX, 0 - {V.b});
    wait({V.w});
    set_val(PS4_LX, 0);
}`,
    logic: `if ({ST} && event_press(PS4_L3) && get_ival(PS4_R3) && !combo_running(c_fc_aj)) combo_run(c_fc_aj);`,
  },
  {
    id: 'fc_player_lock', cat: 'MOVEMENT', name: 'PLAYER LOCK',
    desc: 'Press L3 and R3 together: presses both stick clicks for 80 ms (playerLockCombo).',
    options: OFF_ON, def: 1,
    values: [v('d', 'DURATION MS', 20, 300, 80, 5, 20)],
    combos: `combo c_fc_pl {
    set_val(PS4_L3, 100);
    set_val(PS4_R3, 100);
    wait({V.d});
    set_val(PS4_L3, 0);
    set_val(PS4_R3, 0);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && get_ival(PS4_L3) && !combo_running(c_fc_pl)) combo_run(c_fc_pl);`,
  },
  {
    id: 'fc_open_up', cat: 'MOVEMENT', name: 'OPEN UP',
    desc: 'Press L3: taps L3 for 100 ms to open up the angle (OPEN_UP_cmb).',
    options: OFF_ON, def: 1,
    values: [v('d', 'DURATION MS', 20, 300, 100, 5, 20)],
    combos: `combo c_fc_ou {
    set_val(PS4_L3, 100);
    wait({V.d});
    set_val(PS4_L3, 0);
}`,
    logic: `if ({ST} && event_press(PS4_L3) && !get_ival(PS4_R3) && !combo_running(c_fc_ou)) combo_run(c_fc_ou);`,
  },

  // ======================================================== CONTROL & SYSTEM
  {
    id: 'fc_ls_sens', cat: 'CONTROLLER', name: 'LS SENSITIVITY', control: true, order: 11,
    desc: 'Left stick sensitivity: GENERAL, and SPRINT when you hold the sprint button (Left Stick Sens / L S Sprint Sens).',
    options: OFF_ON, def: 1,
    values: [v('gen', 'GENERAL %', 10, 200, 100, 5, 20), v('spr', 'SPRINT %', 10, 200, 100, 5, 20)],
    logic: `if ({ST}) {
    if (get_ival(PS4_R2)) sensitivity(PS4_LX, 50, {V.spr});
    else sensitivity(PS4_LX, 50, {V.gen});
}`,
  },
  {
    id: 'fc_smart_ball', cat: 'MOVEMENT', name: 'SMART BALL',
    desc: 'While holding the ball, adds a small random wobble to the left stick, so the dribble looks natural (SmartBallControlPro).',
    options: OFF_ON, def: 1,
    values: [v('n', 'NOISE', 0, 10, 4, 1, 2)],
    logic: `if ({ST} && get_ival(PS4_L1) && (get_ival(PS4_LX) != 0 || get_ival(PS4_LY) != 0)) {
    stk_set(PS4_LX, random(0 - {V.n}, {V.n}));
    stk_set(PS4_LY, random(0 - {V.n}, {V.n}));
}`,
  },
];

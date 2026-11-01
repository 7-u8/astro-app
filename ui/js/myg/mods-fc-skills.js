// FC skills, generated from the MF script's skill combos (run_skill_combo + each combo's steps).
// Each skill: press R3 while the RIGHT stick points in its DIRECTION (UP / RIGHT / DOWN / LEFT).
// The skill moves the right stick relative to the LEFT stick (the way the FC scripts do it).
const v = (id, name, min, max, def, step = 1, big = 10) => ({ id, name, min, max, def, step, big });
const OFF_ON = ['OFF', 'ON'];

export const FC_SKILL_MODS = [
  {
    id: 'fc_sk_fake_shot', cat: 'MOVEMENT', name: 'FAKE SHOT',
    desc: 'Press R3 while the right stick points UP. Uses the left stick direction, the way the FC script does this skill (FAKE SHOT).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 1, 1, 1)],
    vars: 'int sd_fake_shot = 1;',
    combos: `combo c_fc_sk_fake_shot {
    sd_fake_shot = 1;
    set_val(PS4_CIRCLE, 100);
    wait(40);
    set_val(PS4_CIRCLE, 100);
    set_val(PS4_CROSS, 100);
    wait(60);
    set_val(PS4_CIRCLE, 0);
    set_val(PS4_CROSS, 100);
    wait(60);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_fake_shot)) combo_run(c_fc_sk_fake_shot);`,
  },
  {
    id: 'fc_sk_heel_to_heel_flick', cat: 'MOVEMENT', name: 'HEEL TO HEEL FLI',
    desc: 'Press R3 while the right stick points RIGHT. Uses the left stick direction, the way the FC script does this skill (HEEL TO HEEL FLICK).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 2, 1, 1)],
    vars: 'int sd_heel_to_heel_flick = 1;',
    combos: `combo c_fc_sk_heel_to_heel_flick {
    sd_heel_to_heel_flick = 1;
    set_val(PS4_RX, get_ival(PS4_LX));
    set_val(PS4_RY, get_ival(PS4_LY));
    wait(40);
    set_val(PS4_RX, 0);
    set_val(PS4_RY, 0);
    wait(40);
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_heel_to_heel_flick)) combo_run(c_fc_sk_heel_to_heel_flick);`,
  },
  {
    id: 'fc_sk_heel_flick_turn', cat: 'MOVEMENT', name: 'HEEL FLICK TURN',
    desc: 'Press R3 while the right stick points DOWN. Uses the left stick direction, the way the FC script does this skill (HEEL FLICK TURN).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 3, 1, 1)],
    vars: 'int sd_heel_flick_turn = 1;',
    combos: `combo c_fc_sk_heel_flick_turn {
    sd_heel_flick_turn = 1;
    set_val(PS4_RX, get_ival(PS4_LX));
    set_val(PS4_RY, get_ival(PS4_LY));
    wait(40);
    set_val(PS4_RX, 0);
    set_val(PS4_RY, 0);
    wait(40);
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_heel_flick_turn)) combo_run(c_fc_sk_heel_flick_turn);`,
  },
  {
    id: 'fc_sk_rainbow', cat: 'MOVEMENT', name: 'RAINBOW',
    desc: 'Press R3 while the right stick points LEFT. Uses the left stick direction, the way the FC script does this skill (RAINBOW).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 4, 1, 1)],
    vars: 'int sd_rainbow = 1;',
    combos: `combo c_fc_sk_rainbow {
    sd_rainbow = 1;
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    set_val(PS4_RX, get_ival(PS4_LX));
    set_val(PS4_RY, get_ival(PS4_LY));
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_rainbow)) combo_run(c_fc_sk_rainbow);`,
  },
  {
    id: 'fc_sk_fake_pass', cat: 'MOVEMENT', name: 'FAKE PASS',
    desc: 'Press R3 while the right stick points UP. Uses the left stick direction, the way the FC script does this skill (FAKE PASS).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 1, 1, 1)],
    vars: 'int sd_fake_pass = 1;',
    combos: `combo c_fc_sk_fake_pass {
    sd_fake_pass = 1;
    set_val(PS4_CIRCLE, 100);
    wait(40);
    set_val(PS4_CIRCLE, 100);
    set_val(PS4_CROSS, 100);
    wait(60);
    set_val(PS4_CIRCLE, 0);
    set_val(PS4_CROSS, 100);
    wait(60);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_fake_pass)) combo_run(c_fc_sk_fake_pass);`,
  },
  {
    id: 'fc_sk_step_over_feint', cat: 'MOVEMENT', name: 'STEP OVER FEINT',
    desc: 'Press R3 while the right stick points RIGHT. Uses the left stick direction, the way the FC script does this skill (STEP OVER FEINT).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 2, 1, 1)],
    vars: 'int sd_step_over_feint = 1;',
    combos: `combo c_fc_sk_step_over_feint {
    sd_step_over_feint = 1;
    set_val(PS4_RX, get_ival(PS4_LX));
    set_val(PS4_RY, get_ival(PS4_LY));
    wait(40);
    if (sd_step_over_feint == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_step_over_feint)) combo_run(c_fc_sk_step_over_feint);`,
  },
  {
    id: 'fc_sk_drag_to_drag', cat: 'MOVEMENT', name: 'DRAG TO DRAG',
    desc: 'Press R3 while the right stick points DOWN. Uses the left stick direction, the way the FC script does this skill (DRAG TO DRAG).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 3, 1, 1)],
    vars: 'int sd_drag_to_drag = 1;',
    combos: `combo c_fc_sk_drag_to_drag {
    sd_drag_to_drag = 1;
    set_val(PS4_LX, 0 - get_ival(PS4_LX));
    set_val(PS4_LY, 0 - get_ival(PS4_LY));
    wait(40);
    set_val(PS4_LX, 0 - get_ival(PS4_LX));
    set_val(PS4_LY, 0 - get_ival(PS4_LY));
    set_val(PS4_CIRCLE, 100);
    wait(40);
    set_val(PS4_LX, 0 - get_ival(PS4_LX));
    set_val(PS4_LY, 0 - get_ival(PS4_LY));
    set_val(PS4_CIRCLE, 100);
    set_val(PS4_CROSS, 100);
    wait(80);
    set_val(PS4_LX, 0 - get_ival(PS4_LX));
    set_val(PS4_LY, 0 - get_ival(PS4_LY));
    set_val(PS4_CIRCLE, 0);
    set_val(PS4_CROSS, 100);
    wait(60);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_drag_to_drag)) combo_run(c_fc_sk_drag_to_drag);`,
  },
  {
    id: 'fc_sk_hocus_pocus', cat: 'MOVEMENT', name: 'HOCUS POCUS',
    desc: 'Press R3 while the right stick points LEFT. Uses the left stick direction, the way the FC script does this skill (HOCUS POCUS).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 4, 1, 1)],
    vars: 'int sd_hocus_pocus = 1;',
    combos: `combo c_fc_sk_hocus_pocus {
    sd_hocus_pocus = 1;
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    sd_hocus_pocus = 0;
    if (sd_hocus_pocus == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    sd_hocus_pocus = 1;
    if (sd_hocus_pocus == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_hocus_pocus)) combo_run(c_fc_sk_hocus_pocus);`,
  },
  {
    id: 'fc_sk_triple_elastico', cat: 'MOVEMENT', name: 'TRIPLE ELASTICO',
    desc: 'Press R3 while the right stick points UP. Uses the left stick direction, the way the FC script does this skill (TRIPLE ELASTICO).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 1, 1, 1)],
    vars: 'int sd_triple_elastico = 1;',
    combos: `combo c_fc_sk_triple_elastico {
    sd_triple_elastico = 1;
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    sd_triple_elastico = 1;
    if (sd_triple_elastico == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    sd_triple_elastico = 0;
    if (sd_triple_elastico == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_triple_elastico)) combo_run(c_fc_sk_triple_elastico);`,
  },
  {
    id: 'fc_sk_cruyff_turn', cat: 'MOVEMENT', name: 'CRUYFF TURN',
    desc: 'Press R3 while the right stick points RIGHT. Uses the left stick direction, the way the FC script does this skill (CRUYFF TURN).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 2, 1, 1)],
    vars: 'int sd_cruyff_turn = 1;',
    combos: `combo c_fc_sk_cruyff_turn {
    sd_cruyff_turn = 1;
    set_val(PS4_LX, 0 - get_ival(PS4_LX));
    set_val(PS4_LY, 0 - get_ival(PS4_LY));
    set_val(PS4_CIRCLE, 100);
    wait(40);
    set_val(PS4_LX, 0 - get_ival(PS4_LX));
    set_val(PS4_LY, 0 - get_ival(PS4_LY));
    set_val(PS4_CIRCLE, 100);
    set_val(PS4_CROSS, 100);
    wait(80);
    set_val(PS4_LX, 0 - get_ival(PS4_LX));
    set_val(PS4_LY, 0 - get_ival(PS4_LY));
    set_val(PS4_CIRCLE, 0);
    set_val(PS4_CROSS, 100);
    wait(60);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_cruyff_turn)) combo_run(c_fc_sk_cruyff_turn);`,
  },
  {
    id: 'fc_sk_la_croqueta', cat: 'MOVEMENT', name: 'LA CROQUETA',
    desc: 'Press R3 while the right stick points DOWN. Uses the left stick direction, the way the FC script does this skill (LA CROQUETA).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 3, 1, 1)],
    vars: 'int sd_la_croqueta = 1;',
    combos: `combo c_fc_sk_la_croqueta {
    sd_la_croqueta = 1;
    set_val(PS4_L1, 100);
    if (sd_la_croqueta == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(500);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_la_croqueta)) combo_run(c_fc_sk_la_croqueta);`,
  },
  {
    id: 'fc_sk_ronaldo_chop', cat: 'MOVEMENT', name: 'RONALDO CHOP',
    desc: 'Press R3 while the right stick points LEFT. Uses the left stick direction, the way the FC script does this skill (RONALDO CHOP).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 4, 1, 1)],
    vars: 'int sd_ronaldo_chop = 1;',
    combos: `combo c_fc_sk_ronaldo_chop {
    sd_ronaldo_chop = 1;
    set_val(PS4_CIRCLE, 100);
    wait(40);
    set_val(PS4_CIRCLE, 100);
    set_val(PS4_CROSS, 100);
    wait(60);
    set_val(PS4_CIRCLE, 0);
    set_val(PS4_CROSS, 100);
    wait(60);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_ronaldo_chop)) combo_run(c_fc_sk_ronaldo_chop);`,
  },
  {
    id: 'fc_sk_roulette', cat: 'MOVEMENT', name: 'ROULETTE',
    desc: 'Press R3 while the right stick points UP. Uses the left stick direction, the way the FC script does this skill (ROULETTE).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 1, 1, 1)],
    vars: 'int sd_roulette = 1;',
    combos: `combo c_fc_sk_roulette {
    sd_roulette = 1;
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    if (sd_roulette == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
    set_val(PS4_RX, get_ival(PS4_LX));
    set_val(PS4_RY, get_ival(PS4_LY));
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_roulette)) combo_run(c_fc_sk_roulette);`,
  },
  {
    id: 'fc_sk_flair_roulette', cat: 'MOVEMENT', name: 'FLAIR ROULETTE',
    desc: 'Press R3 while the right stick points RIGHT. Uses the left stick direction, the way the FC script does this skill (FLAIR ROULETTE).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 2, 1, 1)],
    vars: 'int sd_flair_roulette = 1;',
    combos: `combo c_fc_sk_flair_roulette {
    sd_flair_roulette = 1;
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    if (sd_flair_roulette == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
    set_val(PS4_RX, get_ival(PS4_LX));
    set_val(PS4_RY, get_ival(PS4_LY));
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_flair_roulette)) combo_run(c_fc_sk_flair_roulette);`,
  },
  {
    id: 'fc_sk_ball_roll', cat: 'MOVEMENT', name: 'BALL ROLL',
    desc: 'Press R3 while the right stick points DOWN. Uses the left stick direction, the way the FC script does this skill (BALL ROLL).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 3, 1, 1)],
    vars: 'int sd_ball_roll = 1;',
    combos: `combo c_fc_sk_ball_roll {
    sd_ball_roll = 1;
    if (sd_ball_roll == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(250);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_ball_roll)) combo_run(c_fc_sk_ball_roll);`,
  },
  {
    id: 'fc_sk_berba_mcgeady_spin', cat: 'MOVEMENT', name: 'BERBA MCGEADY SP',
    desc: 'Press R3 while the right stick points LEFT. Uses the left stick direction, the way the FC script does this skill (BERBA MCGEADY SPIN).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 4, 1, 1)],
    vars: 'int sd_berba_mcgeady_spin = 1;',
    combos: `combo c_fc_sk_berba_mcgeady_spin {
    sd_berba_mcgeady_spin = 1;
    wait(40);
    set_val(PS4_RX, get_ival(PS4_LX));
    set_val(PS4_RY, get_ival(PS4_LY));
    wait(40);
    set_val(PS4_RX, 0);
    set_val(PS4_RY, 0);
    wait(40);
    if (sd_berba_mcgeady_spin == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_berba_mcgeady_spin)) combo_run(c_fc_sk_berba_mcgeady_spin);`,
  },
  {
    id: 'fc_sk_bolasie_flick', cat: 'MOVEMENT', name: 'BOLASIE FLICK',
    desc: 'Press R3 while the right stick points UP. Uses the left stick direction, the way the FC script does this skill (BOLASIE FLICK).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 1, 1, 1)],
    vars: 'int sd_bolasie_flick = 1;',
    combos: `combo c_fc_sk_bolasie_flick {
    sd_bolasie_flick = 1;
    wait(40);
    set_val(PS4_RX, get_ival(PS4_LX));
    set_val(PS4_RY, get_ival(PS4_LY));
    wait(40);
    set_val(PS4_RX, 0);
    set_val(PS4_RY, 0);
    wait(40);
    if (sd_bolasie_flick == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_bolasie_flick)) combo_run(c_fc_sk_bolasie_flick);`,
  },
  {
    id: 'fc_sk_tornado', cat: 'MOVEMENT', name: 'TORNADO',
    desc: 'Press R3 while the right stick points RIGHT. Uses the left stick direction, the way the FC script does this skill (TORNADO).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 2, 1, 1)],
    vars: 'int sd_tornado = 1;',
    combos: `combo c_fc_sk_tornado {
    sd_tornado = 1;
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    set_val(PS4_RX, 0);
    set_val(PS4_RY, 0);
    wait(40);
    if (sd_tornado == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_tornado)) combo_run(c_fc_sk_tornado);`,
  },
  {
    id: 'fc_sk_three_touch_roulette', cat: 'MOVEMENT', name: 'THREE TOUCH ROUL',
    desc: 'Press R3 while the right stick points DOWN. Uses the left stick direction, the way the FC script does this skill (THREE TOUCH ROULETTE).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 3, 1, 1)],
    vars: 'int sd_three_touch_roulette = 1;',
    combos: `combo c_fc_sk_three_touch_roulette {
    sd_three_touch_roulette = 1;
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    set_val(PS4_RX, 0);
    set_val(PS4_RY, 0);
    wait(40);
    if (sd_three_touch_roulette == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_three_touch_roulette)) combo_run(c_fc_sk_three_touch_roulette);`,
  },
  {
    id: 'fc_sk_alternative_elastico_chop', cat: 'MOVEMENT', name: 'ALTERNATIVE ELAS',
    desc: 'Press R3 while the right stick points LEFT. Uses the left stick direction, the way the FC script does this skill (ALTERNATIVE ELASTICO CHOP).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 4, 1, 1)],
    vars: 'int sd_alternative_elastico_chop = 1;',
    combos: `combo c_fc_sk_alternative_elastico_chop {
    sd_alternative_elastico_chop = 1;
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    set_val(PS4_RX, 0);
    set_val(PS4_RY, 0);
    wait(40);
    if (sd_alternative_elastico_chop == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_alternative_elastico_chop)) combo_run(c_fc_sk_alternative_elastico_chop);`,
  },
  {
    id: 'fc_sk_ball_roll_chop', cat: 'MOVEMENT', name: 'BALL ROLL CHOP',
    desc: 'Press R3 while the right stick points UP. Uses the left stick direction, the way the FC script does this skill (BALL ROLL CHOP).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 1, 1, 1)],
    vars: 'int sd_ball_roll_chop = 1;',
    combos: `combo c_fc_sk_ball_roll_chop {
    sd_ball_roll_chop = 1;
    if (sd_ball_roll_chop == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(300);
    set_val(PS4_RX, 0);
    set_val(PS4_RY, 0);
    wait(40);
    if (sd_ball_roll_chop == 1) {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    }
    wait(300);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_ball_roll_chop)) combo_run(c_fc_sk_ball_roll_chop);`,
  },
  {
    id: 'fc_sk_feint_and_exit', cat: 'MOVEMENT', name: 'FEINT AND EXIT',
    desc: 'Press R3 while the right stick points RIGHT. Uses the left stick direction, the way the FC script does this skill (FEINT AND EXIT).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 2, 1, 1)],
    vars: 'int sd_feint_and_exit = 1;',
    combos: `combo c_fc_sk_feint_and_exit {
    sd_feint_and_exit = 1;
    if (sd_feint_and_exit == 1) {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    }
    wait(40);
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    if (sd_feint_and_exit == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_feint_and_exit)) combo_run(c_fc_sk_feint_and_exit);`,
  },
  {
    id: 'fc_sk_feint_l_exit_r', cat: 'MOVEMENT', name: 'FEINT L EXIT R',
    desc: 'Press R3 while the right stick points DOWN. Uses the left stick direction, the way the FC script does this skill (FEINT L EXIT R).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 3, 1, 1)],
    vars: 'int sd_feint_l_exit_r = 1;',
    combos: `combo c_fc_sk_feint_l_exit_r {
    sd_feint_l_exit_r = 1;
    if (sd_feint_l_exit_r == 1) {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    }
    wait(40);
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    if (sd_feint_l_exit_r == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_feint_l_exit_r)) combo_run(c_fc_sk_feint_l_exit_r);`,
  },
  {
    id: 'fc_sk_lateral_heel_to_heel', cat: 'MOVEMENT', name: 'LATERAL HEEL TO ',
    desc: 'Press R3 while the right stick points LEFT. Uses the left stick direction, the way the FC script does this skill (LATERAL HEEL TO HEEL).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 4, 1, 1)],
    vars: 'int sd_lateral_heel_to_heel = 1;',
    combos: `combo c_fc_sk_lateral_heel_to_heel {
    sd_lateral_heel_to_heel = 1;
    set_val(PS4_L1, 100);
    if (sd_lateral_heel_to_heel == 1) {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    }
    wait(60);
    set_val(PS4_L1, 100);
    set_val(PS4_RX, 0);
    set_val(PS4_RY, 0);
    wait(60);
    set_val(PS4_L1, 100);
    if (sd_lateral_heel_to_heel == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(60);
    wait(300);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_lateral_heel_to_heel)) combo_run(c_fc_sk_lateral_heel_to_heel);`,
  },
  {
    id: 'fc_sk_waka_waka', cat: 'MOVEMENT', name: 'WAKA WAKA',
    desc: 'Press R3 while the right stick points UP. Uses the left stick direction, the way the FC script does this skill (WAKA WAKA).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 1, 1, 1)],
    vars: 'int sd_waka_waka = 1;',
    combos: `combo c_fc_sk_waka_waka {
    sd_waka_waka = 1;
    if (sd_waka_waka == 1) {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    }
    wait(40);
    set_val(PS4_LX, 0 - get_ival(PS4_LX));
    set_val(PS4_LY, 0 - get_ival(PS4_LY));
    set_val(PS4_RX, get_ival(PS4_LX));
    set_val(PS4_RY, get_ival(PS4_LY));
    wait(40);
    set_val(PS4_LX, 0 - get_ival(PS4_LX));
    set_val(PS4_LY, 0 - get_ival(PS4_LY));
    if (sd_waka_waka == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
    if (sd_waka_waka == 1) sd_waka_waka = 0;
    else sd_waka_waka = 1;
    wait(1000);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_waka_waka)) combo_run(c_fc_sk_waka_waka);`,
  },
  {
    id: 'fc_sk_body_feint', cat: 'MOVEMENT', name: 'BODY FEINT',
    desc: 'Press R3 while the right stick points RIGHT. Uses the left stick direction, the way the FC script does this skill (BODY FEINT).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 2, 1, 1)],
    vars: 'int sd_body_feint = 1;',
    combos: `combo c_fc_sk_body_feint {
    sd_body_feint = 1;
    if (sd_body_feint == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(100);
    set_val(PS4_RX, 0);
    set_val(PS4_RY, 0);
    wait(80);
    wait(600);
    wait(600);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_body_feint)) combo_run(c_fc_sk_body_feint);`,
  },
  {
    id: 'fc_sk_cancel_shoot', cat: 'MOVEMENT', name: 'CANCEL SHOOT',
    desc: 'Press R3 while the right stick points DOWN. Uses the left stick direction, the way the FC script does this skill (CANCEL SHOOT).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 3, 1, 1)],
    vars: 'int sd_cancel_shoot = 1;',
    combos: `combo c_fc_sk_cancel_shoot {
    sd_cancel_shoot = 1;
    set_val(PS4_CIRCLE, 100);
    wait(290);
    wait(300);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_cancel_shoot)) combo_run(c_fc_sk_cancel_shoot);`,
  },
  {
    id: 'fc_sk_directional_nutmeg', cat: 'MOVEMENT', name: 'DIRECTIONAL NUTM',
    desc: 'Press R3 while the right stick points LEFT. Uses the left stick direction, the way the FC script does this skill (DIRECTIONAL NUTMEG).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 4, 1, 1)],
    vars: 'int sd_directional_nutmeg = 1;',
    combos: `combo c_fc_sk_directional_nutmeg {
    sd_directional_nutmeg = 1;
    set_val(PS4_R1, 100);
    set_val(PS4_L1, 100);
    wait(20);
    set_val(PS4_R1, 100);
    set_val(PS4_L1, 100);
    wait(100);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_directional_nutmeg)) combo_run(c_fc_sk_directional_nutmeg);`,
  },
  {
    id: 'fc_sk_canceled_berba_spin', cat: 'MOVEMENT', name: 'CANCELED BERBA S',
    desc: 'Press R3 while the right stick points UP. Uses the left stick direction, the way the FC script does this skill (CANCELED BERBA SPIN).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 1, 1, 1)],
    vars: 'int sd_canceled_berba_spin = 1;',
    combos: `combo c_fc_sk_canceled_berba_spin {
    sd_canceled_berba_spin = 1;
    set_val(PS4_RX, get_ival(PS4_LX));
    set_val(PS4_RY, get_ival(PS4_LY));
    wait(40);
    set_val(PS4_RX, 0);
    set_val(PS4_RY, 0);
    wait(40);
    if (sd_canceled_berba_spin == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
    wait(200);
    wait(300);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_canceled_berba_spin)) combo_run(c_fc_sk_canceled_berba_spin);`,
  },
  {
    id: 'fc_sk_canceled_berba_spin_with_direction', cat: 'MOVEMENT', name: 'CANCELED BERBA S',
    desc: 'Press R3 while the right stick points RIGHT. Uses the left stick direction, the way the FC script does this skill (CANCELED BERBA SPIN WITH DIRECTION).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 2, 1, 1)],
    vars: 'int sd_canceled_berba_spin_with_direction = 1;',
    combos: `combo c_fc_sk_canceled_berba_spin_with_direction {
    sd_canceled_berba_spin_with_direction = 1;
    set_val(PS4_RX, get_ival(PS4_LX));
    set_val(PS4_RY, get_ival(PS4_LY));
    wait(40);
    set_val(PS4_RX, 0);
    set_val(PS4_RY, 0);
    wait(40);
    if (sd_canceled_berba_spin_with_direction == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(40);
    wait(200);
    wait(300);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_canceled_berba_spin_with_direction)) combo_run(c_fc_sk_canceled_berba_spin_with_direction);`,
  },
  {
    id: 'fc_sk_ball_roll_to_scoop_turn', cat: 'MOVEMENT', name: 'BALL ROLL TO SCO',
    desc: 'Press R3 while the right stick points DOWN. Uses the left stick direction, the way the FC script does this skill (BALL ROLL TO SCOOP TURN).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 3, 1, 1)],
    vars: 'int sd_ball_roll_to_scoop_turn = 1;',
    combos: `combo c_fc_sk_ball_roll_to_scoop_turn {
    sd_ball_roll_to_scoop_turn = 1;
    if (sd_ball_roll_to_scoop_turn == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(280);
    set_val(PS4_CIRCLE, 100);
    wait(40);
    set_val(PS4_CIRCLE, 100);
    set_val(PS4_CROSS, 100);
    wait(60);
    set_val(PS4_CIRCLE, 0);
    set_val(PS4_CROSS, 100);
    wait(60);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_ball_roll_to_scoop_turn)) combo_run(c_fc_sk_ball_roll_to_scoop_turn);`,
  },
  {
    id: 'fc_sk_scoop_turn_fake', cat: 'MOVEMENT', name: 'SCOOP TURN FAKE',
    desc: 'Press R3 while the right stick points LEFT. Uses the left stick direction, the way the FC script does this skill (SCOOP TURN FAKE).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 4, 1, 1)],
    vars: 'int sd_scoop_turn_fake = 1;',
    combos: `combo c_fc_sk_scoop_turn_fake {
    sd_scoop_turn_fake = 1;
    if (sd_scoop_turn_fake == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(280);
    set_val(PS4_CIRCLE, 100);
    wait(40);
    set_val(PS4_CIRCLE, 100);
    set_val(PS4_CROSS, 100);
    wait(60);
    set_val(PS4_CIRCLE, 0);
    set_val(PS4_CROSS, 100);
    wait(60);
    wait(250);
    wait(300);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_scoop_turn_fake)) combo_run(c_fc_sk_scoop_turn_fake);`,
  },
  {
    id: 'fc_sk_ball_roll_step_over', cat: 'MOVEMENT', name: 'BALL ROLL STEP O',
    desc: 'Press R3 while the right stick points UP. Uses the left stick direction, the way the FC script does this skill (BALL ROLL STEP OVER).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 1, 1, 1)],
    vars: 'int sd_ball_roll_step_over = 1;',
    combos: `combo c_fc_sk_ball_roll_step_over {
    sd_ball_roll_step_over = 1;
    if (sd_ball_roll_step_over == 1) {
        set_val(PS4_RX, 0 - get_ival(PS4_LY));
        set_val(PS4_RY, get_ival(PS4_LX));
    } else {
        set_val(PS4_RX, get_ival(PS4_LY));
        set_val(PS4_RY, 0 - get_ival(PS4_LX));
    }
    wait(300);
    set_val(PS4_RX, get_ival(PS4_LX));
    set_val(PS4_RY, get_ival(PS4_LY));
    wait(60);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_ball_roll_step_over)) combo_run(c_fc_sk_ball_roll_step_over);`,
  },
  {
    id: 'fc_sk_canceled_4_touch_turn', cat: 'MOVEMENT', name: 'CANCELED 4 TOUCH',
    desc: 'Press R3 while the right stick points RIGHT. Uses the left stick direction, the way the FC script does this skill (CANCELED 4 TOUCH TURN).',
    options: OFF_ON, def: 1,
    values: [v('dir', 'DIRECTION', 1, 4, 2, 1, 1)],
    vars: 'int sd_canceled_4_touch_turn = 1;',
    combos: `combo c_fc_sk_canceled_4_touch_turn {
    sd_canceled_4_touch_turn = 1;
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    wait(30);
    set_val(PS4_RX, 0 - get_ival(PS4_LX));
    set_val(PS4_RY, 0 - get_ival(PS4_LY));
    wait(40);
    set_val(PS4_LX, 0 - get_ival(PS4_LX));
    set_val(PS4_LY, 0 - get_ival(PS4_LY));
    wait(400);
    wait(70);
}`,
    logic: `if ({ST} && event_press(PS4_R3) && ({V.dir} == 1 && get_ival(PS4_RY) < -50 || {V.dir} == 2 && get_ival(PS4_RX) > 50 || {V.dir} == 3 && get_ival(PS4_RY) > 50 || {V.dir} == 4 && get_ival(PS4_RX) < -50) && !combo_running(c_fc_sk_canceled_4_touch_turn)) combo_run(c_fc_sk_canceled_4_touch_turn);`,
  },
];

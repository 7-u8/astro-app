// Mod lists per game. Each game shows only its own mods in the MODS step.
// A section is { title, ids }: the MODS step shows one tab per section.
import { MODS, MOD_CATEGORIES } from './mods.js';
import { OW_HERO_IDS } from './mods-ow.js';

// CALL OF DUTY: every feature extracted from the CALL OF DUTY scripts, in the same sections.
const COD_SECTIONS = [
  { title: 'AIM ASSIST', ids: ['aa_polar', 'aa_adv', 'aa_taylor', 'aa_dogz', 'aa_sticky', 'aa_legacy', 'aa_rotate', 'aa_boost', 'aa_head', 'aa_track', 'aa_hip'] },
  { title: 'ANTI RECOIL', ids: ['ar_basic', 'ar_prog', 'ar_rumble', 'ar_weapon', 'ar_wobble'] },
  { title: 'FIRING', ids: ['sh_rapid', 'sh_burst', 'sh_akimbo', 'sh_qs', 'sh_breath', 'sh_crouch', 'sh_drop', 'mv_drop', 'mv_melee', 'sh_cancel_reload', 'sh_autoreload', 'ctl_hair'] },
  { title: 'MOVEMENT', ids: ['mv_bhop', 'sh_jump', 'mv_slide', 'mv_snake', 'mv_strafe', 'sh_strafe', 'mv_jitter', 'mv_crouch_jump', 'mv_yy', 'mv_sprint', 'sh_ping'] },
  { title: 'CONTROL & SYSTEM', ids: ['ut_kill', 'ctl_rumble', 'ctl_layout', 'ctl_stick', 'ctl_flip', 'ctl_inv', 'ctl_dz', 'ctl_sens', 'ctl_vm', 'ctl_cross'] },
];

// FORTNITE: its features (Brave Aim family and the others), in the same sections.
const FORTNITE_SECTIONS = [
  { title: 'AIM ASSIST', ids: ['fn_auto_aim', 'fn_ads_aa', 'fn_ads_sticky', 'fn_booster', 'fn_auto_track', 'fn_expo', 'fn_pulse', 'aa_polar', 'aa_adv', 'aa_head', 'aa_legacy', 'aa_boost', 'aa_sticky'] },
  { title: 'ANTI RECOIL', ids: ['ar_basic', 'ar_prog'] },
  { title: 'FIRING', ids: ['sh_rapid', 'sh_burst', 'ctl_hair', 'fn_bloom'] },
  { title: 'MOVEMENT', ids: ['mv_bhop', 'mv_yy', 'sh_strafe', 'mv_strafe', 'mv_jitter', 'mv_crouch_jump', 'fn_pickup'] },
  { title: 'CONTROL & SYSTEM', ids: ['ut_kill', 'ctl_layout', 'ctl_stick', 'ctl_dz', 'ctl_sens', 'ctl_vm'] },
  { title: 'OTHER STEPS', ids: [], note: 'Not built as mods yet: Dynamic Finish (hold-time power), Zone Saver, Auto Switch, Penalty and Free Kick menus, Teammate Control, Sprint + Pass, Use Finesse, Shot Power direction settings, Lob / Driven / Chip / Pass MIN power levels, Precision Shot and Curve, controller type and button remapping, Green Timed (FC25). Notify and vibration are in the MENU step.' },
];

// FC: its mods (FC26 MF / DICTATOR family and the FC26 V2 family), in sections.
const FC_SECTIONS = [
  { title: 'AIM ASSIST', ids: ['fc_aa_normal', 'fc_aa_shot', 'fc_auto_target'] },
  { title: 'SHOOTING', ids: ['fc_timed_finish', 'fc_timed_finesse', 'fc_low_driven', 'fc_power_shot', 'fc_curved', 'fc_chip', 'fc_knuckle'] },
  { title: 'PASSING & SKILLS', ids: ['fc_double_ground', 'fc_double_trough', 'fc_precision_pass', 'fc_precision_through', 'fc_sk_fake_shot', 'fc_sk_heel_to_heel_flick', 'fc_sk_heel_flick_turn', 'fc_sk_rainbow', 'fc_sk_fake_pass', 'fc_sk_step_over_feint', 'fc_sk_drag_to_drag', 'fc_sk_hocus_pocus', 'fc_sk_triple_elastico', 'fc_sk_cruyff_turn', 'fc_sk_la_croqueta', 'fc_sk_ronaldo_chop', 'fc_sk_roulette', 'fc_sk_flair_roulette', 'fc_sk_ball_roll', 'fc_sk_berba_mcgeady_spin', 'fc_sk_bolasie_flick', 'fc_sk_tornado', 'fc_sk_three_touch_roulette', 'fc_sk_alternative_elastico_chop', 'fc_sk_ball_roll_chop', 'fc_sk_feint_and_exit', 'fc_sk_feint_l_exit_r', 'fc_sk_lateral_heel_to_heel', 'fc_sk_waka_waka', 'fc_sk_body_feint', 'fc_sk_cancel_shoot', 'fc_sk_directional_nutmeg', 'fc_sk_canceled_berba_spin', 'fc_sk_canceled_berba_spin_with_direction', 'fc_sk_ball_roll_to_scoop_turn', 'fc_sk_scoop_turn_fake', 'fc_sk_ball_roll_step_over', 'fc_sk_canceled_4_touch_turn'] },
  { title: 'MOVEMENT', ids: ['fc_sprint_spam', 'fc_tackle', 'fc_jockey', 'fc_auto_jockey', 'fc_player_lock', 'fc_open_up', 'fc_smart_ball'] },
  { title: 'CONTROL & SYSTEM', ids: ['fc_ls_sens', 'fc_defence'] },
  { title: 'OTHER STEPS', ids: [], note: 'Not mods yet: the other FC skills (Rainbow, Roulette, Stepover, Heel, Nutmeg, Drag Back, Cruyff, Croqueta and about 60 more), Precision pass/through, Dynamic finish, Penalty and free kick menus, Defence mod, Zone saver, Auto target and Auto switch. Their sequences are in the FC scripts and can be added next.' },
];

// OVERWATCH: the shared features, the recoil of the heroes and every hero (hero select + hero features).
const OVERWATCH_SECTIONS = [
  { title: 'AIM ASSIST', ids: ['aa_polar', 'aa_legacy', 'aa_sticky', 'aa_rotate', 'aa_track', 'aa_head', 'aa_hip', 'ow_steady'] },
  { title: 'ANTI RECOIL', ids: ['ar_basic', 'ar_prog', 'ow_soldier_ar', 'ow_ar_cassidy', 'ow_ar_baptiste'] },
  { title: 'SHOOTING', ids: ['sh_rapid', 'sh_crouch', 'sh_ping', 'ctl_hair', 'sh_qs', 'sh_drop'] },
  { title: 'MOVEMENT', ids: ['mv_bhop', 'mv_sprint', 'mv_slide', 'sh_strafe', 'mv_yy'] },
  { title: 'CONTROLLER', ids: ['ctl_dz', 'ctl_sens', 'ctl_rumble', 'ctl_vm', 'ctl_layout', 'sh_autoreload', 'ut_kill'] },
  { title: 'HERO MODS', ids: ['ow_hero', 'ow_hero_btn', ...OW_HERO_IDS] },
];

// Games whose mod lists are not built yet: they have a page but no mods.
const NOT_BUILT = [];

/** Sections of the MODS step for a game. No game chosen = the general catalogue (by category). */
export function sectionsFor(game) {
  if (!game) return MOD_CATEGORIES.map((c) => ({ title: c, ids: MODS.filter((m) => m.cat === c).map((m) => m.id) }));
  if (game === 'cod') return COD_SECTIONS;
  if (game === 'fortnite') return FORTNITE_SECTIONS;
  if (game === 'fc') return FC_SECTIONS;
  if (game === 'overwatch') return OVERWATCH_SECTIONS;
  if (NOT_BUILT.includes(game)) return [];
  return [];
}

/** Every mod id listed for a game (used to check the lists cover the catalogue). */
export function idsFor(game) {
  return sectionsFor(game).flatMap((s) => s.ids);
}

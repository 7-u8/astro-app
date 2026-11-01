// OVERWATCH mods: the hero select, the hero button, the hero features and the hero-only recoil mods.
// Hero numbers follow the OW scripts (0 = none, 1 = ASHE ... 36 = RAMATTRA).
// The shared OVERWATCH features (Polar AA, Rapid Fire, ...) are the existing mods of the catalogue.
const v = (id, name, min, max, def, step = 1, big = 10) => ({ id, name, min, max, def, step, big });
const OFF_ON = ['OFF', 'ON'];

// Option names are cut to 10 characters on the device, so the long ones are short here.
export const OW_HERO_OPTIONS = ['NONE', 'ASHE', 'BASTION', 'ECHO', 'GENJI', 'HANZO', 'JUNKRAT', 'CASSIDY', 'MEI', 'PHARAH',
  'REAPER', 'SOJOURN', 'SOLDIER 76', 'SOMBRA', 'SYMMETRA', 'TORBJORN', 'TRACER', 'WIDOWMAKER', 'ANA', 'BAPTISTE',
  'BRIGITTE', 'KIRIKO', 'LUCIO', 'MERCY', 'MOIRA', 'ZENYATTA', 'D.VA', 'DOOMFIST', 'JUNKER Q', 'ORISA',
  'REINHARDT', 'ROADHOG', 'SIGMA', 'WINSTON', 'WRECK BALL', 'ZARYA', 'RAMATTRA'];

const HERO_BUTTONS = ['PS4_DOWN', 'PS4_LEFT', 'PS4_RIGHT', 'PS4_UP', 'PS4_L3', 'PS4_R3', 'PS4_TOUCH'];

// Buttons of the default layout: fire R2, ADS L2, ability one L1, ability two R1, jump CROSS, crouch CIRCLE,
// melee SQUARE, ultimate TRIANGLE.
const HERO_FEATURES = [
  // [hero no., name, what it does, [[button, ms], ...] (null button = wait)]
  [1, 'ASHE SHOTGUN', 'shotgun jump: jump, then the shot', [['PS4_CROSS', 60], ['PS4_R2', 120]]],
  [2, 'BASTION GRENADE', 'tactical grenade jump: jump, then the ability', [['PS4_CROSS', 60], ['PS4_R1', 80]]],
  [3, 'ECHO LIFT', 'hold to lift: jump twice', [['PS4_CROSS', 80], [null, 150], ['PS4_CROSS', 80]]],
  [4, 'GENJI SHURIKEN', 'shuriken melee: a quick melee', [['PS4_SQUARE', 60]]],
  [4, 'GENJI DASH', 'dash alt fire: alt fire then fire', [['PS4_R1', 60], ['PS4_R2', 60]]],
  [5, 'HANZO STORM', 'auto storm arrow: three fast shots', [['PS4_R2', 50], [null, 50], ['PS4_R2', 50], [null, 50], ['PS4_R2', 50]]],
  [6, 'JUNK MINE JUMP', 'mine jump: jump, then the mine', [['PS4_CROSS', 60], ['PS4_L1', 60]]],
  [6, 'JUNK AUTO DET', 'auto detonate: two taps of the mine button', [['PS4_R1', 60], [null, 100], ['PS4_R1', 60]]],
  [7, 'CASS BETTER ROLL', 'better roll: crouch, then jump', [['PS4_CIRCLE', 80], ['PS4_CROSS', 80]]],
  [7, 'CASS ULT CANCEL', 'ult cancel: ultimate, then crouch to cancel it', [['PS4_TRIANGLE', 60], ['PS4_CIRCLE', 60]]],
  [8, 'MEI WALL', 'instant wall: the ability', [['PS4_L1', 80]]],
  [9, 'PHARAH ROCKET', 'rocket jump: crouch, jump, then fire the rocket', [['PS4_CIRCLE', 60], ['PS4_CROSS', 60], ['PS4_R2', 200]]],
  [10, 'REAPER WRAITH', 'exit wraith form: the second ability', [['PS4_R1', 100]]],
  [11, 'SOJOURN SLIDE', 'slide jump: crouch, then jump', [['PS4_CIRCLE', 80], ['PS4_CROSS', 80]]],
  [12, 'SOLDIER ROCKET', 'rocket jump: crouch, jump, then fire the rocket', [['PS4_CIRCLE', 60], ['PS4_CROSS', 60], ['PS4_R2', 200]]],
  [13, 'SOMBRA HACK', 'auto hack: the ability three times', [['PS4_L1', 80], [null, 80], ['PS4_L1', 80]]],
  [14, 'SYM CHARGED', 'full charged orbs: hold fire', [['PS4_R2', 400]]],
  [14, 'SYM WALL', 'instant wall: the ability', [['PS4_L1', 80]]],
  [14, 'SYM AUTO TP', 'auto teleport: the second ability', [['PS4_R1', 60]]],
  [15, 'TORB HAMMER', 'hold to hammer: melee held', [['PS4_SQUARE', 300]]],
  [15, 'TORB OVERLOAD', 'auto overload: two taps of the second ability', [['PS4_R1', 60], [null, 80], ['PS4_R1', 60]]],
  [16, 'TRACER BLINK', 'blink melee: blink, then melee', [['PS4_L1', 60], ['PS4_SQUARE', 60]]],
  [17, 'WIDOW HOOK', 'hook jump: jump, then the hook', [['PS4_CROSS', 60], ['PS4_L1', 80]]],
  [17, 'WIDOW CROUCH', 'crouch shot: crouch, then fire', [['PS4_CIRCLE', 80], ['PS4_R2', 80]]],
  [18, 'ANA QUICK SCOPE', 'quick scope: ADS, then fire', [['PS4_L2', 80], ['PS4_R2', 80]]],
  [19, 'BAP MATRIX', 'instant matrix: the ability', [['PS4_L1', 60]]],
  [20, 'BRIG BASH', 'instant bash: melee', [['PS4_SQUARE', 60]]],
  [21, 'KIRIKO HEAL', 'heal shot: the second ability', [['PS4_R1', 60]]],
  [22, 'LUCIO SWAP', 'swap and amp: the second ability', [['PS4_R1', 60]]],
  [23, 'MERCY SUPER J', 'better super jump: jump, wait, jump', [['PS4_CROSS', 60], [null, 100], ['PS4_CROSS', 60]]],
  [23, 'MERCY GA RESET', 'GA reset: the ability', [['PS4_L1', 80]]],
  [24, 'MOIRA DOUBLE', 'double tap orb: two taps of fire', [['PS4_R2', 60], [null, 60], ['PS4_R2', 60]]],
  [24, 'MOIRA FADE', 'orb fade: the second ability', [['PS4_R1', 60]]],
  [25, 'ZEN DISCORD', 'auto discord: a tap of fire', [['PS4_R2', 60]]],
  [26, 'DVA FLYING', 'flying ultimate: jump, then the ultimate', [['PS4_CROSS', 60], ['PS4_TRIANGLE', 80]]],
  [27, 'DOOM SLAM', 'slam cancel: crouch, then jump', [['PS4_CIRCLE', 80], ['PS4_CROSS', 80]]],
  [28, 'JQ SHOOT MELEE', 'shoot melee: fire, then melee', [['PS4_R2', 60], ['PS4_SQUARE', 60]]],
  [29, 'ORISA RELEASE', 'ultimate release: the ultimate', [['PS4_TRIANGLE', 80]]],
  [30, 'REIN STRIKE', 'double strike: two melee taps', [['PS4_SQUARE', 60], [null, 60], ['PS4_SQUARE', 60]]],
  [30, 'REIN CHARGE', 'charge cancel swing: crouch, then melee', [['PS4_CIRCLE', 80], ['PS4_SQUARE', 60]]],
  [31, 'ROAD HOOK', 'shoot hook: fire, then the hook', [['PS4_R2', 60], ['PS4_L1', 60]]],
  [32, 'SIGMA LIFT', 'ult levitate: the ultimate, then jump', [['PS4_TRIANGLE', 80], ['PS4_CROSS', 80]]],
  [33, 'WINSTON LEAP', 'leap melee: jump, then melee', [['PS4_CROSS', 60], ['PS4_SQUARE', 80]]],
  [34, 'WRECK PILE', 'mine piledriver: jump, then fire', [['PS4_CROSS', 80], ['PS4_R2', 80]]],
  [35, 'ZARYA PULSE', 'pulse jump: jump, then the second ability', [['PS4_CROSS', 60], ['PS4_R1', 60]]],
  [36, 'RAMA SHIELD', 'shield confirm: the ability', [['PS4_L1', 80]]],
];

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

// The hero select: its option number is the hero number used by every hero feature.
const HERO_SELECT = {
  id: 'ow_hero', cat: 'HERO MODS', name: 'HERO SELECT',
  desc: 'Pick the hero. Every hero feature only works for the hero picked here. Added to the script automatically when you pick a hero feature.',
  options: OW_HERO_OPTIONS, def: 0, values: [],
  logic: '',
};

// The button that starts the hero features (OFF turns them all off).
const HERO_BUTTON = {
  id: 'ow_hero_btn', cat: 'HERO MODS', name: 'HERO BUTTON', control: false,
  desc: 'The button that starts a hero feature. Added to the script automatically when you pick a hero feature.',
  btn: { list: HERO_BUTTONS, def: 'PS4_DOWN' }, values: [],
  logic: '',
};

// One hero feature: a combo of the steps, started by the hero button while the hero is picked.
function heroFeature([hero, name, what, steps]) {
  const id = `ow_h_${hero}_${slug(name)}`;
  const body = steps.map(([b, ms]) => (b ? `    set_val(${b}, 100);\n    wait(${ms});\n    set_val(${b}, 0);` : `    wait(${ms});`)).join('\n');
  return {
    id, cat: 'HERO MODS', name,
    desc: `${OW_HERO_OPTIONS[hero]}: ${what}. Approximate: the steps are a close copy of the OW feature, not its exact timing.`,
    requires: ['ow_hero', 'ow_hero_btn'],
    options: OFF_ON, def: 1, values: [],
    combos: `combo c_${id} {\n${body}\n}`,
    logic: `if ({ST} && {HERO} == ${hero} && event_press({BTN@ow_hero_btn}) && !combo_running(c_${id})) combo_run(c_${id});`,
  };
}

// A recoil pull that only works for one hero (Cassidy, Baptiste).
function heroRecoil(id, name, hero, desc) {
  return {
    id, cat: 'ANTI RECOIL', name,
    desc: `${desc} Works only when ${OW_HERO_OPTIONS[hero]} is picked in HERO SELECT.`,
    requires: ['ow_hero'],
    options: OFF_ON, def: 1,
    values: [v('v', 'VERTICAL', 0, 100, 25, 1, 10)],
    logic: `if ({ST} && {HERO} == ${hero} && is_fire()) stk_soft(s_ry, {V.v} * ar_dir);`,
  };
}

export const OW_HERO_FEATURES = HERO_FEATURES.map(heroFeature);
export const OW_HERO_IDS = OW_HERO_FEATURES.map((m) => m.id);

export const OW_MODS = [
  HERO_SELECT,
  HERO_BUTTON,
  ...OW_HERO_FEATURES,

  heroRecoil('ow_ar_cassidy', 'CASSIDY AR', 7, 'Cassidy anti recoil: a pull down while firing.'),
  heroRecoil('ow_ar_baptiste', 'BAPTISTE AR', 19, 'Baptiste anti recoil: a pull down while firing.'),
  {
    id: 'ow_soldier_ar', cat: 'ANTI RECOIL', name: 'SOLDIER AR',
    desc: 'Soldier: 76 anti recoil. The pull grows with every 100 ms of fire, up to STEPS. Works only when SOLDIER 76 is picked in HERO SELECT.',
    requires: ['ow_hero'],
    options: OFF_ON, def: 1,
    values: [v('base', 'BASE', 0, 100, 10, 1, 5), v('step', 'STEP', 0, 20, 2, 1, 2), v('steps', 'STEPS', 1, 20, 8, 1, 2)],
    vars: 'int osa_t, osa_n;',
    logic: `if ({ST} && {HERO} == 12 && is_fire()) {
    osa_t += get_rtime();
    if (osa_t >= 100) {
        osa_t = 0;
        if (osa_n < {V.steps}) osa_n++;
    }
    stk_soft(s_ry, ({V.base} + osa_n * {V.step}) * ar_dir);
} else {
    osa_t = 0;
    osa_n = 0;
}`,
  },

  {
    id: 'ow_steady', cat: 'AIM ASSIST', name: 'STEADY AIM',
    desc: 'While L2 (aim) is held, both sticks move at half strength, so the aim stays still (Steady Aim).',
    options: OFF_ON, def: 1, values: [],
    logic: `if ({ST} && get_ival(PS4_L2)) {
    set_val(s_rx, get_val(s_rx) / 2);
    set_val(s_ry, get_val(s_ry) / 2);
}`,
  },
];

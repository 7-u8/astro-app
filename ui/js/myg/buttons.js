// Buttons a mod can use for its shot or its tackle. The user picks one in the mod's own settings.
// The buttons are the mod's options (OFF first, then these), so the device menu shows their names too.
export const SHOT_BUTTONS = ['PS4_CIRCLE', 'PS4_SQUARE', 'PS4_CROSS', 'PS4_TRIANGLE'];
export const TACKLE_BUTTONS = ['PS4_L1', 'PS4_R1', 'PS4_L3', 'PS4_R3', 'PS4_CIRCLE', 'PS4_SQUARE', 'PS4_CROSS', 'PS4_TRIANGLE'];

/**
 * A mod with `btn: { list, def }` gets options OFF + the list, and def = the button `def`.
 * Its code uses {BTN}: composeMods turns it into a variable set from the chosen option.
 */
export function withButton(mod) {
  if (!mod.btn) return mod;
  const list = mod.btn.list;
  return {
    ...mod,
    options: ['OFF', ...list.map((b) => b.replace('PS4_', ''))],
    def: list.indexOf(mod.btn.def) + 1,
  };
}

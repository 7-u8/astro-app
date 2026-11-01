// GPC vocabulary for syntax highlighting (from the public GPC language reference).
// Identifiers in ALL_CAPS (button and console constants) are highlighted as constants.

export const GPC_KEYWORDS = [
  'main', 'init', 'combo', 'function', 'define', 'data', 'const', 'enum', 'remap', 'unmap',
  'int', 'int8', 'int16', 'int32', 'uint8', 'uint16', 'uint32', 'string', 'image', 'fix32',
  'if', 'else', 'while', 'for', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return',
  'TRUE', 'FALSE', 'NOT_USE',
];

export const GPC_FUNCTIONS = [
  // I/O
  'get_val', 'set_val', 'get_lval', 'get_ival', 'get_ptime', 'get_rtime', 'get_controller', 'get_console',
  'event_press', 'event_release', 'block', 'block_all_inputs', 'swap', 'sensitivity', 'deadzone', 'stickize',
  'ps4_touchpad', 'ps4_set_touchpad', 'ps4_authtimeout', 'turn_off', 'wii_offscreen', 'get_adt', 'set_adt', 'adt_off', 'adt_cmp',
  'get_battery', 'output_reconnection', 'output_protocol', 'get_brtime', 'set_polar', 'get_polar', 'get_ipolar', 'set_rgb', 'set_hsb',
  // combos & flow
  'combo_run', 'combo_stop', 'combo_restart', 'combo_running', 'combo_suspend', 'combo_resume', 'combo_suspended',
  'combo_stop_all', 'combo_suspend_all', 'combo_resume_all', 'wait', 'call', 'vm_tctrl',
  // LEDs & rumble
  'set_led', 'get_led', 'set_ledx', 'get_ledx', 'reset_leds', 'set_rumble', 'get_rumble', 'block_rumble', 'reset_rumble',
  // slots, pvars, memory
  'get_slot', 'load_slot', 'get_pvar', 'set_pvar', 'get_bit', 'set_bit', 'clear_bit', 'test_bit', 'set_bits', 'get_bits',
  'dchar', 'dbyte', 'dword', 'duint8', 'duint16', 'dint8', 'dint16', 'dint32',
  // math
  'abs', 'inv', 'pow', 'isqrt', 'random', 'min', 'max', 'clamp', 'sin', 'cos', 'atan2', 'sqrt', 'mod',
  // OLED
  'cls_oled', 'pixel_oled', 'line_oled', 'rect_oled', 'circle_oled', 'putc_oled', 'puts_oled', 'print', 'image_oled',
  // keyboard & mouse
  'get_keyboard', 'get_modifiers', 'get_rawkey', 'mxyconverter', 'mouse_status',
  // remote play / debug
  'set_rgb', 'printf', 'trace',
];

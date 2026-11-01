# ASTRO APP

A desktop app for the **Cronus Zen**: manage the device's script slots, edit GPC scripts, and build a complete script with a wizard.
Built with **Rust** ([Tauri 2](https://tauri.app/)) and a dark HTML/JS interface. Open source under the MIT licence.

> **Not affiliated with Cronus, CollectiveMinds or Zen Studio.** "Cronus" and "Zen" belong to their owners.
> This is an independent project. You use it at your own risk: flashing and formatting a device can erase its slots.

Arabic documentation: [README.ar.md](README.ar.md).

## Features

### BOOT: the device
- Connect to the Zen over USB (HID), read the firmware, serial number and the 8 slots.
- Each slot shows its name, type, size, CRC32 and whether it is enabled.
- A script library on disk (`Documents\ASTRO APP\Scripts`).

### COMPILER: the editor
- GPC editor with line numbers, syntax colours and tabs.
- Tools: Encoder / Decoder (numbers to HEX, variable renaming, one-line mode), and *Strings to data()*.
  Every tool leaves string literals and comments alone.

### MAKE YOUR GPC: a script builder wizard
1. **START**: script name and a logo (Logo Studio: image, text, pixel drawing, dithering, export).
2. **MENU**: 17 menu styles and 18 value screens, with a live preview that runs the generated GPC in a built-in VM (`gpc-vm.js`).
3. **MODS**: 167 mods in 7 categories, picked per game (CALL OF DUTY, FORTNITE, OVERWATCH, FC). Each mod has its own settings.
   OVERWATCH adds a hero select and per-hero features.
4. **CONTROLS**: up to 3 profiles, quick toggles, and a button table with conflict detection.
5. **SCREEN**: boot animation, home screen, screen saver, LED colours.
6. **BUILD**: checks, then save to the library, open in the editor, or queue on a slot.

### BEST VALUES
Drop a generated GPC script: the app finds each aim assist **from its code** (an angle taken `% 360`, a value multiplying `COS` / `SIN`),
runs each one alone in the simulator with candidate SIZE and SPEED values, and suggests the strongest setting without a hard jolt.
It also lists the aim sweeps of an FC script.

## Compiler

Compiling GPC to device bytecode uses a GPC compiler library (`libgpc`). **It is not included in this repository**: it is third-party software.
If its three files (`libgpc.js`, `libgpc.wasm`, `libgpc_bg.js`) are in `ui/js/`, the app uses them. If not, the app still opens: the editor, menus, mods,
previews, BEST VALUES, and the device connection (read slots, format) work, and compiling or flashing a script from source reports that no compiler is installed.

## Build and run

Requirements: Rust (MSVC toolchain) and WebView2 (included with Windows 11).

```
cd src-tauri
cargo build --release
```

The executable is `src-tauri/target/release/astro-app.exe`.

## Tests

```
cd src-tauri && cargo test           # protocol tests (packets, slots, firmware)
node tools/test-mods.mjs             # every mod and the full set, compiled and run in the VM
node tools/test-menu-styles.mjs "<repo folder>" "<output folder>"
node tools/test-controls-screen.mjs
node tools/test-logo-export.mjs "<repo folder>"
node tools/gpc-check.mjs file.gpc
```

The `node tools/*` tests compile with the GPC compiler, so they need its files in `ui/js/` (see **Compiler**).
`cargo test` does not need a compiler and does not need a device.

## Project layout

```
src-tauri/src/zen.rs        the device protocol and its tests
src-tauri/src/hid.rs        Tauri commands: connect, read slots, format, flash
src-tauri/src/storage.rs    script library, open and save dialogs
src-tauri/examples/         small read-only probes for a real device
ui/index.html, css/         the interface
ui/js/app.js                BOOT and COMPILER
ui/js/myg/                  MAKE YOUR GPC and BEST VALUES
docs/                       design notes
tools/                      tests
```

## Device notes (firmware 2.3.2)

- The device shows up in Windows as **Cronus Bridge** (`2008:0010`), interface usage page `FFAB`.
- Packets are 64 bytes: `CMD | LEN (u16 LE) | SEQ | up to 60 bytes of data`. Replies number the packets from 0, so reassembly uses `LEN`, not `SEQ`.
- The serial number is sent as UTF-16LE.
- Verified on a real device: reading. **Formatting (RESTART) has not been tried on a real device.**

## Contributing

Issues and pull requests are welcome. Please run the tests above before sending a change, and do not add third-party software
(compilers, game art, leaked scripts) to the repository.

## Licence

MIT. See [LICENSE](LICENSE).

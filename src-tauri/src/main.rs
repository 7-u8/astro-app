// Hide the console window in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod hid;
mod storage;
mod zen;

fn main() {
    tauri::Builder::default()
        .manage(hid::ZenState::default())
        .invoke_handler(tauri::generate_handler![
            hid::zen_presence,
            hid::zen_connect,
            hid::zen_disconnect,
            hid::zen_read_slots,
            hid::zen_format,
            hid::zen_flash_slot,
            hid::zen_flash_slots,
            hid::zen_read_bytecode,
            storage::library_path,
            storage::library_list,
            storage::library_save,
            storage::file_read_text,
            storage::file_write_text,
            storage::dialog_open_gpc,
            storage::dialog_save,
            storage::open_in_explorer,
        ])
        .run(tauri::generate_context!())
        .expect("failed to start ASTRO APP");
}

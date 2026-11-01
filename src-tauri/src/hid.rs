//! Tauri commands for the Cronus Zen: find, connect, read slots, format.
//! Device I/O runs on a blocking worker so the UI never freezes.

use crate::zen::{DeviceInfo, HidTransport, Slot, Zen};
use hidapi::HidApi;
use serde::Serialize;
use std::ffi::CString;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::State;

pub const ZEN_VID: u16 = 0x2008;
pub const ZEN_PID: u16 = 0x0010;

#[derive(Default, Clone)]
pub struct ZenState(Arc<Mutex<Option<Zen<HidTransport>>>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectResult {
    info: DeviceInfo,
    slots: Vec<Slot>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Presence {
    present: bool,
    connected: bool,
}

/// Path of the Zen's vendor-defined HID collection (where the protocol lives).
fn find_zen(api: &HidApi) -> Option<CString> {
    let mut list: Vec<_> = api
        .device_list()
        .filter(|d| d.vendor_id() == ZEN_VID && d.product_id() == ZEN_PID)
        .collect();
    list.sort_by_key(|d| if d.usage_page() >= 0xFF00 { 0 } else { 1 });
    list.first().map(|d| d.path().to_owned())
}

fn present() -> bool {
    HidApi::new().map(|api| find_zen(&api).is_some()).unwrap_or(false)
}

async fn blocking<R: Send + 'static>(
    f: impl FnOnce() -> Result<R, String> + Send + 'static,
) -> Result<R, String> {
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| format!("Internal error: {e}"))?
}

/// Runs `op` on the open session. On an I/O failure the session is dropped,
/// so the UI sees the device as disconnected.
async fn with_session<R: Send + 'static>(
    state: &ZenState,
    op: impl FnOnce(&mut Zen<HidTransport>) -> Result<R, String> + Send + 'static,
) -> Result<R, String> {
    let shared = state.0.clone();
    blocking(move || {
        let mut guard = shared.lock().map_err(|_| "Device lock poisoned".to_string())?;
        let zen = guard.as_mut().ok_or("Device is not connected")?;
        let res = op(zen);
        if res.is_err() && !present() {
            *guard = None;
        }
        res
    })
    .await
}

#[tauri::command]
pub async fn zen_presence(state: State<'_, ZenState>) -> Result<Presence, String> {
    let shared = state.0.clone();
    blocking(move || {
        let present = present();
        let mut guard = shared.lock().map_err(|_| "Device lock poisoned".to_string())?;
        if !present && guard.is_some() {
            *guard = None; // unplugged
        }
        Ok(Presence { present, connected: guard.is_some() })
    })
    .await
}

#[tauri::command]
pub async fn zen_connect(state: State<'_, ZenState>) -> Result<ConnectResult, String> {
    let shared = state.0.clone();
    blocking(move || {
        let mut guard = shared.lock().map_err(|_| "Device lock poisoned".to_string())?;
        *guard = None; // close any previous handle first
        let api = HidApi::new().map_err(|e| format!("USB init failed: {e}"))?;
        let path = find_zen(&api).ok_or(
            "No Cronus Zen found. Connect it to the PC with the PROG port and try again.",
        )?;
        let dev = api.open_path(&path).map_err(|e| {
            format!("Could not open the Cronus Zen ({e}). Close Zen Studio and other apps using it, then try again.")
        })?;
        let mut zen = Zen::new(HidTransport(dev));
        let info = zen.initialize()?;
        let slots = zen.read_slots()?;
        *guard = Some(zen);
        Ok(ConnectResult { info, slots })
    })
    .await
}

#[tauri::command]
pub async fn zen_disconnect(state: State<'_, ZenState>) -> Result<(), String> {
    let shared = state.0.clone();
    blocking(move || {
        *shared.lock().map_err(|_| "Device lock poisoned".to_string())? = None;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn zen_read_slots(state: State<'_, ZenState>) -> Result<Vec<Slot>, String> {
    with_session(&state, |z| z.read_slots()).await
}

#[tauri::command]
pub async fn zen_format(state: State<'_, ZenState>) -> Result<Vec<Slot>, String> {
    with_session(&state, |z| z.erase_all(Duration::from_secs(5), Duration::from_secs(30))).await
}

#[derive(serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FlashSlotInput {
    pub slot: u8,
    pub name: String,
    pub bytecode_hex: String,
}

#[tauri::command]
pub async fn zen_flash_slots(
    state: State<'_, ZenState>,
    slots: Vec<FlashSlotInput>,
) -> Result<Vec<Slot>, String> {
    let mut payloads = Vec::with_capacity(slots.len());
    for s in slots {
        if s.bytecode_hex.len() % 2 != 0 {
            return Err(format!("Slot {}: bytecodeHex has odd length", s.slot));
        }
        let bytecode: Vec<u8> = s
            .bytecode_hex
            .as_bytes()
            .chunks(2)
            .map(|c| {
                let hi = hex_nibble(c[0])?;
                let lo = hex_nibble(c[1])?;
                Ok((hi << 4) | lo)
            })
            .collect::<Result<Vec<u8>, String>>()?;
        payloads.push(crate::zen::SlotPayload {
            slot: s.slot,
            name: s.name,
            bytecode,
        });
    }

    with_session(&state, move |z| z.flash_slots(&payloads)).await
}

#[tauri::command]
pub async fn zen_flash_slot(
    state: State<'_, ZenState>,
    slot: u8,
    name: String,
    bytecode_hex: String,
) -> Result<Vec<Slot>, String> {
    zen_flash_slots(
        state,
        vec![FlashSlotInput {
            slot,
            name,
            bytecode_hex,
        }],
    )
    .await
}

#[tauri::command]
pub async fn zen_read_bytecode(state: State<'_, ZenState>, slot: u8) -> Result<String, String> {
    let data = with_session(&state, move |z| z.read_bytecode(slot)).await?;
    let mut hex = String::with_capacity(data.len() * 2);
    for b in data {
        use std::fmt::Write;
        let _ = write!(&mut hex, "{:02X}", b);
    }
    Ok(hex)
}


fn hex_nibble(b: u8) -> Result<u8, String> {
    match b {
        b'0'..=b'9' => Ok(b - b'0'),
        b'a'..=b'f' => Ok(b - b'a' + 10),
        b'A'..=b'F' => Ok(b - b'A' + 10),
        _ => Err(format!("Invalid hex character: {}", b as char)),
    }
}


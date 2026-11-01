//! Read-only probe for a real Cronus Zen: firmware, serial, slot table.
//! Sends only StreamIO-off (0xAB 00), 0xF0, 0xF1 and 0xFB. Never erases or writes slots.
//! Usage: cargo run --example zen_probe [-- --wait <seconds>]

#[path = "../src/zen.rs"]
#[allow(dead_code)]
mod zen;

use hidapi::HidApi;
use std::time::{Duration, Instant};
use zen::{HidTransport, Zen, SLOT_RECORD};

fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02x}")).collect::<Vec<_>>().join(" ")
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let wait = args
        .iter()
        .position(|a| a == "--wait")
        .and_then(|i| args.get(i + 1))
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);

    let deadline = Instant::now() + Duration::from_secs(wait);
    let (api, info) = loop {
        let mut api = HidApi::new().expect("hid init");
        api.refresh_devices().ok();
        let mut list: Vec<_> = api
            .device_list()
            .filter(|d| d.vendor_id() == 0x2008 && d.product_id() == 0x0010)
            .cloned()
            .collect();
        list.sort_by_key(|d| if d.usage_page() >= 0xFF00 { 0 } else { 1 });
        if let Some(d) = list.into_iter().next() {
            break (api, d);
        }
        if Instant::now() >= deadline {
            println!("RESULT: Cronus Bridge (2008:0010) not found");
            std::process::exit(2);
        }
        std::thread::sleep(Duration::from_secs(2));
    };

    println!(
        "FOUND: {:?} {:?} page={:04X} usage={:04X} if={}",
        info.manufacturer_string(),
        info.product_string(),
        info.usage_page(),
        info.usage(),
        info.interface_number()
    );
    for d in api.device_list().filter(|d| d.vendor_id() == 0x2008) {
        println!("  interface page={:04X} usage={:04X} if={}", d.usage_page(), d.usage(), d.interface_number());
    }

    let dev = match api.open_path(info.path()) {
        Ok(d) => d,
        Err(e) => {
            println!("RESULT: open failed: {e} (close Zen Studio / browser tabs using the device)");
            std::process::exit(3);
        }
    };
    let mut z = Zen::new(HidTransport(dev));

    match z.initialize() {
        Ok(i) => println!("FIRMWARE: {}  SERIAL: {}  supported={}", i.firmware, i.serial, i.firmware_supported),
        Err(e) => println!("INIT ERROR: {e}"),
    }

    match z.read_slots_raw() {
        Ok(raw) => {
            println!("SLOT TABLE: {} bytes", raw.len());
            for i in 0..8usize.min(raw.len() / SLOT_RECORD) {
                let r = &raw[i * SLOT_RECORD..(i + 1) * SLOT_RECORD];
                println!("  raw[{}] 0..8: {}  name: {}  116..124: {}", i + 1, hex(&r[..8]), hex(&r[52..76]), hex(&r[116..124]));
            }
            match zen::parse_slot_table(&raw) {
                Ok(slots) => {
                    for s in slots {
                        if s.empty {
                            println!("SLOT {}: (empty)", s.index);
                        } else {
                            println!(
                                "SLOT {}: name={:?} type={} size={} crc32={:08X} enabled={} content_id={}",
                                s.index, s.name, s.content_type, s.size, s.crc32, s.flags.enabled, s.content_id
                            );
                        }
                    }
                }
                Err(e) => println!("PARSE ERROR: {e}"),
            }
        }
        Err(e) => println!("READ SLOTS ERROR: {e}"),
    }
}

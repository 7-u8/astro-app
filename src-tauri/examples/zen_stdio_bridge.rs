//! Line-based Hex HID bridge over stdio for live testing with Node + libcronuszen.
//! Input line:  "TX:<128 hex chars>" -> sends [0x00, 64 bytes] via hidapi.write()
//! Output line: "RX:<128 hex chars>" whenever a 64-byte report is read from the device.

use hidapi::HidApi;
use std::io::{self, BufRead, Write};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

const BRIDGE_VID: u16 = 0x2008;
const BRIDGE_PID: u16 = 0x0010;
const VENDOR_PAGE: u16 = 0xFFAB;

fn main() {
    let api = HidApi::new().expect("HidApi::new failed");
    let info = api
        .device_list()
        .find(|d| d.vendor_id() == BRIDGE_VID && d.product_id() == BRIDGE_PID && d.usage_page() == VENDOR_PAGE)
        .or_else(|| {
            api.device_list()
                .find(|d| d.vendor_id() == BRIDGE_VID && d.product_id() == BRIDGE_PID && d.interface_number() == 0)
        })
        .expect("Cronus Bridge (2008:0010) not found");

    let dev = info.open_device(&api).expect("open_device failed");
    dev.set_blocking_mode(false).ok();

    let (tx, rx) = mpsc::channel::<String>();
    thread::spawn(move || {
        let stdin = io::stdin();
        for line in stdin.lock().lines() {
            match line {
                Ok(l) => {
                    if tx.send(l.trim().to_string()).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });

    println!("READY");
    io::stdout().flush().ok();

    let mut buf = [0u8; 65];
    loop {
        while let Ok(line) = rx.try_recv() {
            if line == "QUIT" {
                return;
            }
            if let Some(hex_str) = line.strip_prefix("TX:") {
                let mut pkt = [0u8; 65];
                pkt[0] = 0x00;
                let bytes: Vec<u8> = (0..hex_str.len())
                    .step_by(2)
                    .filter_map(|i| u8::from_str_radix(&hex_str[i..i + 2], 16).ok())
                    .collect();
                let copy_len = bytes.len().min(64);
                pkt[1..1 + copy_len].copy_from_slice(&bytes[..copy_len]);
                match dev.write(&pkt) {
                    Ok(_) => {
                        println!("TX_OK");
                        io::stdout().flush().ok();
                    }
                    Err(e) => {
                        println!("TX_ERR:{}", e);
                        io::stdout().flush().ok();
                    }
                }
            }
        }

        match dev.read_timeout(&mut buf, 2) {
            Ok(n) if n > 0 => {
                let slice = if n == 65 && buf[0] == 0 {
                    &buf[1..65]
                } else if n >= 64 {
                    &buf[..64]
                } else {
                    &buf[..n]
                };
                let mut hex = String::with_capacity(slice.len() * 2 + 3);
                hex.push_str("RX:");
                for b in slice {
                    hex.push_str(&format!("{:02x}", b));
                }
                println!("{}", hex);
                io::stdout().flush().ok();
            }
            Ok(_) => {
                thread::sleep(Duration::from_millis(1));
            }
            Err(e) => {
                eprintln!("READ_ERR:{}", e);
                break;
            }
        }
    }
}

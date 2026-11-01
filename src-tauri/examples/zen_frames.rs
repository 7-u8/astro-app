//! Read-only: prints the header (CMD LEN SEQ) of every frame the Zen sends
//! in reply to the slot-table request (0xFB). Sends only 0xAB 00 and 0xFB.

use hidapi::HidApi;
use std::time::{Duration, Instant};

fn main() {
    let api = HidApi::new().expect("hid init");
    let info = api
        .device_list()
        .find(|d| d.vendor_id() == 0x2008 && d.product_id() == 0x0010)
        .expect("Cronus Bridge not found");
    let dev = api.open_path(info.path()).expect("open");
    let mut buf = [0u8; 64];
    let send = |cmd: u8, payload: &[u8]| {
        let mut r = [0u8; 65];
        r[1] = cmd;
        r[2] = payload.len() as u8;
        r[4] = 1;
        r[5..5 + payload.len()].copy_from_slice(payload);
        dev.write(&r).expect("write");
    };
    while dev.read_timeout(&mut buf, 50).unwrap_or(0) > 0 {}
    send(0xAB, &[0x00]);
    std::thread::sleep(Duration::from_millis(300));
    while dev.read_timeout(&mut buf, 50).unwrap_or(0) > 0 {}
    send(0xFB, &[]);
    let end = Instant::now() + Duration::from_secs(3);
    let mut n_frames = 0;
    let mut total = 0usize;
    while Instant::now() < end {
        let n = dev.read_timeout(&mut buf, 100).unwrap_or(0);
        if n == 0 {
            continue;
        }
        n_frames += 1;
        let len = u16::from_le_bytes([buf[1], buf[2]]);
        if buf[0] == 0xFB {
            total += (len as usize).min(60);
        }
        if n_frames <= 4 || len <= 60 {
            println!("frame {:>3}: n={} cmd={:02X} len={:>4} seq={:>3} data0..8={:02x?}", n_frames, n, buf[0], len, buf[3], &buf[4..12]);
        }
    }
    println!("frames={n_frames} fb_bytes={total}");
}

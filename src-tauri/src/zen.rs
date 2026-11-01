//! Cronus Zen USB protocol (our own implementation, read-only + format).
//!
//! Wire format (64-byte HID reports, report ID 0):
//!   byte 0     CMD
//!   byte 1..2  LEN  (u16 LE) bytes of payload remaining, including this packet
//!   byte 3     SEQ  packet number within the message, starting at 1
//!   byte 4..63 payload (up to 60 bytes per packet)
//! Replies use the same framing and start with the command byte they answer.
//!
//! Only unencrypted commands are used: stop StreamIO, firmware, serial,
//! read slot table, erase all slots, status.

use serde::{Deserialize, Serialize};
use std::thread;
use std::time::{Duration, Instant};

pub const PACKET: usize = 64;
const HEADER: usize = 4;
const CHUNK: usize = PACKET - HEADER;

pub const CMD_STREAMIO: u8 = 0xAB;
pub const CMD_STATUS: u8 = 0x20;
pub const CMD_ERASE: u8 = 0xE2;
pub const CMD_FIRMWARE: u8 = 0xF0;
pub const CMD_SERIAL: u8 = 0xF1;
pub const CMD_READ_SLOTS: u8 = 0xFB;
pub const CMD_READ_BYTECODE: u8 = 0xFD; // ReadBytecode — reads slot bytecode
// Flash commands — verified from libcronuszen-core (slots.rs / slot_data.rs / cbc_xor.rs).
pub const CMD_FLASH_META: u8 = 0xF3; // FlashConfig / FlashMetadata — writes 508-byte slot record
pub const CMD_FLASH_DATA: u8 = 0xF2; // FlashBytecode — writes 60-byte seed header + CBC-XOR bytecode
pub const CMD_SEND_BVAR: u8 = 0xB5;  // SendBvarFile — writes [slot_ascii, ...2048 BVAR bytes]

pub const SLOT_COUNT: usize = 8;
pub const SLOT_RECORD: usize = 508;
pub const MIN_FIRMWARE: &str = "2.3.2";

/// Raw report pipe. Implemented by hidapi for the real device and by a script in tests.
pub trait Transport: Send {
    fn write_report(&mut self, report: &[u8; PACKET]) -> Result<(), String>;
    /// Reads one report into `buf`; returns 0 on timeout.
    fn read_report(&mut self, buf: &mut [u8; PACKET], timeout_ms: i32) -> Result<usize, String>;
}

pub struct HidTransport(pub hidapi::HidDevice);

impl Transport for HidTransport {
    fn write_report(&mut self, report: &[u8; PACKET]) -> Result<(), String> {
        let mut out = [0u8; PACKET + 1]; // leading report ID 0
        out[1..].copy_from_slice(report);
        self.0
            .write(&out)
            .map(|_| ())
            .map_err(|e| format!("USB write failed: {e}"))
    }

    fn read_report(&mut self, buf: &mut [u8; PACKET], timeout_ms: i32) -> Result<usize, String> {
        self.0
            .read_timeout(buf, timeout_ms)
            .map_err(|e| format!("USB read failed: {e}"))
    }
}

#[derive(Serialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SlotFlags {
    pub enabled: bool,
    pub remap: bool,
    pub rumble: bool,
    pub interpreter: bool,
    pub gamepack: bool,
    pub script: bool,
    pub marketplace: bool,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Slot {
    pub index: u8,
    pub empty: bool,
    pub name: String,
    pub size: u32,
    pub crc32: u32,
    pub content_id: i32,
    pub content_type: &'static str,
    pub gamepack_type: u8,
    pub pvar_count: u8,
    pub flags: SlotFlags,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub firmware: String,
    pub serial: String,
    pub firmware_supported: bool,
    pub min_firmware: &'static str,
}

fn u32_le(b: &[u8]) -> u32 {
    u32::from_le_bytes([b[0], b[1], b[2], b[3]])
}

/// Parses one 508-byte slot record from the slot table.
pub fn parse_slot(index: u8, r: &[u8]) -> Slot {
    let flags_byte = r[4];
    let flags = SlotFlags {
        enabled: flags_byte & 0x01 != 0,
        remap: flags_byte & 0x02 != 0,
        rumble: flags_byte & 0x04 != 0,
        interpreter: flags_byte & 0x08 != 0,
        gamepack: flags_byte & 0x10 != 0,
        script: flags_byte & 0x20 != 0,
        marketplace: flags_byte & 0x40 != 0,
    };
    let name_bytes = &r[52..116];
    let end = name_bytes.iter().position(|&b| b == 0).unwrap_or(name_bytes.len());
    let name = String::from_utf8_lossy(&name_bytes[..end]).trim().to_string();
    let size = u32_le(&r[116..120]);
    let content_type = if flags.marketplace {
        "Marketplace"
    } else if flags.gamepack {
        "Gamepack"
    } else if flags.script {
        // Note: the remap bit is set on empty slots too, so it does not mean content.
        "Script"
    } else {
        "Unknown"
    };
    Slot {
        index,
        empty: size == 0 && (content_type == "Unknown" || name.is_empty()),
        name,
        size,
        crc32: u32_le(&r[120..124]),
        content_id: u32_le(&r[0..4]) as i32,
        content_type,
        gamepack_type: r[5],
        pvar_count: r[6],
        flags,
    }
}

pub fn parse_slot_table(payload: &[u8]) -> Result<Vec<Slot>, String> {
    if payload.len() < SLOT_COUNT * SLOT_RECORD {
        return Err(format!(
            "Slot table too short: expected {} bytes, got {}",
            SLOT_COUNT * SLOT_RECORD,
            payload.len()
        ));
    }
    Ok((0..SLOT_COUNT)
        .map(|i| parse_slot(i as u8 + 1, &payload[i * SLOT_RECORD..(i + 1) * SLOT_RECORD]))
        .collect())
}

fn version_tuple(v: &str) -> Vec<u32> {
    v.split('.').map(|p| p.trim().parse().unwrap_or(0)).collect()
}

pub fn firmware_supported(v: &str) -> bool {
    version_tuple(v) >= version_tuple(MIN_FIRMWARE)
}

fn crc32_ieee(data: &[u8]) -> u32 {
    let mut crc = 0xFFFF_FFFFu32;
    for &byte in data {
        crc ^= u32::from(byte);
        for _ in 0..8 {
            if crc & 1 != 0 {
                crc = (crc >> 1) ^ 0xEDB8_8320;
            } else {
                crc >>= 1;
            }
        }
    }
    !crc
}

fn format_serial(bytes: &[u8]) -> String {
    // The Zen reports its serial as UTF-16LE text ("P\0E\05\0...").
    let end = bytes.chunks(2).position(|c| c.iter().all(|&b| b == 0)).map(|i| i * 2).unwrap_or(bytes.len());
    let utf16 = &bytes[..end - end % 2];
    if !utf16.is_empty() && utf16.chunks(2).all(|c| c[1] == 0 && (0x20..0x7f).contains(&c[0])) {
        return utf16.chunks(2).map(|c| c[0] as char).collect();
    }
    let printable = !bytes.is_empty() && bytes.iter().all(|&b| (0x20..0x7f).contains(&b));
    if printable {
        String::from_utf8_lossy(bytes).into_owned()
    } else {
        bytes.iter().map(|b| format!("{b:02X}")).collect()
    }
}

/// Pads bytecode to a 16-byte boundary with `0x5C` (matching Zen Studio / libcronuszen).
pub fn pad_bytecode(bytes: &[u8]) -> Vec<u8> {
    if bytes.is_empty() {
        return vec![0x5C; 16];
    }
    let rem = bytes.len() % 16;
    if rem == 0 {
        return bytes.to_vec();
    }
    let mut out = Vec::with_capacity(bytes.len() + (16 - rem));
    out.extend_from_slice(bytes);
    out.resize(bytes.len() + (16 - rem), 0x5C);
    out
}

/// CBC-XOR encryption on 4-byte blocks (`libcronuszen-core/src/crypto/cbc_xor.rs`, `$f441`).
pub fn cbc_xor(key: [u8; 4], data: &[u8]) -> Result<Vec<u8>, String> {
    if data.len() % 4 != 0 {
        return Err(format!("CBC-XOR requires data length to be a multiple of 4, got {}", data.len()));
    }
    let mut out = Vec::with_capacity(data.len());
    let [mut k0, mut k1, mut k2, mut k3] = key;
    for chunk in data.chunks_exact(4) {
        let (d0, d1, d2, d3) = (chunk[0], chunk[1], chunk[2], chunk[3]);
        out.push(d0 ^ k0);
        out.push(d1 ^ k1);
        out.push(d2 ^ k2);
        out.push(d3 ^ k3);
        let next_k3 = !(k3 ^ d1);
        let next_k2 = !(k2 ^ d0);
        let next_k1 = !(k1 ^ d2);
        let next_k0 = !(k0 ^ d3);
        k0 = next_k0;
        k1 = next_k1;
        k2 = next_k2;
        k3 = next_k3;
    }
    Ok(out)
}

/// CBC-XOR decryption on 4-byte blocks.
///
/// In CBC-XOR, the next key is derived from the PLAINTEXT blocks,
/// so during decryption we decrypt each 4-byte chunk first (P = C ^ K)
/// and then use the resulting plaintext bytes (p0..p3) to step the key forward.
pub fn cbc_xor_decrypt(key: [u8; 4], data: &[u8]) -> Result<Vec<u8>, String> {
    if data.len() % 4 != 0 {
        return Err(format!("CBC-XOR requires data length to be a multiple of 4, got {}", data.len()));
    }
    let mut out = Vec::with_capacity(data.len());
    let [mut k0, mut k1, mut k2, mut k3] = key;
    for chunk in data.chunks_exact(4) {
        let (c0, c1, c2, c3) = (chunk[0], chunk[1], chunk[2], chunk[3]);
        let p0 = c0 ^ k0;
        let p1 = c1 ^ k1;
        let p2 = c2 ^ k2;
        let p3 = c3 ^ k3;
        out.push(p0);
        out.push(p1);
        out.push(p2);
        out.push(p3);
        let next_k3 = !(k3 ^ p1);
        let next_k2 = !(k2 ^ p0);
        let next_k1 = !(k1 ^ p2);
        let next_k0 = !(k0 ^ p3);
        k0 = next_k0;
        k1 = next_k1;
        k2 = next_k2;
        k3 = next_k3;
    }
    Ok(out)
}

/// Builds the 60-byte seed header + CBC-XOR encrypted payload (`libcronuszen-core/src/crypto/slot_data.rs`, `$f479`).
pub fn prepare_slot_data(cr_key: [u8; 4], first_byte: u8, data: &[u8]) -> Result<Vec<u8>, String> {
    if data.len() % 4 != 0 {
        return Err(format!("slot data length must be a multiple of 4, got {}", data.len()));
    }
    // Four distinct indices in 6..59 and four seed bytes.
    let indices: [u8; 4] = [11, 23, 37, 49];
    let seed: [u8; 4] = [0xA5, 0x5A, 0x3C, 0xC3];
    let mut header = [0u8; CHUNK];
    for (i, b) in header.iter_mut().enumerate() {
        *b = (i as u8).wrapping_mul(31).wrapping_add(17);
    }
    header[0] = first_byte;
    header[1] = indices[0];
    header[2] = indices[1];
    header[3] = indices[2];
    header[4] = indices[3];
    header[indices[0] as usize] = seed[0];
    header[indices[1] as usize] = seed[1];
    header[indices[2] as usize] = seed[2];
    header[indices[3] as usize] = seed[3];

    let init_key = [
        seed[0] ^ cr_key[0],
        seed[1] ^ cr_key[1],
        seed[2] ^ cr_key[2],
        seed[3] ^ cr_key[3],
    ];
    let encrypted = cbc_xor(init_key, data)?;
    let mut out = Vec::with_capacity(CHUNK + encrypted.len());
    out.extend_from_slice(&header);
    out.extend_from_slice(&encrypted);
    Ok(out)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SlotPayload {
    pub slot: u8,
    pub name: String,
    pub bytecode: Vec<u8>,
}

pub struct Zen<T: Transport> {
    io: T,
    pub info: Option<DeviceInfo>,
    pub cr_key: [u8; 4],
}

impl<T: Transport> Zen<T> {
    pub fn new(io: T) -> Self {
        Self { io, info: None, cr_key: [0u8; 4] }
    }

    /// Sends a command, splitting the payload over as many packets as needed.
    pub fn send(&mut self, cmd: u8, payload: &[u8]) -> Result<(), String> {
        let total = payload.len();
        let mut off = 0usize;
        let mut seq = 1u8;
        loop {
            let remaining = total - off;
            let n = remaining.min(CHUNK);
            let mut r = [0u8; PACKET];
            r[0] = cmd;
            r[1] = (remaining & 0xff) as u8;
            r[2] = ((remaining >> 8) & 0xff) as u8;
            r[3] = seq;
            r[HEADER..HEADER + n].copy_from_slice(&payload[off..off + n]);
            self.io.write_report(&r)?;
            off += n;
            seq = seq.wrapping_add(1);
            if off >= total {
                return Ok(());
            }
        }
    }

    /// Sends a flash command using the fixed-length / decaying-flag framing (`$f384` in `libcronuszen-core`):
    /// - `r[1..3]` = `(payload.len() - size_sub) as u16` (constant across all packets)
    /// - `r[3]`    = `initial_flag` on packet 0, saturating-decremented by 1 on each subsequent packet
    pub fn send_flash_packets(
        &mut self,
        cmd: u8,
        payload: &[u8],
        initial_flag: u8,
        size_sub: usize,
    ) -> Result<(), String> {
        let total = payload.len();
        let advertised = (total & 0xffff).saturating_sub(size_sub & 0xffff) as u16;
        let len_bytes = advertised.to_le_bytes();
        let mut off = 0usize;
        let mut flag = initial_flag;
        loop {
            let remaining = total - off;
            let n = remaining.min(CHUNK);
            let mut r = [0u8; PACKET];
            r[0] = cmd;
            r[1] = len_bytes[0];
            r[2] = len_bytes[1];
            r[3] = flag;
            r[HEADER..HEADER + n].copy_from_slice(&payload[off..off + n]);
            self.io.write_report(&r)?;
            off += n;
            flag = flag.saturating_sub(1);
            if off >= total {
                return Ok(());
            }
        }
    }

    /// Discards any reports already waiting (e.g. telemetry).
    fn drain(&mut self) -> Result<(), String> {
        let mut buf = [0u8; PACKET];
        for _ in 0..256 {
            if self.io.read_report(&mut buf, 0)? == 0 {
                break;
            }
        }
        Ok(())
    }

    /// Receives one reassembled reply for `cmd`, skipping frames for other commands.
    pub fn recv(&mut self, cmd: u8, first_timeout: Duration) -> Result<Vec<u8>, String> {
        let inter = Duration::from_millis(1000);
        let mut deadline = Instant::now() + first_timeout;
        let mut data: Vec<u8> = Vec::new();
        let mut total = 0usize;
        let mut buf = [0u8; PACKET];
        loop {
            let left = deadline.saturating_duration_since(Instant::now());
            if left.is_zero() {
                return Err(if data.is_empty() {
                    format!("The device did not answer command 0x{cmd:02X}")
                } else {
                    format!("Reply to 0x{cmd:02X} was cut off ({} bytes received)", data.len())
                });
            }
            let n = self.io.read_report(&mut buf, left.as_millis().clamp(1, 50) as i32)?;
            if n == 0 {
                continue;
            }
            if n < HEADER || buf[0] != cmd {
                continue; // stray frame (telemetry or a stale reply)
            }
            // LEN counts the bytes still to come including this packet, so it
            // identifies each packet's place in the message. (The device numbers
            // its reply packets from 0, so SEQ is not used for ordering.)
            let len = u16::from_le_bytes([buf[1], buf[2]]) as usize;
            if data.is_empty() {
                total = len;
            } else if len != total - data.len() {
                if len > total - data.len() {
                    // A new message started; restart reassembly.
                    data.clear();
                    total = len;
                } else {
                    return Err(format!("Reply to 0x{cmd:02X} lost a packet"));
                }
            }
            let take = len.min(CHUNK).min(n - HEADER);
            data.extend_from_slice(&buf[HEADER..HEADER + take]);
            if len <= CHUNK {
                return Ok(data);
            }
            deadline = Instant::now() + inter;
        }
    }

    fn transact(&mut self, cmd: u8, payload: &[u8], timeout: Duration) -> Result<Vec<u8>, String> {
        self.drain()?;
        self.send(cmd, payload)?;
        self.recv(cmd, timeout)
    }

    /// Stops the live StreamIO feed so replies are not interleaved with telemetry.
    fn stream_off(&mut self) -> Result<(), String> {
        self.drain()?;
        self.send(CMD_STREAMIO, &[0x00])?;
        // Some firmware does not answer; that is fine.
        let _ = self.recv(CMD_STREAMIO, Duration::from_millis(400));
        Ok(())
    }

    pub fn initialize(&mut self) -> Result<DeviceInfo, String> {
        self.stream_off()?;
        let fw = self.transact(CMD_FIRMWARE, &[], Duration::from_secs(2))?;
        let cl = if fw.len() >= 4 {
            [fw[fw.len() - 4], fw[fw.len() - 3], fw[fw.len() - 2], fw[fw.len() - 1]]
        } else {
            [0u8; 4]
        };
        let fw_str_end = fw.len().saturating_sub(4).max(1);
        let end = fw[..fw_str_end].iter().position(|&b| b == 0).unwrap_or(fw_str_end);
        let firmware = String::from_utf8_lossy(&fw[..end]).trim().to_string();
        if firmware.is_empty() {
            return Err("The device returned an empty firmware version".into());
        }
        let serial = self.transact(CMD_SERIAL, &[], Duration::from_secs(2))?;
        if serial.len() >= 13 {
            self.cr_key = [
                serial[8] ^ cl[0],
                serial[0] ^ cl[1],
                serial[4] ^ cl[2],
                serial[12] ^ cl[3],
            ];
        }
        let info = DeviceInfo {
            firmware_supported: firmware_supported(&firmware),
            firmware,
            serial: format_serial(&serial),
            min_firmware: MIN_FIRMWARE,
        };
        self.info = Some(info.clone());
        Ok(info)
    }

    /// Raw slot table bytes (8 × 508), before parsing.
    pub fn read_slots_raw(&mut self) -> Result<Vec<u8>, String> {
        self.stream_off()?;
        let payload = self.transact(CMD_READ_SLOTS, &[], Duration::from_secs(4))?;
        if payload.is_empty() {
            return Err("The device refused to send its slot table".into());
        }
        Ok(payload)
    }

    pub fn read_slots(&mut self) -> Result<Vec<Slot>, String> {
        let payload = self.read_slots_raw()?;
        parse_slot_table(&payload)
    }

    /// Reads and decrypts the compiled bytecode of `slot` (1-based) directly from the Cronus Zen flash.
    pub fn read_bytecode(&mut self, slot: u8) -> Result<Vec<u8>, String> {
        if slot == 0 || slot as usize > SLOT_COUNT {
            return Err(format!("Invalid slot number {slot}; must be 1–{SLOT_COUNT}"));
        }
        self.stream_off()?;
        let slot_ascii = b'1' + (slot - 1);

        // Build the official 60-byte seed challenge header ($f558 in libcronuszen)
        let seed_header = prepare_slot_data(self.cr_key, slot_ascii, &[])?;

        self.drain()?;

        // Send 0xFD with length 60 (0x3C) and SEQ 1
        let mut req = [0u8; PACKET];
        req[0] = CMD_READ_BYTECODE;
        req[1] = 60;
        req[2] = 0;
        req[3] = 1;
        req[HEADER..HEADER + 60].copy_from_slice(&seed_header);
        self.io.write_report(&req)?;

        // Receive reassembled reply packets.
        // The Cronus Zen transmits 64-byte reports with 4-byte header and 48-byte payload chunks.
        let inter = Duration::from_millis(1500);
        let mut deadline = Instant::now() + Duration::from_secs(6);
        let mut raw: Vec<u8> = Vec::new();
        let mut buf = [0u8; PACKET];

        loop {
            let left = deadline.saturating_duration_since(Instant::now());
            if left.is_zero() {
                if raw.is_empty() {
                    return Err(format!("The device did not answer read bytecode for Slot {slot}"));
                } else {
                    return Err(format!(
                        "Read bytecode for Slot {slot} timed out ({} bytes received)",
                        raw.len()
                    ));
                }
            }
            let n = self.io.read_report(&mut buf, left.as_millis().clamp(1, 100) as i32)?;
            if n == 0 {
                continue;
            }
            if n < HEADER || buf[0] != CMD_READ_BYTECODE {
                continue;
            }
            let rem_len = u16::from_le_bytes([buf[1], buf[2]]) as usize;
            let take = rem_len.min(48).min(n.saturating_sub(HEADER));
            raw.extend_from_slice(&buf[HEADER..HEADER + take]);

            if rem_len <= 48 {
                break;
            }
            deadline = Instant::now() + inter;
        }

        if raw.len() <= 16 {
            return Err(format!("Bytecode payload from Slot {slot} is too short (len = {})", raw.len()));
        }

        // The first 16 bytes is the IV; the remainder is the CBC-XOR encrypted bytecode.
        let ciphertext = &raw[16..];
        let seed = [0xA5, 0x5A, 0x3C, 0xC3];
        let init_key = [
            seed[0] ^ self.cr_key[0],
            seed[1] ^ self.cr_key[1],
            seed[2] ^ self.cr_key[2],
            seed[3] ^ self.cr_key[3],
        ];

        // Symmetrically decrypt the bytecode using the inverted CBC-XOR algorithm
        let decrypted = cbc_xor_decrypt(init_key, ciphertext)?;

        // Strip trailing 0x5C padding bytes (or 0x00)
        let end = decrypted
            .iter()
            .rposition(|&b| b != 0x5C && b != 0x00)
            .map(|i| i + 1)
            .unwrap_or(decrypted.len());

        Ok(decrypted[..end].to_vec())
    }



    /// Flashes multiple compiled GPC scripts in a single transaction.
    ///
    /// The Cronus Zen flash memory architecture requires an erase of the entire slot area (0xE2)
    /// before any slot can be programmed. To program multiple slots without overwriting previous ones,
    /// all active slots must be flashed together in the official sequence:
    /// 1. Erase all slots (`0xE2`) and poll `0x20` until ready.
    /// 2. For each slot: send `FlashMetadata` (`0xF3`).
    /// 3. For each slot: send `FlashBytecode` (`0xF2`) + `SendBvarFile` (`0xB5`).
    /// 4. Read back updated slot table.
    pub fn flash_slots(&mut self, slots: &[SlotPayload]) -> Result<Vec<Slot>, String> {
        if slots.is_empty() {
            return self.erase_all(Duration::from_secs(3), Duration::from_secs(30));
        }
        for s in slots {
            if s.slot == 0 || s.slot as usize > SLOT_COUNT {
                return Err(format!("Invalid slot number {}; must be 1–{SLOT_COUNT}", s.slot));
            }
        }

        // Sort ascending by slot number
        let mut sorted = slots.to_vec();
        sorted.sort_by_key(|s| s.slot);

        // 1. Erase all slots first (required by the device protocol before writing).
        self.erase_all(Duration::from_secs(3), Duration::from_secs(30))?;

        // 2. Metadata pass: build and send 508-byte slot record for each slot.
        for s in &sorted {
            let padded = pad_bytecode(&s.bytecode);
            let slot_ascii = b'0' + (s.slot - 1);
            let mut record = [0u8; SLOT_RECORD];
            record[0..4].copy_from_slice(&0xFFFF_FFFFu32.to_le_bytes()); // content_id = -1
            record[4] = 0x2B; // flags: enabled(0x01) | remap(0x02) | interpreter(0x08) | script(0x20)
            record[5] = 0;    // gamepack_type = 0
            record[6] = 64;   // pvar_count = 64
            record[7] = slot_ascii;
            for i in 0..44usize {
                record[8 + i] = (i + 1) as u8;
            }
            let name_bytes = s.name.as_bytes();
            let name_len = name_bytes.len().min(63);
            record[52..52 + name_len].copy_from_slice(&name_bytes[..name_len]);
            let size = padded.len() as u32;
            record[116..120].copy_from_slice(&size.to_le_bytes());
            let crc = crc32_ieee(&padded);
            record[120..124].copy_from_slice(&crc.to_le_bytes());
            for i in 0..64usize {
                let base = 124 + i * 6;
                record[base..base + 2].copy_from_slice(&(i as u16).to_le_bytes());
            }

            self.drain()?;
            self.send_flash_packets(CMD_FLASH_META, &record, 1, 0)?;
            thread::sleep(Duration::from_millis(120));
        }

        // 3. Bytecode pass: encrypt and send FlashBytecode (0xF2) + SendBvarFile (0xB5) for each slot.
        for s in &sorted {
            let padded = pad_bytecode(&s.bytecode);
            let slot_ascii = b'0' + (s.slot - 1);
            let slot_data = prepare_slot_data(self.cr_key, slot_ascii, &padded)?;

            self.drain()?;
            self.send_flash_packets(CMD_FLASH_DATA, &slot_data, 2, CHUNK)?;
            thread::sleep(Duration::from_millis(120));

            let mut bvar_payload = vec![0u8; 1 + 2048];
            bvar_payload[0] = slot_ascii;
            self.drain()?;
            self.send(CMD_SEND_BVAR, &bvar_payload)?;
            thread::sleep(Duration::from_millis(200));
        }

        // 4. Read back the updated slot table.
        self.read_slots()
    }

    /// Flashes a single compiled GPC script into `slot` (1-based).
    pub fn flash_slot(&mut self, slot: u8, name: &str, bytecode: &[u8]) -> Result<Vec<Slot>, String> {
        self.flash_slots(&[SlotPayload {
            slot,
            name: name.to_string(),
            bytecode: bytecode.to_vec(),
        }])
    }

    /// Erases all 8 slots and waits until the device reports it is ready again.
    pub fn erase_all(&mut self, settle: Duration, max_wait: Duration) -> Result<Vec<Slot>, String> {
        self.stream_off()?;
        self.drain()?;
        self.send(CMD_ERASE, &[])?;
        let _ = self.recv(CMD_ERASE, Duration::from_secs(3)); // acknowledgement
        thread::sleep(settle);
        let deadline = Instant::now() + max_wait;
        loop {
            self.drain()?;
            self.send(CMD_STATUS, &[])?;
            if self.recv(CMD_STATUS, Duration::from_millis(600)).is_ok() {
                break;
            }
            if Instant::now() >= deadline {
                return Err("The device is still erasing. Wait a moment, then reconnect.".into());
            }
            thread::sleep(Duration::from_millis(500));
        }
        self.read_slots()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::VecDeque;

    /// Simulated Zen: answers each request with a scripted reply.
    struct FakeZen {
        table: Vec<u8>,
        inbox: VecDeque<[u8; PACKET]>,
        sent: Vec<[u8; PACKET]>,
        erased: bool,
        noise: bool,
    }

    fn frames(cmd: u8, payload: &[u8]) -> Vec<[u8; PACKET]> {
        let mut out = Vec::new();
        let mut off = 0;
        let mut seq = 0u8; // the real device numbers reply packets from 0
        loop {
            let rem = payload.len() - off;
            let n = rem.min(CHUNK);
            let mut f = [0u8; PACKET];
            f[0] = cmd;
            f[1] = (rem & 0xff) as u8;
            f[2] = (rem >> 8) as u8;
            f[3] = seq;
            f[4..4 + n].copy_from_slice(&payload[off..off + n]);
            out.push(f);
            off += n;
            seq += 1;
            if off >= payload.len() {
                return out;
            }
        }
    }

    impl Transport for FakeZen {
        fn write_report(&mut self, r: &[u8; PACKET]) -> Result<(), String> {
            self.sent.push(*r);
            if self.noise {
                let mut t = [0u8; PACKET];
                t[0] = 0xAA; // unrelated telemetry frame
                self.inbox.push_back(t);
            }
            let reply: Vec<u8> = match r[0] {
                CMD_STREAMIO => b"ok".to_vec(),
                CMD_FIRMWARE => b"2.3.5\0\x11\x22\x33".to_vec(),
                // UTF-16LE, as the real device sends it.
                CMD_SERIAL => b"P\0E\x005\x001\x000\0\0\0".to_vec(),
                CMD_READ_SLOTS => {
                    if self.erased {
                        vec![0u8; SLOT_COUNT * SLOT_RECORD]
                    } else {
                        self.table.clone()
                    }
                }
                CMD_ERASE => {
                    self.erased = true;
                    vec![]
                }
                CMD_STATUS => vec![0, CMD_STATUS, 0, 0],
                CMD_FLASH_META | CMD_FLASH_DATA | CMD_SEND_BVAR => vec![],
                _ => return Ok(()),
            };
            self.inbox.extend(frames(r[0], &reply));
            Ok(())
        }
        fn read_report(&mut self, buf: &mut [u8; PACKET], _t: i32) -> Result<usize, String> {
            match self.inbox.pop_front() {
                Some(f) => {
                    *buf = f;
                    Ok(PACKET)
                }
                None => Ok(0),
            }
        }
    }

    fn record(name: &str, flags: u8, size: u32, slot_char: u8) -> Vec<u8> {
        let mut r = vec![0u8; SLOT_RECORD];
        r[0..4].copy_from_slice(&(-1i32).to_le_bytes());
        r[4] = flags;
        r[6] = 64;
        r[7] = slot_char;
        r[52..52 + name.len()].copy_from_slice(name.as_bytes());
        r[116..120].copy_from_slice(&size.to_le_bytes());
        r[120..124].copy_from_slice(&0xCAFEBABEu32.to_le_bytes());
        r
    }

    fn fake(noise: bool) -> FakeZen {
        let mut table = Vec::new();
        table.extend(record("Rapid Fire", 0x21, 1234, b'0'));
        table.extend(record("COD Pack", 0x11, 20480, b'1'));
        table.extend(record("Pro Script", 0x41 | 0x10, 5000, b'2'));
        table.resize(SLOT_COUNT * SLOT_RECORD, 0);
        FakeZen { table, inbox: VecDeque::new(), sent: Vec::new(), erased: false, noise }
    }

    #[test]
    fn splits_long_payloads_like_the_official_client() {
        let mut z = Zen::new(fake(false));
        let payload = vec![7u8; 2049];
        z.send(0xB5, &payload).unwrap();
        let s = &z.io.sent;
        assert_eq!(s.len(), 35);
        assert_eq!(&s[0][..4], &[0xB5, 0x01, 0x08, 0x01]);
        assert_eq!(&s[1][..4], &[0xB5, 0xC5, 0x07, 0x02]);
        assert_eq!(&s[34][..4], &[0xB5, 0x09, 0x00, 0x23]);
    }

    #[test]
    fn initialize_reads_firmware_and_serial() {
        let mut z = Zen::new(fake(true));
        let info = z.initialize().unwrap();
        assert_eq!(info.firmware, "2.3.5");
        assert!(info.firmware_supported);
        assert_eq!(info.serial, "PE510");
        assert_eq!(&z.io.sent[0][..5], &[0xAB, 0x01, 0x00, 0x01, 0x00]);
    }

    #[test]
    fn reads_and_parses_the_slot_table() {
        let mut z = Zen::new(fake(true));
        let slots = z.read_slots().unwrap();
        assert_eq!(slots.len(), 8);
        assert_eq!(slots[0].name, "Rapid Fire");
        assert_eq!(slots[0].content_type, "Script");
        assert_eq!(slots[0].size, 1234);
        assert_eq!(slots[0].crc32, 0xCAFEBABE);
        assert_eq!(slots[0].content_id, -1);
        assert!(slots[0].flags.enabled);
        assert_eq!(slots[1].content_type, "Gamepack");
        assert_eq!(slots[2].content_type, "Marketplace");
        assert!(slots[3].empty);
        assert!(slots[7].empty);
    }

    #[test]
    fn erase_waits_for_status_then_rereads() {
        let mut z = Zen::new(fake(false));
        let slots = z.erase_all(Duration::from_millis(1), Duration::from_secs(1)).unwrap();
        assert!(slots.iter().all(|s| s.empty));
        let cmds: Vec<u8> = z.io.sent.iter().map(|r| r[0]).collect();
        let e = cmds.iter().position(|&c| c == CMD_ERASE).unwrap();
        assert!(cmds[e..].contains(&CMD_STATUS));
    }

    #[test]
    fn real_device_slot_records() {
        // Bytes as read from a real Zen (firmware 2.3.2).
        let mut r = vec![0u8; SLOT_RECORD];
        r[..8].copy_from_slice(&[0xff, 0xff, 0x00, 0x00, 0x2b, 0x00, 0x00, 0x30]);
        r[52..69].copy_from_slice(b"SGUKI_AIM (2).gpc");
        r[116..124].copy_from_slice(&[0x11, 0x22, 0x00, 0x00, 0x8e, 0x9f, 0x5e, 0x48]);
        let s = parse_slot(1, &r);
        assert_eq!(s.name, "SGUKI_AIM (2).gpc");
        assert_eq!(s.content_type, "Script");
        assert_eq!(s.size, 8721);
        assert_eq!(s.crc32, 0x485E9F8E);
        assert!(!s.empty);

        let mut e = vec![0u8; SLOT_RECORD];
        e[4] = 0x0b; // empty slots still carry enabled|remap|interpreter
        assert!(parse_slot(5, &e).empty);
    }

    #[test]
    fn firmware_floor() {
        assert!(firmware_supported("2.3.2"));
        assert!(firmware_supported("2.10.0"));
        assert!(!firmware_supported("2.3.1"));
        assert!(!firmware_supported("1.9"));
    }

    #[test]
    fn flash_slots_programs_multiple_slots() {
        let mut z = Zen::new(fake(false));
        let slots_to_flash = vec![
            SlotPayload {
                slot: 1,
                name: "Script One".into(),
                bytecode: vec![1, 2, 3, 4],
            },
            SlotPayload {
                slot: 2,
                name: "Script Two".into(),
                bytecode: vec![5, 6, 7, 8],
            },
        ];
        z.flash_slots(&slots_to_flash).unwrap();
        let cmds: Vec<u8> = z.io.sent.iter().map(|r| r[0]).collect();
        assert!(cmds.contains(&CMD_ERASE));
        let meta_count = cmds.iter().filter(|&&c| c == CMD_FLASH_META).count();
        let data_count = cmds.iter().filter(|&&c| c == CMD_FLASH_DATA).count();
        let bvar_count = cmds.iter().filter(|&&c| c == CMD_SEND_BVAR).count();
        assert!(meta_count >= 2);
        assert!(data_count >= 2);
        assert!(bvar_count >= 2);
    }

}



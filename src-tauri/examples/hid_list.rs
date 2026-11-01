//! Lists every HID interface Windows exposes (read-only diagnostic).
fn main() {
    let api = hidapi::HidApi::new().expect("hid init");
    for d in api.device_list() {
        println!(
            "{:04X}:{:04X} if={:<2} page={:04X} usage={:04X} mfr={:?} product={:?} serial={:?}",
            d.vendor_id(), d.product_id(), d.interface_number(), d.usage_page(), d.usage(),
            d.manufacturer_string().unwrap_or(""), d.product_string().unwrap_or(""), d.serial_number().unwrap_or("")
        );
    }
}

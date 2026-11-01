//! Script library on disk (Documents\ASTRO APP\Scripts) plus native
//! open/save dialogs used by the Compiler's File menu.

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryEntry {
    name: String,
    path: String,
    size: u64,
    modified: u64,
}

#[derive(Serialize)]
pub struct OpenedFile {
    path: String,
    name: String,
    content: String,
}

fn library_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let docs = app
        .path()
        .document_dir()
        .map_err(|e| format!("Documents folder not found: {e}"))?;
    let dir = docs.join("ASTRO APP").join("Scripts");
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create {}: {e}", dir.display()))?;
    Ok(dir)
}

fn file_name(p: &Path) -> String {
    p.file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default()
}

#[tauri::command]
pub fn library_path(app: AppHandle) -> Result<String, String> {
    Ok(library_dir(&app)?.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn library_list(app: AppHandle) -> Result<Vec<LibraryEntry>, String> {
    let dir = library_dir(&app)?;
    let mut out = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
        let path = entry.path();
        let is_gpc = path
            .extension()
            .map(|e| e.eq_ignore_ascii_case("gpc"))
            .unwrap_or(false);
        if !is_gpc {
            continue;
        }
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let modified = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        out.push(LibraryEntry {
            name: file_name(&path),
            path: path.to_string_lossy().into_owned(),
            size: meta.len(),
            modified,
        });
    }
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

#[tauri::command]
pub fn library_save(app: AppHandle, name: String, content: String) -> Result<String, String> {
    let clean: String = name
        .chars()
        .filter(|c| !r#"<>:"/\|?*"#.contains(*c) && !c.is_control())
        .collect();
    let clean = clean.trim();
    if clean.is_empty() {
        return Err("Invalid file name".into());
    }
    let mut path = library_dir(&app)?.join(clean);
    if path.extension().map(|e| !e.eq_ignore_ascii_case("gpc")).unwrap_or(true) {
        path.set_extension("gpc");
    }
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn file_read_text(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("Cannot read {path}: {e}"))?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

#[tauri::command]
pub fn file_write_text(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Cannot write {path}: {e}"))
}

#[tauri::command]
pub async fn dialog_open_gpc(app: AppHandle) -> Result<Vec<OpenedFile>, String> {
    let start = library_dir(&app).ok();
    let mut dlg = rfd::FileDialog::new()
        .set_title("Open GPC script")
        .add_filter("GPC script", &["gpc"])
        .add_filter("All files", &["*"]);
    if let Some(dir) = start {
        dlg = dlg.set_directory(dir);
    }
    let picked = dlg.pick_files().unwrap_or_default();
    let mut out = Vec::new();
    for p in picked {
        let bytes = fs::read(&p).map_err(|e| format!("Cannot read {}: {e}", p.display()))?;
        out.push(OpenedFile {
            name: file_name(&p),
            path: p.to_string_lossy().into_owned(),
            content: String::from_utf8_lossy(&bytes).into_owned(),
        });
    }
    Ok(out)
}

#[tauri::command]
pub async fn dialog_save(
    app: AppHandle,
    default_name: String,
) -> Result<Option<String>, String> {
    let (label, ext) = ("GPC script", "gpc");
    let mut dlg = rfd::FileDialog::new()
        .set_title(format!("Save {label}"))
        .set_file_name(default_name)
        .add_filter(label, &[ext]);
    if let Ok(dir) = library_dir(&app) {
        dlg = dlg.set_directory(dir);
    }
    Ok(dlg.save_file().map(|mut p| {
        if p.extension().is_none() {
            p.set_extension(ext);
        }
        p.to_string_lossy().into_owned()
    }))
}

#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<(), String> {
    std::process::Command::new("explorer")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

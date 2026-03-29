use sys_locale::get_locale;
use tauri::{
    menu::{AboutMetadataBuilder, MenuBuilder, MenuItem, SubmenuBuilder},
    Emitter,
};

fn is_german() -> bool {
    let locale = get_locale().unwrap_or_default().to_lowercase();
    locale.starts_with("de") || locale.starts_with("gsw")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let de = is_german();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(move |app| {
            // ── Letters-Menü ──────────────────────────────────────
            let about = AboutMetadataBuilder::new()
                .version(Some(env!("CARGO_PKG_VERSION")))
                .comments(Some(
                    "Vibe-coded by Christopher Könitz.\nEnjoy your writing experience.",
                ))
                .build();

            let app_menu = SubmenuBuilder::new(app, "Letters")
                .about(Some(about))
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            // ── Datei-Menü ────────────────────────────────────────
            let open_item = MenuItem::with_id(
                app, "file-open",
                if de { "Laden" } else { "Open" },
                true, Some("CmdOrCtrl+O"),
            )?;
            let save_item = MenuItem::with_id(
                app, "file-save",
                if de { "Speichern" } else { "Save" },
                true, Some("CmdOrCtrl+S"),
            )?;
            let save_as_item = MenuItem::with_id(
                app, "file-save-as",
                if de { "Speichern als\u{2026}" } else { "Save As\u{2026}" },
                true, Some("CmdOrCtrl+Shift+S"),
            )?;

            let file_menu = SubmenuBuilder::new(app, if de { "Datei" } else { "File" })
                .item(&open_item)
                .separator()
                .item(&save_item)
                .item(&save_as_item)
                .build()?;

            // ── Menüleiste zusammenbauen ──────────────────────────
            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .build()?;

            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "file-open" => {
                app.emit("menu:open", ()).unwrap();
            }
            "file-save" => {
                app.emit("menu:save", ()).unwrap();
            }
            "file-save-as" => {
                app.emit("menu:save-as", ()).unwrap();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der Anwendung");
}

use sys_locale::get_locale;
use tauri::{
    menu::{AboutMetadataBuilder, MenuBuilder, MenuItem, PredefinedMenuItem, SubmenuBuilder},
    Emitter,
};

fn is_german() -> bool {
    let locale = get_locale().unwrap_or_default().to_lowercase();
    // Language is German or Alsatian
    if locale.starts_with("de") || locale.starts_with("gsw") {
        return true;
    }
    // Region is DE / AT / CH (e.g. "en-DE", "en_AT", "fr-CH")
    let region = locale.replace('_', "-");
    region.ends_with("-de") || region.ends_with("-at") || region.ends_with("-ch")
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

            // ── Bearbeiten-Menü ───────────────────────────────────
            // PredefinedMenuItem handles native functionality (undo/cut/copy etc.)
            // The optional label parameter overrides the system language.
            let edit_menu = if de {
                SubmenuBuilder::new(app, "Bearbeiten")
                    .item(&PredefinedMenuItem::undo(app, Some("Rückgängig"))?)
                    .item(&PredefinedMenuItem::redo(app, Some("Wiederholen"))?)
                    .separator()
                    .item(&PredefinedMenuItem::cut(app, Some("Ausschneiden"))?)
                    .item(&PredefinedMenuItem::copy(app, Some("Kopieren"))?)
                    .item(&PredefinedMenuItem::paste(app, Some("Einfügen"))?)
                    .item(&PredefinedMenuItem::select_all(app, Some("Alles auswählen"))?)
                    .build()?
            } else {
                SubmenuBuilder::new(app, "Edit")
                    .undo()
                    .redo()
                    .separator()
                    .cut()
                    .copy()
                    .paste()
                    .select_all()
                    .build()?
            };

            // ── Menüleiste zusammenbauen ──────────────────────────
            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
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

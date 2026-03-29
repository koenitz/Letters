use tauri::{
    menu::{AboutMetadataBuilder, MenuBuilder, MenuItem, SubmenuBuilder},
    Emitter, Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
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
            let open_item =
                MenuItem::with_id(app, "file-open", "Laden", true, Some("CmdOrCtrl+O"))?;
            let save_item =
                MenuItem::with_id(app, "file-save", "Speichern", true, Some("CmdOrCtrl+S"))?;
            let save_as_item = MenuItem::with_id(
                app,
                "file-save-as",
                "Speichern als\u{2026}",
                true,
                Some("CmdOrCtrl+Shift+S"),
            )?;

            let file_menu = SubmenuBuilder::new(app, "Datei")
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

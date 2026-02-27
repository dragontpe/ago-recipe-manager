mod commands;
mod migrations;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:ago_recipes.db", migrations::get_migrations())
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::wifi::wifi_get_interface,
            commands::wifi::wifi_get_current_network,
            commands::wifi::wifi_connect,
            commands::wifi::wifi_reconnect,
            commands::wifi::wifi_probe_ago,
            commands::export::export_recipe_file,
            commands::export::import_recipe_file,
            commands::export::upload_recipe_file,
            commands::export::list_ago_programs,
            commands::export::delete_ago_program,
            commands::export::get_upload_debug_log,
            commands::export::clear_upload_debug_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

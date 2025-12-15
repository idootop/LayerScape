// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod tray;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn update_tray_icon(app: tauri::AppHandle, bytes: Vec<u8>) -> Result<(), String> {
    use tauri::image::Image;
    use tauri::Manager;

    let image = Image::from_bytes(&bytes).map_err(|e| e.to_string())?;

    if let Some(tray) = app.tray_by_id("main") {
        tray.set_icon(Some(image)).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Tray icon not found".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // 让应用在 macOS 上表现为纯菜单栏应用（隐藏 Dock 图标），解决点击任务栏其他图标不触发失焦的问题
            // #[cfg(target_os = "macos")]
            // app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            #[cfg(desktop)]
            {
                tray::create_tray(app.handle())?;
            }
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::Focused(focused) => {
                if !focused && window.label() == "tray" {
                    let _ = window.hide();
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![greet, update_tray_icon])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod background;
mod inputs;
mod wallpaper;

#[tauri::command]
fn resize_and_move(
    window: tauri::Window,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), String> {
    window
        .set_size(tauri::PhysicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    window
        .set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            inputs::init(app.handle()); // 初始化全局输入事件（鼠标位置、点击等）
            background::init(app.handle()); // 创建全局隐藏窗口
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            resize_and_move,
            wallpaper::set_window_level,
            wallpaper::create_wallpaper_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

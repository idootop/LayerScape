mod background;
mod floating_ball;
mod inputs;
mod wallpaper;
mod window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                // 设置为任务栏应用（隐藏 Dock 栏窗口图标）
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            background::create_background_window(app.handle())?; // 创建全局隐藏窗口
            inputs::init(app.handle()); // 初始化全局输入事件（鼠标位置、点击等）
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            window::set_window_shadow,
            window::set_window_level,
            window::resize_and_move_window,
            wallpaper::create_wallpaper_window,
            floating_ball::create_floating_ball_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

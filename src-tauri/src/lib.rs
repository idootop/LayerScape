// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod mouse_events;
mod tray;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn update_tray_icon(app: tauri::AppHandle, bytes: Vec<u8>) -> Result<(), String> {
    use tauri::image::Image;

    let image = Image::from_bytes(&bytes).map_err(|e| e.to_string())?;

    if let Some(tray) = app.tray_by_id("main") {
        tray.set_icon(Some(image)).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Tray icon not found".to_string())
    }
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

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

#[tauri::command]
fn init_wallpaper_windows(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;

    for (i, monitor) in monitors.iter().enumerate() {
        let label = format!("wallpaper-{}", i);

        if app.get_webview_window(&label).is_some() {
            continue;
        }

        let builder = tauri::WebviewWindowBuilder::new(
            &app,
            &label,
            tauri::WebviewUrl::App("index.html#/wallpaper-window".into()),
        )
        .title("Wallpaper")
        .decorations(false)
        .transparent(true)
        .skip_taskbar(true)
        .always_on_bottom(true);

        #[cfg(target_os = "macos")]
        let builder = builder.hidden_title(true);

        let window = builder.build().map_err(|e| e.to_string())?;

        // 设置位置和大小以匹配显示器
        let _ = window.set_position(monitor.position().clone());
        let _ = window.set_size(monitor.size().clone());

        #[cfg(target_os = "macos")]
        {
            use objc2_app_kit::{
                NSWindow, NSWindowCollectionBehavior, NSWindowLevel, NSWindowStyleMask,
            };

            let ns_window_ptr = window.ns_window().map_err(|e| e.to_string())?;
            let ns_window = unsafe { &*(ns_window_ptr as *const NSWindow) };

            // 1. 设置 StyleMask 为 Borderless，确保无边框
            ns_window.setStyleMask(NSWindowStyleMask::Borderless);

            // 2. 将窗口层级设置为桌面层级
            let level: NSWindowLevel = -2147483628 + 10;
            ns_window.setLevel(level);

            // 3. 设置 CollectionBehavior
            let behavior = ns_window.collectionBehavior();
            ns_window.setCollectionBehavior(
                behavior
                    | NSWindowCollectionBehavior::CanJoinAllSpaces
                    | NSWindowCollectionBehavior::Stationary
                    | NSWindowCollectionBehavior::IgnoresCycle
                    | NSWindowCollectionBehavior::FullScreenAuxiliary, // 允许覆盖 Dock
            );

            // 4. 强制设置窗口 Frame 为屏幕 Frame (覆盖 Dock 和菜单栏)
            if let Some(screen) = ns_window.screen() {
                let frame = screen.frame();
                ns_window.setFrame_display(frame, true);
            }
        }

        // 确保它是可见的
        let _ = window.show();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                tray::create_tray(app.handle())?;
            }

            mouse_events::init(app.handle());

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
        .invoke_handler(tauri::generate_handler![
            greet,
            update_tray_icon,
            quit_app,
            resize_and_move,
            init_wallpaper_windows
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

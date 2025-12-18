mod mouse_events;

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
fn set_window_level(window: tauri::WebviewWindow, level: String) -> Result<(), String> {
    let is_below = level == "below";

    #[cfg(target_os = "macos")]
    {
        if is_below {
            use objc2_app_kit::NSWindow;
            let ns_window_ptr = window.ns_window().map_err(|e| e.to_string())?;
            let ns_window = unsafe { &*(ns_window_ptr as *const NSWindow) };
            ns_window.setLevel(-2147483628 + 10); // kCGDesktopWindowLevel + 1
        } else {
            window
                .set_always_on_bottom(true)
                .map_err(|e| e.to_string())?;
        };
    }

    Ok(())
}

#[tauri::command]
fn init_wallpaper_windows(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;

    // 1. 销毁不再存在的显示器对应的窗口
    let current_labels: Vec<String> = monitors
        .iter()
        .enumerate()
        .map(|(i, _)| format!("wallpaper-{}", i))
        .collect();
    let existing_windows = app.webview_windows();
    for (label, window) in existing_windows {
        if label.starts_with("wallpaper-") && !current_labels.contains(&label) {
            let _ = window.close();
        }
    }

    // 2. 为新显示器创建窗口
    for (i, monitor) in monitors.iter().enumerate() {
        let label = format!("wallpaper-{}", i);

        if let Some(window) = app.get_webview_window(&label) {
            // 如果窗口已存在，确保它的位置和大小正确
            let _ = window.set_position(monitor.position().clone());
            let _ = window.set_size(monitor.size().clone());
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
            ns_window.setHasShadow(false);

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
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            mouse_events::init(app.handle()); // 初始化全局鼠标事件

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut last_monitor_count = 0;
                loop {
                    if let Ok(monitors) = handle.available_monitors() {
                        if monitors.len() != last_monitor_count {
                            last_monitor_count = monitors.len();
                            // 只有在已经初始化过壁纸窗口的情况下才自动同步
                            // 我们通过检查是否有任何以 wallpaper- 开头的窗口来判断
                            use tauri::Manager;
                            let has_wallpaper = handle
                                .webview_windows()
                                .values()
                                .any(|w| w.label().starts_with("wallpaper-"));
                            if has_wallpaper {
                                let _ = init_wallpaper_windows(handle.clone());
                            }
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_secs(2));
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            resize_and_move,
            init_wallpaper_windows,
            set_window_level,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

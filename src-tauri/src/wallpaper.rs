use tauri::Manager;

#[tauri::command]
pub fn create_wallpaper_window(
    app: tauri::AppHandle,
    label: String,
    url: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let handle = app.clone();
    handle
        .run_on_main_thread(move || {
            if app.get_webview_window(label.as_str()).is_some() {
                return;
            }

            let builder =
                tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App(url.into()))
                    .title("Wallpaper")
                    .decorations(false)
                    .transparent(true)
                    .skip_taskbar(true)
                    .shadow(false)
                    .always_on_bottom(true);

            let window = builder.build().unwrap();

            #[cfg(target_os = "macos")]
            {
                use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior, NSWindowLevel};

                let ns_window_ptr = window.ns_window().unwrap();
                let ns_window = unsafe { &*(ns_window_ptr as *const NSWindow) };

                // 1. 确保透明背景无阴影
                ns_window.setHasShadow(false);

                // 2. 将窗口设置为桌面层级（图标之下）
                let level: NSWindowLevel = -2147483628 + 10;
                ns_window.setLevel(level);

                // 3. 设置窗口行为
                let behavior = ns_window.collectionBehavior();
                ns_window.setCollectionBehavior(
                    behavior
                | NSWindowCollectionBehavior::CanJoinAllSpaces // 允许在所有空间中显示
                | NSWindowCollectionBehavior::Stationary // 在虚拟桌面切换时保持固定位置
                | NSWindowCollectionBehavior::IgnoresCycle, // 忽略 Tab 键切换窗口
                );
            }

            // 全屏显示
            window
                .set_position(tauri::PhysicalPosition::new(x, y))
                .unwrap();
            window
                .set_size(tauri::PhysicalSize::new(width, height))
                .unwrap();
            let _ = window.show();
        })
        .map_err(|e| e.to_string())?;

    Ok(())
}

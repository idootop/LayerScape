use tauri::Manager;

#[tauri::command]
pub fn create_floating_ball_window(
    app: tauri::AppHandle,
    label: String,
    url: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    shadow: bool,
) -> Result<(), String> {
    let handle = app.clone();
    handle
        .run_on_main_thread(move || {
            if app.get_webview_window(label.as_str()).is_some() {
                return;
            }

            let window =
                tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App(url.into()))
                    .decorations(false)
                    .transparent(true)
                    .skip_taskbar(true)
                    .always_on_top(true)
                    .shadow(shadow)
                    .resizable(false)
                    .build()
                    .unwrap();

            #[cfg(target_os = "macos")]
            {
                use objc2_app_kit::{
                    NSScreenSaverWindowLevel, NSWindow, NSWindowCollectionBehavior, NSWindowLevel,
                };

                let ns_window_ptr = window.ns_window().unwrap();
                let ns_window = unsafe { &*(ns_window_ptr as *const NSWindow) };

                // 将窗口设置为状态栏层级
                let level: NSWindowLevel = NSScreenSaverWindowLevel - 1;
                ns_window.setLevel(level);

                // 设置窗口行为
                let behavior = ns_window.collectionBehavior();
                ns_window.setCollectionBehavior(
                    behavior
                    | NSWindowCollectionBehavior::CanJoinAllSpaces // 允许在所有空间中显示
                    | NSWindowCollectionBehavior::Stationary, // 在虚拟桌面切换时保持固定位置
                );
            }

            window
                .set_position(tauri::PhysicalPosition::new(x, y))
                .unwrap();
            window
                .set_size(tauri::PhysicalSize::new(width, height))
                .unwrap();
            window.show().unwrap();
        })
        .map_err(|e| e.to_string())?;

    Ok(())
}

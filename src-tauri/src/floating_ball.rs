#[tauri::command]
pub fn create_floating_ball_window(
    app: tauri::AppHandle,
    label: String,
    url: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let window = tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App(url.into()))
        .decorations(false)
        .transparent(true)
        .skip_taskbar(true)
        .always_on_top(true)
        .shadow(false)
        .resizable(false)
        .build()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        use objc2_app_kit::{
            NSStatusWindowLevel, NSWindow, NSWindowCollectionBehavior, NSWindowLevel,
        };

        let ns_window_ptr = window.ns_window().map_err(|e| e.to_string())?;
        let ns_window = unsafe { &*(ns_window_ptr as *const NSWindow) };

        // 1. 确保透明背景无阴影
        ns_window.setHasShadow(false);

        // 2. 将窗口设置为状态栏层级
        let level: NSWindowLevel = NSStatusWindowLevel;
        ns_window.setLevel(level);

        // 3. 设置窗口行为
        let behavior = ns_window.collectionBehavior();
        ns_window.setCollectionBehavior(
            behavior
                    | NSWindowCollectionBehavior::CanJoinAllSpaces // 允许在所有空间中显示
                    | NSWindowCollectionBehavior::Stationary, // 在虚拟桌面切换时保持固定位置
        );
    }

    window
        .set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    window
        .set_size(tauri::PhysicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;

    Ok(())
}

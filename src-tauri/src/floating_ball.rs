#[tauri::command]
pub async fn create_floating_ball_window(
    app: tauri::AppHandle,
    label: String,
    url: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    shadow: bool,
) -> Result<(), String> {
    // 1. 异步创建窗口（避免 Windows 主线程阻塞）
    let mut builder =
        tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App(url.into()))
            .decorations(false)
            .transparent(true)
            .skip_taskbar(true)
            .always_on_top(true)
            .shadow(shadow)
            .resizable(false);

    if label == "floating-menu" {
        builder = builder.visible(false);
    }

    let window = builder.build().map_err(|e| e.to_string())?;

    window
        .set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    window
        .set_size(tauri::PhysicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;

    // 3. macOS 特有逻辑：强制切回主线程执行 UI 操作
    #[cfg(target_os = "macos")]
    {
        use objc2_app_kit::{
            NSScreenSaverWindowLevel, NSWindow, NSWindowCollectionBehavior, NSWindowLevel,
        };

        // 克隆窗口句柄和 app handle，用于主线程闭包
        let window_clone = window.clone();
        let app_clone = app.clone();

        // 使用 Tauri 的 run_on_main_thread 强制在 macOS 主线程执行 UI 操作
        app_clone
            .run_on_main_thread(move || {
                let ns_window_ptr = window_clone.ns_window().unwrap();
                let ns_window = unsafe { &*(ns_window_ptr as *const NSWindow) };

                // 设置状态栏层级
                let level: NSWindowLevel = NSScreenSaverWindowLevel - 1;
                ns_window.setLevel(level);

                // 设置窗口行为
                let behavior = ns_window.collectionBehavior();
                ns_window.setCollectionBehavior(
                    behavior
                        | NSWindowCollectionBehavior::CanJoinAllSpaces
                        | NSWindowCollectionBehavior::Stationary,
                );
            })
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

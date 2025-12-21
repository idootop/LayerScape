static NS_DESKTOP_WINDOW_LEVEL: isize = -2147483628;

#[tauri::command]
pub async fn create_wallpaper_window(
    app: tauri::AppHandle,
    label: String,
    url: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), String> {
    // 异步构建窗口（避免 Windows 主线程阻塞）
    let builder =
        tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App(url.into()))
            .title("Wallpaper")
            .decorations(false)
            .transparent(true)
            .skip_taskbar(true)
            .shadow(false)
            .focused(false)
            .always_on_bottom(true);

    let window = builder
        .build()
        .map_err(|e| format!("窗口创建失败: {}", e))?;

    // macOS 特有逻辑：强制在主线程执行 UI 操作
    #[cfg(target_os = "macos")]
    {
        use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior, NSWindowLevel};

        // 克隆窗口和 app 句柄，用于主线程闭包
        let window_clone = window.clone();
        let app_clone = app.clone();

        // 调度到 macOS 主线程执行 NSWindow 操作
        app_clone
            .run_on_main_thread(move || {
                // 获取 NSWindow 指针（macOS 必须在主线程）
                let ns_window_ptr = window_clone.ns_window().unwrap();
                let ns_window = unsafe { &*(ns_window_ptr as *const NSWindow) };

                // 1. 确保无阴影（强化透明效果）
                ns_window.setHasShadow(false);

                // 2. 设置为桌面层级（替换魔法数字，使用官方常量 + 偏移，确保在图标之下）
                // NSDesktopWindowLevel 是 macOS 官方桌面层级常量，+10 确保在纯桌面之上、图标之下

                let level: NSWindowLevel = NS_DESKTOP_WINDOW_LEVEL + 10;
                ns_window.setLevel(level);

                // 3. 设置窗口行为（增强壁纸窗口的特性）
                let behavior = ns_window.collectionBehavior();
                ns_window.setCollectionBehavior(
                    behavior
                        | NSWindowCollectionBehavior::CanJoinAllSpaces // 所有虚拟桌面可见
                        | NSWindowCollectionBehavior::Stationary // 虚拟桌面切换不移动
                        | NSWindowCollectionBehavior::IgnoresCycle // 忽略 Tab 切换
                        | NSWindowCollectionBehavior::FullScreenAuxiliary, // 适配全屏模式
                );
            })
            .map_err(|e| format!("macOS 主线程执行窗口配置失败: {}", e))?;
    }

    // Windows 特有逻辑：将窗口挂载到 WorkerW
    #[cfg(target_os = "windows")]
    {
        use raw_window_handle::HasWindowHandle;
        if let Ok(handle) = window.window_handle() {
            if let raw_window_handle::RawWindowHandle::Win32(h) = handle.as_raw() {
                crate::windows_api::attach_to_wallpaper_worker(h.hwnd.get() as isize)?;
            }
        }
    }

    // 设置窗口位置和大小
    window
        .set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|e| format!("设置窗口位置失败: {}", e))?;
    window
        .set_size(tauri::PhysicalSize::new(width, height))
        .map_err(|e| format!("设置窗口大小失败: {}", e))?;

    // 显示窗口
    window.show().map_err(|e| format!("显示窗口失败: {}", e))?;

    Ok(())
}

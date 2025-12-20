// 创建全局隐藏窗口，用来做一些后台任务，如初始化应用等
pub fn create_background_window(app: &tauri::AppHandle) -> Result<(), String> {
    let win = tauri::WebviewWindowBuilder::new(
        app,
        "background",
        tauri::WebviewUrl::App("index.html#/background".into()),
    )
    .title("background")
    .inner_size(0.0, 0.0)
    .position(0.0, 0.0)
    .decorations(false)
    .transparent(true)
    .skip_taskbar(true)
    .shadow(false)
    .resizable(false)
    .always_on_bottom(true)
    .build()
    .map_err(|e| e.to_string())?;

    // 在 Windows 上窗口大小做不到 0，所以隐藏掉鼠标事件
    win.set_ignore_cursor_events(true)
        .map_err(|e| e.to_string())?;

    Ok(())
}

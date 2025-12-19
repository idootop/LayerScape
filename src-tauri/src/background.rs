// 创建全局隐藏窗口，用来做一些后台任务，如初始化应用等
pub fn init(app: &tauri::AppHandle) {
    let _ = tauri::WebviewWindowBuilder::new(
        app,
        "background",
        tauri::WebviewUrl::App("index.html#/background".into()),
    )
    .title("background")
    .inner_size(0.0, 0.0)
    .decorations(false)
    .transparent(true)
    .skip_taskbar(true)
    .always_on_bottom(true)
    .build()
    .map_err(|e| e.to_string());
}

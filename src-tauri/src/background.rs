// 创建全局隐藏窗口，用来做一些后台任务，如初始化应用等
pub fn create_background_window(app: &tauri::AppHandle) -> Result<(), String> {
    let handle = app.clone();
    app.run_on_main_thread(move || {
        let _ = tauri::WebviewWindowBuilder::new(
            &handle,
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
        .unwrap();
    })
    .map_err(|e| e.to_string())?;

    Ok(())
}

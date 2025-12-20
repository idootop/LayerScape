use tauri::Manager;

#[tauri::command]
pub fn set_window_shadow(app: tauri::AppHandle, label: String, shadow: bool) -> Result<(), String> {
    let window = app
        .get_webview_window(label.as_str())
        .ok_or("Window not found")?;

    #[cfg(target_os = "macos")]
    {
        use objc2_app_kit::NSWindow;

        if let Ok(ptr) = window.ns_window() {
            unsafe {
                let ns_win = &*(ptr as *const NSWindow);
                ns_win.setHasShadow(shadow);
                ns_win.invalidateShadow();
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn set_window_level(app: tauri::AppHandle, label: String, level: String) -> Result<(), String> {
    let window = app
        .get_webview_window(label.as_str())
        .ok_or("Window not found")?;

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
pub fn resize_and_move_window(
    app: tauri::AppHandle,
    label: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let window = app
        .get_webview_window(label.as_str())
        .ok_or("Window not found")?;

    window
        .set_size(tauri::PhysicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    window
        .set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    Ok(())
}

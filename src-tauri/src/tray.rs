use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, PhysicalPosition, PhysicalSize,
};
use tauri_plugin_dialog::DialogExt;

pub fn create_tray<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> tauri::Result<tauri::tray::TrayIcon<R>> {
    let home_i = MenuItem::with_id(app, "home", "首页", true, None::<&str>)?;
    let about_i = MenuItem::with_id(app, "about", "关于", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&home_i, &about_i, &quit_i])?;

    let tray = TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "home" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            "about" => {
                app.dialog()
                    .message("版本: 0.1.0")
                    .title("LayerScape")
                    .kind(tauri_plugin_dialog::MessageDialogKind::Info)
                    .show(|_| {});
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } = event
            {
                let app = tray.app_handle();
                #[cfg(target_os = "macos")]
                {
                    if let Some(window) = app.get_webview_window("tray") {
                        let scale = window
                            .current_monitor()
                            .ok()
                            .flatten()
                            .map(|m| m.scale_factor())
                            .unwrap_or(1.0);

                        let tray_position = match rect.position {
                            tauri::Position::Physical(pos) => {
                                PhysicalPosition::new(pos.x as f64, pos.y as f64)
                            }
                            tauri::Position::Logical(pos) => pos.to_physical(scale),
                        };

                        let tray_size = match rect.size {
                            tauri::Size::Physical(size) => {
                                PhysicalSize::new(size.width as f64, size.height as f64)
                            }
                            tauri::Size::Logical(size) => size.to_physical(scale),
                        };

                        let win_outer_size = window.outer_size().unwrap_or_default();

                        let tray_x = tray_position.x;
                        let tray_y = tray_position.y;
                        let tray_w = tray_size.width;
                        let tray_h = tray_size.height;

                        let win_w = win_outer_size.width as f64;

                        // Center horizontally
                        let new_x = tray_x + (tray_w / 2.0) - (win_w / 2.0);
                        // Position below the icon
                        let new_y = tray_y + tray_h;

                        let _ = window.set_position(PhysicalPosition::new(new_x, new_y));

                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
                #[cfg(target_os = "windows")]
                {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(tray)
}

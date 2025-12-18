use rdev::{Button, EventType, listen};
use serde::Serialize;
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
pub struct GlobalMouseEvent {
    x: f64,
    y: f64,
    event: String,
    button: String,
}

pub fn init(app: &AppHandle) {
    let handle = app.clone();
    thread::spawn(move || {
        let mut x = 0.0;
        let mut y = 0.0;
        let mut is_left_down = false;
        let mut is_right_down = false;

        #[cfg(target_os = "macos")]
        rdev::set_is_main_thread(false); // 防止按键闪退

        if let Err(error) = listen(move |event| {
            let (event_type_str, button_str) = match event.event_type {
                EventType::MouseMove { x: new_x, y: new_y } => {
                    x = new_x;
                    y = new_y;
                    let event_type_str = if is_left_down || is_right_down {
                        "drag"
                    } else {
                        "move"
                    };
                    let button_str = if is_left_down {
                        "left"
                    } else if is_right_down {
                        "right"
                    } else {
                        "none"
                    };
                    (event_type_str, button_str)
                }
                EventType::ButtonPress(btn) => {
                    let event_type_str = "down";
                    let button_str = match btn {
                        Button::Left => {
                            is_left_down = true;
                            "left"
                        }
                        Button::Right => {
                            is_right_down = true;
                            "right"
                        }
                        _ => return, // 忽略其他按键
                    };
                    (event_type_str, button_str)
                }
                EventType::ButtonRelease(btn) => {
                    let event_type_str = "up";
                    let button_str = match btn {
                        Button::Left => {
                            is_left_down = false;
                            "left"
                        }
                        Button::Right => {
                            is_right_down = false;
                            "right"
                        }
                        _ => return,
                    };
                    (event_type_str, button_str)
                }
                _ => {
                    // 忽略键盘和其他事件
                    return;
                }
            };

            let payload = GlobalMouseEvent {
                x,
                y,
                event: event_type_str.to_string(),
                button: button_str.to_string(),
            };
            let _ = handle.emit("global-mouse-event", payload);
        }) {
            eprintln!("Error: {:?}", error);
        }
    });
}

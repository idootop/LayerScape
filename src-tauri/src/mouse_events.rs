use rdev::{listen, Button, EventType};
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

        if let Err(error) = listen(move |event| {
            let mut event_type_str = "";
            let mut button_str = "none";

            match event.event_type {
                EventType::MouseMove { x: new_x, y: new_y } => {
                    x = new_x;
                    y = new_y;
                    event_type_str = if is_left_down || is_right_down {
                        "drag"
                    } else {
                        "move"
                    };
                    button_str = if is_left_down {
                        "left"
                    } else if is_right_down {
                        "right"
                    } else {
                        "none"
                    };
                }
                EventType::ButtonPress(btn) => {
                    event_type_str = "down";
                    match btn {
                        Button::Left => {
                            is_left_down = true;
                            button_str = "left";
                        }
                        Button::Right => {
                            is_right_down = true;
                            button_str = "right";
                        }
                        _ => return, // 忽略其他按键
                    }
                }
                EventType::ButtonRelease(btn) => {
                    event_type_str = "up";
                    match btn {
                        Button::Left => {
                            is_left_down = false;
                            button_str = "left";
                        }
                        Button::Right => {
                            is_right_down = false;
                            button_str = "right";
                        }
                        _ => return,
                    }
                }
                _ => return, // 忽略键盘和其他事件
            }

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

use mouse_position::mouse_position::Mouse;
use serde::Serialize;
use std::thread;
use std::time::Duration;
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
        let mut last_x = 0;
        let mut last_y = 0;

        loop {
            let position = Mouse::get_mouse_position();
            match position {
                Mouse::Position { x, y } => {
                    if x != last_x || y != last_y {
                        last_x = x;
                        last_y = y;

                        let payload = GlobalMouseEvent {
                            x: x as f64,
                            y: y as f64,
                            event: "move".to_string(),
                            button: "none".to_string(),
                        };
                        let _ = handle.emit("global-mouse-event", payload);
                    }
                }
                Mouse::Error => {
                    // ignore error
                }
            }
            thread::sleep(Duration::from_millis(16));
        }
    });
}

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::{HWND, LPARAM, WPARAM};
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowExW, FindWindowW, SMTO_NORMAL, SendMessageTimeoutW, SetParent,
};

#[cfg(target_os = "windows")]
fn to_wstring(str: &str) -> Vec<u16> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    OsStr::new(str).encode_wide().chain(Some(0)).collect()
}

#[cfg(target_os = "windows")]
pub fn attach_to_wallpaper_worker(window_hwnd: isize) -> Result<(), String> {
    let window_hwnd = window_hwnd as HWND;
    unsafe {
        // 1. 查找 Progman
        let progman_class = to_wstring("Progman");
        let progman = FindWindowW(progman_class.as_ptr(), std::ptr::null());

        // 2. 发送 0x052C 消息生成 WorkerW
        let mut result: usize = 0;
        SendMessageTimeoutW(
            progman,
            0x052C,
            0 as WPARAM,
            0 as LPARAM,
            SMTO_NORMAL,
            1000,
            &mut result,
        );

        // 3. 查找正确的 WorkerW
        let mut workerw: HWND = 0 as HWND;

        // windows-sys 中回调函数的返回值通常是 i32 (1 为继续，0 为停止)
        unsafe extern "system" fn enum_window_callback(top_handle: HWND, lparam: LPARAM) -> i32 {
            let shell_view_name = [
                83, 72, 69, 76, 76, 68, 76, 76, 95, 68, 101, 102, 86, 105, 101, 119, 0,
            ];

            let shell_dll_def_view = FindWindowExW(
                top_handle,
                0 as HWND,
                shell_view_name.as_ptr(),
                std::ptr::null(),
            );

            if shell_dll_def_view != 0 as HWND {
                let workerw_ptr = lparam as *mut HWND;

                let workerw_name = [87, 111, 114, 107, 101, 114, 87, 0];

                let next_workerw = FindWindowExW(
                    0 as HWND,
                    top_handle,
                    workerw_name.as_ptr(),
                    std::ptr::null(),
                );

                if next_workerw != 0 as HWND {
                    *workerw_ptr = next_workerw;
                }
                return 0; // 找到目标，停止枚举
            }
            1 // 继续枚举
        }

        EnumWindows(Some(enum_window_callback), &mut workerw as *mut _ as LPARAM);

        if workerw != 0 as HWND {
            SetParent(window_hwnd, workerw);
            Ok(())
        } else {
            Err("未找到 WorkerW 窗口".into())
        }
    }
}

#[cfg(target_os = "windows")]
pub fn detach_from_wallpaper_worker(window_hwnd: isize) -> Result<(), String> {
    let window_hwnd = window_hwnd as HWND;
    unsafe {
        SetParent(window_hwnd, 0 as HWND);
    }
    Ok(())
}

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::{HWND, LPARAM};
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowExW, FindWindowW, GWL_EXSTYLE, GetWindowLongW, HWND_BOTTOM, SMTO_NORMAL,
    SWP_NOMOVE, SWP_NOSIZE, SendMessageTimeoutW, SetParent, SetWindowLongW, SetWindowPos,
    WS_EX_LAYERED,
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
        // 1. 获取 Progman
        let progman = FindWindowW(to_wstring("Progman").as_ptr(), std::ptr::null());

        // 2. 触发 WorkerW 的创建
        SendMessageTimeoutW(progman, 0x052C, 0, 0, SMTO_NORMAL, 1000, &mut 0);

        // 3. 寻找承载壁纸的 WorkerW
        let mut workerw: HWND = 0 as HWND;

        // 我们需要找到那个拥有 SHELLDLL_DefView 的 WorkerW 的 *兄弟* 窗口
        unsafe extern "system" fn enum_window_callback(top_handle: HWND, lparam: LPARAM) -> i32 {
            unsafe {
                let shell_view = FindWindowExW(
                    top_handle,
                    0 as HWND,
                    to_wstring("SHELLDLL_DefView").as_ptr(),
                    std::ptr::null(),
                );

                if shell_view != 0 as HWND {
                    // 找到了包含图标层的窗口，那么壁纸层通常是它的下一个兄弟 WorkerW 窗口
                    let workerw_ptr = lparam as *mut HWND;
                    *workerw_ptr = FindWindowExW(
                        0 as HWND,
                        top_handle, // 寻找在这个窗口之后的窗口
                        to_wstring("WorkerW").as_ptr(),
                        std::ptr::null(),
                    );
                }
            }
            1 // 继续枚举
        }

        EnumWindows(Some(enum_window_callback), &mut workerw as *mut _ as LPARAM);

        if workerw != 0 as HWND {
            // 4. 设置窗口为透明穿透层
            let ex_style = GetWindowLongW(window_hwnd, GWL_EXSTYLE);
            SetWindowLongW(window_hwnd, GWL_EXSTYLE, ex_style | WS_EX_LAYERED as i32);
            SetParent(window_hwnd, workerw);
            Ok(())
        } else {
            // 如果没找到，尝试 fallback 到 progman
            SetParent(window_hwnd, progman);
            Ok(())
        }
    }
}

#[cfg(target_os = "windows")]
pub fn detach_from_wallpaper_worker(window_hwnd: isize) -> Result<(), String> {
    let window_hwnd = window_hwnd as HWND;
    unsafe {
        SetParent(window_hwnd, 0 as HWND);
        // 3. 调整窗口 Z 序：放到桌面图标之上、任务栏之下
        let result = SetWindowPos(
            window_hwnd,
            HWND_BOTTOM,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE,
        );

        if result == 0 {
            return Err("Failed to set window Z-order".to_string());
        }
    }
    Ok(())
}

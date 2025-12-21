#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowExW, FindWindowW, SMTO_NORMAL, SendMessageTimeoutW, SetParent,
};

#[cfg(target_os = "windows")]
pub fn attach_to_wallpaper_worker(window_hwnd: isize) -> Result<(), String> {
    let window_hwnd = HWND(window_hwnd as _);
    unsafe {
        // 1. 查找 Progman
        let progman = FindWindowW(windows::core::w!("Progman"), windows::core::PCWSTR::null());

        // 2. 发送 0x052C 消息生成 WorkerW
        let mut result: usize = 0;
        SendMessageTimeoutW(
            progman,
            0x052C,
            windows::Win32::Foundation::WPARAM(0),
            windows::Win32::Foundation::LPARAM(0),
            SMTO_NORMAL,
            1000,
            Some(&mut result),
        );

        // 3. 查找正确的 WorkerW
        let mut workerw: HWND = HWND(0);

        unsafe extern "system" fn enum_window_callback(top_handle: HWND, lparam: LPARAM) -> BOOL {
            use windows::Win32::UI::WindowsAndMessaging::FindWindowExW;

            let shell_dll_def_view = FindWindowExW(
                top_handle,
                HWND(0),
                windows::core::w!("SHELLDLL_DefView"),
                windows::core::PCWSTR::null(),
            );

            if shell_dll_def_view.0 != 0 {
                let workerw_ptr = lparam.0 as *mut HWND;
                // 找到 SHELLDLL_DefView 的父窗口 WorkerW 的下一个兄弟窗口
                let next_workerw = FindWindowExW(
                    HWND(0),
                    top_handle,
                    windows::core::w!("WorkerW"),
                    windows::core::PCWSTR::null(),
                );

                if next_workerw.0 != 0 {
                    unsafe { *workerw_ptr = next_workerw };
                }
                return BOOL(0); // 停止枚举
            }
            BOOL(1) // 继续枚举
        }

        EnumWindows(
            Some(enum_window_callback),
            LPARAM(&mut workerw as *mut _ as _),
        );

        // 如果找到了 WorkerW，设置父窗口
        if workerw.0 != 0 {
            SetParent(window_hwnd, workerw);
            Ok(())
        } else {
            Err("未找到 WorkerW 窗口".into())
        }
    }
}

#[cfg(target_os = "windows")]
pub fn detach_from_wallpaper_worker(window_hwnd: isize) -> Result<(), String> {
    let window_hwnd = HWND(window_hwnd as _);
    unsafe {
        SetParent(window_hwnd, HWND(0));
    }
    Ok(())
}

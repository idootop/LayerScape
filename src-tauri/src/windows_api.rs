#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::{BOOL, HWND, LPARAM, WPARAM};
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowExW, FindWindowW, SMTO_NORMAL, SendMessageTimeoutW, SetParent,
};

// 辅助函数：将 Rust 字符串转换为 UTF-16 用于 Windows API
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
        // 注意：windows-sys 的 SendMessageTimeoutW 参数类型可能与 windows crate 略有不同（通常是指针或 usize）
        // 在 windows-sys 0.52 中，lpdwresult 是 *mut usize
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
        let mut workerw: HWND = 0;

        unsafe extern "system" fn enum_window_callback(top_handle: HWND, lparam: LPARAM) -> BOOL {
            // 需要再次调用辅助函数，但在 callback 中分配内存需谨慎。
            // 这里因为是同步回调，且逻辑简单，可以这样做。
            // 为了避免重复分配，其实可以在外部传入，但为了代码简洁先这样写。

            // 手动构建 wide string 以避免在此处依赖外部函数（虽然可以调用）
            // "SHELLDLL_DefView"
            let shell_view_name = [
                83, 72, 69, 76, 76, 68, 76, 76, 95, 68, 101, 102, 86, 105, 101, 119, 0,
            ];

            let shell_dll_def_view =
                FindWindowExW(top_handle, 0, shell_view_name.as_ptr(), std::ptr::null());

            if shell_dll_def_view != 0 {
                let workerw_ptr = lparam as *mut HWND;

                // "WorkerW"
                let workerw_name = [87, 111, 114, 107, 101, 114, 87, 0];

                // 找到 SHELLDLL_DefView 的父窗口 WorkerW 的下一个兄弟窗口
                let next_workerw =
                    FindWindowExW(0, top_handle, workerw_name.as_ptr(), std::ptr::null());

                if next_workerw != 0 {
                    *workerw_ptr = next_workerw;
                }
                return 0; // 停止枚举
            }
            1 // 继续枚举
        }

        EnumWindows(Some(enum_window_callback), &mut workerw as *mut _ as LPARAM);

        // 如果找到了 WorkerW，设置父窗口
        if workerw != 0 {
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
        SetParent(window_hwnd, 0);
    }
    Ok(())
}

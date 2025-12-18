import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useWindowFocus } from "../utils/focus";
import { useRef, useEffect } from "react";

interface TrayWrapperProps {
  children: React.ReactNode;
}

export const TrayWrapper = ({ children }: TrayWrapperProps) => {
  const trayShowTimeRef = useRef(0);

  useEffect(() => {
    const unlisten = listen<number>("tray-show", () => {
      trayShowTimeRef.current = Date.now();
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useWindowFocus({
    onBlur: async () => {
      setTimeout(async () => {
        // 延迟隐藏，防止窗口关闭又被快速打开造成闪烁
        const trayShowTimeAfter = trayShowTimeRef.current;
        if (Date.now() - trayShowTimeAfter < 300) {
          return;
        }
        await getCurrentWindow().hide();
      }, 150);
    },
  });

  return (
    <div
      style={{
        background: "var(--bg-color, white)",
        height: "100%",
        borderRadius: "12px",
        border: "1px solid var(--hover-color)",
        boxSizing: "border-box",
        overflow: "hidden", // Ensure container clips children
        display: "flex",
        flexDirection: "column",
        marginTop: "4px",
      }}
    >
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 16,
          // Add padding to bottom to avoid content being cut off by corner radius
          paddingBottom: 20,
        }}
      >
        {children}
      </div>
    </div>
  );
};

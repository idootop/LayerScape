interface TrayWrapperProps {
  children: React.ReactNode;
}

export const TrayWrapper = ({ children }: TrayWrapperProps) => {
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

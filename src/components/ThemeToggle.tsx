"use client";

export default function ThemeToggle({
  theme,
  onToggle
}: {
  theme: "light" | "dark";
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 44,
        height: 44,
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        cursor: "pointer"
      }}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
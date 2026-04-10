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
      type="button"
      onClick={onToggle}
      title={theme === "light" ? "מצב כהה" : "מצב בהיר"}
      style={{
        width: 42,
        height: 42,
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        color: "var(--text)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18
      }}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
"use client";

type Props = {
  open: boolean;
  fromUsername: string;
  onAccept: () => void;
  onReject: () => void;
};

export default function InviteDialog({
  open,
  fromUsername,
  onAccept,
  onReject
}: Props) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          border: "1px solid #ddd"
        }}
      >
        <div
          style={{
            fontSize: "1.3rem",
            fontWeight: 800,
            marginBottom: 10
          }}
        >
          הזמנה למשחק
        </div>

        <div
          style={{
            color: "#555",
            lineHeight: 1.7,
            marginBottom: 18
          }}
        >
          {fromUsername} הזמין אותך למשחק.
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={onAccept}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 12,
              border: "none",
              background: "#1f6f43",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            אישור
          </button>

          <button
            type="button"
            onClick={onReject}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#b42318",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            דחייה
          </button>
        </div>
      </div>
    </div>
  );
}
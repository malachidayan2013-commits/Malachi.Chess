"use client";

export default function InviteDialog({
  open,
  fromUsername,
  onAccept,
  onReject
}: any) {
  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }}>
      <div className="app-shell-card" style={{ margin: "100px auto", padding: 20, maxWidth: 400 }}>
        <h2>הזמנה למשחק</h2>
        <p>{fromUsername} הזמין אותך</p>

        <button onClick={onAccept} className="app-button-success">אישור</button>
        <button onClick={onReject} className="app-button-danger">דחייה</button>
      </div>
    </div>
  );
}
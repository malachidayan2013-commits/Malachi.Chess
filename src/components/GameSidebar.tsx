"use client";

export default function GameSidebar({
  moves = [],
  onResign,
  onOfferDraw
}: any) {
  return (
    <div className="app-shell-card" style={{ padding: 16 }}>
      <h3>מהלכים</h3>

      {moves.map((m: any, i: number) => (
        <div key={i}>{m.san}</div>
      ))}

      <button onClick={onOfferDraw} className="app-button-primary">
        תיקו
      </button>

      <button onClick={onResign} className="app-button-danger">
        כניעה
      </button>
    </div>
  );
}
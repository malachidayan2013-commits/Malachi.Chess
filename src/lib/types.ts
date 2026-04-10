"use client";

import type { MoveEntry, PlayerColor } from "../lib/types";

export default function GameSidebar({
  moves = [],
  playerColor,
  resultText = "",
  drawOfferBy = null,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  isDemoRoom
}: {
  moves?: MoveEntry[];
  playerColor: PlayerColor;
  resultText?: string;
  drawOfferBy?: PlayerColor | null;
  onResign: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  isDemoRoom: boolean;
}) {
  const safeMoves = Array.isArray(moves) ? moves : [];

  const groupedMoves = [];
  for (let i = 0; i < safeMoves.length; i += 2) {
    groupedMoves.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: safeMoves[i]?.san || "",
      black: safeMoves[i + 1]?.san || ""
    });
  }

  const hasIncomingDrawOffer = !!drawOfferBy && drawOfferBy !== playerColor;

  return (
    <div
      style={{
        width: 300,
        position: "sticky",
        top: 96,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: 18,
        boxShadow: "var(--shadow)",
        color: "var(--text)",
        zIndex: 1
      }}
    >
      <div style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 14 }}>
        מהלכים
      </div>

      <div
        style={{
          maxHeight: 360,
          overflowY: "auto",
          border: "1px solid var(--border)",
          borderRadius: 14,
          background: "var(--bg-soft)",
          padding: 10,
          marginBottom: 16
        }}
      >
        {groupedMoves.length === 0 ? (
          <div style={{ color: "var(--text-soft)" }}>עדיין אין מהלכים</div>
        ) : (
          groupedMoves.map((row) => (
            <div
              key={row.moveNumber}
              style={{
                display: "grid",
                gridTemplateColumns: "42px 1fr 1fr",
                gap: 10,
                padding: "8px 4px",
                borderBottom: "1px solid var(--border)"
              }}
            >
              <div style={{ color: "var(--text-soft)", fontWeight: 700 }}>
                {row.moveNumber}.
              </div>
              <div style={{ fontWeight: 700 }}>{row.white}</div>
              <div style={{ fontWeight: 700 }}>{row.black}</div>
            </div>
          ))
        )}
      </div>

      {resultText ? (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--bg-soft)",
            border: "1px solid var(--border)",
            fontWeight: 800
          }}
        >
          {resultText}
        </div>
      ) : null}

      {hasIncomingDrawOffer ? (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--bg-soft)",
            border: "1px solid var(--border)"
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 10 }}>התקבלה הצעת תיקו</div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onAcceptDraw}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 10,
                border: "none",
                background: "var(--accent-strong)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                pointerEvents: "auto"
              }}
            >
              אישור
            </button>

            <button
              type="button"
              onClick={onDeclineDraw}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text)",
                fontWeight: 700,
                cursor: "pointer",
                pointerEvents: "auto"
              }}
            >
              דחייה
            </button>
          </div>
        </div>
      ) : null}

      {!resultText ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={onOfferDraw}
            style={{
              height: 44,
              borderRadius: 12,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              pointerEvents: "auto"
            }}
          >
            הצעת תיקו
          </button>

          <button
            type="button"
            onClick={onResign}
            style={{
              height: 44,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--danger)",
              fontWeight: 700,
              cursor: "pointer",
              pointerEvents: "auto"
            }}
          >
            כניעה
          </button>
        </div>
      ) : null}

      {isDemoRoom ? (
        <div
          style={{
            marginTop: 14,
            color: "var(--text-soft)",
            fontSize: 14,
            lineHeight: 1.6
          }}
        >
          בחדר הדגמה הכפתורים פועלים מקומית בלבד.
        </div>
      ) : null}
    </div>
  );
}
export type MoveEntry = {
  from: string;
  to: string;
  san: string;
  piece: string;
  color: 'w' | 'b';
};
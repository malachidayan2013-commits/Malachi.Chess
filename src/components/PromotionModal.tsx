"use client";

import Piece from "./Piece";

type PieceColor = "white" | "brown";
type PromotionChoice = "queen" | "rook" | "bishop" | "knight";

type Props = {
  open: boolean;
  color: PieceColor;
  onSelect: (piece: PromotionChoice) => void;
};

const options: PromotionChoice[] = ["queen", "rook", "bishop", "knight"];

export default function PromotionModal({ open, color, onSelect }: Props) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          border: "1px solid #ddd",
          minWidth: 380
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontWeight: 700,
            marginBottom: 16,
            fontSize: "1.2rem"
          }}
        >
          בחר כלי להכתרה
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12
          }}
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              style={{
                height: 92,
                borderRadius: 16,
                border: "1px solid #d8d8d8",
                background: "#f8f7f3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <Piece color={color} type={option} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
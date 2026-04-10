"use client";

type PieceColor = "white" | "brown";
type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";

type Props = {
  color: PieceColor;
  type: PieceType;
};

const pieceMap: Record<PieceType, string> = {
  king: "K",
  queen: "Q",
  rook: "R",
  bishop: "B",
  knight: "N",
  pawn: "P"
};

function normalizeColor(color: PieceColor) {
  return color === "white" ? "w" : "b";
}

export default function Piece({ color, type }: Props) {
  const c = normalizeColor(color);
  const t = pieceMap[type];

  const src = `https://lichess1.org/assets/piece/cburnett/${c}${t}.svg`;

  return (
    <img
      src={src}
      alt={`${c}-${type}`}
      draggable={false}
      style={{
        width: 64,
        height: 64,
        display: "block",
        userSelect: "none",
        pointerEvents: "none"
      }}
    />
  );
}
"use client";

import Piece from "./Piece";

type PieceColor = "white" | "brown";
type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";

type SquarePiece =
  | {
      color: PieceColor;
      type: PieceType;
    }
  | null;

type Props = {
  isDark: boolean;
  piece: SquarePiece;
  selected?: boolean;
  canMove?: boolean;
  canCapture?: boolean;
  inCheck?: boolean;
  isLastMove?: boolean;
  onClick?: () => void;
  fileLabel?: string;
  rankLabel?: string;
};

export default function Square({
  isDark,
  piece,
  selected = false,
  canMove = false,
  canCapture = false,
  inCheck = false,
  isLastMove = false,
  onClick,
  fileLabel,
  rankLabel
}: Props) {
  const baseColor = isDark ? "#B98B66" : "#F0D9B5";

  let backgroundColor = baseColor;

  if (isLastMove) backgroundColor = isDark ? "#C8A34F" : "#E9D66B";
  if (selected) backgroundColor = "#1F6F43";
  if (inCheck) backgroundColor = "#D9534F";

  const labelColor = isDark ? "#F0D9B5" : "#B98B66";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 80,
        height: 80,
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        padding: 0,
        margin: 0,
        position: "relative",
        cursor: "pointer"
      }}
    >
      {piece ? <Piece color={piece.color} type={piece.type} /> : null}

      {rankLabel ? (
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 6,
            fontSize: 14,
            fontWeight: 700,
            color: labelColor,
            pointerEvents: "none",
            userSelect: "none"
          }}
        >
          {rankLabel}
        </span>
      ) : null}

      {fileLabel ? (
        <span
          style={{
            position: "absolute",
            bottom: 4,
            left: 6,
            fontSize: 14,
            fontWeight: 700,
            color: labelColor,
            pointerEvents: "none",
            userSelect: "none"
          }}
        >
          {fileLabel}
        </span>
      ) : null}

      {canMove && !piece ? (
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "rgba(20,20,20,0.35)",
            position: "absolute"
          }}
        />
      ) : null}

      {canCapture ? (
        <>
          <span
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              borderTop: "14px solid rgba(20,20,20,0.8)",
              borderRight: "14px solid transparent"
            }}
          />
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              borderTop: "14px solid rgba(20,20,20,0.8)",
              borderLeft: "14px solid transparent"
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 0,
              height: 0,
              borderBottom: "14px solid rgba(20,20,20,0.8)",
              borderRight: "14px solid transparent"
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 0,
              height: 0,
              borderBottom: "14px solid rgba(20,20,20,0.8)",
              borderLeft: "14px solid transparent"
            }}
          />
        </>
      ) : null}
    </button>
  );
}
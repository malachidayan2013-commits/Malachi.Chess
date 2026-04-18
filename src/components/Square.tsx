"use client";

import { useMemo, useState } from "react";

type PieceColor = "white" | "brown";
type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";

type BoardPiece =
  | {
      color: PieceColor;
      type: PieceType;
    }
  | null;

function getCandidatePaths(piece: NonNullable<BoardPiece>) {
  return [
    `/pieces/${piece.color}-${piece.type}.png`,
    `/pieces/${piece.color}-${piece.type}.svg`,
    `/pieces/${piece.color}_${piece.type}.png`,
    `/pieces/${piece.color}_${piece.type}.svg`,
    `/pieces/${piece.color}${piece.type}.png`,
    `/pieces/${piece.color}${piece.type}.svg`
  ];
}

export default function Square({
  isDark,
  piece,
  selected,
  canMove,
  canCapture,
  inCheck,
  isLastMove,
  fileLabel,
  rankLabel,
  onClick
}: {
  isDark: boolean;
  piece: BoardPiece;
  selected: boolean;
  canMove: boolean;
  canCapture: boolean;
  inCheck: boolean;
  isLastMove: boolean;
  fileLabel?: string;
  rankLabel?: string;
  onClick: () => void;
}) {
  const candidates = useMemo(() => (piece ? getCandidatePaths(piece) : []), [piece]);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  const pieceSrc =
    piece && !imageFailed && candidates.length > 0 ? candidates[imageIndex] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        border: "none",
        padding: 0,
        margin: 0,
        background: inCheck
          ? "#d95c5c"
          : selected
          ? "#7fbe6f"
          : isLastMove
          ? isDark
            ? "#9f8b55"
            : "#d8c98f"
          : isDark
          ? "#8b5a3c"
          : "#f3e2c7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        userSelect: "none",
        overflow: "hidden"
      }}
    >
      {pieceSrc ? (
        <img
          src={pieceSrc}
          alt=""
          draggable={false}
          onError={() => {
            if (imageIndex < candidates.length - 1) {
              setImageIndex((prev) => prev + 1);
            } else {
              setImageFailed(true);
            }
          }}
          style={{
            width: "84%",
            height: "84%",
            objectFit: "contain",
            pointerEvents: "none",
            userSelect: "none"
          }}
        />
      ) : null}

      {canMove ? (
        <span
          style={{
            position: "absolute",
            width: "18%",
            height: "18%",
            borderRadius: "50%",
            background: "rgba(20,20,20,0.28)"
          }}
        />
      ) : null}

      {canCapture ? (
        <span
          style={{
            position: "absolute",
            inset: "6%",
            borderRadius: "50%",
            border: "4px solid rgba(20,20,20,0.35)"
          }}
        />
      ) : null}

      {fileLabel ? (
        <span
          style={{
            position: "absolute",
            bottom: "4%",
            left: "6%",
            fontSize: "clamp(0.5rem, 1.6vw, 0.82rem)",
            fontWeight: 700,
            color: isDark ? "#f7ecdc" : "#5b3a25",
            pointerEvents: "none"
          }}
        >
          {fileLabel}
        </span>
      ) : null}

      {rankLabel ? (
        <span
          style={{
            position: "absolute",
            top: "4%",
            right: "6%",
            fontSize: "clamp(0.5rem, 1.6vw, 0.82rem)",
            fontWeight: 700,
            color: isDark ? "#f7ecdc" : "#5b3a25",
            pointerEvents: "none"
          }}
        >
          {rankLabel}
        </span>
      ) : null}
    </button>
  );
}
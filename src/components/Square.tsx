"use client";

type PieceColor = "white" | "brown";
type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";

type BoardPiece =
  | {
      color: PieceColor;
      type: PieceType;
    }
  | null;

function getPieceSymbol(piece: BoardPiece) {
  if (!piece) return "";

  const map = {
    white: {
      king: "♔",
      queen: "♕",
      rook: "♖",
      bishop: "♗",
      knight: "♘",
      pawn: "♙"
    },
    brown: {
      king: "♚",
      queen: "♛",
      rook: "♜",
      bishop: "♝",
      knight: "♞",
      pawn: "♟"
    }
  };

  return map[piece.color][piece.type];
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
        userSelect: "none"
      }}
    >
      {piece ? (
        <span
          style={{
            fontSize: "clamp(1.2rem, 5vw, 2.7rem)",
            lineHeight: 1,
            filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))"
          }}
        >
          {getPieceSymbol(piece)}
        </span>
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
            color: isDark ? "#f7ecdc" : "#5b3a25"
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
            color: isDark ? "#f7ecdc" : "#5b3a25"
          }}
        >
          {rankLabel}
        </span>
      ) : null}
    </button>
  );
}
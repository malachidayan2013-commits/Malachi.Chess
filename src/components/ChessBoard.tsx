"use client";

import { useEffect, useMemo, useState } from "react";
import { Chess, type Square as SquareName } from "chess.js";
import Square from "./Square";
import PromotionModal from "./PromotionModal";
import { socket } from "../lib/socket";
import type { MoveEntry, PlayerColor, RoomSnapshot } from "../lib/types";

type PieceColor = "white" | "brown";
type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
type PromotionChoice = "queen" | "rook" | "bishop" | "knight";

type BoardPiece =
  | {
      color: PieceColor;
      type: PieceType;
    }
  | null;

type PendingPromotion = {
  from: SquareName;
  to: SquareName;
  color: PieceColor;
} | null;

function mapPieceType(type: string): PieceType {
  switch (type) {
    case "k":
      return "king";
    case "q":
      return "queen";
    case "r":
      return "rook";
    case "b":
      return "bishop";
    case "n":
      return "knight";
    case "p":
      return "pawn";
    default:
      return "pawn";
  }
}

function mapPieceColor(color: string): PieceColor {
  return color === "w" ? "white" : "brown";
}

function getBoardFromFen(fen: string): BoardPiece[][] {
  const chess = new Chess(fen);
  const board = chess.board();

  return board.map((row) =>
    row.map((piece) => {
      if (!piece) return null;

      return {
        color: mapPieceColor(piece.color),
        type: mapPieceType(piece.type)
      };
    })
  );
}

function toSquareName(rowIndex: number, colIndex: number): SquareName {
  const file = String.fromCharCode("a".charCodeAt(0) + colIndex);
  const rank = String(8 - rowIndex);
  return `${file}${rank}` as SquareName;
}

function isPromotionMove(piece: BoardPiece, targetSquare: SquareName): boolean {
  if (!piece || piece.type !== "pawn") return false;

  const targetRank = targetSquare[1];
  return (
    (piece.color === "white" && targetRank === "8") ||
    (piece.color === "brown" && targetRank === "1")
  );
}

function promotionToChessLetter(piece: PromotionChoice): "q" | "r" | "b" | "n" {
  switch (piece) {
    case "queen":
      return "q";
    case "rook":
      return "r";
    case "bishop":
      return "b";
    case "knight":
      return "n";
  }
}

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default function ChessBoard({
  roomId,
  snapshot,
  playerColor,
  isDemoRoom,
  onDemoMovesChange,
  onDemoResultChange
}: {
  roomId: string;
  snapshot: RoomSnapshot;
  playerColor: PlayerColor;
  isDemoRoom: boolean;
  onDemoMovesChange?: (moves: MoveEntry[]) => void;
  onDemoResultChange?: (result: string) => void;
}) {
  const [selectedSquare, setSelectedSquare] = useState<SquareName | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion>(null);
  const [localDemoChess, setLocalDemoChess] = useState<Chess | null>(
    isDemoRoom ? new Chess(snapshot.fen) : null
  );
  const [localDemoLastMove, setLocalDemoLastMove] = useState<{ from: string; to: string } | null>(null);
  const [localDemoMoves, setLocalDemoMoves] = useState<MoveEntry[]>([]);
  const [moveAudio, setMoveAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio(
      "data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YTAAAAA="
    );
    setMoveAudio(audio);
  }, []);

  useEffect(() => {
    if (isDemoRoom && onDemoMovesChange) {
      onDemoMovesChange(localDemoMoves);
    }
  }, [localDemoMoves, isDemoRoom, onDemoMovesChange]);

  const effectiveFen = isDemoRoom
    ? localDemoChess?.fen() || snapshot.fen
    : snapshot.fen;

  const chess = useMemo(() => new Chess(effectiveFen), [effectiveFen]);
  const board = useMemo(() => getBoardFromFen(effectiveFen), [effectiveFen]);

  const effectiveTurn = isDemoRoom
    ? (chess.turn() === "w" ? "white" : "black")
    : snapshot.turn;

  const effectiveLastMove = isDemoRoom ? localDemoLastMove : snapshot.lastMove;
  const effectiveInCheck = isDemoRoom ? chess.inCheck() : snapshot.inCheck;
  const effectiveIsCheckmate = isDemoRoom ? chess.isCheckmate() : snapshot.isCheckmate;
  const effectiveIsDraw = isDemoRoom ? chess.isDraw() : snapshot.isDraw;
  const effectiveResultText = isDemoRoom
    ? effectiveIsCheckmate
      ? effectiveTurn === "white"
        ? "שחור ניצח במט"
        : "לבן ניצח במט"
      : effectiveIsDraw
      ? "המשחק הסתיים בתיקו"
      : ""
    : snapshot.resultText;

  useEffect(() => {
    if (isDemoRoom && onDemoResultChange) {
      onDemoResultChange(effectiveResultText);
    }
  }, [effectiveResultText, isDemoRoom, onDemoResultChange]);

  const isMyTurn = isDemoRoom ? true : effectiveTurn === playerColor;
  const isBoardFlipped = isDemoRoom ? false : playerColor === "black";

  const displayedRows = useMemo(() => {
    if (!isBoardFlipped) {
      return board;
    }

    return [...board].reverse().map((row) => [...row].reverse());
  }, [board, isBoardFlipped]);

  useEffect(() => {
    setSelectedSquare(null);
    setPendingPromotion(null);
  }, [effectiveFen, effectiveTurn]);

  useEffect(() => {
    if (effectiveLastMove && moveAudio) {
      moveAudio.currentTime = 0;
      void moveAudio.play().catch(() => {});
    }
  }, [effectiveLastMove, moveAudio]);

  const legalMoves = useMemo(() => {
    if (!selectedSquare || !isMyTurn) return [];
    return chess.moves({ square: selectedSquare, verbose: true });
  }, [chess, selectedSquare, isMyTurn]);

  const moveMap = useMemo(() => {
    const map = new Map<
      string,
      {
        canMove: boolean;
        canCapture: boolean;
      }
    >();

    for (const move of legalMoves) {
      map.set(move.to, {
        canMove: !move.captured,
        canCapture: !!move.captured
      });
    }

    return map;
  }, [legalMoves]);

  const checkSquare = useMemo(() => {
    if (!effectiveInCheck) return null;

    const currentTurn = chess.turn();
    const kingSquare = chess
      .board()
      .flatMap((row, rowIndex) =>
        row.map((piece, colIndex) => ({
          piece,
          square: toSquareName(rowIndex, colIndex)
        }))
      )
      .find((item) => item.piece?.type === "k" && item.piece?.color === currentTurn);

    return kingSquare?.square ?? null;
  }, [chess, effectiveInCheck]);

  const statusText = useMemo(() => {
    if (effectiveIsCheckmate) {
      return effectiveTurn === "white" ? "מט! שחור ניצח" : "מט! לבן ניצח";
    }

    if (effectiveIsDraw) {
      return "המשחק הסתיים בתיקו";
    }

    if (isDemoRoom) {
      return effectiveTurn === "white" ? "תור הלבן" : "תור השחור";
    }

    return isMyTurn ? "התור שלך" : "ממתין ליריב";
  }, [effectiveIsCheckmate, effectiveIsDraw, effectiveTurn, isMyTurn, isDemoRoom]);

  const gameOverText = useMemo(() => {
    if (effectiveResultText) {
      return effectiveResultText;
    }
    return "";
  }, [effectiveResultText]);

  function applyDemoMove(from: SquareName, to: SquareName, promotion?: PromotionChoice) {
    if (!localDemoChess) return;

    const nextChess = new Chess(localDemoChess.fen());

    const result = nextChess.move({
      from,
      to,
      ...(promotion ? { promotion: promotionToChessLetter(promotion) } : {})
    });

    if (!result) return;

    setLocalDemoChess(nextChess);
    setLocalDemoLastMove({ from: result.from, to: result.to });
    setLocalDemoMoves((prev) => [
      ...prev,
      {
        from: result.from,
        to: result.to,
        san: result.san,
        color: result.color === "w" ? "white" : "black"
      }
    ]);
    setSelectedSquare(null);
    setPendingPromotion(null);
  }

  function sendMove(from: SquareName, to: SquareName, promotion?: PromotionChoice) {
    if (isDemoRoom) {
      applyDemoMove(from, to, promotion);
      return;
    }

    socket.emit("room:move", {
      roomId,
      from,
      to,
      ...(promotion ? { promotion: promotionToChessLetter(promotion) } : {})
    });

    setSelectedSquare(null);
    setPendingPromotion(null);
  }

  function handlePromotionSelect(piece: PromotionChoice) {
    if (!pendingPromotion) return;
    sendMove(pendingPromotion.from, pendingPromotion.to, piece);
  }

  function handleSquareClick(realRowIndex: number, realColIndex: number) {
    if (pendingPromotion) return;
    if (!isMyTurn) return;
    if (effectiveIsCheckmate || effectiveIsDraw || effectiveResultText) return;

    const clickedSquare = toSquareName(realRowIndex, realColIndex);
    const clickedPiece = board[realRowIndex][realColIndex];
    const clickedMove = moveMap.get(clickedSquare);

    if (selectedSquare === clickedSquare) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare && clickedMove) {
      const selectedRow = 8 - Number(selectedSquare[1]);
      const selectedCol = selectedSquare.charCodeAt(0) - "a".charCodeAt(0);
      const selectedPiece = board[selectedRow][selectedCol];

      if (isPromotionMove(selectedPiece, clickedSquare)) {
        setPendingPromotion({
          from: selectedSquare,
          to: clickedSquare,
          color: selectedPiece?.color ?? "white"
        });
        return;
      }

      sendMove(selectedSquare, clickedSquare);
      return;
    }

    if (!clickedPiece) {
      setSelectedSquare(null);
      return;
    }

    if (!isDemoRoom) {
      const pieceBelongsToPlayer =
        (playerColor === "white" && clickedPiece.color === "white") ||
        (playerColor === "black" && clickedPiece.color === "brown");

      if (!pieceBelongsToPlayer) {
        setSelectedSquare(null);
        return;
      }
    }

    if (isDemoRoom) {
      const pieceBelongsToCurrentTurn =
        (effectiveTurn === "white" && clickedPiece.color === "white") ||
        (effectiveTurn === "black" && clickedPiece.color === "brown");

      if (!pieceBelongsToCurrentTurn) {
        setSelectedSquare(null);
        return;
      }
    }

    setSelectedSquare(clickedSquare);
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        <div
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            fontWeight: 700,
            color: "var(--text)"
          }}
        >
          {statusText}
        </div>

        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "repeat(8, 80px)",
            border: "4px solid #7A5230",
            width: "fit-content"
          }}
        >
          {displayedRows.flatMap((row, displayRowIndex) =>
            row.map((piece, displayColIndex) => {
              const realRowIndex = isBoardFlipped ? 7 - displayRowIndex : displayRowIndex;
              const realColIndex = isBoardFlipped ? 7 - displayColIndex : displayColIndex;

              const squareName = toSquareName(realRowIndex, realColIndex);
              const moveInfo = moveMap.get(squareName);

              const fileLabel =
                displayRowIndex === 7
                  ? isBoardFlipped
                    ? files[7 - displayColIndex]
                    : files[displayColIndex]
                  : undefined;

              const rankLabel =
                displayColIndex === 7
                  ? isBoardFlipped
                    ? String(realRowIndex + 1)
                    : String(8 - realRowIndex)
                  : undefined;

              return (
                <Square
                  key={`${realRowIndex}-${realColIndex}`}
                  isDark={(realRowIndex + realColIndex) % 2 === 1}
                  piece={piece}
                  selected={selectedSquare === squareName}
                  canMove={moveInfo?.canMove ?? false}
                  canCapture={moveInfo?.canCapture ?? false}
                  inCheck={checkSquare === squareName}
                  isLastMove={
                    effectiveLastMove?.from === squareName ||
                    effectiveLastMove?.to === squareName
                  }
                  fileLabel={fileLabel}
                  rankLabel={rankLabel}
                  onClick={() => handleSquareClick(realRowIndex, realColIndex)}
                />
              );
            })
          )}

          {gameOverText ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <div
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text)",
                  padding: "24px 32px",
                  borderRadius: 18,
                  fontSize: "2rem",
                  fontWeight: 800,
                  boxShadow: "var(--shadow)"
                }}
              >
                {gameOverText}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <PromotionModal
        open={!!pendingPromotion}
        color={pendingPromotion?.color ?? "white"}
        onSelect={handlePromotionSelect}
      />
    </>
  );
}
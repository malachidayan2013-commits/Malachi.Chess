"use client";

import { useEffect, useMemo, useState } from "react";
import { Chess, type Square as SquareName } from "chess.js";
import Square from "./Square";
import PromotionModal from "./PromotionModal";
import { socket } from "../lib/socket";
import type { PlayerColor, RoomSnapshot } from "../lib/types";

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
  playerColor
}: {
  roomId: string;
  snapshot: RoomSnapshot;
  playerColor: PlayerColor;
}) {
  const [selectedSquare, setSelectedSquare] = useState<SquareName | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion>(null);

  const chess = useMemo(() => new Chess(snapshot.fen), [snapshot.fen]);
  const board = useMemo(() => getBoardFromFen(snapshot.fen), [snapshot.fen]);

  useEffect(() => {
    setSelectedSquare(null);
    setPendingPromotion(null);
  }, [snapshot.fen]);

  const isMyTurn = snapshot.turn === playerColor;

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
    if (!snapshot.inCheck) return null;

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
  }, [chess, snapshot.inCheck]);

  const statusText = useMemo(() => {
    if (snapshot.isCheckmate) {
      return snapshot.turn === "white" ? "מט! שחור ניצח" : "מט! לבן ניצח";
    }

    if (snapshot.isDraw) {
      return "המשחק הסתיים בתיקו";
    }

    return isMyTurn ? "התור שלך" : "ממתין ליריב";
  }, [snapshot, isMyTurn]);

  const gameOverText = useMemo(() => {
    if (snapshot.isCheckmate) {
      return snapshot.turn === "white" ? "שחור ניצח!" : "לבן ניצח!";
    }

    if (snapshot.isDraw) {
      return "תיקו";
    }

    return null;
  }, [snapshot]);

  function sendMove(from: SquareName, to: SquareName, promotion?: PromotionChoice) {
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

  function handleSquareClick(rowIndex: number, colIndex: number) {
    if (pendingPromotion) return;
    if (!isMyTurn) return;
    if (snapshot.isCheckmate || snapshot.isDraw) return;

    const clickedSquare = toSquareName(rowIndex, colIndex);
    const clickedPiece = board[rowIndex][colIndex];
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

    const pieceBelongsToPlayer =
      (playerColor === "white" && clickedPiece.color === "white") ||
      (playerColor === "black" && clickedPiece.color === "brown");

    if (!pieceBelongsToPlayer) {
      setSelectedSquare(null);
      return;
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
            background: "#fff",
            border: "1px solid #d8d8d8",
            fontWeight: 700
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
          {board.flatMap((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const squareName = toSquareName(rowIndex, colIndex);
              const moveInfo = moveMap.get(squareName);

              const fileLabel = rowIndex === 7 ? files[colIndex] : undefined;
              const rankLabel = colIndex === 7 ? String(8 - rowIndex) : undefined;

              return (
                <Square
                  key={`${rowIndex}-${colIndex}`}
                  isDark={(rowIndex + colIndex) % 2 === 1}
                  piece={piece}
                  selected={selectedSquare === squareName}
                  canMove={moveInfo?.canMove ?? false}
                  canCapture={moveInfo?.canCapture ?? false}
                  inCheck={checkSquare === squareName}
                  isLastMove={
                    snapshot.lastMove?.from === squareName ||
                    snapshot.lastMove?.to === squareName
                  }
                  fileLabel={fileLabel}
                  rankLabel={rankLabel}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
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
                  background: "#ffffff",
                  color: "#111",
                  padding: "24px 32px",
                  borderRadius: 18,
                  fontSize: "2rem",
                  fontWeight: 800,
                  boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
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
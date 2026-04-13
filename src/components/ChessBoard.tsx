"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ChessBoard from "./ChessBoard";
import GameSidebar from "./GameSidebar";
import { socket } from "../lib/socket";
import { getStoredUsername } from "../lib/storage";
import type { MoveEntry, PlayerColor, RoomSnapshot } from "../lib/types";

export default function GameRoom({ roomId }: { roomId: string }) {
  const isDemoRoom = roomId === "demo-room";

  const [username, setUsername] = useState("");
  const [initialPlayerColor, setInitialPlayerColor] = useState<PlayerColor | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [joinError, setJoinError] = useState("");

  const [demoMoves, setDemoMoves] = useState<MoveEntry[]>([]);
  const [demoResultText, setDemoResultText] = useState("");

  useEffect(() => {
    if (isDemoRoom) {
      setUsername("שחקן מקומי");
      setInitialPlayerColor("white");
      setSnapshot({
        roomId: "demo-room",
        fen: "start",
        turn: "white",
        inCheck: false,
        isCheckmate: false,
        isDraw: false,
        lastMove: null,
        whiteUsername: "לבן",
        blackUsername: "שחור",
        moves: [],
        resultText: "",
        drawOfferBy: null,
        rematchOfferedBy: null,
        whiteConnected: true,
        blackConnected: true
      });
      return;
    }

    const storedUsername = getStoredUsername();

    if (!storedUsername) {
      setJoinError("אין שם משתמש");
      return;
    }

    setUsername(storedUsername);

    socket.emit(
      "room:join",
      { roomId, username: storedUsername },
      (res: any) => {
        if (!res.ok) {
          setJoinError(res.message);
          return;
        }

        setInitialPlayerColor(res.playerColor);
        setSnapshot(res.snapshot);
      }
    );

    socket.on("room:update", setSnapshot);

    return () => {
      socket.off("room:update");
    };
  }, [roomId]);

  const effectivePlayerColor = useMemo(() => {
    if (isDemoRoom) return "white";
    if (!snapshot) return initialPlayerColor;
    if (snapshot.whiteUsername === username) return "white";
    if (snapshot.blackUsername === username) return "black";
    return initialPlayerColor;
  }, [snapshot, username]);

  if (joinError) {
    return <div>{joinError}</div>;
  }

  if (!snapshot || !effectivePlayerColor) {
    return <div>טוען...</div>;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 30,
        direction: "rtl",
        background: "var(--bg)",
        color: "var(--text)"
      }}
    >
      {/* HEADER */}
      <div
        className="app-shell-card"
        style={{
          padding: 16,
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between"
        }}
      >
        <h1>חדר משחק</h1>

        <Link href="/" className="app-button-secondary">
          חזרה
        </Link>
      </div>

      {/* MAIN */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 20
        }}
      >
        {/* BOARD */}
        <div className="app-shell-card" style={{ padding: 20 }}>
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            {snapshot.blackUsername}
          </div>

          <ChessBoard
            roomId={roomId}
            snapshot={snapshot}
            playerColor={effectivePlayerColor}
            isDemoRoom={isDemoRoom}
            onDemoMovesChange={setDemoMoves}
            onDemoResultChange={setDemoResultText}
          />

          <div style={{ textAlign: "center", marginTop: 10 }}>
            {snapshot.whiteUsername}
          </div>
        </div>

        {/* SIDEBAR */}
        <GameSidebar
          moves={snapshot.moves}
          onResign={() => socket.emit("room:resign", { roomId })}
          onOfferDraw={() => socket.emit("room:offer-draw", { roomId })}
        />
      </div>
    </div>
  );
}
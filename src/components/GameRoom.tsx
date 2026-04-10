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
  const [demoDrawOfferBy, setDemoDrawOfferBy] = useState<PlayerColor | null>(null);

  useEffect(() => {
    if (isDemoRoom) {
      setUsername("שחקן מקומי");
      setInitialPlayerColor("white");
      setSnapshot({
        roomId: "demo-room",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
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
      setDemoMoves([]);
      setDemoResultText("");
      setDemoDrawOfferBy(null);
      return;
    }

    const storedUsername = getStoredUsername();

    if (!storedUsername) {
      setJoinError("אין שם משתמש מחובר. יש לחזור לדף הבית ולהתחבר.");
      return;
    }

    setUsername(storedUsername);

    socket.emit(
      "room:join",
      { roomId, username: storedUsername },
      (response: {
        ok: boolean;
        message?: string;
        playerColor?: PlayerColor;
        snapshot?: RoomSnapshot;
      }) => {
        if (!response.ok) {
          setJoinError(response.message || "לא ניתן להצטרף לחדר");
          return;
        }

        setInitialPlayerColor(response.playerColor || null);
        setSnapshot(response.snapshot || null);
      }
    );

    const handleRoomUpdate = (nextSnapshot: RoomSnapshot) => {
      if (nextSnapshot.roomId === roomId) {
        setSnapshot(nextSnapshot);
      }
    };

    socket.on("room:update", handleRoomUpdate);

    return () => {
      socket.off("room:update", handleRoomUpdate);
    };
  }, [roomId, isDemoRoom]);

  const effectivePlayerColor = useMemo<PlayerColor | null>(() => {
    if (isDemoRoom) return "white";
    if (!snapshot || !username) return initialPlayerColor;

    if (snapshot.whiteUsername === username) return "white";
    if (snapshot.blackUsername === username) return "black";

    return initialPlayerColor;
  }, [snapshot, username, initialPlayerColor, isDemoRoom]);

  const safeMoves: MoveEntry[] = isDemoRoom ? demoMoves : snapshot?.moves ?? [];
  const safeResultText = isDemoRoom ? demoResultText : snapshot?.resultText ?? "";
  const safeDrawOfferBy = isDemoRoom ? demoDrawOfferBy : snapshot?.drawOfferBy ?? null;
  const safeRematchOfferedBy = snapshot?.rematchOfferedBy ?? null;

  const topPlayerName = useMemo(() => {
    if (isDemoRoom) return "שחור";
    if (!snapshot || !effectivePlayerColor) return "";

    const name =
      effectivePlayerColor === "white"
        ? snapshot.blackUsername || ""
        : snapshot.whiteUsername || "";

    const connected =
      effectivePlayerColor === "white"
        ? snapshot.blackConnected
        : snapshot.whiteConnected;

    return connected ? name : `${name} (מנותק)`;
  }, [snapshot, effectivePlayerColor, isDemoRoom]);

  const bottomPlayerName = useMemo(() => {
    if (isDemoRoom) return "לבן";
    return username || "";
  }, [username, isDemoRoom]);

  const opponentDisconnected = useMemo(() => {
    if (isDemoRoom || !snapshot || !effectivePlayerColor) return false;

    return effectivePlayerColor === "white"
      ? !snapshot.blackConnected
      : !snapshot.whiteConnected;
  }, [snapshot, effectivePlayerColor, isDemoRoom]);

  function handleResign() {
    if (isDemoRoom) {
      setDemoResultText("המשחק הסתיים בכניעה");
      return;
    }

    socket.emit("room:resign", { roomId });
  }

  function handleOfferDraw() {
    if (isDemoRoom) {
      setDemoResultText("המשחק הסתיים בתיקו בהסכמה");
      setDemoDrawOfferBy(null);
      return;
    }

    socket.emit("room:offer-draw", { roomId });
  }

  function handleAcceptDraw() {
    if (isDemoRoom) {
      setDemoResultText("המשחק הסתיים בתיקו בהסכמה");
      setDemoDrawOfferBy(null);
      return;
    }

    socket.emit("room:accept-draw", { roomId });
  }

  function handleDeclineDraw() {
    if (isDemoRoom) {
      setDemoDrawOfferBy(null);
      return;
    }

    socket.emit("room:decline-draw", { roomId });
  }

  function handleOfferRematch() {
    if (isDemoRoom) {
      window.location.reload();
      return;
    }

    socket.emit("room:offer-rematch", { roomId });
  }

  function handleDeclineRematch() {
    if (isDemoRoom) return;
    socket.emit("room:decline-rematch", { roomId });
  }

  if (joinError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          padding: "32px 24px",
          direction: "rtl",
          fontFamily: "Arial, sans-serif",
          color: "var(--text)"
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Link
            href="/"
            style={{ textDecoration: "none", color: "var(--accent)", fontWeight: 700 }}
          >
            חזרה לדף הבית
          </Link>

          <div
            style={{
              marginTop: 20,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 18,
              padding: 20,
              color: "var(--danger)",
              fontWeight: 700
            }}
          >
            {joinError}
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot || !effectivePlayerColor) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          padding: "32px 24px",
          direction: "rtl",
          fontFamily: "Arial, sans-serif",
          color: "var(--text)"
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>טוען חדר משחק...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "32px 24px",
        direction: "rtl",
        fontFamily: "Arial, sans-serif",
        color: "var(--text)"
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            gap: 16
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>{isDemoRoom ? "חדר הדגמה" : "חדר משחק"}</h1>
            <p style={{ margin: "8px 0 0", color: "var(--text-soft)" }}>Room ID: {roomId}</p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link
              href="/"
              style={{
                textDecoration: "none",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                padding: "12px 16px",
                borderRadius: 12,
                fontWeight: 700
              }}
            >
              יציאה מהחדר
            </Link>
          </div>
        </div>

        {opponentDisconnected ? (
          <div
            style={{
              marginBottom: 16,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "12px 16px",
              color: "var(--danger)",
              fontWeight: 700
            }}
          >
            היריב התנתק מהחדר.
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 20,
            alignItems: "start"
          }}
        >
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 24,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              boxShadow: "var(--shadow)"
            }}
          >
            <div
              style={{
                width: 648,
                background: "var(--bg-soft)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "12px 16px",
                fontWeight: 700,
                textAlign: "center"
              }}
            >
              {topPlayerName}
            </div>

            <ChessBoard
              roomId={roomId}
              snapshot={snapshot}
              playerColor={effectivePlayerColor}
              isDemoRoom={isDemoRoom}
              onDemoMovesChange={setDemoMoves}
              onDemoResultChange={setDemoResultText}
            />

            <div
              style={{
                width: 648,
                background: "var(--bg-soft)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "12px 16px",
                fontWeight: 700,
                textAlign: "center"
              }}
            >
              {bottomPlayerName}
            </div>
          </div>

          <GameSidebar
            moves={safeMoves}
            playerColor={effectivePlayerColor}
            resultText={safeResultText}
            drawOfferBy={safeDrawOfferBy}
            rematchOfferedBy={safeRematchOfferedBy}
            onResign={handleResign}
            onOfferDraw={handleOfferDraw}
            onAcceptDraw={handleAcceptDraw}
            onDeclineDraw={handleDeclineDraw}
            onOfferRematch={handleOfferRematch}
            onDeclineRematch={handleDeclineRematch}
            isDemoRoom={isDemoRoom}
          />
        </div>
      </div>
    </div>
  );
}
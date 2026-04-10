"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ChessBoard from "./ChessBoard";
import { socket } from "../lib/socket";
import { getStoredUsername } from "../lib/storage";
import type { PlayerColor, RoomSnapshot } from "../lib/types";

export default function GameRoom({ roomId }: { roomId: string }) {
  const [username, setUsername] = useState("");
  const [playerColor, setPlayerColor] = useState<PlayerColor | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
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

        setPlayerColor(response.playerColor || null);
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
  }, [roomId]);

  const myName = username;
  const opponentName =
    playerColor === "white"
      ? snapshot?.blackUsername || "ממתין ליריב"
      : playerColor === "black"
      ? snapshot?.whiteUsername || "ממתין ליריב"
      : "ממתין לחיבור";

  if (joinError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8f7f3",
          padding: "32px 24px",
          direction: "rtl",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Link href="/" style={{ textDecoration: "none", color: "#5a3d28", fontWeight: 700 }}>
            חזרה לדף הבית
          </Link>

          <div
            style={{
              marginTop: 20,
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: 18,
              padding: 20,
              color: "#b42318",
              fontWeight: 700
            }}
          >
            {joinError}
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot || !playerColor) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8f7f3",
          padding: "32px 24px",
          direction: "rtl",
          fontFamily: "Arial, sans-serif"
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
        background: "#f8f7f3",
        padding: "32px 24px",
        direction: "rtl",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
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
            <h1 style={{ margin: 0 }}>חדר משחק</h1>
            <p style={{ margin: "8px 0 0", color: "#666" }}>Room ID: {roomId}</p>
          </div>

          <Link
            href="/"
            style={{
              textDecoration: "none",
              background: "#fff",
              border: "1px solid #ddd",
              color: "#222",
              padding: "12px 16px",
              borderRadius: 12,
              fontWeight: 700
            }}
          >
            חזרה לדף הבית
          </Link>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #ddd",
            borderRadius: 20,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16
          }}
        >
          <ChessBoard roomId={roomId} snapshot={snapshot} playerColor={playerColor} />

          <div
            style={{
              width: 648,
              display: "flex",
              justifyContent: "space-between",
              gap: 20
            }}
          >
            <div
              style={{
                flex: 1,
                background: "#f3f1eb",
                border: "1px solid #ddd7ca",
                borderRadius: 12,
                padding: "12px 16px",
                fontWeight: 700,
                textAlign: "right"
              }}
            >
              {myName || "אתה"}
            </div>

            <div
              style={{
                flex: 1,
                background: "#f3f1eb",
                border: "1px solid #ddd7ca",
                borderRadius: 12,
                padding: "12px 16px",
                fontWeight: 700,
                textAlign: "left"
              }}
            >
              {opponentName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
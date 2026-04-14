"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  applyTheme,
  getStoredTheme,
  getStoredUsername,
  setStoredTheme,
  setStoredUsername,
  clearStoredUsername
} from "../lib/storage";
import { socket } from "../lib/socket";
import InviteDialog from "./InviteDialog";
import ThemeToggle from "./ThemeToggle";
import { generateRoomId } from "../lib/utils";
import type {
  IncomingInvite,
  InviteAcceptedPayload,
  FriendStatusResponse,
  UsersUpdatePayload,
  OutgoingInviteState
} from "../lib/types";

type AuthMode = "login" | "register";

export default function HomeShell() {
  const router = useRouter();

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [username, setUsername] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);

  const [friendName, setFriendName] = useState("");
  const [friendStatus, setFriendStatus] = useState<FriendStatusResponse | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<IncomingInvite | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<UsersUpdatePayload>([]);
  const [privateRoomId, setPrivateRoomId] = useState("");
  const [outgoingInvite, setOutgoingInvite] = useState<OutgoingInviteState | null>(null);
  const [inviteStatusText, setInviteStatusText] = useState("");

  useEffect(() => {
    const storedTheme = getStoredTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
    setPrivateRoomId(generateRoomId(6));
  }, []);

  useEffect(() => {
    const existing = getStoredUsername();

    if (existing) {
      socket.emit("user:register", { username: existing }, (response: { ok: boolean }) => {
        if (response?.ok) {
          setUsername(existing);
        } else {
          clearStoredUsername();
        }
      });
    }

    socket.on("users:update", setConnectedUsers);
    socket.on("invite:incoming", setIncomingInvite);
    socket.on("invite:accepted", (payload: InviteAcceptedPayload) => {
      setOutgoingInvite(null);
      setInviteStatusText("");
      router.push(`/game/${payload.roomId}`);
    });

    socket.on("invite:rejected", () => {
      setOutgoingInvite(null);
      setInviteStatusText("ההזמנה נדחתה.");
    });

    socket.on("invite:cancelled", () => {
      setIncomingInvite(null);
    });

    return () => {
      socket.off("users:update");
      socket.off("invite:incoming");
      socket.off("invite:accepted");
      socket.off("invite:rejected");
      socket.off("invite:cancelled");
    };
  }, [router]);

  function handleToggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    setStoredTheme(next);
    applyTheme(next);
  }

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setInput("");
    setError("");
    setAuthOpen(true);
  }

  function closeAuth() {
    setAuthOpen(false);
  }

  function handlePrimaryAction() {
    const normalized = input.trim();
    if (!normalized) {
      setError("יש להזין שם משתמש");
      return;
    }

    socket.emit(
      "user:register",
      { username: normalized },
      (res: { ok: boolean; message?: string }) => {
        if (!res.ok) {
          setError(res.message || "שגיאה");
          return;
        }

        setStoredUsername(normalized);
        setUsername(normalized);
        setAuthOpen(false);
      }
    );
  }

  function handleLogout() {
    socket.emit("user:logout", {}, () => {
      clearStoredUsername();
      setUsername("");
      setHoverOpen(false);
    });
  }

  function handleCheckFriend() {
    socket.emit("friend:status", { friendName }, setFriendStatus);
  }

  function handleSendInvite() {
    socket.emit("invite:create", { fromUsername: username, toUsername: friendName }, (res: any) => {
      if (!res.ok) return;
      setOutgoingInvite(res);
      setInviteStatusText("הזמנה נשלחה");
    });
  }

  function handleCancelInvite() {
    if (!outgoingInvite) return;
    socket.emit("invite:cancel", { inviteId: outgoingInvite.inviteId }, () => {
      setOutgoingInvite(null);
    });
  }

  function handleAcceptInvite() {
    if (!incomingInvite) return;
    socket.emit("invite:accept", { inviteId: incomingInvite.inviteId }, (res: any) => {
      if (res.roomId) router.push(`/game/${res.roomId}`);
    });
  }

  function handleRejectInvite() {
    if (!incomingInvite) return;
    socket.emit("invite:reject", { inviteId: incomingInvite.inviteId });
    setIncomingInvite(null);
  }

  function handleCreateRoom() {
    setPrivateRoomId(generateRoomId(6));
  }

  function handleEnterRoom() {
    router.push(`/game/${privateRoomId}`);
  }

  return (
    <>
      <div style={{ padding: 24 }}>
        <h1>אתר שחמט</h1>

        <ThemeToggle theme={theme} onToggle={handleToggleTheme} />

        {!username ? (
          <button onClick={() => openAuth("login")}>התחברות</button>
        ) : (
          <div>
            {username}
            <button onClick={handleLogout}>התנתקות</button>
          </div>
        )}

        <div>
          <h2>חדר פרטי</h2>
          <div>{privateRoomId}</div>
          <button onClick={handleCreateRoom}>חדש</button>
          <button onClick={handleEnterRoom}>כניסה</button>
        </div>

        <div>
          <h2>מחוברים</h2>
          {connectedUsers.map((u) => (
            <div key={u.username}>{u.username}</div>
          ))}
        </div>
      </div>

      <InviteDialog
        open={!!incomingInvite}
        fromUsername={incomingInvite?.fromUsername || ""}
        onAccept={handleAcceptInvite}
        onReject={handleRejectInvite}
      />

      {authOpen && (
        <div>
          <h2>{authMode === "login" ? "התחברות" : "הרשמה"}</h2>
          <input value={input} onChange={(e) => setInput(e.target.value)} />
          <button onClick={handlePrimaryAction}>אישור</button>
          <button onClick={closeAuth}>סגור</button>
          {error && <div>{error}</div>}
        </div>
      )}
    </>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getStoredUsername,
  setStoredUsername,
  clearStoredUsername
} from "../lib/storage";
import { socket } from "../lib/socket";
import InviteDialog from "./InviteDialog";
import type {
  IncomingInvite,
  InviteAcceptedPayload,
  FriendStatusResponse,
  UsersUpdatePayload
} from "../lib/types";

type AuthMode = "login" | "register";

export default function HomeShell() {
  const router = useRouter();

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

    const handleUsersUpdate = (users: UsersUpdatePayload) => {
      setConnectedUsers(users);
    };

    const handleIncomingInvite = (payload: IncomingInvite) => {
      setIncomingInvite(payload);
    };

    const handleInviteAccepted = (payload: InviteAcceptedPayload) => {
      router.push(`/game/${payload.roomId}`);
    };

    const handleInviteRejected = () => {
      alert("ההזמנה נדחתה.");
    };

    socket.on("users:update", handleUsersUpdate);
    socket.on("invite:incoming", handleIncomingInvite);
    socket.on("invite:accepted", handleInviteAccepted);
    socket.on("invite:rejected", handleInviteRejected);

    return () => {
      socket.off("users:update", handleUsersUpdate);
      socket.off("invite:incoming", handleIncomingInvite);
      socket.off("invite:accepted", handleInviteAccepted);
      socket.off("invite:rejected", handleInviteRejected);
    };
  }, [router]);

  const authTitle = useMemo(() => {
    return authMode === "login" ? "התחברות" : "הרשמה";
  }, [authMode]);

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setInput("");
    setError("");
    setLoadingAuth(false);
    setAuthOpen(true);
  }

  function closeAuth() {
    if (loadingAuth) return;
    setAuthOpen(false);
    setInput("");
    setError("");
    setLoadingAuth(false);
  }

  function finishAuthSuccess(normalized: string) {
    setStoredUsername(normalized);
    setUsername(normalized);
    setHoverOpen(false);
    setLoadingAuth(false);
    setAuthOpen(false);
    setInput("");
    setError("");
  }

  function handlePrimaryAction() {
    const normalized = input.trim();

    if (!normalized) {
      setError("יש להזין שם משתמש");
      return;
    }

    if (!socket.connected) {
      setError("אין חיבור לשרת כרגע. רענן את הדף ונסה שוב.");
      return;
    }

    setLoadingAuth(true);
    setError("");

    let handled = false;

    const timeoutId = window.setTimeout(() => {
      if (!handled) {
        handled = true;
        setLoadingAuth(false);
        setError("השרת לא הגיב בזמן. נסה שוב.");
      }
    }, 5000);

    socket.emit(
      "user:register",
      { username: normalized },
      (response: { ok: boolean; message?: string }) => {
        if (handled) return;
        handled = true;
        clearTimeout(timeoutId);

        if (!response?.ok) {
          setLoadingAuth(false);
          setError(
            response?.message ||
              (authMode === "login" ? "לא ניתן להתחבר" : "לא ניתן להירשם")
          );
          return;
        }

        finishAuthSuccess(normalized);
      }
    );
  }

  function handleLogout() {
    socket.emit("user:logout", {}, () => {
      clearStoredUsername();
      setUsername("");
      setHoverOpen(false);
      setFriendName("");
      setFriendStatus(null);
    });
  }

  function handleCheckFriend() {
    const normalized = friendName.trim();

    if (!normalized) {
      setFriendStatus({
        ok: false,
        online: false,
        friendName: "",
        message: "יש להזין שם חבר"
      });
      return;
    }

    socket.emit(
      "friend:status",
      { friendName: normalized },
      (response: FriendStatusResponse) => {
        setFriendStatus(response);
      }
    );
  }

  function handleSendInvite() {
    const normalized = friendName.trim();
    if (!username || !normalized) return;

    socket.emit(
      "invite:create",
      {
        fromUsername: username,
        toUsername: normalized
      },
      (response: { ok: boolean; message?: string }) => {
        if (!response.ok) {
          alert(response.message || "לא ניתן היה לשלוח הזמנה");
          return;
        }

        alert("ההזמנה נשלחה");
      }
    );
  }

  function handleAcceptInvite() {
    if (!incomingInvite) return;

    socket.emit(
      "invite:accept",
      { inviteId: incomingInvite.inviteId },
      (response: { ok: boolean; roomId?: string }) => {
        if (!response.ok || !response.roomId) return;
        setIncomingInvite(null);
        router.push(`/game/${response.roomId}`);
      }
    );
  }

  function handleRejectInvite() {
    if (!incomingInvite) return;

    socket.emit("invite:reject", { inviteId: incomingInvite.inviteId }, () => {
      setIncomingInvite(null);
    });
  }

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          background: "#f8f7f3",
          direction: "rtl",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div
          style={{
            borderBottom: "1px solid #e6dfd3",
            background: "#f8f7f3"
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "16px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "#5a3d28"
              }}
            >
              אתר שחמט
            </div>

            <div style={{ position: "relative" }}>
              {!username ? (
                <button
                  type="button"
                  onClick={() => openAuth("login")}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#5a3d28",
                    fontWeight: 700,
                    fontSize: "1rem",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  התחברות
                </button>
              ) : (
                <div
                  onMouseEnter={() => setHoverOpen(true)}
                  onMouseLeave={() => setHoverOpen(false)}
                  style={{
                    position: "relative",
                    display: "inline-block",
                    paddingBottom: 48
                  }}
                >
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#1f1f1f",
                      fontWeight: 700,
                      fontSize: "1rem",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    {username}
                  </button>

                  {hoverOpen ? (
                    <div
                      style={{
                        position: "absolute",
                        top: 28,
                        left: 0,
                        minWidth: 140,
                        background: "#ffffff",
                        border: "1px solid #ddd",
                        borderRadius: 12,
                        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                        padding: 8,
                        zIndex: 20
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleLogout}
                        style={{
                          width: "100%",
                          border: "none",
                          background: "transparent",
                          textAlign: "right",
                          padding: "10px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                          color: "#b42318",
                          fontWeight: 700
                        }}
                      >
                        התנתקות
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "40px 24px"
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "360px 1fr",
              gap: 24
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #ddd",
                borderRadius: 20,
                padding: 20
              }}
            >
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  marginBottom: 14
                }}
              >
                דף הבית
              </div>

              <p
                style={{
                  color: "#666",
                  lineHeight: 1.7,
                  marginTop: 0
                }}
              >
                מכאן אפשר להתחבר, להזמין חבר למשחק, או להיכנס לחדר ישיר.
              </p>

              <Link
                href="/game/demo-room"
                style={{
                  display: "block",
                  textAlign: "center",
                  textDecoration: "none",
                  background: "#8b5e3c",
                  color: "#fff",
                  padding: "14px 16px",
                  borderRadius: 14,
                  fontWeight: 700,
                  marginTop: 12
                }}
              >
                כניסה לחדר משחק לדוגמה
              </Link>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #ddd",
                borderRadius: 20,
                padding: 20,
                minHeight: 220
              }}
            >
              <h2 style={{ marginTop: 0 }}>הזמן חבר למשחק</h2>

              {!username ? (
                <p style={{ color: "#666" }}>כדי להזמין חבר, יש להתחבר קודם.</p>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <input
                      value={friendName}
                      onChange={(e) => {
                        setFriendName(e.target.value);
                        setFriendStatus(null);
                      }}
                      placeholder="שם החבר"
                      style={{
                        flex: 1,
                        height: 48,
                        borderRadius: 12,
                        border: "1px solid #ccc",
                        padding: "0 14px",
                        fontSize: 16
                      }}
                    />

                    <button
                      type="button"
                      onClick={handleCheckFriend}
                      style={{
                        width: 120,
                        borderRadius: 12,
                        border: "none",
                        background: "#1f6f43",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      אישור
                    </button>
                  </div>

                  {friendStatus ? (
                    <div
                      style={{
                        border: "1px solid #e2ddd5",
                        borderRadius: 14,
                        padding: 14,
                        background: "#faf8f5"
                      }}
                    >
                      {friendStatus.online ? (
                        <>
                          <div
                            style={{
                              fontWeight: 700,
                              color: "#1f6f43",
                              marginBottom: 10
                            }}
                          >
                            {friendStatus.friendName} מחובר
                          </div>

                          <button
                            type="button"
                            onClick={handleSendInvite}
                            style={{
                              height: 44,
                              borderRadius: 12,
                              border: "none",
                              background: "#8b5e3c",
                              color: "#fff",
                              fontWeight: 700,
                              cursor: "pointer",
                              padding: "0 18px"
                            }}
                          >
                            הזמנה
                          </button>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              fontWeight: 700,
                              color: "#b42318",
                              marginBottom: 10
                            }}
                          >
                            {friendName.trim()} לא מחובר
                          </div>

                          <div style={{ display: "flex", gap: 10 }}>
                            <Link
                              href="/game/demo-room"
                              style={{
                                textDecoration: "none",
                                height: 44,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "0 16px",
                                borderRadius: 12,
                                background: "#8b5e3c",
                                color: "#fff",
                                fontWeight: 700
                              }}
                            >
                              קישור לחדר
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setFriendName("");
                                setFriendStatus(null);
                              }}
                              style={{
                                height: 44,
                                borderRadius: 12,
                                border: "1px solid #ddd",
                                background: "#fff",
                                color: "#222",
                                fontWeight: 700,
                                cursor: "pointer",
                                padding: "0 16px"
                              }}
                            >
                              לבחור שחקן אחר
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>מחוברים כרגע</div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {connectedUsers.length === 0 ? (
                        <div style={{ color: "#777" }}>אין משתמשים מחוברים כרגע</div>
                      ) : (
                        connectedUsers.map((user) => (
                          <div
                            key={user.username}
                            style={{
                              padding: "8px 12px",
                              background: "#f3f1eb",
                              border: "1px solid #ddd7ca",
                              borderRadius: 999,
                              fontWeight: 700
                            }}
                          >
                            {user.username}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {authOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(19,14,10,0.98) 0%, rgba(37,30,25,0.95) 45%, rgba(54,45,38,0.92) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 24
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "linear-gradient(180deg, #2b2622 0%, #231f1b 100%)",
              color: "#f2ede7",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
              padding: 28,
              boxShadow: "0 24px 60px rgba(0,0,0,0.45)"
            }}
          >
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                marginBottom: 22
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setError("");
                }}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: authMode === "login" ? "#ff8a2a" : "#e5ddd3",
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  padding: "12px 10px",
                  cursor: "pointer",
                  borderBottom:
                    authMode === "login" ? "2px solid #ff8a2a" : "2px solid transparent"
                }}
              >
                התחברות
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setError("");
                }}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: authMode === "register" ? "#ff8a2a" : "#e5ddd3",
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  padding: "12px 10px",
                  cursor: "pointer",
                  borderBottom:
                    authMode === "register" ? "2px solid #ff8a2a" : "2px solid transparent"
                }}
              >
                הרשמה
              </button>
            </div>

            <div
              style={{
                marginBottom: 12,
                fontWeight: 700,
                fontSize: "1rem"
              }}
            >
              שם משתמש
            </div>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handlePrimaryAction();
                }
              }}
              placeholder="הכנס שם משתמש"
              autoFocus
              style={{
                width: "100%",
                height: 54,
                borderRadius: 16,
                border: "2px solid #4ea1ff",
                background: "#17130f",
                color: "#fff",
                padding: "0 16px",
                fontSize: "1rem",
                outline: "none",
                marginBottom: 12
              }}
            />

            <div
              style={{
                color: "#a9a29b",
                lineHeight: 1.6,
                marginBottom: 18,
                fontSize: 14
              }}
            >
              {authMode === "login"
                ? "הזן שם משתמש קיים כדי להתחבר."
                : "בחר שם משתמש חדש. כל עוד הוא מחובר, אף אחד אחר לא יוכל להשתמש בו."}
            </div>

            {error ? (
              <div
                style={{
                  color: "#ff8f8f",
                  marginBottom: 14,
                  fontSize: 14,
                  fontWeight: 700
                }}
              >
                {error}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={loadingAuth}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 14,
                  border: "none",
                  background: "#8b5e3c",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: loadingAuth ? "default" : "pointer",
                  opacity: loadingAuth ? 0.7 : 1
                }}
              >
                {loadingAuth ? "טוען..." : authTitle}
              </button>

              <button
                type="button"
                onClick={closeAuth}
                disabled={loadingAuth}
                style={{
                  width: 110,
                  height: 50,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "transparent",
                  color: "#f2ede7",
                  fontWeight: 700,
                  cursor: loadingAuth ? "default" : "pointer",
                  opacity: loadingAuth ? 0.7 : 1
                }}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <InviteDialog
        open={!!incomingInvite}
        fromUsername={incomingInvite?.fromUsername || ""}
        onAccept={handleAcceptInvite}
        onReject={handleRejectInvite}
      />
    </>
  );
}
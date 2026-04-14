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

    const handleUsersUpdate = (users: UsersUpdatePayload) => {
      setConnectedUsers(users);
    };

    const handleIncomingInvite = (payload: IncomingInvite) => {
      setIncomingInvite(payload);
    };

    const handleInviteAccepted = (payload: InviteAcceptedPayload) => {
      setOutgoingInvite(null);
      setInviteStatusText("");
      router.push(`/game/${payload.roomId}`);
    };

    const handleInviteRejected = () => {
      setOutgoingInvite(null);
      setInviteStatusText("ההזמנה נדחתה.");
    };

    const handleInviteCancelled = () => {
      setIncomingInvite(null);
    };

    socket.on("users:update", handleUsersUpdate);
    socket.on("invite:incoming", handleIncomingInvite);
    socket.on("invite:accepted", handleInviteAccepted);
    socket.on("invite:rejected", handleInviteRejected);
    socket.on("invite:cancelled", handleInviteCancelled);

    return () => {
      socket.off("users:update", handleUsersUpdate);
      socket.off("invite:incoming", handleIncomingInvite);
      socket.off("invite:accepted", handleInviteAccepted);
      socket.off("invite:rejected", handleInviteRejected);
      socket.off("invite:cancelled", handleInviteCancelled);
    };
  }, [router]);

  const authTitle = useMemo(() => {
    return authMode === "login" ? "התחברות" : "הרשמה";
  }, [authMode]);

  function handleToggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
    applyTheme(nextTheme);
  }

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
      setPrivateRoomId(generateRoomId(6));
      setOutgoingInvite(null);
      setInviteStatusText("");
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
        setInviteStatusText("");
      }
    );
  }

  function handleSendInvite() {
    const normalized = friendName.trim();
    if (!username || !normalized || outgoingInvite) return;

    socket.emit(
      "invite:create",
      {
        fromUsername: username,
        toUsername: normalized
      },
      (response: { ok: boolean; message?: string; inviteId?: string }) => {
        if (!response.ok || !response.inviteId) {
          setInviteStatusText(response.message || "לא ניתן היה לשלוח הזמנה");
          return;
        }

        setOutgoingInvite({
          inviteId: response.inviteId,
          toUsername: normalized
        });
        setInviteStatusText(`ההזמנה נשלחה ל־${normalized}`);
      }
    );
  }

  function handleCancelInvite() {
    if (!outgoingInvite) return;

    socket.emit(
      "invite:cancel",
      { inviteId: outgoingInvite.inviteId },
      (response: { ok: boolean; message?: string }) => {
        if (!response.ok) {
          setInviteStatusText(response.message || "לא ניתן לבטל את ההזמנה");
          return;
        }

        setOutgoingInvite(null);
        setInviteStatusText("ההזמנה בוטלה");
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

  async function handleCopyRoomLink() {
    try {
      const url = `${window.location.origin}/game/${privateRoomId}`;
      await navigator.clipboard.writeText(url);
      setInviteStatusText("הקישור הועתק");
    } catch {
      setInviteStatusText("לא ניתן היה להעתיק את הקישור");
    }
  }

  function handleCreateNewPrivateRoom() {
    setPrivateRoomId(generateRoomId(6));
  }

  function handleEnterPrivateRoom() {
    router.push(`/game/${privateRoomId}`);
  }

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          direction: "rtl",
          fontFamily: "Arial, sans-serif",
          color: "var(--text)"
        }}
      >
        <div
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--bg)",
            position: "sticky",
            top: 0,
            zIndex: 10,
            backdropFilter: "blur(8px)"
          }}
        >
          <div
            className="top-nav"
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "16px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12
            }}
          >
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 900,
                color: "var(--accent)"
              }}
            >
              אתר שחמט
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <ThemeToggle theme={theme} onToggle={handleToggleTheme} />

              <div style={{ position: "relative" }}>
                {!username ? (
                  <button
                    type="button"
                    onClick={() => openAuth("login")}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--accent)",
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
                        color: "var(--text)",
                        fontWeight: 800,
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
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          boxShadow: "var(--shadow)",
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
                            color: "var(--danger)",
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
        </div>

        <div
          className="page-wrap"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "34px 24px 56px"
          }}
        >
          <div
            className="app-shell-card hero-wrap"
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "30px 28px",
              marginBottom: 24
            }}
          >
            <div
              className="hero-glow"
              style={{
                top: "-80px",
                left: "-40px",
                background: "rgba(31, 122, 73, 0.22)"
              }}
            />

            <div
              className="hero-glow"
              style={{
                bottom: "-120px",
                right: "-60px",
                background: "rgba(149, 99, 60, 0.22)"
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 20,
                flexWrap: "wrap"
              }}
            >
              <div style={{ maxWidth: 760 }}>
                <div
                  className="soft-badge"
                  style={{
                    marginBottom: 14
                  }}
                >
                  ♟️ שחמט אונליין
                </div>

                <h1
                  className="hero-title"
                  style={{
                    margin: 0,
                    fontSize: "2.7rem",
                    lineHeight: 1.15,
                    fontWeight: 900
                  }}
                >
                  שחק מול חברים, פתח חדר פרטי, או תרגל בחדר הדגמה
                </h1>

                <p
                  style={{
                    margin: "14px 0 0",
                    color: "var(--text-soft)",
                    fontSize: "1.05rem",
                    lineHeight: 1.85,
                    maxWidth: 760
                  }}
                >
                  התחבר, הזמן חבר למשחק, או פתח חדר פרטי. בנוסף יש גם חדר הדגמה מקומי
                  שבו אפשר לשחק את שני הצדדים על אותו מסך.
                </p>
              </div>

              <div
                className="app-shell-card"
                style={{
                  minWidth: 220,
                  padding: "16px 18px",
                  background: "var(--bg-elevated)"
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 10 }}>מצב נוכחי</div>
                <div style={{ color: "var(--text-soft)", lineHeight: 1.7 }}>
                  {username ? `מחובר כ־${username}` : "לא מחובר כרגע"}
                </div>
              </div>
            </div>
          </div>

          <div
            className="home-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: 20
            }}
          >
            <div
              className="app-shell-card"
              style={{
                gridColumn: "span 4",
                padding: 22
              }}
            >
              <div className="section-title">משחק מהיר</div>

              <p className="section-text">
                כניסה מיידית לחדר ההדגמה המקומי. מתאים לבדיקה, תרגול, או משחק על אותו
                מחשב לשני הצדדים.
              </p>

              <Link
                href="/game/demo-room"
                className="app-button-primary"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "14px 16px",
                  marginTop: 18
                }}
              >
                כניסה לחדר הדגמה
              </Link>
            </div>

            <div
              className="app-shell-card"
              style={{
                gridColumn: "span 4",
                padding: 22
              }}
            >
              <div className="section-title">חדר פרטי מהיר</div>

              <p className="section-text">
                צור קישור לחדר פרטי ושלח אותו לחבר. כל חדר פרטי מבודד ממשחקים אחרים.
              </p>

              <div
                style={{
                  background: "var(--bg-soft)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "14px 14px",
                  wordBreak: "break-all",
                  color: "var(--accent)",
                  fontWeight: 800,
                  marginTop: 12,
                  textAlign: "center"
                }}
              >
                {privateRoomId
                  ? `${typeof window !== "undefined" ? window.location.origin : ""}/game/${privateRoomId}`
                  : ""}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginTop: 12
                }}
              >
                <button
                  type="button"
                  onClick={handleCreateNewPrivateRoom}
                  className="app-button-secondary"
                  style={{
                    height: 46
                  }}
                >
                  צור חדר חדש
                </button>

                <button
                  type="button"
                  onClick={handleCopyRoomLink}
                  className="app-button-success"
                  style={{
                    height: 46
                  }}
                >
                  העתק קישור
                </button>
              </div>

              <button
                type="button"
                onClick={handleEnterPrivateRoom}
                className="app-button-primary"
                style={{
                  width: "100%",
                  height: 46,
                  marginTop: 12
                }}
              >
                כניסה לחדר הפרטי
              </button>
            </div>

            <div
              className="app-shell-card"
              style={{
                gridColumn: "span 4",
                padding: 22
              }}
            >
              <div className="section-title">מחוברים כרגע</div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {connectedUsers.length === 0 ? (
                  <div style={{ color: "var(--text-soft)" }}>אין משתמשים מחוברים כרגע</div>
                ) : (
                  connectedUsers.map((user) => (
                    <div key={user.username} className="connected-pill">
                      {user.username}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div
              className="app-shell-card"
              style={{
                gridColumn: "span 12",
                padding: 22
              }}
            >
              <div className="section-title">הזמן חבר למשחק</div>

              {!username ? (
                <p className="section-text">כדי להזמין חבר, יש להתחבר קודם.</p>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      marginBottom: 12,
                      flexWrap: "wrap"
                    }}
                  >
                    <input
                      value={friendName}
                      onChange={(e) => {
                        setFriendName(e.target.value);
                        setFriendStatus(null);
                        setInviteStatusText("");
                      }}
                      placeholder="שם החבר"
                      style={{
                        flex: 1,
                        minWidth: 220,
                        height: 50,
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--bg-elevated)",
                        color: "var(--text)",
                        padding: "0 14px",
                        fontSize: 16
                      }}
                    />

                    <button
                      type="button"
                      onClick={handleCheckFriend}
                      className="app-button-success"
                      style={{
                        width: 120,
                        height: 50
                      }}
                    >
                      אישור
                    </button>
                  </div>

                  {friendStatus ? (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 16,
                        padding: 16,
                        background: "var(--bg-soft)"
                      }}
                    >
                      {friendStatus.online ? (
                        <>
                          <div
                            style={{
                              fontWeight: 800,
                              color: "var(--accent-strong)",
                              marginBottom: 10
                            }}
                          >
                            {friendStatus.friendName} מחובר
                          </div>

                          {!outgoingInvite ? (
                            <button
                              type="button"
                              onClick={handleSendInvite}
                              className="app-button-primary"
                              style={{
                                height: 44,
                                padding: "0 18px"
                              }}
                            >
                              הזמנה
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleCancelInvite}
                              className="app-button-danger"
                              style={{
                                height: 44,
                                padding: "0 18px"
                              }}
                            >
                              בטל הזמנה
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              fontWeight: 800,
                              color: "var(--danger)",
                              marginBottom: 10
                            }}
                          >
                            {friendName.trim()} לא מחובר
                          </div>

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <Link
                              href={`/game/${privateRoomId || "demo-room"}`}
                              className="app-button-primary"
                              style={{
                                height: 44,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "0 16px"
                              }}
                            >
                              קישור לחדר
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setFriendName("");
                                setFriendStatus(null);
                                setInviteStatusText("");
                              }}
                              className="app-button-secondary"
                              style={{
                                height: 44,
                                padding: "0 16px"
                              }}
                            >
                              לבחור שחקן אחר
                            </button>
                          </div>
                        </>
                      )}

                      {inviteStatusText ? (
                        <div
                          style={{
                            marginTop: 12,
                            fontWeight: 700,
                            color: "var(--text-soft)"
                          }}
                        >
                          {inviteStatusText}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
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
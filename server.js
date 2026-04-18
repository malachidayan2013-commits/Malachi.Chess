const next = require("next");
const http = require("http");
const { Server } = require("socket.io");
const {
  joinRoom,
  leaveSocket,
  makeMove,
  getRoomSnapshot,
  registerUser,
  unregisterUser,
  getUserByName,
  getPublicUsers,
  createInvite,
  cancelInvite,
  acceptInvite,
  rejectInvite,
  resignRoom,
  offerDraw,
  acceptDraw,
  declineDraw,
  offerRematch,
  declineRematch
} = require("./src/server/state");
const { createUser, loginUser, deleteUser } = require("./src/server/auth");
const { initDatabase } = require("./src/server/db");

const dev = process.env.NODE_ENV !== "production";
const host = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname: host, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  await initDatabase();

  const server = http.createServer((req, res) => handle(req, res));

  const io = new Server(server, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    socket.on("auth:register", async ({ username, password }, callback) => {
      try {
        const authResult = await createUser(username, password);

        if (!authResult.ok) {
          if (callback) callback(authResult);
          return;
        }

        const onlineResult = registerUser(authResult.username, socket.id);

        if (!onlineResult.ok) {
          if (callback) callback(onlineResult);
          return;
        }

        if (callback) {
          callback({
            ok: true,
            message: "נרשמת בהצלחה.",
            username: authResult.username
          });
        }

        io.emit("users:update", getPublicUsers());
      } catch {
        if (callback) {
          callback({
            ok: false,
            message: "אירעה שגיאה במהלך ההרשמה."
          });
        }
      }
    });

    socket.on("auth:login", async ({ username, password }, callback) => {
      try {
        const authResult = await loginUser(username, password);

        if (!authResult.ok) {
          if (callback) callback(authResult);
          return;
        }

        const onlineResult = registerUser(authResult.username, socket.id);

        if (!onlineResult.ok) {
          if (callback) callback(onlineResult);
          return;
        }

        if (callback) {
          callback({
            ok: true,
            message: "התחברת בהצלחה.",
            username: authResult.username
          });
        }

        io.emit("users:update", getPublicUsers());
      } catch {
        if (callback) {
          callback({
            ok: false,
            message: "אירעה שגיאה במהלך ההתחברות."
          });
        }
      }
    });

    socket.on("auth:delete", async ({ username, password }, callback) => {
      try {
        const deleteResult = await deleteUser(username, password);

        if (!deleteResult.ok) {
          if (callback) callback(deleteResult);
          return;
        }

        unregisterUser(socket.id);

        if (callback) {
          callback({
            ok: true,
            message: "המשתמש נמחק בהצלחה."
          });
        }

        io.emit("users:update", getPublicUsers());
      } catch {
        if (callback) {
          callback({
            ok: false,
            message: "אירעה שגיאה במהלך מחיקת המשתמש."
          });
        }
      }
    });

    socket.on("user:register", ({ username }, callback) => {
      const result = registerUser(username, socket.id);
      if (callback) callback(result);
      io.emit("users:update", getPublicUsers());
    });

    socket.on("user:logout", (_, callback) => {
      unregisterUser(socket.id);
      if (callback) callback({ ok: true });
      io.emit("users:update", getPublicUsers());
    });

    socket.on("friend:status", ({ friendName }, callback) => {
      const friend = getUserByName(friendName);

      if (!callback) return;

      if (!friend) {
        callback({
          ok: true,
          online: false,
          friendName
        });
        return;
      }

      callback({
        ok: true,
        online: true,
        friendName: friend.username
      });
    });

    socket.on("invite:create", ({ fromUsername, toUsername }, callback) => {
      const result = createInvite(fromUsername, toUsername);

      if (!result.ok) {
        if (callback) callback(result);
        return;
      }

      io.to(result.targetSocketId).emit("invite:incoming", {
        inviteId: result.invite.id,
        fromUsername: result.invite.fromUsername
      });

      if (callback) {
        callback({
          ok: true,
          inviteId: result.invite.id
        });
      }
    });

    socket.on("invite:cancel", ({ inviteId }, callback) => {
      const result = cancelInvite(inviteId, socket.id);

      if (!result.ok) {
        if (callback) callback(result);
        return;
      }

      io.to(result.invite.toSocketId).emit("invite:cancelled", {
        inviteId: result.invite.id
      });

      if (callback) callback({ ok: true });
    });

    socket.on("invite:accept", ({ inviteId }, callback) => {
      const result = acceptInvite(inviteId);

      if (!result.ok) {
        if (callback) callback(result);
        return;
      }

      io.to(result.invite.fromSocketId).emit("invite:accepted", {
        inviteId: result.invite.id,
        roomId: result.invite.roomId
      });

      io.to(result.invite.toSocketId).emit("invite:accepted", {
        inviteId: result.invite.id,
        roomId: result.invite.roomId
      });

      if (callback) callback({ ok: true, roomId: result.invite.roomId });
    });

    socket.on("invite:reject", ({ inviteId }, callback) => {
      const result = rejectInvite(inviteId);

      if (!result.ok) {
        if (callback) callback(result);
        return;
      }

      io.to(result.invite.fromSocketId).emit("invite:rejected", {
        inviteId: result.invite.id
      });

      if (callback) callback({ ok: true });
    });

    socket.on("room:join", ({ roomId, username }, callback) => {
      const result = joinRoom({
        roomId,
        username,
        socketId: socket.id
      });

      if (!result.ok) {
        if (callback) callback(result);
        return;
      }

      socket.join(roomId);

      const snapshot = getRoomSnapshot(roomId);
      io.to(roomId).emit("room:update", snapshot);

      if (callback) {
        callback({
          ok: true,
          roomId,
          playerColor: result.playerColor,
          snapshot
        });
      }
    });

    socket.on("room:move", ({ roomId, from, to, promotion }, callback) => {
      const result = makeMove({
        roomId,
        socketId: socket.id,
        from,
        to,
        promotion
      });

      if (!result.ok) {
        if (callback) callback(result);
        return;
      }

      const snapshot = getRoomSnapshot(roomId);
      io.to(roomId).emit("room:update", snapshot);

      if (callback) {
        callback({
          ok: true,
          snapshot
        });
      }
    });

    socket.on("room:resign", ({ roomId }, callback) => {
      const result = resignRoom({
        roomId,
        socketId: socket.id
      });

      if (!result.ok) {
        if (callback) callback(result);
        return;
      }

      const snapshot = getRoomSnapshot(roomId);
      io.to(roomId).emit("room:update", snapshot);

      if (callback) callback({ ok: true, snapshot });
    });

    socket.on("room:offer-draw", ({ roomId }, callback) => {
      const result = offerDraw({
        roomId,
        socketId: socket.id
      });

      if (!result.ok) {
        if (callback) callback(result);
        return;
      }

      const snapshot = getRoomSnapshot(roomId);
      io.to(roomId).emit("room:update", snapshot);

      if (callback) callback({ ok: true, snapshot });
    });

    socket.on("room:accept-draw", ({ roomId }, callback) => {
      const result = acceptDraw({
        roomId,
        socketId: socket.id
      });

      if (!result.ok) {
        if (callback) callback(result);
        return;
      }

      const snapshot = getRoomSnapshot(roomId);
      io.to(roomId).emit("room:update", snapshot);

      if (callback) callback({ ok: true, snapshot });
    });

    socket.on("room:decline-draw", ({ roomId }, callback) => {
      const result = declineDraw({
        roomId,
        socketId: socket.id
      });

      if (!result.ok) {
        if (callback) callback(result);
        return;
      }

      const snapshot = getRoomSnapshot(roomId);
      io.to(roomId).emit("room:update", snapshot);

      if (callback) callback({ ok: true, snapshot });
    });

    socket.on("room:offer-rematch", ({ roomId }, callback) => {
      const result = offerRematch({
        roomId,
        socketId: socket.id
      });

      if (!result.ok) {
        if (callback) callback(result);
        return;
      }

      const snapshot = getRoomSnapshot(roomId);
      io.to(roomId).emit("room:update", snapshot);

      if (callback) callback({ ok: true, snapshot, restarted: !!result.restarted });
    });

    socket.on("room:decline-rematch", ({ roomId }, callback) => {
      const result = declineRematch({
        roomId,
        socketId: socket.id
      });

      if (!result.ok) {
        if (callback) callback(result);
        return;
      }

      const snapshot = getRoomSnapshot(roomId);
      io.to(roomId).emit("room:update", snapshot);

      if (callback) callback({ ok: true, snapshot });
    });

    socket.on("disconnect", () => {
      const affectedRoomIds = leaveSocket(socket.id);

      for (const roomId of affectedRoomIds) {
        const snapshot = getRoomSnapshot(roomId);
        if (snapshot) {
          io.to(roomId).emit("room:update", snapshot);
        }
      }

      io.emit("users:update", getPublicUsers());
    });
  });

  server.listen(port, host, () => {
    console.log(`> Ready on http://${host}:${port}`);
  });
}).catch((error) => {
  console.error("Startup failed:", error);
  process.exit(1);
});
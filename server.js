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
  acceptInvite,
  rejectInvite
} = require("./src/server/state");

const dev = process.env.NODE_ENV !== "production";
const host = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname: host, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => handle(req, res));

  const io = new Server(server, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
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
});
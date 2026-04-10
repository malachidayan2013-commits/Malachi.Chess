const { Chess } = require("chess.js");

const rooms = new Map();
const socketToRoom = new Map();

const usersByName = new Map();
const usersBySocket = new Map();

const invitesById = new Map();

function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function normalize(value) {
  return String(value || "").trim();
}

function createRoom(roomId) {
  return {
    roomId,
    chess: new Chess(),
    white: null,
    black: null,
    lastMove: null
  };
}

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, createRoom(roomId));
  }
  return rooms.get(roomId);
}

function getPlayerColorBySocket(room, socketId) {
  if (room.white?.socketId === socketId) return "white";
  if (room.black?.socketId === socketId) return "black";
  return null;
}

function getPublicUsers() {
  return Array.from(usersByName.values()).map((user) => ({
    username: user.username
  }));
}

function registerUser(username, socketId) {
  const normalized = normalize(username);

  if (!normalized) {
    return { ok: false, message: "יש להזין שם משתמש." };
  }

  const existingByName = usersByName.get(normalized);
  if (existingByName && existingByName.socketId !== socketId) {
    return { ok: false, message: "השם כבר תפוס." };
  }

  const existingBySocket = usersBySocket.get(socketId);
  if (existingBySocket && existingBySocket.username !== normalized) {
    usersByName.delete(existingBySocket.username);
  }

  const user = { username: normalized, socketId };
  usersByName.set(normalized, user);
  usersBySocket.set(socketId, user);

  return { ok: true, message: "נרשמת בהצלחה." };
}

function unregisterUser(socketId) {
  const user = usersBySocket.get(socketId);
  if (!user) return null;

  usersBySocket.delete(socketId);
  usersByName.delete(user.username);

  for (const [inviteId, invite] of invitesById.entries()) {
    if (invite.fromSocketId === socketId || invite.toSocketId === socketId) {
      invitesById.delete(inviteId);
    }
  }

  return user;
}

function getUserByName(username) {
  return usersByName.get(normalize(username)) || null;
}

function createInvite(fromUsername, toUsername) {
  const fromUser = getUserByName(fromUsername);
  const toUser = getUserByName(toUsername);

  if (!fromUser) return { ok: false, message: "השולח אינו מחובר." };
  if (!toUser) return { ok: false, message: "החבר אינו מחובר." };
  if (fromUser.username === toUser.username) {
    return { ok: false, message: "לא ניתן להזמין את עצמך." };
  }

  const invite = {
    id: createId("invite"),
    fromUsername: fromUser.username,
    toUsername: toUser.username,
    fromSocketId: fromUser.socketId,
    toSocketId: toUser.socketId,
    roomId: createId("room")
  };

  invitesById.set(invite.id, invite);

  return {
    ok: true,
    invite,
    targetSocketId: toUser.socketId
  };
}

function acceptInvite(inviteId) {
  const invite = invitesById.get(inviteId);
  if (!invite) return { ok: false, message: "ההזמנה לא נמצאה." };

  invitesById.delete(inviteId);
  return { ok: true, invite };
}

function rejectInvite(inviteId) {
  const invite = invitesById.get(inviteId);
  if (!invite) return { ok: false, message: "ההזמנה לא נמצאה." };

  invitesById.delete(inviteId);
  return { ok: true, invite };
}

function getRoomSnapshot(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  return {
    roomId,
    fen: room.chess.fen(),
    turn: room.chess.turn() === "w" ? "white" : "black",
    inCheck: room.chess.inCheck(),
    isCheckmate: room.chess.isCheckmate(),
    isDraw: room.chess.isDraw(),
    lastMove: room.lastMove,
    whiteUsername: room.white?.username || "",
    blackUsername: room.black?.username || ""
  };
}

function joinRoom({ roomId, username, socketId }) {
  const normalizedRoomId = normalize(roomId);
  const normalizedUsername = normalize(username);

  if (!normalizedRoomId) return { ok: false, message: "חדר לא תקין" };
  if (!normalizedUsername) return { ok: false, message: "יש להזין שם משתמש" };

  const room = getOrCreateRoom(normalizedRoomId);

  if (room.white?.socketId === socketId) {
    return { ok: true, playerColor: "white" };
  }

  if (room.black?.socketId === socketId) {
    return { ok: true, playerColor: "black" };
  }

  if (room.white?.username === normalizedUsername) {
    room.white.socketId = socketId;
    socketToRoom.set(socketId, normalizedRoomId);
    return { ok: true, playerColor: "white" };
  }

  if (room.black?.username === normalizedUsername) {
    room.black.socketId = socketId;
    socketToRoom.set(socketId, normalizedRoomId);
    return { ok: true, playerColor: "black" };
  }

  if (!room.white) {
    room.white = { username: normalizedUsername, socketId };
    socketToRoom.set(socketId, normalizedRoomId);
    return { ok: true, playerColor: "white" };
  }

  if (!room.black) {
    room.black = { username: normalizedUsername, socketId };
    socketToRoom.set(socketId, normalizedRoomId);
    return { ok: true, playerColor: "black" };
  }

  return { ok: false, message: "החדר כבר מלא" };
}

function makeMove({ roomId, socketId, from, to, promotion }) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, message: "החדר לא קיים" };

  const playerColor = getPlayerColorBySocket(room, socketId);
  if (!playerColor) return { ok: false, message: "השחקן אינו שייך לחדר" };

  const turnColor = room.chess.turn() === "w" ? "white" : "black";
  if (playerColor !== turnColor) {
    return { ok: false, message: "זה לא התור שלך" };
  }

  try {
    const result = room.chess.move({
      from,
      to,
      ...(promotion ? { promotion } : {})
    });

    if (!result) {
      return { ok: false, message: "מהלך לא חוקי" };
    }

    room.lastMove = {
      from: result.from,
      to: result.to
    };

    return { ok: true };
  } catch {
    return { ok: false, message: "מהלך לא חוקי" };
  }
}

function leaveSocket(socketId) {
  const affectedRoomIds = [];
  const roomId = socketToRoom.get(socketId);

  if (roomId) {
    const room = rooms.get(roomId);

    if (room) {
      if (room.white?.socketId === socketId) room.white.socketId = null;
      if (room.black?.socketId === socketId) room.black.socketId = null;
      affectedRoomIds.push(roomId);
    }

    socketToRoom.delete(socketId);
  }

  unregisterUser(socketId);

  return affectedRoomIds;
}

module.exports = {
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
};
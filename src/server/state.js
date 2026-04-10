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
    lastMove: null,
    moves: [],
    resultText: "",
    drawOfferBy: null,
    rematchOfferedBy: null
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

function hasPendingInviteBetween(fromUsername, toUsername) {
  for (const invite of invitesById.values()) {
    const sameDirection =
      invite.fromUsername === fromUsername && invite.toUsername === toUsername;
    const reverseDirection =
      invite.fromUsername === toUsername && invite.toUsername === fromUsername;

    if (sameDirection || reverseDirection) {
      return true;
    }
  }

  return false;
}

function createInvite(fromUsername, toUsername) {
  const fromUser = getUserByName(fromUsername);
  const toUser = getUserByName(toUsername);

  if (!fromUser) return { ok: false, message: "השולח אינו מחובר." };
  if (!toUser) return { ok: false, message: "החבר אינו מחובר." };
  if (fromUser.username === toUser.username) {
    return { ok: false, message: "לא ניתן להזמין את עצמך." };
  }

  if (hasPendingInviteBetween(fromUser.username, toUser.username)) {
    return { ok: false, message: "כבר קיימת הזמנה פתוחה ביניכם." };
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

function cancelInvite(inviteId, socketId) {
  const invite = invitesById.get(inviteId);
  if (!invite) return { ok: false, message: "ההזמנה לא נמצאה." };
  if (invite.fromSocketId !== socketId) {
    return { ok: false, message: "רק שולח ההזמנה יכול לבטל." };
  }

  invitesById.delete(inviteId);
  return { ok: true, invite };
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

function buildResultText(room) {
  if (room.resultText) return room.resultText;

  if (room.chess.isCheckmate()) {
    return room.chess.turn() === "w" ? "שחור ניצח במט" : "לבן ניצח במט";
  }

  if (room.chess.isDraw()) {
    return "המשחק הסתיים בתיקו";
  }

  return "";
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
    blackUsername: room.black?.username || "",
    moves: room.moves,
    resultText: buildResultText(room),
    drawOfferBy: room.drawOfferBy,
    rematchOfferedBy: room.rematchOfferedBy,
    whiteConnected: !!room.white?.socketId,
    blackConnected: !!room.black?.socketId
  };
}

function resetRoomGame(room) {
  room.chess = new Chess();
  room.lastMove = null;
  room.moves = [];
  room.resultText = "";
  room.drawOfferBy = null;
  room.rematchOfferedBy = null;
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

  if (room.resultText) {
    return { ok: false, message: "המשחק כבר הסתיים" };
  }

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

    room.moves.push({
      from: result.from,
      to: result.to,
      san: result.san,
      color: result.color === "w" ? "white" : "black"
    });

    room.drawOfferBy = null;
    room.rematchOfferedBy = null;

    if (room.chess.isCheckmate()) {
      room.resultText = room.chess.turn() === "w" ? "שחור ניצח במט" : "לבן ניצח במט";
    } else if (room.chess.isDraw()) {
      room.resultText = "המשחק הסתיים בתיקו";
    }

    return { ok: true };
  } catch {
    return { ok: false, message: "מהלך לא חוקי" };
  }
}

function resignRoom({ roomId, socketId }) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, message: "החדר לא קיים" };
  if (room.resultText) return { ok: false, message: "המשחק כבר הסתיים" };

  const playerColor = getPlayerColorBySocket(room, socketId);
  if (!playerColor) return { ok: false, message: "השחקן אינו שייך לחדר" };

  room.resultText = playerColor === "white" ? "שחור ניצח בכניעה" : "לבן ניצח בכניעה";
  room.drawOfferBy = null;
  room.rematchOfferedBy = null;

  return { ok: true };
}

function offerDraw({ roomId, socketId }) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, message: "החדר לא קיים" };
  if (room.resultText) return { ok: false, message: "המשחק כבר הסתיים" };

  const playerColor = getPlayerColorBySocket(room, socketId);
  if (!playerColor) return { ok: false, message: "השחקן אינו שייך לחדר" };

  room.drawOfferBy = playerColor;
  return { ok: true };
}

function acceptDraw({ roomId, socketId }) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, message: "החדר לא קיים" };
  if (room.resultText) return { ok: false, message: "המשחק כבר הסתיים" };

  const playerColor = getPlayerColorBySocket(room, socketId);
  if (!playerColor) return { ok: false, message: "השחקן אינו שייך לחדר" };
  if (!room.drawOfferBy) return { ok: false, message: "אין הצעת תיקו פעילה" };
  if (room.drawOfferBy === playerColor) {
    return { ok: false, message: "לא ניתן לאשר את ההצעה של עצמך" };
  }

  room.resultText = "המשחק הסתיים בתיקו בהסכמה";
  room.drawOfferBy = null;
  room.rematchOfferedBy = null;

  return { ok: true };
}

function declineDraw({ roomId, socketId }) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, message: "החדר לא קיים" };

  const playerColor = getPlayerColorBySocket(room, socketId);
  if (!playerColor) return { ok: false, message: "השחקן אינו שייך לחדר" };
  if (!room.drawOfferBy) return { ok: false, message: "אין הצעת תיקו פעילה" };
  if (room.drawOfferBy === playerColor) {
    return { ok: false, message: "לא ניתן לדחות את ההצעה של עצמך" };
  }

  room.drawOfferBy = null;
  return { ok: true };
}

function offerRematch({ roomId, socketId }) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, message: "החדר לא קיים" };
  if (!room.resultText) return { ok: false, message: "ניתן לבקש משחק חוזר רק אחרי סיום משחק" };

  const playerColor = getPlayerColorBySocket(room, socketId);
  if (!playerColor) return { ok: false, message: "השחקן אינו שייך לחדר" };

  if (room.rematchOfferedBy === playerColor) {
    return { ok: false, message: "כבר שלחת בקשת משחק חוזר" };
  }

  if (room.rematchOfferedBy && room.rematchOfferedBy !== playerColor) {
    resetRoomGame(room);
    return { ok: true, restarted: true };
  }

  room.rematchOfferedBy = playerColor;
  return { ok: true, restarted: false };
}

function declineRematch({ roomId, socketId }) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, message: "החדר לא קיים" };

  const playerColor = getPlayerColorBySocket(room, socketId);
  if (!playerColor) return { ok: false, message: "השחקן אינו שייך לחדר" };

  if (!room.rematchOfferedBy || room.rematchOfferedBy === playerColor) {
    return { ok: false, message: "אין בקשת משחק חוזר לדחות" };
  }

  room.rematchOfferedBy = null;
  return { ok: true };
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
  cancelInvite,
  acceptInvite,
  rejectInvite,
  resignRoom,
  offerDraw,
  acceptDraw,
  declineDraw,
  offerRematch,
  declineRematch
};
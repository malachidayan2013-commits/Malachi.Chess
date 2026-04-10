export type RegisterResponse = {
  ok: boolean;
  message: string;
};

export type FriendStatusResponse = {
  ok: boolean;
  online: boolean;
  friendName: string;
  message?: string;
};

export type ConnectedUser = {
  username: string;
};

export type UsersUpdatePayload = ConnectedUser[];

export type PlayerColor = "white" | "black";

export type IncomingInvite = {
  inviteId: string;
  fromUsername: string;
};

export type InviteAcceptedPayload = {
  inviteId: string;
  roomId: string;
};

export type InviteRejectedPayload = {
  inviteId: string;
};

export type MoveEntry = {
  from: string;
  to: string;
  san: string;
  piece: string;
  color: "w" | "b";
};

export type RoomSnapshot = {
  roomId: string;
  fen: string;
  turn: PlayerColor;
  inCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  lastMove: {
    from: string;
    to: string;
  } | null;
  whiteUsername: string;
  blackUsername: string;
  moves: MoveEntry[];
  resultText: string;
  drawOfferBy: PlayerColor | null;
  rematchOfferedBy: PlayerColor | null;
  whiteConnected: boolean;
  blackConnected: boolean;
};

export type OutgoingInviteState = {
  inviteId: string;
  toUsername: string;
};
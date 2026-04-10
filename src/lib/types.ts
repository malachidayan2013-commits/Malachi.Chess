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

export type RoomSnapshot = {
  roomId: string;
  fen: string;
  turn: "white" | "black";
  inCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  lastMove: {
    from: string;
    to: string;
  } | null;
  whiteUsername: string;
  blackUsername: string;
};

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
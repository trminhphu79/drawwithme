export type JoinMode = 'auto' | 'approval';

/** A collaborative drawing room. */
export interface Room {
  id: string;
  code: string;
  name: string;
  hasPassword: boolean;
  hostId: string | null;
  joinMode: JoinMode;
  width: number;
  height: number;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface CreateRoomRequest {
  name?: string;
  password?: string;
  hostId?: string;
  joinMode?: JoinMode;
}

export interface JoinRoomRequest {
  code: string;
  password?: string;
}

/** A room card in the lobby list. */
export interface RoomSummary {
  code: string;
  name: string;
  memberCount: number;
  avatars: string[];
  createdAt: string;
}

export interface RoomListResponse {
  rooms: RoomSummary[];
  total: number;
}

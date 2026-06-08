/** A collaborative drawing room. */
export interface Room {
  id: string;
  code: string;
  name: string;
  hasPassword: boolean;
  width: number;
  height: number;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface CreateRoomRequest {
  name?: string;
  password?: string;
}

export interface JoinRoomRequest {
  code: string;
  password?: string;
}

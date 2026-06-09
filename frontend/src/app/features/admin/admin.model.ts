export interface AdminRoom {
  code: string;
  name: string;
  status: string;
  joinMode: 'auto' | 'approval';
  capacity: number;
  hostId: string | null;
  memberCount: number;
  createdAt: string;
}

export interface AdminRoomList {
  rooms: AdminRoom[];
  total: number;
}

export interface AdminLoginResponse {
  token: string;
  username: string;
}

export interface UpdateRoomPayload {
  name?: string;
  status?: 'active' | 'archived';
  joinMode?: 'auto' | 'approval';
  capacity?: number;
}

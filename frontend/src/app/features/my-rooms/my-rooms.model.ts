import { JoinMode } from '../lobby/room.model';

/** A room the current user hosts (manageable on the My Rooms page). */
export interface ManagedRoom {
  code: string;
  name: string;
  status: 'active' | 'archived';
  joinMode: JoinMode;
  capacity: number;
  memberCount: number;
  createdAt: string;
}

/** Host-authorized update payload (requesterId = the caller's client id). */
export interface ManageRoomPayload {
  requesterId: string;
  name?: string;
  status?: 'active' | 'archived';
  joinMode?: JoinMode;
  capacity?: number;
}

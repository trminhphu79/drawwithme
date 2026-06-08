/** A sealed, completed artwork from a finished drawing session. */
export interface Artwork {
  id: string;
  roomCode: string | null;
  title: string;
  imageUrl: string | null;
  participants: string[];
  /** Whether a replay (stored op snapshot) is available. */
  replayable: boolean;
  createdAt: string;
}

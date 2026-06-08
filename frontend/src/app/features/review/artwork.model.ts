/** A sealed, completed artwork from a finished drawing session. */
export interface Artwork {
  id: string;
  roomCode: string;
  title: string;
  imageUrl: string | null;
  participants: string[];
  createdAt: string;
}

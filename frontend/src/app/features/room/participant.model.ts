/** A participant present in the room. */
export interface Participant {
  id: string;
  name: string;
  /** Tailwind classes used to tint the avatar / cursor. */
  colorClass: string;
}

/** A live remote cursor position (not persisted). */
export interface RemoteCursor {
  id: string;
  name: string;
  x: number;
  y: number;
  colorClass: string;
}

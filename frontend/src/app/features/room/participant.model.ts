/** A participant present in the room. */
export interface Participant {
  id: string;
  name: string;
  /** Server-assigned color slot (see cursorColor() in core/models). */
  colorIndex: number;
  /** Avatar key (filename in public/avatars). */
  avatar?: string;
}

/** A live remote cursor position (not persisted). */
export interface RemoteCursor {
  id: string;
  name: string;
  x: number;
  y: number;
  colorIndex: number;
}

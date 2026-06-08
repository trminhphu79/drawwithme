export interface Point {
  x: number;
  y: number;
}

export type OperationType = 'stroke' | 'erase' | 'fill';

/**
 * An immutable drawing operation — the unit of both rendering and sync.
 * The canvas is reconstructed by replaying operations in order, which makes
 * undo, persistence, real-time sync and replay all fall out of one model.
 */
export interface DrawOperation {
  /** Client temp id; replaced/confirmed by the server's id when persisted. */
  id: string;
  type: OperationType;
  color: string;
  /** Stroke width (px). Ignored for fill. */
  size: number;
  /** 0–1. */
  opacity: number;
  /** Path points for stroke/erase; single seed point for fill. */
  points: Point[];
  /** Pencil style for stroke ops: hard | soft | shadow. */
  style?: 'hard' | 'soft' | 'shadow';
  /** Socket id / user id of the author. */
  authorId?: string;
}

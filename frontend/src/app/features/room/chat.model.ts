/** A chat message in a room. */
export interface ChatMessage {
  id: string;
  authorId: string;
  author: string;
  text: string;
  /** ISO timestamp. */
  at: string;
  /** System notice (e.g. "X joined the room") — rendered centered, no sound. */
  system?: boolean;
}

/** A transient emoji reaction broadcast to the whole room. */
export interface ReactionEvent {
  id: string;
  emoji: string;
  authorId: string;
  author: string;
  /** Horizontal seed position (0–100, % of canvas) so all clients align. */
  x: number;
}

export const REACTION_EMOJIS = ['❤️', '🔥', '✨', '👏', '🚀', '👎', '🤢'] as const;

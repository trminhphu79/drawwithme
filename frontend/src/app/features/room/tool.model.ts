export type ToolId = 'hand' | 'pencil' | 'fill' | 'eraser';

export interface ToolDef {
  id: ToolId;
  icon: string;
  label: string;
}

export const DRAWING_TOOLS: ToolDef[] = [
  { id: 'hand', icon: 'pan_tool', label: 'Hand / Pan' },
  { id: 'pencil', icon: 'draw', label: 'Pencil' },
  { id: 'fill', icon: 'format_color_fill', label: 'Coloring / Fill' },
  { id: 'eraser', icon: 'ink_eraser', label: 'Eraser' },
];

/** Pencil rendering style. */
export type PencilStyle = 'hard' | 'soft' | 'shadow';

export interface PencilStyleDef {
  id: PencilStyle;
  icon: string;
  label: string;
}

export const PENCIL_STYLES: PencilStyleDef[] = [
  { id: 'soft', icon: 'brush', label: 'Soft lines' },
  { id: 'shadow', icon: 'blur_on', label: 'Lines with shadow' },
];

/** Current brush configuration applied to new strokes. */
export interface BrushSettings {
  tool: ToolId;
  color: string;
  /** Stroke width in canvas pixels. */
  size: number;
  /** 0–1. */
  opacity: number;
  /** Pencil rendering style (hard / soft / glowing shadow). */
  style: PencilStyle;
}

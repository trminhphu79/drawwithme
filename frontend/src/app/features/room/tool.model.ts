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

/** Current brush configuration applied to new strokes. */
export interface BrushSettings {
  tool: ToolId;
  color: string;
  /** Stroke width in canvas pixels. */
  size: number;
  /** 0–1. */
  opacity: number;
}

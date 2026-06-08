import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { BrushSettings } from '../tool.model';
import { DrawOperation, Point } from '../operation.model';
import { RemoteCursor } from '../participant.model';

/** Fixed internal canvas resolution; CSS scales it to fit the viewport. */
const CANVAS_W = 1600;
const CANVAS_H = 1000;
/** Flood-fill color tolerance (0–255 per channel). */
const FILL_TOLERANCE = 32;

type CommittedOp = Omit<DrawOperation, 'id' | 'authorId'>;

/**
 * DUMB / presentational canvas renderer + input surface.
 *
 * Rendering is event-sourced: it replays the `operations` input onto a 2D
 * canvas, so remote ops / undo just re-render. Local pointer input is drawn
 * incrementally for responsiveness, then emitted as a completed operation via
 * `strokeComplete` — the parent commits it to the store. No injected services.
 */
@Component({
  selector: 'app-canvas-stage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './canvas-stage.html',
})
export class CanvasStage {
  readonly operations = input<DrawOperation[]>([]);
  readonly brush = input.required<BrushSettings>();
  readonly zoom = input(100);
  readonly cursors = input<RemoteCursor[]>([]);

  readonly strokeComplete = output<CommittedOp>();
  readonly cursorMove = output<Point>();

  protected readonly canvasW = CANVAS_W;
  protected readonly canvasH = CANVAS_H;

  /** Export the current canvas as a PNG data URL (used when sealing artwork). */
  captureDataUrl(): string | null {
    return this.canvasRef()?.nativeElement.toDataURL('image/png') ?? null;
  }

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private ctx: CanvasRenderingContext2D | null = null;

  /** In-progress freehand stroke (pencil / eraser). */
  private drawing = false;
  private points: Point[] = [];
  private lastCursorEmit = 0;

  constructor() {
    // Replay the operation log whenever it (or the canvas) changes.
    effect(() => {
      const el = this.canvasRef().nativeElement;
      const ops = this.operations();
      if (!this.ctx) this.ctx = el.getContext('2d', { willReadFrequently: true });
      this.redraw(ops);
    });
  }

  // ---- pointer handling ----
  protected onPointerDown(event: PointerEvent): void {
    const tool = this.brush().tool;
    if (tool === 'select') return;
    const p = this.toCanvasPoint(event);

    if (tool === 'fill') {
      this.strokeComplete.emit({ type: 'fill', color: this.brush().color, size: 0, opacity: 1, points: [p] });
      return;
    }

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.drawing = true;
    this.points = [p];
  }

  protected onPointerMove(event: PointerEvent): void {
    const now = event.timeStamp;
    if (now - this.lastCursorEmit > 40) {
      this.lastCursorEmit = now;
      this.cursorMove.emit(this.toCanvasPoint(event));
    }
    if (!this.drawing || !this.ctx) return;

    const p = this.toCanvasPoint(event);
    const prev = this.points[this.points.length - 1];
    this.points.push(p);
    this.strokeSegment(this.ctx, prev, p, this.brush());
  }

  protected onPointerUp(): void {
    if (!this.drawing) return;
    this.drawing = false;
    const b = this.brush();
    // A single click → a dot: duplicate the point so it renders on replay.
    const points = this.points.length === 1 ? [this.points[0], this.points[0]] : this.points;
    this.strokeComplete.emit({
      type: b.tool === 'eraser' ? 'erase' : 'stroke',
      color: b.color,
      size: b.size,
      opacity: b.opacity,
      points,
    });
    this.points = [];
  }

  // ---- rendering ----
  private redraw(ops: DrawOperation[]): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    for (const op of ops) this.renderOp(ctx, op);
  }

  private renderOp(ctx: CanvasRenderingContext2D, op: DrawOperation): void {
    if (op.type === 'fill') {
      this.floodFill(ctx, op.points[0], op.color);
      return;
    }
    const settings: BrushSettings = {
      tool: op.type === 'erase' ? 'eraser' : 'pencil',
      color: op.color,
      size: op.size,
      opacity: op.opacity,
    };
    for (let i = 1; i < op.points.length; i++) {
      this.strokeSegment(ctx, op.points[i - 1], op.points[i], settings);
    }
  }

  private strokeSegment(
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    b: BrushSettings,
  ): void {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = b.size;
    if (b.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = b.opacity;
      ctx.strokeStyle = b.color;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  /** Scanline flood fill from a seed point. */
  private floodFill(ctx: CanvasRenderingContext2D, seed: Point, hex: string): void {
    const w = CANVAS_W;
    const h = CANVAS_H;
    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;
    const sx = Math.round(seed.x);
    const sy = Math.round(seed.y);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;

    const start = (sy * w + sx) * 4;
    const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
    const fill = this.hexToRgba(hex);
    if (this.colorsEqual(target, fill, 0)) return;

    const stack: number[] = [sx, sy];
    while (stack.length) {
      const y = stack.pop()!;
      const x = stack.pop()!;
      const idx = (y * w + x) * 4;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      if (!this.colorsEqual([data[idx], data[idx + 1], data[idx + 2], data[idx + 3]], target, FILL_TOLERANCE)) {
        continue;
      }
      data[idx] = fill[0];
      data[idx + 1] = fill[1];
      data[idx + 2] = fill[2];
      data[idx + 3] = fill[3];
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    ctx.putImageData(img, 0, 0);
  }

  // ---- helpers ----
  private toCanvasPoint(event: PointerEvent): Point {
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }

  private hexToRgba(hex: string): [number, number, number, number] {
    const v = hex.replace('#', '');
    const n = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
    return [
      parseInt(n.slice(0, 2), 16),
      parseInt(n.slice(2, 4), 16),
      parseInt(n.slice(4, 6), 16),
      255,
    ];
  }

  private colorsEqual(a: number[], b: number[], tol: number): boolean {
    return (
      Math.abs(a[0] - b[0]) <= tol &&
      Math.abs(a[1] - b[1]) <= tol &&
      Math.abs(a[2] - b[2]) <= tol &&
      Math.abs(a[3] - b[3]) <= tol
    );
  }
}

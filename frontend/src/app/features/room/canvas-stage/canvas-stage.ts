import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { BrushSettings } from '../tool.model';
import { DrawOperation, Point } from '../operation.model';
import { RemoteCursor } from '../participant.model';
import { cursorColor } from '../../../core/models/cursor-colors';

/** Fixed internal canvas resolution. */
const CANVAS_W = 1600;
const CANVAS_H = 1000;
/** On-screen (unscaled) canvas size. */
const DISPLAY_W = 1200;
const DISPLAY_H = 750;
const FILL_TOLERANCE = 32;
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;

type CommittedOp = Omit<DrawOperation, 'id' | 'authorId'>;
type Gesture = 'draw' | 'pan' | 'zoom' | 'pinch' | null;

/**
 * DUMB / presentational canvas with a pan/zoom viewport (Figma-style).
 *
 * Rendering is event-sourced (replays `operations`). The viewport supports:
 *  - trackpad pinch / ⌘-scroll → zoom the stage (not the browser),
 *  - two-finger scroll → pan,
 *  - Hand tool or ⌘-drag → pan, Ctrl-drag → zoom.
 * Pointer→canvas mapping uses the canvas' on-screen rect, so it stays correct
 * under any pan/zoom transform.
 */
@Component({
  selector: 'app-canvas-stage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './canvas-stage.html',
})
export class CanvasStage {
  protected readonly color = cursorColor;
  readonly operations = input<DrawOperation[]>([]);
  readonly brush = input.required<BrushSettings>();
  readonly cursors = input<RemoteCursor[]>([]);
  readonly referenceUrl = input<string | null>(null);
  readonly referenceVisible = input(true);
  readonly referenceOpacity = input(0.5);

  readonly strokeComplete = output<CommittedOp>();
  readonly cursorMove = output<Point>();
  readonly zoomChange = output<number>();

  protected readonly canvasW = CANVAS_W;
  protected readonly canvasH = CANVAS_H;
  protected readonly displayW = DISPLAY_W;
  protected readonly displayH = DISPLAY_H;

  private readonly destroyRef = inject(DestroyRef);
  private readonly viewportRef = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private ctx: CanvasRenderingContext2D | null = null;

  // ---- viewport (pan/zoom) ----
  private readonly scale = signal(1);
  private readonly panX = signal(0);
  private readonly panY = signal(0);
  protected readonly panning = signal(false);
  protected readonly transform = computed(
    () => `translate(${this.panX()}px, ${this.panY()}px) scale(${this.scale()})`,
  );
  protected readonly isPanTool = computed(() => this.brush().tool === 'hand');
  /** Local pointer position within the viewport (for the tool-shaped cursor). */
  protected readonly hoverPos = signal<{ x: number; y: number } | null>(null);
  /** Material-symbol matching the active tool (mirrors the toolbar icon). */
  protected readonly toolIcon = computed(() => {
    switch (this.brush().tool) {
      case 'eraser':
        return 'ink_eraser';
      case 'fill':
        return 'format_color_fill';
      default:
        return 'draw';
    }
  });
  /** Hand → grab/grabbing; drawing tools hide the native cursor (icon shown instead). */
  protected readonly cursorStyle = computed(() =>
    this.isPanTool() ? (this.panning() ? 'grabbing' : 'grab') : 'none',
  );

  // ---- gesture state ----
  private gesture: Gesture = null;
  private drawing = false;
  private points: Point[] = [];
  private last = { x: 0, y: 0 };
  private zoomAnchor = { x: 0, y: 0 };
  private lastCursorEmit = 0;
  /** Active touch/pen/mouse pointers (for multi-touch pinch). */
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private prevDist = 0;
  private prevMid = { x: 0, y: 0 };

  constructor() {
    effect(() => {
      const el = this.canvasRef().nativeElement;
      const ops = this.operations();
      if (!this.ctx) this.ctx = el.getContext('2d', { willReadFrequently: true });
      this.redraw(ops);
    });

    afterNextRender(() => {
      const el = this.viewportRef().nativeElement;
      // Non-passive so we can preventDefault the browser pinch-zoom / scroll.
      const onWheel = (e: WheelEvent) => this.handleWheel(e);
      el.addEventListener('wheel', onWheel, { passive: false });
      this.destroyRef.onDestroy(() => el.removeEventListener('wheel', onWheel));
      this.centerCanvas();
    });
  }

  /**
   * Export the current canvas as a PNG data URL (used when sealing artwork).
   * The drawing canvas is transparent where nothing was painted, which exports
   * as see-through pixels (and shows as black in many PDF/image viewers). So we
   * flatten onto a solid background first — white in light mode, near-black in
   * dark mode — to match the theme the artist drew in.
   */
  captureDataUrl(): string | null {
    const src = this.canvasRef()?.nativeElement;
    if (!src) return null;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const ctx = out.getContext('2d');
    if (!ctx) return src.toDataURL('image/png');
    const dark =
      typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    ctx.fillStyle = dark ? '#101415' : '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0);
    return out.toDataURL('image/png');
  }

  // ---- public zoom controls (driven by the +/- buttons) ----
  zoomIn(): void {
    const r = this.viewportRef().nativeElement.getBoundingClientRect();
    this.zoomAt(1.15, r.left + r.width / 2, r.top + r.height / 2);
  }
  zoomOut(): void {
    const r = this.viewportRef().nativeElement.getBoundingClientRect();
    this.zoomAt(1 / 1.15, r.left + r.width / 2, r.top + r.height / 2);
  }

  // ---- wheel: pinch/⌘ = zoom, plain scroll = pan ----
  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      this.zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
    } else {
      this.panX.update((x) => x - e.deltaX);
      this.panY.update((y) => y - e.deltaY);
    }
  }

  // ---- pointer handling ----
  protected onPointerDown(event: PointerEvent): void {
    const tool = this.brush().tool;
    const vp = this.viewportRef().nativeElement;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    // Two fingers → pinch zoom/pan. Abort any stroke the first finger began.
    if (this.pointers.size === 2) {
      this.abortStroke();
      this.gesture = 'pinch';
      const m = this.twoPointerMetrics();
      if (m) {
        this.prevDist = m.dist;
        this.prevMid = m.mid;
      }
      return;
    }
    if (this.pointers.size > 2) return;

    // Pan: Hand tool or ⌘-drag.
    if (tool === 'hand' || event.metaKey) {
      this.gesture = 'pan';
      this.panning.set(true);
      this.last = { x: event.clientX, y: event.clientY };
      vp.setPointerCapture(event.pointerId);
      return;
    }
    // Zoom: Ctrl-drag (drag vertically).
    if (event.ctrlKey) {
      this.gesture = 'zoom';
      this.last = { x: event.clientX, y: event.clientY };
      this.zoomAnchor = { x: event.clientX, y: event.clientY };
      vp.setPointerCapture(event.pointerId);
      return;
    }

    const p = this.toCanvasPoint(event);
    if (tool === 'fill') {
      this.strokeComplete.emit({ type: 'fill', color: this.brush().color, size: 0, opacity: 1, points: [p] });
      return;
    }

    this.gesture = 'draw';
    this.drawing = true;
    this.points = [p];
    vp.setPointerCapture(event.pointerId);
  }

  protected onPointerLeave(event: PointerEvent): void {
    this.onPointerUp(event);
    this.hoverPos.set(null);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.pointers.has(event.pointerId)) {
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    const vr = this.viewportRef().nativeElement.getBoundingClientRect();
    this.hoverPos.set({ x: event.clientX - vr.left, y: event.clientY - vr.top });

    // Pinch: two-finger zoom (distance) + pan (midpoint).
    if (this.gesture === 'pinch') {
      const m = this.twoPointerMetrics();
      if (!m) return;
      this.panX.update((x) => x + (m.mid.x - this.prevMid.x));
      this.panY.update((y) => y + (m.mid.y - this.prevMid.y));
      this.zoomAt(m.dist / this.prevDist, m.mid.x, m.mid.y);
      this.prevDist = m.dist;
      this.prevMid = m.mid;
      return;
    }

    if (event.timeStamp - this.lastCursorEmit > 40) {
      this.lastCursorEmit = event.timeStamp;
      this.cursorMove.emit(this.toCanvasPoint(event));
    }

    if (this.gesture === 'pan') {
      this.panX.update((x) => x + (event.clientX - this.last.x));
      this.panY.update((y) => y + (event.clientY - this.last.y));
      this.last = { x: event.clientX, y: event.clientY };
      return;
    }
    if (this.gesture === 'zoom') {
      this.zoomAt(Math.exp(-(event.clientY - this.last.y) * 0.01), this.zoomAnchor.x, this.zoomAnchor.y);
      this.last = { x: event.clientX, y: event.clientY };
      return;
    }
    if (this.gesture === 'draw' && this.ctx) {
      const p = this.toCanvasPoint(event);
      const prev = this.points[this.points.length - 1];
      this.points.push(p);
      this.strokeSegment(this.ctx, prev, p, this.brush());
    }
  }

  protected onPointerUp(event?: PointerEvent): void {
    if (event) this.pointers.delete(event.pointerId);

    // Leaving a pinch (a finger lifted).
    if (this.gesture === 'pinch') {
      if (this.pointers.size < 2) {
        this.gesture = null;
        const rest = [...this.pointers.values()][0];
        if (rest) this.last = { x: rest.x, y: rest.y };
      } else {
        const m = this.twoPointerMetrics();
        if (m) {
          this.prevDist = m.dist;
          this.prevMid = m.mid;
        }
      }
      return;
    }

    if (this.gesture === 'draw' && this.drawing) {
      const b = this.brush();
      const points = this.points.length === 1 ? [this.points[0], this.points[0]] : this.points;
      this.strokeComplete.emit({
        type: b.tool === 'eraser' ? 'erase' : 'stroke',
        color: b.color,
        size: b.size,
        opacity: b.opacity,
        points,
        style: b.tool === 'eraser' ? undefined : b.style,
      });
    }
    this.gesture = null;
    this.drawing = false;
    this.points = [];
    this.panning.set(false);
  }

  /** Discard an in-progress stroke (e.g. when a second finger lands for pinch). */
  private abortStroke(): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.points = [];
    this.gesture = null;
    this.redraw(this.operations()); // wipe uncommitted live segments
  }

  private twoPointerMetrics(): { dist: number; mid: { x: number; y: number } } | null {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return null;
    const [a, b] = pts;
    return {
      dist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }

  // ---- viewport math ----
  private zoomAt(factor: number, clientX: number, clientY: number): void {
    const r = this.viewportRef().nativeElement.getBoundingClientRect();
    const sx = clientX - r.left;
    const sy = clientY - r.top;
    const oldS = this.scale();
    const newS = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldS * factor));
    if (newS === oldS) return;
    const wx = (sx - this.panX()) / oldS;
    const wy = (sy - this.panY()) / oldS;
    this.panX.set(sx - wx * newS);
    this.panY.set(sy - wy * newS);
    this.scale.set(newS);
    this.zoomChange.emit(Math.round(newS * 100));
  }

  private centerCanvas(): void {
    const r = this.viewportRef().nativeElement.getBoundingClientRect();
    this.scale.set(1);
    this.panX.set(Math.round((r.width - DISPLAY_W) / 2));
    this.panY.set(Math.round((r.height - DISPLAY_H) / 2));
    this.zoomChange.emit(100);
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
      style: op.style ?? 'hard',
    };
    // Replay the whole stroke as one smooth path (quadratic through midpoints).
    ctx.save();
    this.applyStrokeStyle(ctx, settings);
    this.tracePath(ctx, op.points);
    ctx.stroke();
    ctx.restore();
  }

  /** Smooth path: quadratic curves through the midpoints of consecutive points. */
  private tracePath(ctx: CanvasRenderingContext2D, pts: Point[]): void {
    ctx.beginPath();
    if (pts.length < 3) {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      return;
    }
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    const last = pts[pts.length - 1];
    ctx.quadraticCurveTo(pts[pts.length - 2].x, pts[pts.length - 2].y, last.x, last.y);
  }

  /** Configure ctx for the given brush incl. the 3 pencil styles. */
  private applyStrokeStyle(ctx: CanvasRenderingContext2D, b: BrushSettings): void {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = b.size;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    if (b.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = b.opacity;
    ctx.strokeStyle = b.color;
    if (b.style === 'soft') {
      // Marker / airbrush: translucent + heavily feathered edges.
      ctx.globalAlpha = b.opacity * 0.55;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = Math.max(6, b.size * 1.3);
    } else if (b.style === 'shadow') {
      // Neon: solid core with a strong colored glow (bolder = larger blur).
      ctx.shadowColor = b.color;
      ctx.shadowBlur = Math.max(18, b.size * 3.2);
    }
    // 'hard' (legacy) → crisp, fully opaque, no blur (defaults above).
  }

  private strokeSegment(
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    b: BrushSettings,
  ): void {
    ctx.save();
    this.applyStrokeStyle(ctx, b);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    // Shadow style: a second pass intensifies the colored glow.
    if (b.tool !== 'eraser' && b.style === 'shadow') ctx.stroke();
    ctx.restore();
  }

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

    // STRICT = solid fill region; SOFT = feather the fill INTO the stroke's
    // anti-aliased fringe so no white gap is left between line and fill.
    const STRICT = FILL_TOLERANCE;
    const SOFT = 160;
    const visited = new Uint8Array(w * h);
    const stack: number[] = [sx, sy];
    while (stack.length) {
      const y = stack.pop()!;
      const x = stack.pop()!;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const p = y * w + x;
      if (visited[p]) continue;
      visited[p] = 1;
      const idx = p * 4;
      const d = this.colorDist(data, idx, target);
      if (d <= STRICT) {
        data[idx] = fill[0];
        data[idx + 1] = fill[1];
        data[idx + 2] = fill[2];
        data[idx + 3] = 255;
        stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
      } else if (d <= SOFT) {
        // Boundary fringe: blend the fill in proportionally, but stop here.
        const f = 1 - (d - STRICT) / (SOFT - STRICT);
        data[idx] = Math.round(fill[0] * f + data[idx] * (1 - f));
        data[idx + 1] = Math.round(fill[1] * f + data[idx + 1] * (1 - f));
        data[idx + 2] = Math.round(fill[2] * f + data[idx + 2] * (1 - f));
        data[idx + 3] = Math.round(255 * f + data[idx + 3] * (1 - f));
      }
      // else: stroke core — leave untouched.
    }
    ctx.putImageData(img, 0, 0);
  }

  /** Max per-channel (incl. alpha) distance between a pixel and a target color. */
  private colorDist(data: Uint8ClampedArray, idx: number, target: number[]): number {
    return Math.max(
      Math.abs(data[idx] - target[0]),
      Math.abs(data[idx + 1] - target[1]),
      Math.abs(data[idx + 2] - target[2]),
      Math.abs(data[idx + 3] - target[3]),
    );
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
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16), 255];
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

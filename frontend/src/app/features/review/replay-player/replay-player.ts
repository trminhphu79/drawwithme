import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ArtworkService } from '../artwork.service';
import { DrawOperation, Point } from '../../room/operation.model';

const W = 1600;
const H = 1000;
const FILL_TOLERANCE = 32;
const SOFT = 160;
/** Replay pace: wall-clock time per drawn point (so total scales with size). */
const MS_PER_POINT = 7.5;

interface StrokeStyle {
  erase: boolean;
  color: string;
  size: number;
  opacity: number;
  style?: 'hard' | 'soft' | 'shadow';
}

/**
 * Time-lapse replay: loads a room's operation log and re-draws it progressively
 * (stroke segment-by-segment, fills instantly) onto a canvas. Modal overlay.
 */
@Component({
  selector: 'app-replay-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './replay-player.html',
})
export class ReplayPlayer {
  readonly id = input.required<string>();
  readonly close = output<void>();

  private readonly artworks = inject(ArtworkService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private ctx: CanvasRenderingContext2D | null = null;

  protected readonly canvasW = W;
  protected readonly canvasH = H;
  protected readonly loading = signal(true);
  protected readonly empty = signal(false);
  protected readonly playing = signal(false);
  protected readonly finished = signal(false);
  protected readonly progress = signal(0);

  private ops: DrawOperation[] = [];
  private opIndex = 0;
  private ptIndex = 1;
  private totalPoints = 0;
  private donePoints = 0;
  private raf = 0;
  /** rAF timestamp of the previous frame (0 = first frame / just resumed). */
  private lastFrame = 0;
  /** Fractional points carried over between frames (time-based pacing). */
  private pointCarry = 0;

  constructor() {
    afterNextRender(() => {
      this.ctx = this.canvasRef().nativeElement.getContext('2d', { willReadFrequently: true });
      void this.load();
    });
    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.raf));
  }

  private async load(): Promise<void> {
    try {
      this.ops = (await firstValueFrom(this.artworks.getOperations(this.id()))) ?? [];
    } catch {
      this.ops = [];
    }
    this.loading.set(false);
    if (!this.ops.length) {
      this.empty.set(true);
      return;
    }
    this.totalPoints = this.ops.reduce(
      (n, o) => n + (o.type === 'fill' ? 1 : Math.max(1, o.points.length - 1)),
      0,
    );
    this.restart();
  }

  protected restart(): void {
    cancelAnimationFrame(this.raf);
    this.ctx?.clearRect(0, 0, W, H);
    this.opIndex = 0;
    this.ptIndex = 1;
    this.donePoints = 0;
    this.lastFrame = 0;
    this.pointCarry = 0;
    this.finished.set(false);
    this.progress.set(0);
    this.playing.set(true);
    this.raf = requestAnimationFrame(this.tick);
  }

  protected togglePlay(): void {
    if (this.finished()) {
      this.restart();
      return;
    }
    this.playing.update((p) => !p);
    if (this.playing()) {
      this.lastFrame = 0; // don't count the paused gap as elapsed time
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  private readonly tick = (now: number): void => {
    const ctx = this.ctx;
    if (!ctx || !this.playing()) return;
    // Time-based pacing: draw points at a constant MS_PER_POINT rate, so the
    // total replay length scales with the number of points (framerate-independent).
    if (!this.lastFrame) this.lastFrame = now;
    this.pointCarry += (now - this.lastFrame) / MS_PER_POINT;
    this.lastFrame = now;
    let budget = Math.floor(this.pointCarry);
    this.pointCarry -= budget;
    while (budget > 0 && this.opIndex < this.ops.length) {
      const op = this.ops[this.opIndex];
      if (op.type === 'fill') {
        this.floodFill(ctx, op.points[0], op.color);
        this.advanceOp();
        budget--;
        continue;
      }
      if (op.points.length < 2) {
        this.segment(ctx, op.points[0], op.points[0], op);
        this.advanceOp();
        budget--;
        continue;
      }
      this.segment(ctx, op.points[this.ptIndex - 1], op.points[this.ptIndex], op);
      this.ptIndex++;
      this.donePoints++;
      budget--;
      if (this.ptIndex >= op.points.length) {
        this.opIndex++;
        this.ptIndex = 1;
      }
    }
    this.progress.set(this.totalPoints ? Math.min(1, this.donePoints / this.totalPoints) : 1);
    if (this.opIndex >= this.ops.length) {
      this.playing.set(false);
      this.finished.set(true);
      this.progress.set(1);
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private advanceOp(): void {
    this.donePoints++;
    this.opIndex++;
    this.ptIndex = 1;
  }

  // ---- rendering (mirrors the canvas engine) ----
  private segment(ctx: CanvasRenderingContext2D, from: Point, to: Point, op: DrawOperation): void {
    const s: StrokeStyle = {
      erase: op.type === 'erase',
      color: op.color,
      size: op.size,
      opacity: op.opacity,
      style: op.style ?? 'hard',
    };
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = s.size;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    if (s.erase) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = s.opacity;
      ctx.strokeStyle = s.color;
      if (s.style === 'soft') {
        ctx.globalAlpha = s.opacity * 0.55;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = Math.max(6, s.size * 1.3);
      } else if (s.style === 'shadow') {
        ctx.shadowColor = s.color;
        ctx.shadowBlur = Math.max(12, s.size * 2.2);
      }
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  private floodFill(ctx: CanvasRenderingContext2D, seed: Point, hex: string): void {
    const img = ctx.getImageData(0, 0, W, H);
    const data = img.data;
    const sx = Math.round(seed.x);
    const sy = Math.round(seed.y);
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
    const ti = (sy * W + sx) * 4;
    const target = [data[ti], data[ti + 1], data[ti + 2], data[ti + 3]];
    const fill = this.hexToRgba(hex);
    const visited = new Uint8Array(W * H);
    const stack: number[] = [sx, sy];
    while (stack.length) {
      const y = stack.pop()!;
      const x = stack.pop()!;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const p = y * W + x;
      if (visited[p]) continue;
      visited[p] = 1;
      const idx = p * 4;
      const d = Math.max(
        Math.abs(data[idx] - target[0]),
        Math.abs(data[idx + 1] - target[1]),
        Math.abs(data[idx + 2] - target[2]),
        Math.abs(data[idx + 3] - target[3]),
      );
      if (d <= FILL_TOLERANCE) {
        data[idx] = fill[0];
        data[idx + 1] = fill[1];
        data[idx + 2] = fill[2];
        data[idx + 3] = 255;
        stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
      } else if (d <= SOFT) {
        const f = 1 - (d - FILL_TOLERANCE) / (SOFT - FILL_TOLERANCE);
        data[idx] = Math.round(fill[0] * f + data[idx] * (1 - f));
        data[idx + 1] = Math.round(fill[1] * f + data[idx + 1] * (1 - f));
        data[idx + 2] = Math.round(fill[2] * f + data[idx + 2] * (1 - f));
        data[idx + 3] = Math.round(255 * f + data[idx + 3] * (1 - f));
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private hexToRgba(hex: string): [number, number, number, number] {
    const v = hex.replace('#', '');
    const n = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16), 255];
  }
}

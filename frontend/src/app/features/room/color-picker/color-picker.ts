import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

interface Hsv {
  h: number;
  s: number;
  v: number;
}

/**
 * Custom, consistent color picker (saturation/value area + hue slider + hex +
 * eyedropper where supported). Replaces the platform-native <input type=color>
 * so it looks identical across desktop/mobile. Emits hex on every change.
 */
@Component({
  selector: 'app-color-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './color-picker.html',
  host: { '(document:keydown.escape)': 'close.emit()' },
})
export class ColorPicker {
  readonly color = input.required<string>();
  readonly colorChange = output<string>();
  readonly close = output<void>();

  private readonly area = viewChild.required<ElementRef<HTMLElement>>('area');

  protected readonly h = signal(0);
  protected readonly s = signal(1);
  protected readonly v = signal(1);
  private dragging = false;

  protected readonly hex = computed(() => this.hsvToHex(this.h(), this.s(), this.v()));
  protected readonly hueColor = computed(() => this.hsvToHex(this.h(), 1, 1));
  protected readonly thumbX = computed(() => this.s() * 100);
  protected readonly thumbY = computed(() => (1 - this.v()) * 100);
  protected readonly hasEyeDropper =
    typeof window !== 'undefined' && 'EyeDropper' in window;

  constructor() {
    // Sync from an external colour (swatch click) unless it already matches.
    effect(() => {
      const c = this.color()?.toLowerCase();
      if (!c || c === this.hex().toLowerCase()) return;
      const hsv = this.hexToHsv(c);
      if (hsv) {
        this.h.set(hsv.h);
        this.s.set(hsv.s);
        this.v.set(hsv.v);
      }
    });
  }

  // ---- saturation/value area ----
  protected onAreaPointer(event: PointerEvent): void {
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    this.dragging = true;
    this.applyArea(event);
  }
  protected onAreaMove(event: PointerEvent): void {
    if (this.dragging) this.applyArea(event);
  }
  protected onAreaUp(): void {
    this.dragging = false;
  }
  private applyArea(event: PointerEvent): void {
    const r = this.area().nativeElement.getBoundingClientRect();
    this.s.set(Math.min(1, Math.max(0, (event.clientX - r.left) / r.width)));
    this.v.set(1 - Math.min(1, Math.max(0, (event.clientY - r.top) / r.height)));
    this.emit();
  }

  protected onHue(event: Event): void {
    this.h.set(Number((event.target as HTMLInputElement).value));
    this.emit();
  }

  protected onHex(event: Event): void {
    const hsv = this.hexToHsv((event.target as HTMLInputElement).value.trim());
    if (hsv) {
      this.h.set(hsv.h);
      this.s.set(hsv.s);
      this.v.set(hsv.v);
      this.emit();
    }
  }

  protected async pickEyeDropper(): Promise<void> {
    try {
      const ed = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
      const { sRGBHex } = await ed.open();
      const hsv = this.hexToHsv(sRGBHex);
      if (hsv) {
        this.h.set(hsv.h);
        this.s.set(hsv.s);
        this.v.set(hsv.v);
        this.emit();
      }
    } catch {
      /* cancelled */
    }
  }

  private emit(): void {
    this.colorChange.emit(this.hex());
  }

  // ---- conversions ----
  private hsvToHex(h: number, s: number, v: number): string {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${to(r)}${to(g)}${to(b)}`;
  }

  private hexToHsv(hex: string): Hsv | null {
    const v = hex.replace('#', '');
    const n = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
    if (!/^[0-9a-fA-F]{6}$/.test(n)) return null;
    const r = parseInt(n.slice(0, 2), 16) / 255;
    const g = parseInt(n.slice(2, 4), 16) / 255;
    const b = parseInt(n.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let hue = 0;
    if (d !== 0) {
      if (max === r) hue = 60 * (((g - b) / d) % 6);
      else if (max === g) hue = 60 * ((b - r) / d + 2);
      else hue = 60 * ((r - g) / d + 4);
    }
    if (hue < 0) hue += 360;
    return { h: hue, s: max === 0 ? 0 : d / max, v: max };
  }
}

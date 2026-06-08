import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { DrawingStore } from '../drawing.store';
import { ChatStore } from '../chat.store';
import { PreferencesStore } from '../../../core/preferences.store';
import { DRAWING_TOOLS, PENCIL_STYLES } from '../tool.model';
import { RoomTopBar } from '../room-top-bar/room-top-bar';
import { ToolRail } from '../tool-rail/tool-rail';
import { CanvasStage } from '../canvas-stage/canvas-stage';
import { CanvasControls } from '../canvas-controls/canvas-controls';
import { ReactionBar } from '../reaction-bar/reaction-bar';
import { StrokeWeight } from '../stroke-weight/stroke-weight';
import { PencilStyle, ToolId } from '../tool.model';
import { PropertiesPanel } from '../properties-panel/properties-panel';
import { ChatPanel } from '../chat-panel/chat-panel';
import { ReactionOverlay } from '../reaction-overlay/reaction-overlay';
import { NameGate } from '../name-gate/name-gate';
import { ConfirmDialog } from '../../../core/confirm-dialog';
import { Toast } from '../../../core/toast';

/**
 * SMART / container for the Drawing Room (new-main.html layout). Provides the
 * DrawingStore (canvas + cursors) and ChatStore (chat + reactions), gates entry
 * behind a name prompt, and orchestrates all presentational panels.
 */
@Component({
  selector: 'app-drawing-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DrawingStore, ChatStore],
  imports: [
    RoomTopBar,
    ToolRail,
    CanvasStage,
    CanvasControls,
    ReactionBar,
    StrokeWeight,
    PropertiesPanel,
    ChatPanel,
    ReactionOverlay,
    NameGate,
    ConfirmDialog,
    Toast,
  ],
  templateUrl: './drawing-room.html',
  host: { '(window:keydown)': 'onKeydown($event)' },
})
export class DrawingRoom {
  protected readonly store = inject(DrawingStore);
  protected readonly chat = inject(ChatStore);
  private readonly prefs = inject(PreferencesStore);
  private readonly router = inject(Router);

  readonly code = input<string>('');

  protected readonly tools = DRAWING_TOOLS;
  protected readonly pencilStyles = PENCIL_STYLES;
  protected readonly showNameGate = signal(false);
  /** Mobile/tablet chat drawer open state (always visible on lg+). */
  protected readonly chatOpen = signal(false);
  /** Mobile/tablet properties drawer open state (always visible on lg+). */
  protected readonly propsOpen = signal(false);
  /** Live zoom % reported by the canvas viewport (for the controls display). */
  protected readonly zoomPercent = signal(100);
  /** Transient stroke-weight slider (shows on tool change, fades out after idle). */
  protected readonly weightVisible = signal(false);
  private weightTimer: ReturnType<typeof setTimeout> | undefined;
  /** Reset-canvas confirmation modal. */
  protected readonly confirmReset = signal(false);
  /** Transient toast message (e.g. after copying the invite link). */
  protected readonly toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  /** Desktop collapse state for the side panels. */
  protected readonly chatCollapsed = signal(false);
  protected readonly propsCollapsed = signal(false);
  protected readonly initialName = computed(() =>
    this.prefs.hasProfile() ? this.prefs.displayName() : '',
  );

  private readonly canvas = viewChild(CanvasStage);
  private entered = false;

  constructor() {
    effect(() => {
      const code = this.code();
      if (!code || this.entered || this.showNameGate()) return;
      if (this.hasName()) this.enter(code);
      else this.showNameGate.set(true);
    });
  }

  protected onNameSubmit(name: string): void {
    this.prefs.setDisplayName(name);
    this.showNameGate.set(false);
    this.enter(this.code());
  }

  protected toggleChat(): void {
    this.chatOpen.update((o) => !o);
  }

  /** Tool change → reveal the weight slider (hidden for the Hand tool). */
  protected onToolSelect(tool: ToolId): void {
    this.store.setTool(tool);
    if (tool === 'hand') this.weightVisible.set(false);
    else this.flashWeight();
  }

  protected onStyleChange(style: PencilStyle): void {
    this.store.setPencilStyle(style);
    this.flashWeight();
  }

  protected onSizeChange(size: number): void {
    this.store.setSize(size);
    this.flashWeight();
  }

  /** Show the slider, then auto-fade it out after a short idle. */
  private flashWeight(): void {
    this.weightVisible.set(true);
    clearTimeout(this.weightTimer);
    this.weightTimer = setTimeout(() => this.weightVisible.set(false), 2600);
  }

  protected zoomIn(): void {
    this.canvas()?.zoomIn();
  }
  protected zoomOut(): void {
    this.canvas()?.zoomOut();
  }

  protected onInvite(): void {
    const url = `${location.origin}/room/${this.code()}`;
    const done = () => this.showToast('Link copied — share it with your friends! 🎉');
    try {
      navigator.clipboard?.writeText(url).then(done, done) ?? done();
    } catch {
      done();
    }
  }

  protected onHome(): void {
    this.router.navigate(['/join']);
  }

  protected onReset(): void {
    this.confirmReset.set(true);
  }

  protected onConfirmReset(): void {
    this.confirmReset.set(false);
    this.store.reset();
  }

  private showToast(message: string): void {
    this.toast.set(message);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }

  protected async onFinish(): Promise<void> {
    const dataUrl = this.canvas()?.captureDataUrl();
    if (dataUrl) await this.store.seal(dataUrl);
    this.router.navigate(['/artwork', this.code() || 'demo']);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey)) return;
    const target = event.target as HTMLElement;
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
    if (event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.store.undo();
    } else if ((event.key === 'z' && event.shiftKey) || event.key === 'y') {
      event.preventDefault();
      this.store.redo();
    }
  }

  private hasName(): boolean {
    return this.prefs.hasProfile();
  }

  private enter(code: string): void {
    if (this.entered || !code) return;
    this.entered = true;
    void this.store.init(code);
    void this.chat.init(code);
  }
}

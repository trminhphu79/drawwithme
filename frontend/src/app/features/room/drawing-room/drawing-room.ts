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
import { VoiceStore } from '../voice.store';
import { PreferencesStore } from '../../../core/stores/preferences.store';
import { avatarUrl } from '../../../core/models/avatars';
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
import { ProfileGate, Profile } from '../profile-gate/profile-gate';
import { ReplayPlayer } from '../../review/replay-player/replay-player';
import { ConfirmDialog } from '../../../core/ui/confirm-dialog';
import { Toast } from '../../../core/ui/toast';

/**
 * SMART / container for the Drawing Room (new-main.html layout). Provides the
 * DrawingStore (canvas + cursors) and ChatStore (chat + reactions), gates entry
 * behind a name prompt, and orchestrates all presentational panels.
 */
@Component({
  selector: 'app-drawing-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DrawingStore, ChatStore, VoiceStore],
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
    ProfileGate,
    ReplayPlayer,
    ConfirmDialog,
    Toast,
  ],
  templateUrl: './drawing-room.html',
  host: { '(window:keydown)': 'onKeydown($event)' },
})
export class DrawingRoom {
  protected readonly store = inject(DrawingStore);
  protected readonly chat = inject(ChatStore);
  protected readonly voice = inject(VoiceStore);
  private readonly prefs = inject(PreferencesStore);
  private readonly router = inject(Router);

  readonly code = input<string>('');

  protected readonly tools = DRAWING_TOOLS;
  protected readonly pencilStyles = PENCIL_STYLES;
  /** Blocking entry gate (pick avatar + name before joining). */
  protected readonly showNameGate = signal(false);
  /** Header "edit profile" modal (re-pick avatar + name mid-session). */
  protected readonly editProfileOpen = signal(false);
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
  /** "Leave the room?" confirmation (logo click or mobile back-swipe). */
  protected readonly confirmLeave = signal(false);
  /** True once we've decided to actually leave (skips the leave guard). */
  private leaving = false;
  /** Resolves the CanDeactivate promise when the leave dialog is answered. */
  private leaveResolver: ((ok: boolean) => void) | null = null;
  /** "Finish & save?" confirmation before sealing the artwork. */
  protected readonly confirmFinish = signal(false);
  /** Result modal (replay / share / download) shown after sealing. */
  protected readonly completeModalOpen = signal(false);
  protected readonly completeReplayOpen = signal(false);
  /** The sealed artwork id (for share link + replay). */
  protected readonly completedArtworkId = signal<string | null>(null);
  /** Captured PNG of the sealed artwork (for download). */
  private completedDataUrl: string | null = null;
  /** Reference image view state (local, per-user) + fullscreen preview.
   *  Off by default — the reference only renders on the canvas once the user
   *  chooses to show it. */
  protected readonly referenceVisible = signal(false);
  protected readonly referenceOpacity = signal(50);
  protected readonly showRefPreview = signal(false);
  /** Transient toast message (e.g. after copying the invite link). */
  protected readonly toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  /** Desktop collapse state for the properties panel. */
  protected readonly propsCollapsed = signal(false);
  protected readonly initialName = computed(() =>
    this.prefs.hasProfile() ? this.prefs.displayName() : '',
  );
  /** The current user's own avatar + name (for the header profile button). */
  protected readonly myAvatar = this.prefs.avatar;
  protected readonly myName = this.prefs.displayName;
  /** Stable client id — shown in the edit-profile modal so it can be given to an admin. */
  protected readonly myClientId = this.prefs.clientId;
  /** avatarUrl helper for the host's pending-request list. */
  protected readonly avatarUrl = avatarUrl;
  /** Tools + chat are usable only once fully admitted (host approval). */
  protected readonly canInteract = computed(() => this.store.joinState() === 'active');

  private readonly canvas = viewChild(CanvasStage);
  private entered = false;

  /** Guards the one-shot "someone finished" toast. */
  private finishNotified = false;

  constructor() {
    effect(() => {
      const code = this.code();
      if (!code || this.entered || this.showNameGate() || this.leaving) return;
      // Only prompt for a profile the FIRST time (no saved name yet). Name +
      // avatar live in localStorage, so the same browser — including new tabs —
      // is recognised as the same user and enters straight away. They can still
      // change it later via the header profile button.
      if (this.prefs.hasProfile()) this.enter(code);
      else this.showNameGate.set(true);
    });

    // Another member sealed the artwork → just let everyone know (the room
    // stays open; nobody is kicked out). The share link is in the result modal.
    effect(() => {
      const done = this.store.finished();
      if (!done || this.finishNotified) return;
      this.finishNotified = true;
      this.completedArtworkId.set(done.artworkId);
      this.showToast(`🎉 ${done.by} finished the masterpiece! Share link is ready.`);
    });

    // Denied by host, or the room is full → let them know, then send them home.
    effect(() => {
      const state = this.store.joinState();
      if ((state !== 'denied' && state !== 'full') || this.leaving) return;
      this.leaving = true;
      this.showToast(
        state === 'full'
          ? 'This room is full — try another or create your own.'
          : 'The host didn’t let you into this room.',
      );
      setTimeout(() => this.router.navigate(['/join']), 2000);
    });
  }

  /** Entry gate "Done" — save profile then connect. */
  protected onNameSubmit(profile: Profile): void {
    this.prefs.setDisplayName(profile.name);
    this.prefs.setAvatar(profile.avatar);
    this.showNameGate.set(false);
    this.enter(this.code());
  }

  /** Header profile "Done" — save then broadcast the change to everyone. */
  protected onProfileSave(profile: Profile): void {
    this.prefs.setDisplayName(profile.name);
    this.prefs.setAvatar(profile.avatar);
    this.editProfileOpen.set(false);
    this.store.updateProfile();
  }

  /** "My Rooms" from the profile menu — navigates out (leave guard prompts). */
  protected goMyRooms(): void {
    this.router.navigate(['/my-rooms']);
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

  /** Logo click → navigate home; the CanDeactivate guard prompts to confirm. */
  protected onHome(): void {
    this.router.navigate(['/join']);
  }

  /**
   * CanDeactivate guard hook. Runs on the logo, any router nav, AND the
   * browser/mobile Back gesture. Returns a promise resolved by the dialog.
   */
  canDeactivate(): boolean | Promise<boolean> {
    if (this.leaving) return true; // finishing / already-confirmed leave
    this.confirmLeave.set(true);
    return new Promise<boolean>((resolve) => (this.leaveResolver = resolve));
  }

  /** Confirmed "Leave" → allow the pending navigation. */
  protected onConfirmLeave(): void {
    this.confirmLeave.set(false);
    this.leaving = true;
    this.leaveResolver?.(true);
    this.leaveResolver = null;
  }

  /** Cancelled → stay (the guard rejects, router restores the URL). */
  protected onCancelLeave(): void {
    this.confirmLeave.set(false);
    this.leaveResolver?.(false);
    this.leaveResolver = null;
  }

  protected onReset(): void {
    this.confirmReset.set(true);
  }

  /** Toggle the Properties panel — mobile drawer (propsOpen) + desktop sidebar
   *  (propsCollapsed). Each breakpoint only reads its own state. */
  protected onPreferences(): void {
    this.propsOpen.update((v) => !v);
    this.propsCollapsed.update((v) => !v);
  }

  protected onConfirmReset(): void {
    this.confirmReset.set(false);
    this.store.reset();
  }

  /** Read an uploaded reference file and share it with the room. */
  protected onReferenceFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (dataUrl) {
        void this.store.setReference(dataUrl);
        this.referenceVisible.set(true);
      }
    };
    reader.readAsDataURL(file);
  }

  private showToast(message: string): void {
    this.toast.set(message);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }

  /** Finish icon → confirm first (don't seal/redirect directly). */
  protected onFinish(): void {
    if (!this.store.canUndo()) {
      this.showToast('Draw something before finishing 🎨');
      return;
    }
    this.confirmFinish.set(true);
  }

  protected onCancelFinish(): void {
    this.confirmFinish.set(false);
  }

  /** Confirmed Save → seal the artwork, notify the room, open the result modal. */
  protected async onConfirmFinish(): Promise<void> {
    this.confirmFinish.set(false);
    const dataUrl = this.canvas()?.captureDataUrl();
    if (!dataUrl) {
      this.showToast('Could not capture the canvas — try again.');
      return;
    }
    const id = await this.store.seal(dataUrl);
    if (!id) {
      this.showToast('Saving failed — please try again.');
      return;
    }
    this.completedDataUrl = dataUrl;
    this.completedArtworkId.set(id);
    this.finishNotified = true; // don't also toast ourselves from room:finished
    this.store.notifyFinished(id);
    this.completeModalOpen.set(true);
  }

  /** Result-modal actions. */
  protected openCompleteReplay(): void {
    this.completeReplayOpen.set(true);
  }
  protected onCopyShareLink(): void {
    const id = this.completedArtworkId();
    if (!id) return;
    const url = `${location.origin}/view/${id}`;
    const done = () => this.showToast('Share link copied — anyone with it can view & replay 🎨');
    try {
      navigator.clipboard?.writeText(url).then(done, done) ?? done();
    } catch {
      done();
    }
  }
  protected onDownloadComplete(): void {
    if (!this.completedDataUrl) return;
    const name = `${(this.store.title() || 'artwork').replace(/\s+/g, '-').toLowerCase()}.png`;
    const a = document.createElement('a');
    a.href = this.completedDataUrl;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  /** Open the full result page (the modal's "view" path). */
  protected goToResult(): void {
    const id = this.completedArtworkId();
    if (!id) return;
    this.leaving = true; // skip the leave-confirm guard
    this.router.navigate(['/view', id]);
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

  private enter(code: string): void {
    if (this.entered || !code) return;
    this.entered = true;
    void this.store.init(code);
    void this.chat.init(code);
    this.voice.init(code);
  }
}

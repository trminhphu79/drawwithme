import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ChatMessage } from '../chat.model';

/**
 * DUMB. Room chat: message list (self vs others), input + mute. Reactions live
 * in the on-canvas reaction bar, not here. Auto-scrolls on new messages.
 */
@Component({
  selector: 'app-chat-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './chat-panel.html',
})
export class ChatPanel {
  readonly messages = input<ChatMessage[]>([]);
  readonly myId = input('');
  readonly muted = input(false);

  readonly send = output<string>();
  readonly toggleMute = output<void>();

  protected readonly draft = signal('');

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  constructor() {
    // Auto-scroll to the latest message.
    effect(() => {
      this.messages();
      const el = this.scroller()?.nativeElement;
      if (el) queueMicrotask(() => (el.scrollTop = el.scrollHeight));
    });
  }

  protected isSelf(m: ChatMessage): boolean {
    return m.authorId === this.myId();
  }

  protected onInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  protected submit(): void {
    const text = this.draft().trim();
    if (!text) return;
    this.send.emit(text);
    this.draft.set('');
  }
}

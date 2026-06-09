import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { REACTION_EMOJIS } from '../chat.model';

/**
 * DUMB. Floating quick-reaction bar shown on the canvas (above the undo/redo
 * controls). Emits the chosen emoji; the parent broadcasts it to the room.
 */
@Component({
  selector: 'app-reaction-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="glass-panel rounded-full elevation-3 border border-white/20 px-2 py-1.5 flex items-center gap-1 touch-manipulation select-none">
      @for (emoji of emojis; track emoji) {
        <button
          type="button"
          (click)="react.emit(emoji)"
          class="w-9 h-9 flex items-center justify-center text-xl rounded-full hover:bg-secondary/15 hover:scale-125 active:scale-110 transition-transform duration-150"
          [attr.aria-label]="'React ' + emoji">
          {{ emoji }}
        </button>
      }
    </div>
  `,
})
export class ReactionBar {
  protected readonly emojis = REACTION_EMOJIS;
  readonly react = output<string>();
}

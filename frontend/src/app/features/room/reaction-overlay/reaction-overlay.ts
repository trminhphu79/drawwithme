import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactionEvent } from '../chat.model';

/**
 * DUMB. Renders active emoji reactions as float-up bubbles over the canvas.
 * The parent (ChatStore) adds/removes events in sync across all clients, so the
 * same animation fires for everyone at the same spot.
 */
@Component({
  selector: 'app-reaction-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      @for (r of reactions(); track r.id) {
        <div
          class="reaction-bubble text-5xl drop-shadow-lg flex flex-col items-center"
          [style.left.%]="r.x"
          style="bottom: 12%">
          <span>{{ r.emoji }}</span>
          <span class="text-[10px] font-bold text-on-surface-variant bg-surface-container/80 backdrop-blur-sm px-2 py-0.5 rounded-full mt-1 whitespace-nowrap">
            {{ r.author }}
          </span>
        </div>
      }
    </div>
  `,
})
export class ReactionOverlay {
  readonly reactions = input<ReactionEvent[]>([]);
}

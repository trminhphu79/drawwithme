import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Shared footer — Help + About links. Used on the lobby and the view page. */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="flex gap-4 justify-center items-center text-body-sm text-on-surface-variant">
      <a routerLink="/help" class="hover:text-secondary transition-colors">Help</a>
      <span aria-hidden="true">·</span>
      <a routerLink="/about" class="hover:text-secondary transition-colors">About</a>
    </div>
  `,
})
export class AppFooter {}

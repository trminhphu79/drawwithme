import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { InstallService } from './install.service';

/** Shows an Install button (Android/Chrome) or an iOS "Add to Home Screen" hint. */
@Component({
  selector: 'app-install-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (svc.canInstall()) {
      <button
        type="button"
        (click)="svc.install()"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/15 text-secondary font-label-md hover:bg-secondary/25 active:scale-95 transition-all">
        <span class="material-symbols-outlined text-[18px]">install_mobile</span>
        Install app
      </button>
    } @else if (svc.showIosHint) {
      <p class="text-body-sm text-on-surface-variant flex items-center justify-center gap-1.5">
        <span class="material-symbols-outlined text-[16px]">ios_share</span>
        Install: tap <strong class="font-bold">Share</strong> then “Add to Home Screen”
      </p>
    }
  `,
})
export class InstallButton {
  protected readonly svc = inject(InstallService);
}

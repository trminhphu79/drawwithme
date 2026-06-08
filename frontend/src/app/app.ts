import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { ThemeStore } from './core/stores/theme.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Instantiate early so the theme is managed (and follows the system) on boot.
  protected readonly theme = inject(ThemeStore);
  private readonly updates = inject(SwUpdate);

  constructor() {
    // When a new build is deployed, activate it and reload so clients stop
    // running stale cached code (the canvas is server-persisted, so a reload
    // restores state). Without this the service worker only updates on a cold
    // launch, and new tabs keep serving the old bundle.
    if (this.updates.isEnabled) {
      this.updates.versionUpdates
        .pipe(
          filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'),
          takeUntilDestroyed(),
        )
        .subscribe(() => void this.updates.activateUpdate().then(() => document.location.reload()));
      void this.updates.checkForUpdate().catch(() => undefined);
    }
  }
}

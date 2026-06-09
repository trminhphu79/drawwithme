import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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

  constructor() {
    // The service worker was removed. Proactively unregister any SW a returning
    // visitor still has installed and wipe its caches, so nobody is stuck on a
    // stale cached bundle. No-op once everyone is clean.
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => void r.unregister()))
        .catch(() => undefined);
    }
    if (typeof caches !== 'undefined') {
      void caches
        .keys()
        .then((keys) => keys.forEach((k) => void caches.delete(k)))
        .catch(() => undefined);
    }
  }
}

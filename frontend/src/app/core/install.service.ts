import { Injectable, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

/**
 * PWA install helper.
 *  - Android/desktop Chrome: captures `beforeinstallprompt` and exposes install().
 *  - iOS Safari: no programmatic install — expose a flag so the UI can show the
 *    "Share → Add to Home Screen" hint.
 */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private deferred: BeforeInstallPromptEvent | null = null;

  readonly canInstall = signal(false);
  readonly isIOS =
    typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  readonly isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true);

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferred = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canInstall.set(false);
    });
  }

  async install(): Promise<void> {
    if (!this.deferred) return;
    await this.deferred.prompt();
    try {
      await this.deferred.userChoice;
    } catch {
      /* dismissed */
    }
    this.deferred = null;
    this.canInstall.set(false);
  }

  /** iOS Safari, not already installed → show the manual "Add to Home Screen" hint. */
  get showIosHint(): boolean {
    return this.isIOS && !this.isStandalone;
  }
}

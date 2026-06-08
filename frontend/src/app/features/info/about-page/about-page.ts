import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggle } from '../../../core/ui/theme-toggle';

interface Social {
  label: string;
  icon: string; // inline SVG path is overkill — we use a simple emoji/letter badge
  url: string;
}

/** About-the-author page: short bio, avatar and social links. */
@Component({
  selector: 'app-about-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ThemeToggle],
  template: `
    <div class="min-h-screen bg-background text-on-background flex flex-col">
      <header class="flex items-center justify-between px-margin-mobile md:px-margin-desktop py-margin-mobile md:py-4">
        <a routerLink="/join" title="Back to home"
          class="flex items-center gap-2 hover:opacity-80 active:scale-95 transition-all">
          <img src="logo.png" alt="" class="w-9 h-9 rounded-lg object-contain" />
          <span class="text-headline-md font-extrabold brand-gradient hidden sm:inline">DrawWithMe</span>
        </a>
        <app-theme-toggle />
      </header>

      <main class="flex-grow w-full max-w-xl mx-auto px-margin-mobile md:px-0 py-8 md:py-12 flex flex-col items-center text-center">
        <img
          src="author.jpeg"
          alt="Author"
          class="w-32 h-32 rounded-full object-cover ring-4 ring-secondary/30 shadow-lg mb-6" />

        <h1 class="text-display-lg font-extrabold mb-1">Phu Tran</h1>
        <p class="text-label-md text-secondary font-bold uppercase tracking-wider mb-6">
          Creator of DrawWithMe
        </p>

        <p class="text-body-lg text-on-surface-variant max-w-md mb-8">
          Hi! I'm a software engineer who loves building playful, real-time
          experiences. DrawWithMe started as a way to sketch and goof around with
          the people I care about — no accounts, no fuss, just a shared canvas.
          Thanks for trying it out. 💛
        </p>

        <div class="flex items-center gap-4">
          @for (s of socials; track s.label) {
            <a
              [href]="s.url"
              target="_blank"
              rel="noopener noreferrer"
              [title]="s.label"
              [attr.aria-label]="s.label"
              class="w-12 h-12 flex items-center justify-center rounded-full glass-panel border border-outline-variant/40 text-on-surface hover:bg-secondary hover:text-on-secondary hover:scale-110 active:scale-95 transition-all">
              <span class="text-label-lg font-extrabold">{{ s.icon }}</span>
            </a>
          }
        </div>

        <div class="mt-12">
          <a routerLink="/join"
            class="brand-bg inline-flex items-center gap-1 px-5 py-3 rounded-lg font-label-md hover:brightness-105 active:scale-95 transition-all shadow-sm">
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to home
          </a>
        </div>
      </main>
    </div>
  `,
})
export class AboutPage {
  // TODO: replace these with your real profile URLs.
  protected readonly socials: Social[] = [
    { label: 'LinkedIn', icon: 'in', url: 'https://www.linkedin.com/' },
    { label: 'GitHub', icon: 'GH', url: 'https://github.com/' },
    { label: 'Instagram', icon: 'IG', url: 'https://www.instagram.com/' },
  ];
}

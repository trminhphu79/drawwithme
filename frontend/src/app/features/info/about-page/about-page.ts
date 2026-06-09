import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Social {
  label: string;
  /** Brand glyph as an SVG path (24×24 viewBox, from simple-icons). */
  path: string;
  url: string;
}

/** About-the-author page: short bio, avatar and social links. */
@Component({
  selector: 'app-about-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-background text-on-background flex flex-col">
      <header
        class="flex items-center justify-between px-margin-mobile md:px-margin-desktop py-margin-mobile md:py-4"
      >
        <a
          routerLink="/join"
          title="Back to home"
          class="flex items-center gap-2 hover:opacity-80 active:scale-95 transition-all"
        >
          <img src="logo.png" alt="" class="w-9 h-9 rounded-lg object-contain" />
          <span class="text-headline-md font-extrabold brand-gradient hidden sm:inline"
            >DrawWithMe</span
          >
        </a>
      </header>

      <main
        class="flex-grow w-full max-w-xl mx-auto px-margin-mobile md:px-0 py-8 md:py-12 flex flex-col items-center text-center"
      >
        <img
          src="author.jpeg"
          alt="Author"
          class="w-32 h-32 rounded-full object-cover ring-4 ring-secondary/30 shadow-lg mb-6"
        />

        <h1 class="text-display-lg font-extrabold mb-1">Phu Tran</h1>
        <p class="text-label-md text-secondary font-bold uppercase tracking-wider mb-6">
          Creator of DrawWithMe
        </p>

        <p class="text-body-lg text-on-surface-variant max-w-md mb-8">
          Hi! I'm a software engineer who loves creating spaces for people to connect.
          <br />
          DrawWithMe is a small canvas for shared sketches, wandering ideas, and the simple joy of
          making something together.
          <br />
          Thanks for being part of it. 💛
        </p>

        <div class="flex items-center gap-4">
          @for (s of socials; track s.label) {
            <a
              [href]="s.url"
              target="_blank"
              rel="noopener noreferrer"
              [title]="s.label"
              [attr.aria-label]="s.label"
              class="w-12 h-12 flex items-center justify-center rounded-full glass-panel border border-outline-variant/40 text-on-surface-variant hover:text-secondary hover:border-secondary/60 hover:scale-110 active:scale-95 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5" aria-hidden="true">
                <path [attr.d]="s.path" />
              </svg>
            </a>
          }
        </div>

        <div class="mt-12">
          <a
            routerLink="/join"
            class="brand-bg inline-flex items-center gap-1 px-5 py-3 rounded-lg font-label-md hover:brightness-105 active:scale-95 transition-all shadow-sm"
          >
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to home
          </a>
        </div>
      </main>
    </div>
  `,
})
export class AboutPage {
  protected readonly socials: Social[] = [
    {
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/tmp-dev79/',
      path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z',
    },
    {
      label: 'GitHub',
      url: 'https://github.com/trminhphu79/',
      path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
    },
    {
      label: 'Instagram',
      url: 'https://www.instagram.com/tm.phu/',
      path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
    },
  ];
}

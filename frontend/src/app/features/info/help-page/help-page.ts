import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggle } from '../../../core/ui/theme-toggle';

interface HelpItem {
  icon: string;
  title: string;
  body: string;
}

/** Static Help / how-it-works page. */
@Component({
  selector: 'app-help-page',
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

      <main class="flex-grow w-full max-w-2xl mx-auto px-margin-mobile md:px-0 py-8 md:py-12">
        <h1 class="text-display-lg font-extrabold mb-3">Help</h1>
        <p class="text-body-lg text-on-surface-variant mb-10">
          DrawWithMe is a real-time canvas you share with friends. Here's the gist.
        </p>

        <div class="space-y-5">
          @for (item of items; track item.title) {
            <div class="glass-panel rounded-xl p-5 flex gap-4 items-start">
              <span class="material-symbols-outlined text-secondary text-[26px] shrink-0" style="font-variation-settings:'FILL' 1;">{{ item.icon }}</span>
              <div>
                <h2 class="text-label-lg font-bold text-on-surface mb-1">{{ item.title }}</h2>
                <p class="text-body-md text-on-surface-variant">{{ item.body }}</p>
              </div>
            </div>
          }
        </div>

        <div class="mt-10">
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
export class HelpPage {
  protected readonly items: HelpItem[] = [
    {
      icon: 'group_add',
      title: 'Create or join a room',
      body: 'Create a new room and share the link or code, or enter a code to join an existing one. Pick an avatar and a name when you arrive.',
    },
    {
      icon: 'draw',
      title: 'Draw together, live',
      body: 'Everyone draws on the same canvas in real time. Use the tool rail to switch between pencil, fill, eraser and pan, change colors and pencil styles.',
    },
    {
      icon: 'image',
      title: 'Reference & properties',
      body: 'Open Properties (the sliders icon) to set stroke weight, opacity, upload a shared reference image, or clear the canvas.',
    },
    {
      icon: 'chat',
      title: 'Chat & react',
      body: 'Tap the chat bubble to message the room, and send emoji reactions that float across the canvas for everyone.',
    },
    {
      icon: 'check_circle',
      title: 'Finish & share',
      body: 'When you are done, hit Finish to seal the artwork. Everyone is taken to the result page where you can replay how it was drawn, download it, or share a link.',
    },
  ];
}

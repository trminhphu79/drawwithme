import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Reusable skeleton placeholder. Size/shape come from the consumer's classes,
 * e.g. <app-skeleton class="h-8 w-48 rounded-lg" />. The host supplies the
 * shimmer + base tint.
 */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: { class: 'block animate-pulse bg-on-surface/10 dark:bg-white/10', 'aria-hidden': 'true' },
})
export class Skeleton {}

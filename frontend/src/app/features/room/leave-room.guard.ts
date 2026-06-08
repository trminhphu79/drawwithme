import { CanDeactivateFn } from '@angular/router';

/** A component that can veto navigating away (e.g. show a "leave?" prompt). */
export interface LeaveGuarded {
  canDeactivate(): boolean | Promise<boolean>;
}

/**
 * Runs on any navigation away from the drawing room — router links, the logo,
 * AND the browser/mobile Back gesture (Angular routes popstate through guards
 * and restores the URL if the guard rejects). The component decides whether to
 * prompt the user.
 */
export const leaveRoomGuard: CanDeactivateFn<LeaveGuarded> = (component) =>
  component?.canDeactivate ? component.canDeactivate() : true;

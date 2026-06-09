import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';

/** Block admin routes unless a token is present; otherwise send to login. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/admin/login']);
};

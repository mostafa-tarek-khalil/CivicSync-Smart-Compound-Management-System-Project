import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Reads the `roles` requirement declared on a route.
 *
 * Angular merges `data` down the route tree, so a parent `/resident` route
 * declaring `data: { roles: ['RESIDENT'] }` also protects every child.
 */
export function requiredRoles(
  route: ActivatedRouteSnapshot
): string[] {
  const roles = route.data['roles'];

  return Array.isArray(roles) ? roles : [];
}

/**
 * Authentication guard — the single gate for every protected route.
 *
 * Rules:
 *  1. No token / no hydrated user  -> back to /login (with returnUrl).
 *  2. Account not ACTIVE           -> session cleared, back to /login.
 *  3. Role not in the route's      -> /access-denied (never silently dumped
 *     `roles` list                    on some other dashboard).
 *
 * `roleGuard` exists as a standalone, explicit alias so routes can be written
 * as `canActivate: [authGuard, roleGuard]`; both share this implementation so
 * there is exactly one authorisation rule in the app.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getUser();

  if (!authService.getToken() || !user) {
    authService.logout();

    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  if (user.status !== 'ACTIVE') {
    authService.logout();

    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url, reason: 'inactive' }
    });
  }

  const allowedRoles = requiredRoles(route);

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return router.createUrlTree(['/access-denied'], {
      queryParams: { from: state.url }
    });
  }

  return true;
};

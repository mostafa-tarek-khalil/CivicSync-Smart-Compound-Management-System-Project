import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import { AuthService } from '../Services/auth-service';

export const authGuard: CanActivateFn = (route, state) => {

  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();

  if (!token) {
    return router.createUrlTree(['/login'], {
      queryParams: {
        returnUrl: state.url
      }
    });
  }

  const user = authService.getUser();

  if (!user) {
    authService.logout();

    return router.createUrlTree(['/login'], {
      queryParams: {
        returnUrl: state.url
      }
    });
  }

  const allowedRoles = route.data['roles'] as string[] | undefined;

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return router.createUrlTree(['/']);
  }

  return true;
};
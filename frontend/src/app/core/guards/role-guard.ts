import { CanActivateFn } from '@angular/router';

import { authGuard } from './auth-guard';

/**
 * Explicit role-based guard.
 *
 * Routes declare the roles they accept:
 *
 *   { path: 'admin', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN'] } }
 *
 * The role comparison lives in `authGuard` (single implementation); this
 * export exists so a route can state its intent — "this is a role-protected
 * boundary" — without duplicating the logic.
 */
export const roleGuard: CanActivateFn = (route, state) => authGuard(route, state);

import { HttpInterceptorFn } from '@angular/common/http';
import { readToken } from '../services/token-storage';

/**
 * Attaches the JWT to every outgoing request.
 *
 * The token is read through `token-storage`, the single module that owns the
 * credential keys. The interceptor deliberately does NOT inject AuthService —
 * that would create an HttpClient -> interceptor -> AuthService -> HttpClient
 * dependency cycle.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = readToken();

  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authReq);
};

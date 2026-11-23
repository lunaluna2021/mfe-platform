import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { HOST_ROUTES } from '../../app.constants';
import { AuthService } from './auth.service';

/** 未登入或登入已過期時導向登入頁，並記住原本要去的網址 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated(Date.now())) {
    return true;
  }

  auth.logout();
  return router.createUrlTree(['/', HOST_ROUTES.login], {
    queryParams: { returnUrl: state.url },
  });
};

/** 只接受站內路徑，避免 returnUrl 被利用來跳到外部網站 */
export function isSafeReturnUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  );
}

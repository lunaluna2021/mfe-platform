import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { HOST_ROUTES } from '../const/app.const';
import { AuthService } from '../services/auth.service';

/**
 * 未登入時導向登入頁，並記住原本要去的網址。
 * 第一次進入時要等登入狀態還原完成（可能已在模組的獨立頁登入過）。
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  // inject 必須在第一個 await 之前呼叫
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.initialize();
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/', HOST_ROUTES.LOGIN], {
    queryParams: { returnUrl: state.url },
  });
};

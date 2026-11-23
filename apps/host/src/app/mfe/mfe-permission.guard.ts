import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { hasPermission } from '@mfe-platform/shared-permission';
import { HOST_ROUTES } from '../app.constants';
import { AuthService } from '../core/auth/auth.service';
import { MfeManifestService } from './mfe-manifest.service';

/**
 * 進入 MFE 路由前檢查：模組是否存在、使用者是否有 requiredPermission。
 * 沒有權限時連 JS 都不會載入。這只是使用體驗上的阻擋，真正的授權仍在後端。
 */
export const mfePermissionGuard: CanActivateFn = async (route) => {
  // inject 必須在第一個 await 之前呼叫
  const manifest = inject(MfeManifestService);
  const auth = inject(AuthService);
  const router = inject(Router);

  try {
    await manifest.load();
  } catch {
    // manifest 讀取失敗時回首頁，由外框顯示錯誤與重試按鈕
    return router.createUrlTree(['/']);
  }

  const entry = manifest.findByRoute(route.paramMap.get('mfeRoute') ?? '');
  if (!entry) {
    return router.createUrlTree(['/', HOST_ROUTES.notFound]);
  }
  if (!hasPermission(auth.permissions(), entry.requiredPermission)) {
    return router.createUrlTree(['/', HOST_ROUTES.forbidden]);
  }
  return true;
};

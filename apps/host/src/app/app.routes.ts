import type { Route } from '@angular/router';
import { APP_TITLE, HOST_ROUTES } from './core/const/app.const';
import { authGuard } from './core/guards/auth.guard';
import { mfePermissionGuard } from './core/guards/mfe-permission.guard';
import { HomePage } from './features/home/home-page';
import { LoginPage } from './features/login/login-page';
import { MfeOutlet } from './features/mfe-outlet/mfe-outlet';
import { Shell } from './features/shell/shell';
import { ForbiddenPage, NotFoundPage } from './features/status/status-pages';

/**
 * Host 的路由只有固定的幾頁，加上一個 `:mfeRoute` 動態路由。
 * 新增 MFE 只要改 manifest.json，不必改這裡，也不必重新建置 Host。
 */
export const appRoutes: Route[] = [
  {
    path: HOST_ROUTES.LOGIN,
    component: LoginPage,
    title: `登入｜${APP_TITLE}`,
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', component: HomePage, title: `首頁｜${APP_TITLE}` },
      {
        path: HOST_ROUTES.FORBIDDEN,
        component: ForbiddenPage,
        title: `沒有權限｜${APP_TITLE}`,
      },
      {
        path: HOST_ROUTES.NOT_FOUND,
        component: NotFoundPage,
        title: `找不到頁面｜${APP_TITLE}`,
      },
      // 固定路由要放在動態路由前面，否則會被 :mfeRoute 吃掉
      {
        path: ':mfeRoute',
        component: MfeOutlet,
        canActivate: [mfePermissionGuard],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

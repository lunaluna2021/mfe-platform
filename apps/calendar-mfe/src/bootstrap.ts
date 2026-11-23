import { bootstrapMfeElement } from '@mfe-platform/shared-mfe-element';
import type { UnhandledRequestCallback } from 'msw';
import { appProviders } from './app/app.config';
import { TAG_NAME } from './app/core/const/app.const';
import { CalendarApp } from './app/calendar-app';
import { environment } from './environments/environment';

/** 專案 API 的路徑開頭，用來判斷沒有 handler 的請求是不是專案 API */
const urlPreWordList = ['/api/'];

/**
 * MSW 找不到對應 handler 時呼叫。請求一律照常送出（PASSTHROUGH 到後端），
 * 只有專案 API 才在主控台提醒，表示 mocks/handlers.ts 還沒寫這支 API；
 * 靜態檔、runtime-config 等其他請求直接放行，不提醒。
 */
const onUnhandledRequest: UnhandledRequestCallback = (request, print) => {
  const { pathname } = new URL(request.url);
  if (urlPreWordList.some((preWord) => pathname.startsWith(preWord))) {
    print.warning();
  }
};

/**
 * 啟動這個 MFE：模擬模式先啟動 MSW，再註冊 Custom Element（啟動 Angular）。
 *
 * 模擬模式的條件：environment.isMock && environment.envName === 'SIT'，
 * 而且是獨立執行頁。被 Host 載入時不啟動，因為 Service Worker 只能控制
 * 自己目錄底下的頁面，管不到 Host 的頁面。
 */
export async function bootstrap(): Promise<void> {
  if (
    environment.isMock &&
    environment.envName === 'SIT' &&
    isStandalonePage()
  ) {
    await startMockWorker();
  }
  await bootstrapMfeElement({
    tagName: TAG_NAME,
    component: CalendarApp,
    providers: appProviders,
  });
}

/** @returns 是否為獨立執行頁（index.html 放了帶 is-standalone 屬性的元素） */
function isStandalonePage(): boolean {
  return document.querySelector(`${TAG_NAME}[is-standalone]`) !== null;
}

/** 載入 mocks/browser.ts 並啟動 worker；失敗時照常啟動畫面，請求直接送到後端 */
async function startMockWorker(): Promise<void> {
  try {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      // mockServiceWorker.js 與 main.js 在同一個目錄（建置設定的 assets 從 msw 套件複製）
      serviceWorker: {
        url: new URL('mockServiceWorker.js', document.baseURI).href,
      },
      onUnhandledRequest,
    });
  } catch (error) {
    console.error('[MSW] 模擬 API 啟動失敗，改為呼叫後端', error);
  }
}

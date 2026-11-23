import type { EnvironmentProviders, Provider, Type } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { createApplication } from '@angular/platform-browser';

export interface MfeElementOptions {
  /** 要註冊的 Custom Element 名稱，必須與 manifest 的 tagName 一致 */
  readonly tagName: string;
  /** 根元件；它的 input 會成為元素的 property */
  readonly component: Type<unknown>;
  readonly providers?: ReadonlyArray<Provider | EnvironmentProviders>;
}

/**
 * 把 Angular 元件註冊成 Custom Element，供每個 MFE 的 main.ts 使用。
 *
 * - Angular 22 預設為 zoneless，MFE 不載入 zone.js，
 *   也就不會和 Host 或其他 MFE 搶同一個全域 Zone。
 * - 每個 MFE 有自己的 Angular 應用程式與 injector，彼此不共用服務。
 * - customElements 的登錄無法取消或覆蓋。Host 重試時可能讓同一支 JS 執行兩次，
 *   所以建立應用程式的前後都先檢查名稱是否已被註冊。
 *
 * @returns 是否由這次呼叫完成註冊
 */
export async function bootstrapMfeElement(
  options: MfeElementOptions,
): Promise<boolean> {
  const { tagName, component, providers = [] } = options;

  if (customElements.get(tagName)) {
    return false;
  }

  try {
    const application = await createApplication({ providers: [...providers] });

    if (customElements.get(tagName)) {
      // 等待期間已有另一份相同的 bundle 完成註冊，放棄這次建立的應用程式
      application.destroy();
      return false;
    }

    customElements.define(
      tagName,
      createCustomElement(component, { injector: application.injector }),
    );
    return true;
  } catch (error) {
    // 元素不會被註冊；Host 端等待註冊會逾時，並顯示載入失敗
    console.error(`[${tagName}] MFE 啟動失敗`, error);
    return false;
  }
}

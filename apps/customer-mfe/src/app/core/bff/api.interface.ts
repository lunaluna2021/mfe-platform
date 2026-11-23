/**
 * 客戶 API 的 request／response，欄位與後端 JSON 相同（全大寫）。
 * 畫面使用的型別在 interfaces/，兩者由 utils/app.util.ts 轉換。
 */

/** GET api/customers、POST、PUT 的回應 */
export interface CustomerRes {
  readonly ID: string;
  readonly NAME: string;
  readonly INDUSTRY: string;
  readonly CONTACT: string;
  readonly PHONE: string;
  readonly LEVEL: string;
  readonly CREATED_AT: string;
}

/** POST api/customers、PUT api/customers/{id} 的 request */
export interface CustomerReq {
  readonly NAME: string;
  readonly INDUSTRY: string;
  readonly CONTACT: string;
  readonly PHONE: string;
  readonly LEVEL: string;
}

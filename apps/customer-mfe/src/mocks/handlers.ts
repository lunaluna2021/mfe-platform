import { mockErrorRes } from '@mfe-platform/shared-mocks';
import { http, HttpResponse } from 'msw';
import type { CustomerReq, CustomerRes } from '../app/core/bff/api.interface';
import mock from './mock.json';

/** 記憶體中的客戶資料：新增、修改、刪除只影響目前的頁面，重新整理後恢復成 mock.json */
const customers: CustomerRes[] = structuredClone(mock.CUSTOMERS);

/**
 * 客戶 API 的 MSW handlers。路徑與錯誤代碼都和後端相同；
 * `*` 開頭表示不限後端網址（interceptor 會把 api/customers 接上 runtime-config 的網址）。
 */
export const handlers = [
  http.get('*/api/customers', () => HttpResponse.json(customers)),

  http.post<never, CustomerReq>('*/api/customers', async ({ request }) => {
    const body = await request.json();
    if (isDuplicateName(body.NAME, null)) {
      return duplicateName();
    }
    const customer: CustomerRes = {
      ID: crypto.randomUUID(),
      ...toFields(body),
      CREATED_AT: new Date().toISOString(),
    };
    customers.push(customer);
    return HttpResponse.json(customer, { status: 201 });
  }),

  http.put<{ id: string }, CustomerReq>(
    '*/api/customers/:id',
    async ({ params, request }) => {
      const index = customers.findIndex(
        (customer) => customer.ID === params.id,
      );
      if (index < 0) {
        return notFound();
      }
      const body = await request.json();
      if (isDuplicateName(body.NAME, params.id)) {
        return duplicateName();
      }
      customers[index] = { ...customers[index], ...toFields(body) };
      return HttpResponse.json(customers[index]);
    },
  ),

  http.delete<{ id: string }>('*/api/customers/:id', ({ params }) => {
    const index = customers.findIndex((customer) => customer.ID === params.id);
    if (index < 0) {
      return notFound();
    }
    customers.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

/**
 * @param body 請求內容
 * @returns 可修改的欄位；產業空白時與後端一樣存成「未分類」
 */
function toFields(body: CustomerReq): Omit<CustomerRes, 'ID' | 'CREATED_AT'> {
  return {
    NAME: body.NAME,
    INDUSTRY: body.INDUSTRY || '未分類',
    CONTACT: body.CONTACT,
    PHONE: body.PHONE,
    LEVEL: body.LEVEL,
  };
}

/**
 * @param name 公司名稱
 * @param exceptId 修改時排除自己
 * @returns 是否已有其他客戶使用這個名稱
 */
function isDuplicateName(name: string, exceptId: string | null): boolean {
  return customers.some(
    (customer) => customer.NAME === name && customer.ID !== exceptId,
  );
}

function duplicateName() {
  return mockErrorRes(409, 'DUPLICATE_CUSTOMER_NAME', '已有相同名稱的客戶');
}

function notFound() {
  return mockErrorRes(
    404,
    'CUSTOMER_NOT_FOUND',
    '找不到這位客戶，可能已被刪除',
  );
}

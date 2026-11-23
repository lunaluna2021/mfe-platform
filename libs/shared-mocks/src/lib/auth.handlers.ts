import type {
  LoginReq,
  RefreshTokenReq,
  TokenRes,
  UserRes,
} from '@mfe-platform/shared-auth';
import { http, HttpResponse } from 'msw';
import { mockErrorRes } from './error-res';
import mock from './mock.json';

/** access token 的有效秒數，與後端相同（15 分鐘） */
const ACCESS_TOKEN_TTL_SECONDS = 900;

/** 模擬帳號；登入只比對 Email，不檢查密碼內容 */
const users = mock.USERS as UserRes[];

/**
 * 模擬登入相關 API 的 MSW handlers，各 MFE 的 mocks/browser.ts 一併註冊。
 *
 * 路徑以 `*` 開頭，不論 runtime-config 的後端網址是哪一個（本機或 Render）都能攔截，
 * 模擬模式下完全不需要啟動後端。token 只是可辨識使用者的字串，前端不會驗證簽章。
 */
export const authHandlers = [
  http.post<never, LoginReq>('*/api/auth/login', async ({ request }) => {
    const body = await request.json();
    const user = users.find(
      (item) => item.EMAIL === body.EMAIL?.trim().toLowerCase(),
    );
    if (!user || !body.PASSWORD) {
      return mockErrorRes(401, 'INVALID_CREDENTIALS', 'Email 或密碼錯誤');
    }
    return HttpResponse.json(issueTokens(user));
  }),

  http.post<never, RefreshTokenReq>(
    '*/api/auth/refresh',
    async ({ request }) => {
      const body = await request.json();
      const user = findUserByToken(body.REFRESH_TOKEN, 'refresh');
      return user
        ? HttpResponse.json(issueTokens(user))
        : mockErrorRes(401, 'INVALID_REFRESH_TOKEN', '登入已過期，請重新登入');
    },
  ),

  http.post('*/api/auth/logout', () => new HttpResponse(null, { status: 204 })),

  http.get('*/api/auth/me', ({ request }) => {
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
    const user = findUserByToken(token, 'access');
    return user
      ? HttpResponse.json(user)
      : mockErrorRes(401, 'UNAUTHORIZED', '帳號已停用或不存在，請重新登入');
  }),
];

/**
 * @param user 登入者
 * @returns 新的一組模擬 token
 */
function issueTokens(user: UserRes): TokenRes {
  return {
    ACCESS_TOKEN: `mock-access.${user.ID}.${crypto.randomUUID()}`,
    REFRESH_TOKEN: `mock-refresh.${user.ID}.${crypto.randomUUID()}`,
    EXPIRES_IN: ACCESS_TOKEN_TTL_SECONDS,
    USER: user,
  };
}

/**
 * @param token 模擬 token，格式 `mock-<kind>.<使用者 ID>.<亂數>`
 * @param kind token 種類
 * @returns 對應的使用者；格式不符或找不到時為 undefined
 */
function findUserByToken(
  token: string | null | undefined,
  kind: 'access' | 'refresh',
): UserRes | undefined {
  const [prefix, userId] = token?.split('.') ?? [];
  return prefix === `mock-${kind}`
    ? users.find((user) => user.ID === userId)
    : undefined;
}

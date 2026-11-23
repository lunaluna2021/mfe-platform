/**
 * 只接受站內路徑，避免登入後的 returnUrl 被利用來跳到外部網站。
 *
 * @param value 網址參數中的 returnUrl
 * @returns 是否為安全的站內路徑
 */
export function isSafeReturnUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  );
}

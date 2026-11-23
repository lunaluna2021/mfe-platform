import { isPermission, type Permission } from './identity';

/** manifest.json 本身的格式版本，與 Host／MFE 的契約版本分開管理 */
export const MFE_MANIFEST_SCHEMA_VERSION = 1;

/** manifest 中的一個微前端 */
export interface MfeManifestEntry {
  /** 唯一識別，也用於事件的 source */
  readonly name: string;
  readonly title: string;
  readonly description?: string;
  /** Host 路由，例如 `customers` 對應 `/customers` */
  readonly route: string;
  /** MFE 註冊的 Custom Element 名稱；必須與 MFE 程式中的設定一致 */
  readonly tagName: string;
  /** 入口 JS，相對於 manifest.json 所在位置 */
  readonly entry: string;
  /** MFE 版本；Host 會加在入口網址上，版本改變時瀏覽器才會重新下載 */
  readonly version: string;
  /** MFE 實作的契約版本，見 MFE_CONTRACT_VERSION */
  readonly contractVersion: number;
  /** 顯示選單與進入路由所需的權限 */
  readonly requiredPermission: Permission;
  /** 單次載入（下載加上註冊）的逾時毫秒數 */
  readonly loadTimeoutMs?: number;
  /** 第一次失敗後最多再試幾次 */
  readonly maxRetries?: number;
}

export interface MfeManifest {
  readonly schemaVersion: number;
  readonly mfes: readonly MfeManifestEntry[];
}

export interface MfeManifestParseResult {
  /** 通過檢查的項目 */
  readonly entries: readonly MfeManifestEntry[];
  /** 被略過的項目與原因；不影響其他項目 */
  readonly issues: readonly string[];
}

/** manifest 整體格式錯誤，無法取得任何項目 */
export class MfeManifestError extends Error {
  override readonly name = 'MfeManifestError';
}

const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;
/** Custom Element 名稱：小寫開頭且至少含一個連字號（簡化版規則） */
const CUSTOM_ELEMENT_NAME_PATTERN = /^[a-z][a-z0-9._]*-[a-z0-9._-]*$/;
const MAX_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 5;

/**
 * 檢查從網路取得的 manifest。manifest 決定要執行哪些 JS，屬於信任邊界，
 * 不能直接把 JSON 斷言成型別使用。
 *
 * - 整體結構錯誤（不是物件、版本不符、沒有 mfes 陣列）：拋出 MfeManifestError。
 * - 單一項目錯誤或與其他項目重複：略過該項並記在 issues，其餘項目照常使用。
 */
export function parseMfeManifest(value: unknown): MfeManifestParseResult {
  if (!isRecord(value)) {
    throw new MfeManifestError('manifest 必須是 JSON 物件');
  }
  if (value['schemaVersion'] !== MFE_MANIFEST_SCHEMA_VERSION) {
    throw new MfeManifestError(
      `不支援的 manifest schemaVersion：${String(value['schemaVersion'])}（需要 ${MFE_MANIFEST_SCHEMA_VERSION}）`,
    );
  }
  const list = value['mfes'];
  if (!Array.isArray(list)) {
    throw new MfeManifestError('manifest 缺少 mfes 陣列');
  }

  const entries: MfeManifestEntry[] = [];
  const issues: string[] = [];
  const usedNames = new Set<string>();
  const usedRoutes = new Set<string>();
  const usedTags = new Set<string>();

  list.forEach((raw, index) => {
    const errors: string[] = [];
    const entry = parseEntry(raw, errors);
    if (!entry) {
      issues.push(`mfes[${index}] 已略過：${errors.join('；')}`);
      return;
    }
    const duplicate = usedNames.has(entry.name)
      ? `name「${entry.name}」重複`
      : usedRoutes.has(entry.route)
        ? `route「${entry.route}」重複`
        : usedTags.has(entry.tagName)
          ? `tagName「${entry.tagName}」重複`
          : null;
    if (duplicate) {
      issues.push(`mfes[${index}] 已略過：${duplicate}`);
      return;
    }
    usedNames.add(entry.name);
    usedRoutes.add(entry.route);
    usedTags.add(entry.tagName);
    entries.push(entry);
  });

  return { entries, issues };
}

function parseEntry(raw: unknown, errors: string[]): MfeManifestEntry | null {
  if (!isRecord(raw)) {
    errors.push('必須是物件');
    return null;
  }

  const name = readString(raw, 'name', errors, SLUG_PATTERN);
  const title = readString(raw, 'title', errors);
  const route = readString(raw, 'route', errors, SLUG_PATTERN);
  const tagName = readString(
    raw,
    'tagName',
    errors,
    CUSTOM_ELEMENT_NAME_PATTERN,
  );
  const entry = readString(raw, 'entry', errors);
  const version = readString(raw, 'version', errors);
  const contractVersion = readInteger(raw, 'contractVersion', errors, 1);

  const requiredPermission = raw['requiredPermission'];
  if (!isPermission(requiredPermission)) {
    errors.push(
      `requiredPermission 不是有效的權限：${String(requiredPermission)}`,
    );
  }

  const description = raw['description'];
  if (description !== undefined && typeof description !== 'string') {
    errors.push('description 必須是字串');
  }

  const loadTimeoutMs = readOptionalInteger(
    raw,
    'loadTimeoutMs',
    errors,
    1,
    MAX_TIMEOUT_MS,
  );
  const maxRetries = readOptionalInteger(
    raw,
    'maxRetries',
    errors,
    0,
    MAX_RETRIES,
  );

  if (
    errors.length > 0 ||
    name === null ||
    title === null ||
    route === null ||
    tagName === null ||
    entry === null ||
    version === null ||
    contractVersion === null ||
    !isPermission(requiredPermission)
  ) {
    return null;
  }

  return {
    name,
    title,
    route,
    tagName,
    entry,
    version,
    contractVersion,
    requiredPermission,
    ...(typeof description === 'string' ? { description } : {}),
    ...(loadTimeoutMs !== undefined ? { loadTimeoutMs } : {}),
    ...(maxRetries !== undefined ? { maxRetries } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown>,
  key: string,
  errors: string[],
  pattern?: RegExp,
): string | null {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${key} 必須是非空字串`);
    return null;
  }
  if (pattern && !pattern.test(value)) {
    errors.push(`${key} 格式不符：${value}`);
    return null;
  }
  return value;
}

function readInteger(
  record: Record<string, unknown>,
  key: string,
  errors: string[],
  min: number,
): number | null {
  const value = record[key];
  if (!Number.isInteger(value) || (value as number) < min) {
    errors.push(`${key} 必須是大於等於 ${min} 的整數`);
    return null;
  }
  return value as number;
}

function readOptionalInteger(
  record: Record<string, unknown>,
  key: string,
  errors: string[],
  min: number,
  max: number,
): number | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (
    !Number.isInteger(value) ||
    (value as number) < min ||
    (value as number) > max
  ) {
    errors.push(`${key} 必須是 ${min} 到 ${max} 之間的整數`);
    return undefined;
  }
  return value as number;
}

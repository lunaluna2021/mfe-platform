// 帳號管理指令：以 local profile（apps/api/config/application-local.yml）連線資料庫後執行，完成即結束。
//
//   npm run api:admin -- list-users
//   npm run api:admin -- create-user --email a@example.com --password ... --display-name 王小明 --role sales
//   npm run api:admin -- reset-password --email a@example.com --password ...
//   npm run api:admin -- set-role --email a@example.com --role manager
//   npm run api:admin -- disable --email a@example.com
//   npm run api:admin -- enable --email a@example.com
//
// 需要先建置：npx nx build api
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const apiDir = resolve(import.meta.dirname, '../apps/api');
const jar = resolve(apiDir, 'target/api.jar');
if (!existsSync(jar)) {
  console.error('找不到 apps/api/target/api.jar，請先執行：npx nx build api');
  process.exit(1);
}

const [command, ...rest] = process.argv.slice(2);
if (!command) {
  console.error(
    '請指定指令：list-users、create-user、reset-password、set-role、disable、enable',
  );
  process.exit(1);
}

// --display-name x → 環境變數 ADMIN_DISPLAY_NAME=x（Spring 讀成 admin.display-name）。
// 不放在命令列：Windows 的 Java 以系統字碼頁解析命令列，中文可能變成亂碼；
// 密碼也不會出現在處理程序清單中。
const adminEnv = {};
for (let index = 0; index < rest.length; index += 2) {
  const key = rest[index];
  const value = rest[index + 1];
  if (!key?.startsWith('--') || value === undefined) {
    console.error(`參數格式不正確：${key ?? ''}`);
    process.exit(1);
  }
  adminEnv[`ADMIN_${key.slice(2).toUpperCase().replaceAll('-', '_')}`] = value;
}

const result = spawnSync(
  'java',
  [
    '-jar',
    jar,
    '--spring.profiles.active=local',
    '--spring.main.web-application-type=none',
    '--spring.main.banner-mode=off',
    '--logging.level.root=WARN',
    `--admin.command=${command}`,
  ],
  { cwd: apiDir, stdio: 'inherit', env: { ...process.env, ...adminEnv } },
);
process.exit(result.status ?? 1);

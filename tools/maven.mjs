// 在指定目錄執行 Maven Wrapper，Windows 用 mvnw.cmd，其他系統用 ./mvnw。
// 用法：node tools/maven.mjs <專案目錄> <maven 參數...>
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const [projectDir, ...args] = process.argv.slice(2);
if (!projectDir) {
  console.error('用法：node tools/maven.mjs <專案目錄> <maven 參數...>');
  process.exit(1);
}

const isWindows = process.platform === 'win32';
// 明確寫出目前目錄：部分 Windows 環境設定了 NoDefaultCurrentDirectoryInExePath，不會在目前目錄找執行檔
const command = isWindows ? String.raw`.\mvnw.cmd` : './mvnw';
const result = spawnSync(command, args, {
  cwd: resolve(projectDir),
  stdio: 'inherit',
  // Windows 執行 .cmd 需要透過 shell
  shell: isWindows,
});
process.exit(result.status ?? 1);

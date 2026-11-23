// 把 Host 與各 MFE 的建置結果組成一個可直接部署的靜態網站：dist/site
//
//   dist/site/
//   ├── index.html、main-*.js …   ← Host（含 manifest.json）
//   ├── 404.html                  ← 複製 index.html，讓 GitHub Pages 的深層網址也能開啟 SPA
//   └── mfe/<name>/main.js        ← 各 MFE
//
// 需先執行 npm run build（或在 CI 分別建置），這支腳本只搬檔，不建置。
import {
  cpSync,
  copyFileSync,
  existsSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const hostDir = join(root, 'dist/apps/host/browser');
const mfeDir = join(root, 'dist/mfe');
const siteDir = join(root, 'dist/site');

for (const required of [hostDir, mfeDir]) {
  if (!existsSync(required)) {
    console.error(`找不到建置結果：${required}，請先建置 Host 與 MFE`);
    process.exit(1);
  }
}

rmSync(siteDir, { recursive: true, force: true });
cpSync(hostDir, siteDir, { recursive: true });
cpSync(mfeDir, join(siteDir, 'mfe'), { recursive: true });
copyFileSync(join(siteDir, 'index.html'), join(siteDir, '404.html'));

// 提醒 manifest 指向但不存在的入口（故障示範項目會出現在這裡）
const manifest = JSON.parse(
  readFileSync(join(siteDir, 'manifest.json'), 'utf8'),
);
for (const entry of manifest.mfes ?? []) {
  if (!existsSync(join(siteDir, entry.entry))) {
    console.warn(`注意：${entry.name} 的入口 ${entry.entry} 不存在`);
  }
}

console.log(`網站已輸出到 ${siteDir}`);

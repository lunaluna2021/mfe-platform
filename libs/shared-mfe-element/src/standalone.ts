// 第二入口：只給模組在 @defer 區塊中動態載入。
// 獨立執行用的登入流程（登入外框與 PlatformAuth）放在這裡，不和 bootstrapMfeElement 同一個入口，
// 模組被 Host 載入時才不會把它們打包進主程式。
export * from './lib/mfe-standalone-session';

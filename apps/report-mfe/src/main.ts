import { bootstrapMfeElement } from '@mfe-platform/shared-mfe-element';
import { ReportApp } from './app/report-app';

// 標籤名稱必須與 manifest.json 的 tagName 相同，否則 Host 會等到逾時
void bootstrapMfeElement({ tagName: 'mfe-report', component: ReportApp });

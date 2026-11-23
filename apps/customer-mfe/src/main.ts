import { bootstrapMfeElement } from '@mfe-platform/shared-mfe-element';
import { CustomerApp } from './app/customer-app';

// 標籤名稱必須與 manifest.json 的 tagName 相同，否則 Host 會等到逾時
void bootstrapMfeElement({ tagName: 'mfe-customer', component: CustomerApp });

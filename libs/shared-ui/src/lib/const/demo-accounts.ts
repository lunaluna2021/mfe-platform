/** 使用者指定公開的四組練習帳號；僅用於登入頁填入，仍由 API 驗證帳密與權限。 */
export const DEMO_ACCOUNTS = [
  {
    label: '系統管理員',
    email: 'admin@example.com',
    password: 'UYyWZhADfkhNAnF5',
  },
  {
    label: '業務主管',
    email: 'manager@example.com',
    password: 'jFaz7oFcswwYaBjR',
  },
  {
    label: '業務人員',
    email: 'sales@example.com',
    password: 'u3MQFEXkKMnZCnzd',
  },
  {
    label: '唯讀人員',
    email: 'viewer@example.com',
    password: 'mRvBQ23mbPRZqaKD',
  },
] as const;

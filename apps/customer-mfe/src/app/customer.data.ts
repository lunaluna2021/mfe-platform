export type CustomerLevel = 'A' | 'B' | 'C';

export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly industry: string;
  readonly contact: string;
  readonly phone: string;
  readonly level: CustomerLevel;
}

export interface NewCustomerInput {
  readonly name: string;
  readonly industry: string;
}

/** 示範資料，名稱與電話皆為虛構 */
export const DEMO_CUSTOMERS: readonly Customer[] = [
  {
    id: 'c001',
    name: '晨光資訊有限公司',
    industry: '軟體',
    contact: '李先生',
    phone: '02-2345-0001',
    level: 'A',
  },
  {
    id: 'c002',
    name: '青禾食品股份有限公司',
    industry: '食品',
    contact: '吳小姐',
    phone: '04-2233-0002',
    level: 'B',
  },
  {
    id: 'c003',
    name: '遠揚物流有限公司',
    industry: '物流',
    contact: '周先生',
    phone: '07-3344-0003',
    level: 'A',
  },
  {
    id: 'c004',
    name: '星河設計工作室',
    industry: '設計',
    contact: '許小姐',
    phone: '02-8765-0004',
    level: 'C',
  },
  {
    id: 'c005',
    name: '松林建材行',
    industry: '建材',
    contact: '鄭先生',
    phone: '03-4567-0005',
    level: 'B',
  },
  {
    id: 'c006',
    name: '海灣餐飲有限公司',
    industry: '餐飲',
    contact: '黃小姐',
    phone: '06-2345-0006',
    level: 'C',
  },
];

/** 依關鍵字篩選（不分大小寫，比對編號、名稱、產業、聯絡人） */
export function filterCustomers(
  customers: readonly Customer[],
  keyword: string,
): readonly Customer[] {
  const term = keyword.trim().toLowerCase();
  if (!term) {
    return customers;
  }
  return customers.filter((customer) =>
    [customer.id, customer.name, customer.industry, customer.contact].some(
      (field) => field.toLowerCase().includes(term),
    ),
  );
}

/** 以目前最大的編號加一建立新客戶 */
export function createCustomer(
  existing: readonly Customer[],
  input: NewCustomerInput,
): Customer {
  const maxNumber = existing.reduce(
    (max, customer) => Math.max(max, Number(customer.id.slice(1)) || 0),
    0,
  );
  return {
    id: `c${String(maxNumber + 1).padStart(3, '0')}`,
    name: input.name,
    industry: input.industry,
    contact: '—',
    phone: '—',
    level: 'C',
  };
}

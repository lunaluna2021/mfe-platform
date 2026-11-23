-- =============================================================================
-- 示範資料（名稱與電話皆為虛構）。帳號不在這裡建立，請用帳號管理指令。
-- 建立時間分散在過去幾個月，報表才看得到每月的變化。
-- =============================================================================

insert into customers (name, industry, contact, phone, level, created_at) values
  ('晨光資訊有限公司', '軟體', '李先生', '02-2345-0001', 'A', now() - interval '5 months'),
  ('青禾食品股份有限公司', '食品', '吳小姐', '04-2233-0002', 'B', now() - interval '4 months'),
  ('遠揚物流有限公司', '物流', '周先生', '07-3344-0003', 'A', now() - interval '3 months'),
  ('星河設計工作室', '設計', '許小姐', '02-8765-0004', 'C', now() - interval '2 months'),
  ('松林建材行', '建材', '鄭先生', '03-4567-0005', 'B', now() - interval '1 month'),
  ('海灣餐飲有限公司', '餐飲', '黃小姐', '06-2345-0006', 'C', now());

insert into calendar_events (customer_id, event_date, start_time, title)
select
  c.id,
  (date_trunc('month', now() at time zone 'Asia/Taipei')
    + make_interval(months => s.month_offset, days => s.day_of_month - 1))::date,
  s.start_time,
  s.title
from (
  values
    ('晨光資訊有限公司', -2, 6, time '10:00', '需求訪談'),
    ('青禾食品股份有限公司', -1, 9, time '14:00', '報價說明'),
    ('遠揚物流有限公司', -1, 18, time '09:30', '季度回顧'),
    ('晨光資訊有限公司', 0, 3, time '10:00', '產品簡報'),
    ('青禾食品股份有限公司', 0, 8, time '14:30', '續約討論'),
    ('遠揚物流有限公司', 0, 12, time '09:30', '季度回顧'),
    ('星河設計工作室', 0, 15, time '16:00', '需求訪談'),
    ('松林建材行', 0, 21, time '11:00', '報價說明'),
    ('晨光資訊有限公司', 0, 26, time '10:00', '系統展示'),
    ('海灣餐飲有限公司', 0, 26, time '15:00', '教育訓練')
) as s(customer_name, month_offset, day_of_month, start_time, title)
join customers c on c.name = s.customer_name;

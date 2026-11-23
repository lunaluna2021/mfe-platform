-- =============================================================================
-- mfe-platform 資料表（schema：mfe）
-- 由 Flyway 在 API 啟動時套用；Flyway 以 mfe_api 身分執行，資料表的擁有者也是 mfe_api。
-- 權限檢查由 Java API 執行；這個 schema 不對 Supabase 的 Data API 開放。
-- =============================================================================

-- 帳號：密碼只存 BCrypt 雜湊；email 一律存小寫
create table app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) <= 254),
  password_hash text not null,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  role text not null check (role in ('admin', 'manager', 'sales', 'viewer')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 角色與權限的對照只存在這裡，登入時寫進 access token
create table role_permissions (
  role text not null check (role in ('admin', 'manager', 'sales', 'viewer')),
  permission text not null check (
    permission in (
      'customer:read', 'customer:write',
      'calendar:read', 'calendar:write',
      'report:read', 'report:export'
    )
  ),
  primary key (role, permission)
);

insert into role_permissions (role, permission) values
  ('admin', 'customer:read'), ('admin', 'customer:write'),
  ('admin', 'calendar:read'), ('admin', 'calendar:write'),
  ('admin', 'report:read'), ('admin', 'report:export'),
  ('manager', 'customer:read'), ('manager', 'calendar:read'),
  ('manager', 'report:read'), ('manager', 'report:export'),
  ('sales', 'customer:read'), ('sales', 'customer:write'),
  ('sales', 'calendar:read'), ('sales', 'calendar:write'),
  ('viewer', 'customer:read'), ('viewer', 'calendar:read');

-- refresh token：只存 SHA-256 雜湊；輪替時記錄被哪一筆取代
create table refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  replaced_by uuid,
  created_at timestamptz not null default now()
);

create index refresh_tokens_user_id_idx on refresh_tokens (user_id);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 40),
  industry text not null default '未分類' check (char_length(btrim(industry)) between 1 and 20),
  contact text not null default '' check (char_length(contact) <= 20),
  phone text not null default '' check (char_length(phone) <= 20),
  level text not null default 'C' check (level in ('A', 'B', 'C')),
  created_by uuid references app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- on delete restrict：客戶還有行程時，資料庫拒絕刪除客戶
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete restrict,
  event_date date not null,
  start_time time not null,
  title text not null check (char_length(btrim(title)) between 1 and 40),
  note text not null default '' check (char_length(note) <= 200),
  created_by uuid references app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calendar_events_customer_id_idx on calendar_events (customer_id);
create index calendar_events_event_date_idx on calendar_events (event_date);

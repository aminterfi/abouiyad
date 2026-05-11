-- Stock valuation methods and lot-based inventory tracking.

create extension if not exists pgcrypto;

alter table if exists public.settings
  add column if not exists inventory_method text default 'fifo';

update public.settings
set inventory_method = 'fifo'
where inventory_method is null or trim(inventory_method) = '';

create table if not exists public.stock_lots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  lot_code text not null,
  source_movement_id uuid null references public.stock_movements(id) on delete set null,
  received_at timestamptz not null default now(),
  initial_quantity numeric not null,
  remaining_quantity numeric not null,
  unit_cost numeric not null default 0,
  notes text null,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_stock_lots_company_product_code
  on public.stock_lots(company_id, product_id, lot_code);

create index if not exists idx_stock_lots_company_product_received
  on public.stock_lots(company_id, product_id, received_at, created_at);

create table if not exists public.stock_lot_consumptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  lot_id uuid not null references public.stock_lots(id) on delete cascade,
  stock_movement_id uuid not null references public.stock_movements(id) on delete cascade,
  quantity numeric not null,
  unit_cost numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_lot_consumptions_movement
  on public.stock_lot_consumptions(stock_movement_id);

alter table if exists public.stock_movements
  add column if not exists lot_id uuid null references public.stock_lots(id) on delete set null;

alter table if exists public.stock_movements
  add column if not exists lot_code text null;

alter table if exists public.stock_movements
  add column if not exists valuation_method text null;

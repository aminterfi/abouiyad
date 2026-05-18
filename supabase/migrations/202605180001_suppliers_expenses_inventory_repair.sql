create extension if not exists pgcrypto;

alter table if exists public.settings
  add column if not exists inventory_method text default 'fifo';

update public.settings
set inventory_method = 'fifo'
where inventory_method is null or trim(inventory_method) = '';

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid null,
  name text not null,
  contact_name text null,
  email text null,
  phone text null,
  address text null,
  tax_number text null,
  default_currency text not null default 'DZD',
  notes text null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_suppliers_company_name_unique
  on public.suppliers(company_id, lower(name))
  where is_archived = false;

create index if not exists idx_suppliers_company_created
  on public.suppliers(company_id, created_at desc);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid null references public.suppliers(id) on delete set null,
  created_by uuid null,
  expense_date date not null default current_date,
  category text not null default 'General',
  description text not null,
  reference_number text null,
  amount numeric not null default 0,
  tax_rate numeric not null default 0,
  tax_amount numeric not null default 0,
  total_amount numeric not null default 0,
  currency text not null default 'DZD',
  payment_status text not null default 'pending',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_expenses_company_date
  on public.expenses(company_id, expense_date desc, created_at desc);

create index if not exists idx_expenses_company_supplier
  on public.expenses(company_id, supplier_id);

alter table if exists public.suppliers enable row level security;
alter table if exists public.expenses enable row level security;

drop policy if exists "suppliers_select" on public.suppliers;
create policy "suppliers_select"
on public.suppliers
for select
using (public.is_company_member(company_id));

drop policy if exists "suppliers_write" on public.suppliers;
create policy "suppliers_write"
on public.suppliers
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select"
on public.expenses
for select
using (public.is_company_member(company_id));

drop policy if exists "expenses_write" on public.expenses;
create policy "expenses_write"
on public.expenses
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

insert into public.company_module_access(company_id, module_key, is_enabled)
select c.id, key.module_key, true
from public.companies c
cross join (values ('suppliers'), ('expenses')) as key(module_key)
on conflict (company_id, module_key) do nothing;

create or replace function public.default_client_modules()
returns text[]
language sql
immutable
as $$
  select array[
    'dashboard',
    'billing',
    'clients',
    'payments',
    'catalog',
    'stock',
    'suppliers',
    'expenses',
    'tickets',
    'service_requests',
    'documents',
    'users',
    'settings'
  ]::text[];
$$;

create or replace function public.admin_create_managed_client_workspace(
  p_company_name text,
  p_slug text,
  p_owner_email text,
  p_owner_full_name text,
  p_parent_cabinet_id uuid,
  p_modules text[] default public.default_client_modules()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
begin
  if not exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_platform_admin = true
  ) then
    raise exception 'forbidden';
  end if;

  if p_parent_cabinet_id is null then
    raise exception 'parent cabinet required';
  end if;

  insert into public.companies(name, slug, workspace_type, parent_cabinet_id)
  values (trim(p_company_name), trim(lower(p_slug)), 'client', p_parent_cabinet_id)
  returning id into new_company_id;

  insert into public.owners(company_id, email, full_name)
  values (new_company_id, trim(lower(p_owner_email)), trim(p_owner_full_name))
  on conflict do nothing;

  perform public.ensure_company_defaults(new_company_id, p_company_name, 'DZD', p_modules);

  return new_company_id;
end;
$$;

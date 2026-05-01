-- Accounting Portal Foundation
-- Adds client relationship modules: tickets, service requests, documents, and module access matrix.

create extension if not exists pgcrypto;

create table if not exists public.company_module_access (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  module_key text not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, module_key)
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  created_by uuid not null,
  assigned_to uuid null,
  title text not null,
  description text null,
  priority text not null default 'normal',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  created_by uuid not null,
  request_type text not null,
  title text not null,
  details text null,
  status text not null default 'pending',
  requires_generated_document boolean not null default false,
  validated_by uuid null,
  validated_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  created_by uuid not null,
  related_request_id uuid null references public.service_requests(id) on delete set null,
  name text not null,
  direction text not null default 'incoming',
  status text not null default 'shared',
  file_url text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_module_access_company on public.company_module_access(company_id);
create index if not exists idx_support_tickets_company on public.support_tickets(company_id, created_at desc);
create index if not exists idx_service_requests_company on public.service_requests(company_id, created_at desc);
create index if not exists idx_client_documents_company on public.client_documents(company_id, created_at desc);

alter table public.company_module_access enable row level security;
alter table public.support_tickets enable row level security;
alter table public.service_requests enable row level security;
alter table public.client_documents enable row level security;

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.users u
    where u.id = auth.uid() and u.company_id = p_company_id
  )
  or exists(
    select 1 from public.owners o
    where o.user_id = auth.uid() and o.company_id = p_company_id
  );
$$;

drop policy if exists "company_module_access_select" on public.company_module_access;
create policy "company_module_access_select"
on public.company_module_access
for select
using (public.is_company_member(company_id));

drop policy if exists "company_module_access_write" on public.company_module_access;
create policy "company_module_access_write"
on public.company_module_access
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

drop policy if exists "support_tickets_select" on public.support_tickets;
create policy "support_tickets_select"
on public.support_tickets
for select
using (public.is_company_member(company_id));

drop policy if exists "support_tickets_write" on public.support_tickets;
create policy "support_tickets_write"
on public.support_tickets
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

drop policy if exists "service_requests_select" on public.service_requests;
create policy "service_requests_select"
on public.service_requests
for select
using (public.is_company_member(company_id));

drop policy if exists "service_requests_write" on public.service_requests;
create policy "service_requests_write"
on public.service_requests
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

drop policy if exists "client_documents_select" on public.client_documents;
create policy "client_documents_select"
on public.client_documents
for select
using (public.is_company_member(company_id));

drop policy if exists "client_documents_write" on public.client_documents;
create policy "client_documents_write"
on public.client_documents
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

insert into public.company_module_access(company_id, module_key, is_enabled)
select c.id, m.module_key, true
from public.companies c
cross join (
  values
    ('dashboard'),
    ('billing'),
    ('clients'),
    ('payments'),
    ('catalog'),
    ('stock'),
    ('tickets'),
    ('service_requests'),
    ('documents'),
    ('users'),
    ('settings')
) as m(module_key)
on conflict (company_id, module_key) do nothing;


-- Workspace shells for cabinet/client/admin-rs split.

create extension if not exists pgcrypto;

alter table if exists public.companies
  add column if not exists workspace_type text;

alter table if exists public.companies
  add column if not exists parent_cabinet_id uuid;

update public.companies
set workspace_type = coalesce(nullif(workspace_type, ''), 'cabinet')
where workspace_type is null or workspace_type = '';

alter table if exists public.companies
  alter column workspace_type set default 'cabinet';

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null default 'lecteur',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create index if not exists idx_workspace_memberships_user on public.workspace_memberships(user_id);
create index if not exists idx_workspace_memberships_company on public.workspace_memberships(company_id);
create index if not exists idx_companies_parent_cabinet on public.companies(parent_cabinet_id);

insert into public.workspace_memberships(user_id, company_id, role, is_primary)
select o.user_id, o.company_id, 'owner', true
from public.owners o
where o.user_id is not null
on conflict (user_id, company_id) do update
set role = excluded.role,
    is_primary = excluded.is_primary;

insert into public.workspace_memberships(user_id, company_id, role, is_primary)
select u.id, u.company_id, coalesce(nullif(u.role, ''), 'lecteur'), false
from public.users u
where u.company_id is not null
on conflict (user_id, company_id) do update
set role = excluded.role;

alter table if exists public.workspace_memberships enable row level security;

drop policy if exists "workspace_memberships_select" on public.workspace_memberships;
create policy "workspace_memberships_select"
on public.workspace_memberships
for select
using (auth.uid() = user_id);

drop policy if exists "workspace_memberships_write" on public.workspace_memberships;
create policy "workspace_memberships_write"
on public.workspace_memberships
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.workspace_memberships wm
    where wm.user_id = auth.uid()
      and wm.company_id = p_company_id
  )
  or exists(
    select 1
    from public.companies target_company
    join public.companies client_company
      on client_company.parent_cabinet_id = target_company.id
    join public.workspace_memberships wm
      on wm.company_id = target_company.id
    where client_company.id = p_company_id
      and wm.user_id = auth.uid()
      and coalesce(target_company.workspace_type, 'cabinet') = 'cabinet'
  )
  or exists(
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_platform_admin = true
  );
$$;

create or replace function public.list_managed_client_workspaces(p_cabinet_id uuid)
returns table (
  id uuid,
  name text,
  slug text,
  workspace_type text,
  parent_cabinet_id uuid,
  owner_email text,
  active_modules text[]
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.slug,
    coalesce(c.workspace_type, 'client') as workspace_type,
    c.parent_cabinet_id,
    o.email as owner_email,
    coalesce(
      (
        select array_agg(cma.module_key order by cma.module_key)
        from public.company_module_access cma
        where cma.company_id = c.id
          and cma.is_enabled = true
      ),
      '{}'::text[]
    ) as active_modules
  from public.companies c
  left join public.owners o
    on o.company_id = c.id
  where c.parent_cabinet_id = p_cabinet_id
    and public.is_company_member(p_cabinet_id)
  order by c.created_at desc nulls last, c.name asc;
$$;

create or replace function public.admin_update_company_workspace(
  p_company_id uuid,
  p_workspace_type text,
  p_parent_cabinet_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_platform_admin = true
  ) then
    raise exception 'forbidden';
  end if;

  update public.companies
  set workspace_type = case when p_workspace_type in ('cabinet', 'client') then p_workspace_type else 'cabinet' end,
      parent_cabinet_id = case when p_workspace_type = 'client' then p_parent_cabinet_id else null end
  where id = p_company_id;
end;
$$;

create or replace function public.admin_set_company_module_access(
  p_company_id uuid,
  p_modules text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  module_key text;
begin
  if not exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_platform_admin = true
  ) then
    raise exception 'forbidden';
  end if;

  delete from public.company_module_access
  where company_id = p_company_id;

  foreach module_key in array coalesce(p_modules, '{}'::text[]) loop
    insert into public.company_module_access(company_id, module_key, is_enabled)
    values (p_company_id, module_key, true)
    on conflict (company_id, module_key) do update
    set is_enabled = excluded.is_enabled;
  end loop;
end;
$$;

create or replace function public.admin_create_managed_client_workspace(
  p_company_name text,
  p_slug text,
  p_owner_email text,
  p_owner_full_name text,
  p_parent_cabinet_id uuid,
  p_modules text[] default array['dashboard','billing','clients','payments','catalog','stock','tickets','service_requests','documents','users','settings']::text[]
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

  perform public.admin_set_company_module_access(new_company_id, p_modules);

  return new_company_id;
end;
$$;

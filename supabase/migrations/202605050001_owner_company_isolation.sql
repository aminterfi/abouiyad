-- Make every company selected from the hub a separate workspace.
-- Secondary companies share the owner account, but keep their own settings,
-- modules, employees and operational data through company_id.

create extension if not exists pgcrypto;

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
    'tickets',
    'service_requests',
    'documents',
    'users',
    'settings'
  ]::text[];
$$;

create or replace function public.ensure_company_defaults(
  p_company_id uuid,
  p_company_name text,
  p_currency text default 'DZD',
  p_modules text[] default public.default_client_modules()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  module_key text;
begin
  insert into public.settings(
    company_id,
    company_name,
    primary_color,
    currency,
    font_family,
    font_size_base,
    font_size_pdf
  )
  select
    p_company_id,
    trim(p_company_name),
    '#2563EB',
    coalesce(nullif(trim(p_currency), ''), 'DZD'),
    'Outfit',
    14,
    12
  where not exists (
    select 1 from public.settings s where s.company_id = p_company_id
  );

  foreach module_key in array coalesce(p_modules, public.default_client_modules()) loop
    insert into public.company_module_access(company_id, module_key, is_enabled)
    values (p_company_id, module_key, true)
    on conflict (company_id, module_key) do update
    set is_enabled = excluded.is_enabled;
  end loop;
end;
$$;

create or replace function public.get_owner_companies(p_user_id uuid)
returns table (
  company_id uuid,
  company_name text,
  slug text,
  is_primary boolean,
  is_platform_admin boolean,
  logo_url text,
  primary_color text,
  workspace_type text,
  parent_cabinet_id uuid,
  workspace_role text
)
language sql
security definer
set search_path = public
as $$
  with owner_rows as (
    select
      c.id as company_id,
      c.name as company_name,
      c.slug,
      coalesce(wm.is_primary, false) as is_primary,
      coalesce(u.is_platform_admin, false) as is_platform_admin,
      s.logo_url,
      coalesce(s.primary_color, '#2563EB') as primary_color,
      coalesce(c.workspace_type, case when c.slug = 'rs' then 'cabinet' else 'client' end) as workspace_type,
      c.parent_cabinet_id,
      coalesce(wm.role, 'owner') as workspace_role
    from public.workspace_memberships wm
    join public.companies c on c.id = wm.company_id
    left join public.settings s on s.company_id = c.id
    left join public.users u on u.id = wm.user_id
    where wm.user_id = p_user_id

    union

    select
      c.id as company_id,
      c.name as company_name,
      c.slug,
      true as is_primary,
      coalesce(u.is_platform_admin, false) as is_platform_admin,
      s.logo_url,
      coalesce(s.primary_color, '#2563EB') as primary_color,
      coalesce(c.workspace_type, case when c.slug = 'rs' then 'cabinet' else 'client' end) as workspace_type,
      c.parent_cabinet_id,
      'owner' as workspace_role
    from public.owners o
    join public.companies c on c.id = o.company_id
    left join public.settings s on s.company_id = c.id
    left join public.users u on u.id = o.user_id
    where o.user_id = p_user_id
  )
  select distinct on (company_id)
    company_id,
    company_name,
    slug,
    is_primary,
    is_platform_admin,
    logo_url,
    primary_color,
    workspace_type,
    parent_cabinet_id,
    workspace_role
  from owner_rows
  order by company_id, is_primary desc, company_name asc;
$$;

create or replace function public.add_company_to_owner(
  p_user_id uuid,
  p_company_name text,
  p_slug text,
  p_currency text default 'DZD'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  clean_slug text;
  owner_email text;
  owner_name text;
  parent_company_id uuid;
begin
  clean_slug := lower(regexp_replace(trim(p_slug), '[^a-z0-9-]+', '-', 'g'));
  clean_slug := trim(both '-' from clean_slug);

  if p_user_id is null then
    raise exception 'Owner introuvable.';
  end if;

  if trim(coalesce(p_company_name, '')) = '' or clean_slug = '' then
    raise exception 'Nom et slug requis.';
  end if;

  if exists (select 1 from public.companies c where c.slug = clean_slug) then
    raise exception 'Ce slug est deja utilise.';
  end if;

  select wm.company_id
  into parent_company_id
  from public.workspace_memberships wm
  join public.companies c on c.id = wm.company_id
  where wm.user_id = p_user_id
    and coalesce(wm.is_primary, false) = true
  order by c.created_at nulls last
  limit 1;

  if parent_company_id is null then
    select o.company_id
    into parent_company_id
    from public.owners o
    where o.user_id = p_user_id
    limit 1;
  end if;

  select u.email, u.full_name
  into owner_email, owner_name
  from public.users u
  where u.id = p_user_id
  limit 1;

  if owner_email is null then
    select au.email, coalesce(au.raw_user_meta_data->>'full_name', au.email)
    into owner_email, owner_name
    from auth.users au
    where au.id = p_user_id
    limit 1;
  end if;

  if owner_email is null then
    raise exception 'Owner introuvable pour user_id %', p_user_id;
  end if;

  insert into public.companies(name, slug, workspace_type, parent_cabinet_id)
  values (trim(p_company_name), clean_slug, 'client', parent_company_id)
  returning id into new_company_id;

  insert into public.workspace_memberships(user_id, company_id, role, is_primary)
  values (p_user_id, new_company_id, 'owner', false)
  on conflict (user_id, company_id) do update
  set role = 'owner',
      is_primary = false;

  insert into public.owners(company_id, email, full_name, user_id)
  values (new_company_id, lower(trim(owner_email)), coalesce(nullif(trim(owner_name), ''), owner_email), p_user_id)
  on conflict do nothing;

  perform public.ensure_company_defaults(new_company_id, p_company_name, p_currency, public.default_client_modules());

  return new_company_id;
end;
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

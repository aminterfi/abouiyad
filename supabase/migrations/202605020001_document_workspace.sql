-- Document archive rebuild
-- Cabinet creates exercise folders, both sides can upload,
-- and clients only get read + upload behavior.

create extension if not exists pgcrypto;

create table if not exists public.document_exercise_folders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  exercise_year integer not null check (exercise_year between 2000 and 2100),
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, exercise_year)
);

create table if not exists public.document_archive_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  folder_id uuid not null references public.document_exercise_folders(id) on delete cascade,
  created_by uuid null,
  uploader_role text not null default 'client',
  name text not null,
  description text null,
  file_bucket text not null default 'document-archive',
  file_path text not null,
  file_size bigint null,
  mime_type text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (uploader_role in ('cabinet', 'client'))
);

create index if not exists idx_document_exercise_folders_company on public.document_exercise_folders(company_id, exercise_year desc);
create index if not exists idx_document_archive_files_company on public.document_archive_files(company_id, created_at desc);
create index if not exists idx_document_archive_files_folder on public.document_archive_files(folder_id, created_at desc);

alter table public.document_exercise_folders enable row level security;
alter table public.document_archive_files enable row level security;

create or replace function public.can_manage_company_archive(p_company_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.companies client_company
    join public.workspace_memberships wm
      on wm.company_id = client_company.parent_cabinet_id
    where client_company.id = p_company_id
      and wm.user_id = auth.uid()
  )
  or exists(
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_platform_admin = true
  );
$$;

create or replace function public.sync_document_archive_file_company_id()
returns trigger
language plpgsql
as $$
begin
  select company_id into new.company_id
  from public.document_exercise_folders
  where id = new.folder_id;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_sync_document_archive_file_company_id on public.document_archive_files;
create trigger trg_sync_document_archive_file_company_id
before insert or update on public.document_archive_files
for each row
execute function public.sync_document_archive_file_company_id();

create or replace function public.touch_document_exercise_folder()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_document_exercise_folder on public.document_exercise_folders;
create trigger trg_touch_document_exercise_folder
before update on public.document_exercise_folders
for each row
execute function public.touch_document_exercise_folder();

drop policy if exists "document_exercise_folders_select" on public.document_exercise_folders;
create policy "document_exercise_folders_select"
on public.document_exercise_folders
for select
using (public.is_company_member(company_id));

drop policy if exists "document_exercise_folders_write" on public.document_exercise_folders;
create policy "document_exercise_folders_write"
on public.document_exercise_folders
for all
using (public.can_manage_company_archive(company_id))
with check (public.can_manage_company_archive(company_id));

drop policy if exists "document_archive_files_select" on public.document_archive_files;
create policy "document_archive_files_select"
on public.document_archive_files
for select
using (public.is_company_member(company_id));

drop policy if exists "document_archive_files_insert" on public.document_archive_files;
create policy "document_archive_files_insert"
on public.document_archive_files
for insert
with check (
  public.is_company_member(company_id)
  and exists (
    select 1
    from public.document_exercise_folders f
    where f.id = folder_id
      and f.company_id = company_id
  )
);

drop policy if exists "document_archive_files_update" on public.document_archive_files;
create policy "document_archive_files_update"
on public.document_archive_files
for update
using (public.can_manage_company_archive(company_id))
with check (public.can_manage_company_archive(company_id));

drop policy if exists "document_archive_files_delete" on public.document_archive_files;
create policy "document_archive_files_delete"
on public.document_archive_files
for delete
using (public.can_manage_company_archive(company_id));

create or replace function public.storage_company_id(p_object_name text)
returns uuid
language plpgsql
stable
as $$
declare
  folder_part text;
begin
  folder_part := split_part(coalesce(p_object_name, ''), '/', 1);

  if folder_part ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return folder_part::uuid;
  end if;

  return null;
end;
$$;

insert into storage.buckets (id, name, public)
values ('document-archive', 'document-archive', false)
on conflict (id) do nothing;

drop policy if exists "document_archive_bucket_select" on storage.objects;
create policy "document_archive_bucket_select"
on storage.objects
for select
using (
  bucket_id = 'document-archive'
  and public.is_company_member(public.storage_company_id(name))
);

drop policy if exists "document_archive_bucket_insert" on storage.objects;
create policy "document_archive_bucket_insert"
on storage.objects
for insert
with check (
  bucket_id = 'document-archive'
  and public.is_company_member(public.storage_company_id(name))
);

drop policy if exists "document_archive_bucket_update" on storage.objects;
create policy "document_archive_bucket_update"
on storage.objects
for update
using (
  bucket_id = 'document-archive'
  and public.can_manage_company_archive(public.storage_company_id(name))
)
with check (
  bucket_id = 'document-archive'
  and public.can_manage_company_archive(public.storage_company_id(name))
);

drop policy if exists "document_archive_bucket_delete" on storage.objects;
create policy "document_archive_bucket_delete"
on storage.objects
for delete
using (
  bucket_id = 'document-archive'
  and public.can_manage_company_archive(public.storage_company_id(name))
);

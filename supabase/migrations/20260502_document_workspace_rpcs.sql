-- Archive RPCs for stable folder and file access

create or replace function public.list_company_archive_folders(p_company_id uuid)
returns table (
  id uuid,
  company_id uuid,
  exercise_year integer,
  created_at timestamptz,
  updated_at timestamptz,
  parent_folder_id uuid,
  folder_name text,
  folder_kind text
)
language sql
security definer
set search_path = public
as $$
  select
    f.id,
    f.company_id,
    f.exercise_year,
    f.created_at,
    f.updated_at,
    f.parent_folder_id,
    f.folder_name,
    f.folder_kind
  from public.document_exercise_folders f
  where f.company_id = p_company_id
    and public.is_company_member(p_company_id)
  order by f.exercise_year desc, f.created_at asc;
$$;

create or replace function public.list_company_archive_files(p_company_id uuid)
returns table (
  id uuid,
  company_id uuid,
  folder_id uuid,
  created_by uuid,
  uploader_role text,
  name text,
  description text,
  file_bucket text,
  file_path text,
  file_size bigint,
  mime_type text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    f.id,
    f.company_id,
    f.folder_id,
    f.created_by,
    f.uploader_role,
    f.name,
    f.description,
    f.file_bucket,
    f.file_path,
    f.file_size,
    f.mime_type,
    f.created_at,
    f.updated_at
  from public.document_archive_files f
  where f.company_id = p_company_id
    and public.is_company_member(p_company_id)
  order by f.created_at desc;
$$;

create or replace function public.create_company_archive_folder(
  p_company_id uuid,
  p_exercise_year integer,
  p_folder_name text default null,
  p_parent_folder_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_year integer;
  target_name text;
  target_kind text;
  parent_company_id uuid;
  new_folder_id uuid;
begin
  if not public.can_manage_company_archive(p_company_id) then
    raise exception 'forbidden';
  end if;

  if p_parent_folder_id is not null then
    select company_id, exercise_year
    into parent_company_id, target_year
    from public.document_exercise_folders
    where id = p_parent_folder_id;

    if parent_company_id is null then
      raise exception 'parent folder not found';
    end if;

    if parent_company_id <> p_company_id then
      raise exception 'parent folder company mismatch';
    end if;

    target_kind := 'folder';
    target_name := nullif(trim(coalesce(p_folder_name, '')), '');

    if target_name is null then
      raise exception 'folder name required';
    end if;
  else
    target_year := p_exercise_year;
    target_kind := 'exercise';
    target_name := coalesce(nullif(trim(coalesce(p_folder_name, '')), ''), 'Annee d''exercice ' || target_year::text);
  end if;

  insert into public.document_exercise_folders(
    company_id,
    exercise_year,
    created_by,
    parent_folder_id,
    folder_name,
    folder_kind
  )
  values (
    p_company_id,
    target_year,
    auth.uid(),
    p_parent_folder_id,
    target_name,
    target_kind
  )
  returning id into new_folder_id;

  return new_folder_id;
end;
$$;

create or replace function public.create_company_archive_file_record(
  p_company_id uuid,
  p_folder_id uuid,
  p_name text,
  p_description text,
  p_file_bucket text,
  p_file_path text,
  p_file_size bigint,
  p_mime_type text,
  p_uploader_role text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  folder_company_id uuid;
  new_file_id uuid;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  select company_id into folder_company_id
  from public.document_exercise_folders
  where id = p_folder_id;

  if folder_company_id is null then
    raise exception 'folder not found';
  end if;

  if folder_company_id <> p_company_id then
    raise exception 'folder company mismatch';
  end if;

  insert into public.document_archive_files(
    company_id,
    folder_id,
    created_by,
    uploader_role,
    name,
    description,
    file_bucket,
    file_path,
    file_size,
    mime_type
  )
  values (
    p_company_id,
    p_folder_id,
    auth.uid(),
    case when p_uploader_role in ('cabinet', 'client') then p_uploader_role else 'client' end,
    trim(p_name),
    nullif(trim(coalesce(p_description, '')), ''),
    p_file_bucket,
    p_file_path,
    p_file_size,
    p_mime_type
  )
  returning id into new_file_id;

  return new_file_id;
end;
$$;

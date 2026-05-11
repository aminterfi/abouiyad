-- Nested folders inside exercise archives

alter table if exists public.document_exercise_folders
  add column if not exists parent_folder_id uuid references public.document_exercise_folders(id) on delete cascade;

alter table if exists public.document_exercise_folders
  add column if not exists folder_name text;

alter table if exists public.document_exercise_folders
  add column if not exists folder_kind text not null default 'exercise';

alter table if exists public.document_exercise_folders
  drop constraint if exists document_exercise_folders_company_id_exercise_year_key;

update public.document_exercise_folders
set folder_name = coalesce(folder_name, 'Annee d''exercice ' || exercise_year),
    folder_kind = coalesce(nullif(folder_kind, ''), 'exercise')
where folder_name is null
   or folder_kind is null
   or folder_kind = '';

alter table if exists public.document_exercise_folders
  alter column folder_name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'document_exercise_folders_kind_check'
  ) then
    alter table public.document_exercise_folders
      add constraint document_exercise_folders_kind_check
      check (folder_kind in ('exercise', 'folder'));
  end if;
end $$;

create index if not exists idx_document_exercise_folders_parent on public.document_exercise_folders(parent_folder_id, created_at desc);

create unique index if not exists idx_document_exercise_folders_unique_exercise_root
on public.document_exercise_folders(company_id, exercise_year)
where parent_folder_id is null;

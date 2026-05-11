create table if not exists public.workspace_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  audience text not null check (audience in ('cabinet', 'client')),
  kind text not null check (kind in ('demande', 'ticket')),
  entity_id uuid null,
  title text not null,
  message text not null,
  status text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspace_notifications_company_audience
on public.workspace_notifications(company_id, audience, created_at desc);

alter table public.workspace_notifications enable row level security;

drop policy if exists "workspace_notifications_select" on public.workspace_notifications;
create policy "workspace_notifications_select"
on public.workspace_notifications
for select
using (public.is_company_member(company_id));

drop policy if exists "workspace_notifications_write" on public.workspace_notifications;
create policy "workspace_notifications_write"
on public.workspace_notifications
for insert
with check (public.is_company_member(company_id));

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workspace_notifications'
  ) then
    alter publication supabase_realtime add table public.workspace_notifications;
  end if;
end $$;

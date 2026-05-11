create table if not exists public.purchase_document_costs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  purchase_document_id uuid not null references public.purchase_documents(id) on delete cascade,
  cost_name text not null,
  amount numeric(14,2) not null default 0,
  currency text not null default 'DZD',
  created_at timestamptz not null default now()
);

create index if not exists idx_purchase_document_costs_document
on public.purchase_document_costs(purchase_document_id, created_at asc);

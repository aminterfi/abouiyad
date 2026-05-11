create table if not exists public.purchase_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  supplier_name text not null,
  document_kind text not null default 'simple'
    check (document_kind in ('simple', 'import')),
  reference_number text null,
  purchase_date date not null default current_date,
  notes text null,
  currency text not null default 'DZD',
  extra_costs_total numeric(14,2) not null default 0,
  subtotal numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  status text not null default 'received'
    check (status in ('draft', 'received', 'cancelled')),
  created_by uuid null,
  created_by_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_document_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  purchase_document_id uuid not null references public.purchase_documents(id) on delete cascade,
  product_id uuid null references public.products(id) on delete set null,
  product_name text null,
  quantity numeric(14,3) not null default 0,
  base_unit_cost numeric(14,2) not null default 0,
  extra_cost_allocated numeric(14,2) not null default 0,
  effective_unit_cost numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  lot_code text null,
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_purchase_documents_company_created
on public.purchase_documents(company_id, created_at desc);

create index if not exists idx_purchase_documents_company_kind
on public.purchase_documents(company_id, document_kind, purchase_date desc);

create index if not exists idx_purchase_document_items_document
on public.purchase_document_items(purchase_document_id, created_at asc);

create index if not exists idx_purchase_document_items_company_product
on public.purchase_document_items(company_id, product_id);

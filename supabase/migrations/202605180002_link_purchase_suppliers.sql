alter table if exists public.purchase_documents
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists idx_purchase_documents_company_supplier
  on public.purchase_documents(company_id, supplier_id, created_at desc);

update public.purchase_documents pd
set supplier_id = s.id
from public.suppliers s
where pd.company_id = s.company_id
  and pd.supplier_id is null
  and lower(trim(pd.supplier_name)) = lower(trim(s.name));

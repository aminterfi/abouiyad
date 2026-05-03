alter table public.bills
add column if not exists document_type text not null default 'invoice'
  check (document_type in ('invoice', 'quote', 'purchase_order', 'delivery_note'));

alter table public.bills
add column if not exists commercial_status text not null default 'issued';

alter table public.bills
add column if not exists source_bill_id uuid null references public.bills(id) on delete set null;

alter table public.bills
add column if not exists client_declared boolean not null default false;

alter table public.bills
add column if not exists client_declared_at timestamptz null;

alter table public.bills
add column if not exists client_declaration_note text null;

alter table public.bills
add column if not exists client_declared_by uuid null;

alter table public.bills
add column if not exists invoice_policy text not null default 'ordered'
  check (invoice_policy in ('ordered', 'delivered'));

alter table public.bill_items
add column if not exists ordered_quantity numeric not null default 0;

alter table public.bill_items
add column if not exists delivered_quantity numeric not null default 0;

alter table public.bill_items
add column if not exists source_item_id uuid null references public.bill_items(id) on delete set null;

update public.bills
set document_type = coalesce(document_type, 'invoice')
where document_type is null;

update public.bills
set commercial_status = case
  when document_type = 'quote' then 'draft'
  when document_type = 'purchase_order' then 'confirmed'
  when document_type = 'delivery_note' then 'delivered'
  else 'issued'
end
where commercial_status is null;

update public.bill_items
set ordered_quantity = coalesce(nullif(ordered_quantity, 0), quantity),
    delivered_quantity = coalesce(nullif(delivered_quantity, 0), quantity)
where ordered_quantity = 0 or delivered_quantity = 0;

create index if not exists idx_bills_company_doc_type_declared
on public.bills(company_id, document_type, client_declared, created_at desc);

create index if not exists idx_bills_source_bill_id
on public.bills(source_bill_id);

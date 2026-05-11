alter table public.service_requests
add column if not exists cabinet_reply text null,
add column if not exists response_updated_at timestamptz null,
add column if not exists attached_document_name text null,
add column if not exists attached_document_url text null;

alter table public.support_tickets
add column if not exists cabinet_reply text null,
add column if not exists response_updated_at timestamptz null,
add column if not exists attached_document_name text null,
add column if not exists attached_document_url text null;

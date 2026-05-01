# Accounting Platform V2

This app is evolving from a single-company ERP into a collaboration platform between:

1. Accounting company team (owner, accountants, admins)
2. Their client companies

## Product Structure

- `Operations`: billing, payments, stock, products
- `Client Relationship`: tickets, service requests, documents exchange
- `Administration`: users, settings, subscription-based module access

## Module Access by Subscription

Module keys:

- `dashboard`
- `billing`
- `clients`
- `payments`
- `catalog`
- `stock`
- `tickets`
- `service_requests`
- `documents`
- `users`
- `settings`
- `admin_platform`

The dashboard sidebar now supports module gating from:

1. `settings.enabled_modules` (priority)
2. `localStorage.subscription.enabled_modules/modules/plan_modules`

## New Flows Added

- `Tickets`: client or accountant can open and track support tasks.
- `Demandes`: service requests (G12, generated document, prepared document, etc.).
- `Documents`: shared vault for incoming/outgoing files linked to the company.

## Database Foundation

A migration has been added:

- `supabase/migrations/20260501_accounting_portal_foundation.sql`

It creates:

- `company_module_access`
- `support_tickets`
- `service_requests`
- `client_documents`

with RLS policies based on company membership (`users` / `owners`).


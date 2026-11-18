-- Per-seller-listing payment availability.
-- Existing listings default to both methods enabled.
alter table public.listings
  add column if not exists cash_enabled boolean not null default true,
  add column if not exists financing_enabled boolean not null default true;

alter table public.listings
  drop constraint if exists listings_at_least_one_payment_method;

alter table public.listings
  add constraint listings_at_least_one_payment_method
  check (cash_enabled or financing_enabled);

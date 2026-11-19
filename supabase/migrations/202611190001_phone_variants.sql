-- PhoneFlex global catalogue variants.
-- Images remain hosted at their original source; store only external URLs.
create table if not exists public.phone_variants (
  id uuid primary key default gen_random_uuid(),
  phone_id uuid not null references public.phones(id) on delete cascade,
  variant_name text not null,
  ram_gb integer,
  storage_gb integer,
  network text[] not null default '{}',
  model_number text,
  region text,
  image_url text,
  source_url text,
  source_name text,
  verified_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phone_variants_ram_positive check (ram_gb is null or ram_gb > 0),
  constraint phone_variants_storage_positive check (storage_gb is null or storage_gb > 0),
  constraint phone_variants_unique_config unique (phone_id, variant_name)
);
create index if not exists phone_variants_phone_id_idx on public.phone_variants(phone_id);
create index if not exists phone_variants_ram_storage_idx on public.phone_variants(ram_gb, storage_gb);
alter table public.phone_variants enable row level security;
grant select on public.phone_variants to anon, authenticated;
grant insert, update, delete on public.phone_variants to authenticated;
drop policy if exists phone_variants_public_read on public.phone_variants;
create policy phone_variants_public_read on public.phone_variants for select to anon, authenticated using (
  (is_active and exists (select 1 from public.phones p where p.id = phone_variants.phone_id and p.is_published))
  or public.phoneflex_is_admin()
);
drop policy if exists phone_variants_admin_manage on public.phone_variants;
create policy phone_variants_admin_manage on public.phone_variants for all to authenticated using (public.phoneflex_is_admin()) with check (public.phoneflex_is_admin());
alter table public.listings add column if not exists variant_id uuid references public.phone_variants(id) on delete set null;
create index if not exists listings_variant_id_idx on public.listings(variant_id);

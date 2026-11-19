-- Ensure source imports can be repeated safely.
create unique index if not exists brands_slug_unique_idx on public.brands(slug);
create unique index if not exists phones_slug_unique_idx on public.phones(slug);
create unique index if not exists phone_variants_phone_variant_unique_idx on public.phone_variants(phone_id, variant_name);

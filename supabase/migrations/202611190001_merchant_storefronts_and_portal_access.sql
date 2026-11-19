alter table public.sellers
  add column if not exists storefront_config jsonb not null default '{
    "theme":"forest","accent":"#176b4b","hero_title":"Your next phone is here",
    "hero_subtitle":"Shop trusted devices from our store.","hero_image_url":null,
    "hero_cta":"Shop phones","show_featured":true,"show_categories":true,
    "announcement":"","about_text":""
  }'::jsonb;

drop policy if exists sellers_member_read on public.sellers;
create policy sellers_member_read on public.sellers for select to authenticated
using(public.phoneflex_is_admin() or public.phoneflex_is_seller_member(id));
drop policy if exists sellers_member_update on public.sellers;
create policy sellers_member_update on public.sellers for update to authenticated
using(public.phoneflex_is_seller_member(id))
with check(public.phoneflex_is_seller_member(id));
drop policy if exists leads_seller_read on public.leads;
create policy leads_seller_read on public.leads for select to authenticated
using(public.phoneflex_is_admin() or (seller_id is not null and public.phoneflex_is_seller_member(seller_id)));

drop policy if exists sellers_public_read on public.sellers;
create policy sellers_public_read on public.sellers for select to anon,authenticated
using(is_active=true and verification_status='verified');
create or replace view public.public_storefronts with (security_invoker = true) as
select id,name,slug,description,logo_url,website_url,whatsapp_number,public_phone,public_email,county,town,storefront_config
from public.sellers where is_active=true and verification_status='verified';
grant select on public.public_storefronts to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('storefront-assets','storefront-assets',true,8388608,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=true,file_size_limit=8388608,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists storefront_assets_public_read on storage.objects;
create policy storefront_assets_public_read on storage.objects for select to anon,authenticated using(bucket_id='storefront-assets');
drop policy if exists storefront_assets_member_insert on storage.objects;
create policy storefront_assets_member_insert on storage.objects for insert to authenticated
with check(bucket_id='storefront-assets' and public.phoneflex_is_seller_member(((storage.foldername(name))[1])::uuid));
drop policy if exists storefront_assets_member_update on storage.objects;
create policy storefront_assets_member_update on storage.objects for update to authenticated
using(bucket_id='storefront-assets' and public.phoneflex_is_seller_member(((storage.foldername(name))[1])::uuid))
with check(bucket_id='storefront-assets' and public.phoneflex_is_seller_member(((storage.foldername(name))[1])::uuid));
drop policy if exists storefront_assets_member_delete on storage.objects;
create policy storefront_assets_member_delete on storage.objects for delete to authenticated
using(bucket_id='storefront-assets' and public.phoneflex_is_seller_member(((storage.foldername(name))[1])::uuid));
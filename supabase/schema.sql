-- PhoneFlex Kenya marketplace schema.
-- This file documents the schema deployed to the connected Supabase project.
-- Apply to a fresh project only. The connected PhoneFlex project already has this schema.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end; $$;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text, role text not null default 'customer'
 check(role in ('customer','seller','admin')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.brands (
 id uuid primary key default gen_random_uuid(), name text not null unique,
 slug text not null unique, logo_url text, website_url text,
 is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.phones (
 id uuid primary key default gen_random_uuid(),
 brand_id uuid not null references public.brands(id) on delete restrict,
 name text not null, model text, slug text not null unique, description text,
 image_url text, images text[] not null default '{}',
 ram_gb integer check(ram_gb is null or ram_gb>0),
 storage_gb integer check(storage_gb is null or storage_gb>0),
 screen_inches numeric(4,2), battery_mah integer,
 camera_summary text, network text[] not null default '{}',
 operating_system text,
 condition_type text not null default 'new' check(condition_type in ('new','refurbished','used')),
 specifications jsonb not null default '{}'::jsonb,
 is_published boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(brand_id,name,model)
);

create table if not exists public.sellers (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
 description text, logo_url text, website_url text, whatsapp_number text,
 public_phone text, public_email text, county text, town text,
 verification_status text not null default 'pending'
 check(verification_status in ('pending','verified','rejected','suspended')),
 is_active boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.seller_members (
 seller_id uuid not null references public.sellers(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 member_role text not null default 'manager' check(member_role in ('owner','manager','staff')),
 created_at timestamptz not null default now(), primary key(seller_id,user_id)
);

create table if not exists public.listings (
 id uuid primary key default gen_random_uuid(),
 phone_id uuid not null references public.phones(id) on delete restrict,
 seller_id uuid not null references public.sellers(id) on delete cascade,
 cash_price_kes numeric(12,2) not null check(cash_price_kes>=0),
 currency text not null default 'KES' check(currency='KES'),
 stock_quantity integer not null default 0 check(stock_quantity>=0),
 stock_status text not null default 'out_of_stock'
 check(stock_status in ('in_stock','out_of_stock','preorder','discontinued')),
 warranty_months integer check(warranty_months is null or warranty_months>=0),
 condition_type text not null default 'new' check(condition_type in ('new','refurbished','used')),
 listing_status text not null default 'draft'
 check(listing_status in ('draft','active','paused','rejected','sold_out')),
 product_url text, last_price_verified_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(phone_id,seller_id)
);

create table if not exists public.finance_providers (
 id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique,
 description text, website_url text, application_url text, whatsapp_number text, contact_phone text,
 is_active boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.finance_offers (
 id uuid primary key default gen_random_uuid(),
 provider_id uuid not null references public.finance_providers(id) on delete cascade,
 phone_id uuid references public.phones(id) on delete cascade,
 listing_id uuid references public.listings(id) on delete cascade,
 deposit_kes numeric(12,2) not null check(deposit_kes>=0),
 instalment_amount_kes numeric(12,2) not null check(instalment_amount_kes>0),
 instalment_frequency text not null check(instalment_frequency in ('daily','weekly','biweekly','monthly')),
 instalment_count integer not null check(instalment_count>0),
 total_payable_kes numeric(12,2) not null check(total_payable_kes>=deposit_kes),
 fees_kes numeric(12,2) not null default 0 check(fees_kes>=0),
 terms_summary text, eligibility_summary text, application_url text,
 is_active boolean not null default false, valid_from timestamptz, valid_until timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(phone_id is not null or listing_id is not null)
);

create table if not exists public.leads (
 id uuid primary key default gen_random_uuid(),
 phone_id uuid references public.phones(id) on delete set null,
 listing_id uuid references public.listings(id) on delete set null,
 finance_offer_id uuid references public.finance_offers(id) on delete set null,
 seller_id uuid references public.sellers(id) on delete set null,
 customer_name text not null check(length(trim(customer_name)) between 2 and 120),
 customer_phone text not null,
 customer_email text, county text, town text,
 payment_method text not null check(payment_method in ('cash','instalments')),
 preferred_contact text not null default 'whatsapp' check(preferred_contact in ('whatsapp','call','email')),
 message text, consent_to_contact boolean not null default false,
 lead_status text not null default 'new'
 check(lead_status in ('new','contacted','qualified','converted','closed','spam')),
 source text not null default 'website',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);


do $$ declare t text; begin
 foreach t in array array['profiles','brands','phones','sellers','listings','finance_providers','finance_offers','leads'] loop
  execute format('drop trigger if exists %I on public.%I',t||'_set_updated_at',t);
  execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()',t||'_set_updated_at',t);
 end loop;
end $$;

create index if not exists phones_brand_idx on public.phones(brand_id);
create index if not exists phones_published_idx on public.phones(is_published);
create index if not exists listings_phone_idx on public.listings(phone_id);
create index if not exists listings_seller_idx on public.listings(seller_id);
create index if not exists listings_public_idx on public.listings(listing_status,stock_status);
create index if not exists finance_offers_phone_idx on public.finance_offers(phone_id);
create index if not exists finance_offers_listing_idx on public.finance_offers(listing_id);
create index if not exists finance_offers_provider_idx on public.finance_offers(provider_id);
create index if not exists leads_created_idx on public.leads(created_at desc);
create index if not exists leads_status_idx on public.leads(lead_status);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,full_name)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''))
 on conflict(id) do nothing;
 return new;
end; $$;

drop trigger if exists on_auth_user_created_phoneflex on auth.users;
create trigger on_auth_user_created_phoneflex after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.phoneflex_is_admin()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;

create or replace function public.phoneflex_is_seller_member(target_seller_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.seller_members where seller_id=target_seller_id and user_id=auth.uid());
$$;

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.phones enable row level security;
alter table public.sellers enable row level security;
alter table public.seller_members enable row level security;
alter table public.listings enable row level security;
alter table public.finance_providers enable row level security;
alter table public.finance_offers enable row level security;
alter table public.leads enable row level security;

drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin on public.profiles for select to authenticated
using(id=auth.uid() or public.phoneflex_is_admin());
drop policy if exists profiles_admin_manage on public.profiles;
create policy profiles_admin_manage on public.profiles for all to authenticated
using(public.phoneflex_is_admin()) with check(public.phoneflex_is_admin());

drop policy if exists brands_public_read_active on public.brands;
create policy brands_public_read_active on public.brands for select to anon,authenticated
using(is_active or public.phoneflex_is_admin());
drop policy if exists brands_admin_manage on public.brands;
create policy brands_admin_manage on public.brands for all to authenticated
using(public.phoneflex_is_admin()) with check(public.phoneflex_is_admin());

drop policy if exists phones_public_read_published on public.phones;
create policy phones_public_read_published on public.phones for select to anon,authenticated
using(is_published or public.phoneflex_is_admin());
drop policy if exists phones_admin_manage on public.phones;
create policy phones_admin_manage on public.phones for all to authenticated
using(public.phoneflex_is_admin()) with check(public.phoneflex_is_admin());

drop policy if exists sellers_admin_read on public.sellers;
create policy sellers_admin_read on public.sellers for select to authenticated
using(public.phoneflex_is_admin());
drop policy if exists sellers_admin_manage on public.sellers;
create policy sellers_admin_manage on public.sellers for all to authenticated
using(public.phoneflex_is_admin()) with check(public.phoneflex_is_admin());

drop policy if exists seller_members_read_self_or_admin on public.seller_members;
create policy seller_members_read_self_or_admin on public.seller_members for select to authenticated
using(user_id=auth.uid() or public.phoneflex_is_admin());
drop policy if exists seller_members_admin_manage on public.seller_members;
create policy seller_members_admin_manage on public.seller_members for all to authenticated
using(public.phoneflex_is_admin()) with check(public.phoneflex_is_admin());

create or replace view public.public_sellers as
select id,name,slug,description,logo_url,website_url,county,town,whatsapp_number
from public.sellers where is_active=true and verification_status='verified';
grant select on public.public_sellers to anon,authenticated;

drop policy if exists listings_public_read_active on public.listings;
create policy listings_public_read_active on public.listings for select to anon,authenticated
using((listing_status='active' and stock_status in ('in_stock','preorder') and stock_quantity>0
 and exists(select 1 from public.public_sellers s where s.id=seller_id)
 and exists(select 1 from public.phones p where p.id=phone_id and p.is_published))
 or public.phoneflex_is_admin() or public.phoneflex_is_seller_member(seller_id));
drop policy if exists listings_seller_insert on public.listings;
create policy listings_seller_insert on public.listings for insert to authenticated
with check(public.phoneflex_is_admin() or public.phoneflex_is_seller_member(seller_id));
drop policy if exists listings_seller_update on public.listings;
create policy listings_seller_update on public.listings for update to authenticated
using(public.phoneflex_is_admin() or public.phoneflex_is_seller_member(seller_id))
with check(public.phoneflex_is_admin() or public.phoneflex_is_seller_member(seller_id));
drop policy if exists listings_admin_delete on public.listings;
create policy listings_admin_delete on public.listings for delete to authenticated
using(public.phoneflex_is_admin());

drop policy if exists finance_providers_public_read_active on public.finance_providers;
create policy finance_providers_public_read_active on public.finance_providers for select to anon,authenticated
using(is_active or public.phoneflex_is_admin());
drop policy if exists finance_providers_admin_manage on public.finance_providers;
create policy finance_providers_admin_manage on public.finance_providers for all to authenticated
using(public.phoneflex_is_admin()) with check(public.phoneflex_is_admin());

drop policy if exists finance_offers_public_read_active on public.finance_offers;
create policy finance_offers_public_read_active on public.finance_offers for select to anon,authenticated
using((is_active and (valid_from is null or valid_from<=now()) and (valid_until is null or valid_until>now())
 and exists(select 1 from public.finance_providers fp where fp.id=provider_id and fp.is_active))
 or public.phoneflex_is_admin());
drop policy if exists finance_offers_admin_manage on public.finance_offers;
create policy finance_offers_admin_manage on public.finance_offers for all to authenticated
using(public.phoneflex_is_admin()) with check(public.phoneflex_is_admin());

drop policy if exists leads_public_submit on public.leads;
create policy leads_public_submit on public.leads for insert to anon,authenticated
with check(consent_to_contact=true);
drop policy if exists leads_admin_read on public.leads;
create policy leads_admin_read on public.leads for select to authenticated using(public.phoneflex_is_admin());
drop policy if exists leads_admin_update on public.leads;
create policy leads_admin_update on public.leads for update to authenticated
using(public.phoneflex_is_admin()) with check(public.phoneflex_is_admin());
drop policy if exists leads_admin_delete on public.leads;
create policy leads_admin_delete on public.leads for delete to authenticated using(public.phoneflex_is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('phone-images','phone-images',true,5242880,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists phone_images_public_read on storage.objects;
create policy phone_images_public_read on storage.objects for select to anon,authenticated using(bucket_id='phone-images');
drop policy if exists phone_images_admin_upload on storage.objects;
create policy phone_images_admin_upload on storage.objects for insert to authenticated
with check(bucket_id='phone-images' and public.phoneflex_is_admin());
drop policy if exists phone_images_admin_update on storage.objects;
create policy phone_images_admin_update on storage.objects for update to authenticated
using(bucket_id='phone-images' and public.phoneflex_is_admin())
with check(bucket_id='phone-images' and public.phoneflex_is_admin());
drop policy if exists phone_images_admin_delete on storage.objects;
create policy phone_images_admin_delete on storage.objects for delete to authenticated
using(bucket_id='phone-images' and public.phoneflex_is_admin());

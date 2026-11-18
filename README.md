# PhoneFlex Kenya

Next.js 15 + Supabase marketplace foundation for Kenya: multi-seller phone catalogue, cash prices, multiple financing providers, WhatsApp-first enquiries, admin workspace and CSV imports.

## Local setup (Windows)

1. Install Node.js 20.9 or newer.
2. Extract this folder.
3. Copy `.env.example` to `.env.local`:

   ```cmd
   copy .env.example .env.local
   ```

4. Add your PhoneFlex WhatsApp Business number to `NEXT_PUBLIC_WHATSAPP_NUMBER` in `.env.local` (international format without `+`, e.g. `2547XXXXXXXX`).
5. Install and run:

   ```cmd
   npm install
   npm run dev
   ```

6. Open http://localhost:3000.

The Supabase project URL and public publishable key are prefilled. The publishable key is designed for browser use; database access is restricted by Row Level Security. Never put a Supabase service-role/secret key in a `NEXT_PUBLIC_` variable.

## Database

The connected Supabase project already has the PhoneFlex marketplace schema deployed. The schema contains:

- `brands`, `phones` (categorised as smartphones, feature phones, foldables, gaming phones, rugged phones and tablets)
- `sellers`, `seller_members`, `listings`
- `finance_providers`, `finance_offers`
- `leads`, `profiles`
- `public_sellers` view and `phone-images` storage bucket

The current application code is aligned to these normalized table and column names. Do not run the old schema file from the original starter ZIP over the live project.

## Create the first administrator

1. In Supabase Dashboard, open Authentication > Users and create the administrator account.
2. Copy that user's UUID.
3. In SQL Editor, run:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = 'PASTE_AUTH_USER_UUID_HERE';
   ```

4. Sign in at http://localhost:3000/admin/login. If an administrator is already signed in, the login page redirects to the workspace. Use Log out in the admin sidebar to end the current session.

New accounts default to the `customer` role. Only a profile explicitly promoted to `admin` can enter the admin workspace.

## Admin workflows

- Products: create phone models, import CSV, publish/unpublish catalogue entries.
- Sellers: add retailers, verify them, create seller-specific prices, stock and warranty. Each listing has independent Cash and Financing switches; at least one must remain enabled.
- Financing: register providers and save offers as inactive drafts pending verification. An offer is only shown where the seller listing has Financing enabled and the provider/offer is active and in date.
- Leads: review enquiries, update status and export CSV.

A phone model is not purchasable just because it exists in the catalogue. It needs a published phone record plus an active listing from a verified, active seller with available stock.

## CSV format

Required columns: `name,brand,slug`.

Optional columns: `model,category,ram_gb,storage_gb,screen_inches,battery_mah,network,condition_type,image_url,description,is_published`.

`category` accepts `smartphone`, `feature_phone`, `foldable`, `gaming`, `rugged` or `tablet`. The Kenya starter catalogue seeds 188 representative phone/tablet models across 30 brands. These model records are published in the catalogue; this does not mean they are in stock or purchasable. Confirm variants/specifications and add a verified seller listing with current price and stock before treating a model as available. The financing admin suggests a 10% deposit based on the lowest current seller cash listing for the selected phone; verify the amount and provider terms before activating an offer. `network` accepts values such as `4G`, `5G`, or `4G / 5G`. Import creates/updates phone model records and brands. Seller prices, stock and financing offers are managed separately.

## WhatsApp and lead capture

The enquiry form records a lead through `/api/leads` using the public key and an RLS policy that only permits inserts when the customer has explicitly checked the contact-consent box. After the lead is saved, the browser opens a prefilled WhatsApp conversation with the selected seller/provider number (or the central number configured in `.env.local`).

WhatsApp handoff is not payment processing or a confirmed order.

## Before public launch

- Add real Kenyan catalogue records and properly licensed product imagery.
- Verify sellers and their phone numbers; confirm prices and stock regularly.
- Confirm financing agreements, fees, total payable and eligibility with each provider before activating offers.
- Add privacy notice, data retention policy, rate limiting/CAPTCHA and abuse monitoring.
- Test RLS with anonymous, customer and admin accounts.
- Configure production domain, HTTPS, backups, monitoring and deployment secrets.
- Test the full enquiry path on mobile devices and WhatsApp.

This project is a functional software foundation, not a live national inventory feed. Nationwide coverage requires ongoing merchant onboarding and catalogue/stock feeds.

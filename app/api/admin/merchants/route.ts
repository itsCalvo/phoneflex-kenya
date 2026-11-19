import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

async function requireAdmin(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase is not configured.');
  const client = createServerClient(url, key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (cookies: {name:string;value:string;options:CookieOptions}[]) => {
      cookies.forEach(({name,value,options}) => request.cookies.set(name,value));
    }
  }});
  const { data: { user } } = await client.auth.getUser();
  if (!user) return false;
  const { data: profile } = await client.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return profile?.role === 'admin';
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
    const body = await request.json();
    const name = String(body.business_name || '').trim();
    const ownerName = String(body.owner_name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const slug = String(body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).trim();
    if (!name || !ownerName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !slug) {
      return NextResponse.json({ error: 'Business name, owner name and a valid email are required.' }, { status: 400 });
    }
    const admin = createSupabaseAdmin();
    const { data: seller, error: sellerError } = await admin.from('sellers').insert({
      name, slug, whatsapp_number: body.whatsapp_number || null,
      public_email: email, public_phone: body.public_phone || null,
      town: body.town || null, county: body.county || null,
      description: body.description || null,
      verification_status: 'pending', is_active: false
    }).select('id,name,slug').single();
    if (sellerError) return NextResponse.json({ error: sellerError.message }, { status: 400 });

    const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL + '/merchant/login'
      : new URL('/merchant/login', request.url).toString();
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: ownerName },
      redirectTo
    });
    if (inviteError || !invited.user) {
      await admin.from('sellers').delete().eq('id', seller.id);
      return NextResponse.json({ error: inviteError?.message || 'Merchant invitation could not be created.' }, { status: 400 });
    }
    const { error: profileError } = await admin.from('profiles').upsert({ id: invited.user.id, full_name: ownerName, role: 'seller' });
    const { error: memberError } = await admin.from('seller_members').insert({ seller_id: seller.id, user_id: invited.user.id, member_role: 'owner' });
    if (profileError || memberError) {
      await admin.auth.admin.deleteUser(invited.user.id);
      await admin.from('sellers').delete().eq('id', seller.id);
      return NextResponse.json({ error: profileError?.message || memberError?.message || 'Merchant account setup failed.' }, { status: 500 });
    }
    return NextResponse.json({ seller, invited: true, message: 'Merchant created and invitation email sent. They can set their password from the invitation.' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected server error.' }, { status: 500 });
  }
}
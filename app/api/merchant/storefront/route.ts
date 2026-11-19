import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

async function getMember(request: NextRequest) {
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
  if (!user) return null;
  const admin = createSupabaseAdmin();
  const { data: membership } = await admin.from('seller_members').select('seller_id,member_role,sellers(*)').eq('user_id', user.id).limit(1).maybeSingle();
  if (!membership) return null;
  return { user, seller: membership.sellers as any, role: membership.member_role };
}

export async function GET(request: NextRequest) {
  try {
    const member = await getMember(request);
    if (!member) return NextResponse.json({ error: 'Merchant access required.' }, { status: 403 });
    return NextResponse.json({ seller: member.seller, role: member.role });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const member = await getMember(request);
    if (!member) return NextResponse.json({ error: 'Merchant access required.' }, { status: 403 });
    if (member.role !== 'owner' && member.role !== 'manager') return NextResponse.json({ error: 'Only owners and managers can edit the storefront.' }, { status: 403 });
    const body = await request.json();
    const allowed = ['description','logo_url','website_url','whatsapp_number','public_phone','public_email','town','county','storefront_config'];
    const update: Record<string, unknown> = {};
    for (const field of allowed) if (body[field] !== undefined) update[field] = body[field];
    if (update.storefront_config && typeof update.storefront_config !== 'object') return NextResponse.json({ error: 'Invalid storefront settings.' }, { status: 400 });
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.from('sellers').update(update).eq('id', member.seller.id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ seller: data, message: 'Storefront saved.' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error.' }, { status: 500 });
  }
}
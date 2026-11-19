import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
export async function POST(request:Request){
 try{
  const body=await request.json();if(!['admin','seller'].includes(body.role))return NextResponse.json({error:'Invalid role'},{status:400});
  const cookieStore=await cookies();const headerStore=await headers();
  const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>cookieStore.getAll(),setAll:(items)=>items.forEach(({name,value,options})=>cookieStore.set(name,value,options))}});
  const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)return NextResponse.json({error:'Authentication required'},{status:401});
  const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();if(profile?.role!==body.role)return NextResponse.json({error:'Role mismatch'},{status:403});
  const clean=(v:unknown,max=80)=>typeof v==='string'?v.slice(0,max):null;
  const {error}=await supabase.from('login_events').insert({user_id:user.id,email:user.email,role:profile.role,device_type:clean(body.device_type,20),browser:clean(body.browser,30),operating_system:clean(body.operating_system,30),screen_size:clean(body.screen_size,24),timezone:clean(body.timezone,80),language:clean(body.language,20),city:clean(headerStore.get('x-vercel-ip-city'),100),region:clean(headerStore.get('x-vercel-ip-country-region'),100),country:clean(headerStore.get('x-vercel-ip-country'),3)});
  if(error)throw error;return NextResponse.json({ok:true});
 }catch(error){console.error('Login audit event failed:',error);return NextResponse.json({error:'Could not record sign-in details'},{status:500});}
}

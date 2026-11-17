import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function middleware(request:NextRequest){
 if(request.nextUrl.pathname==='/admin/login')return NextResponse.next();
 let response=NextResponse.next({request});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return NextResponse.redirect(new URL('/admin/login',request.url));
 const supabase=createServerClient(url,key,{cookies:{getAll(){return request.cookies.getAll();},setAll(cookies){cookies.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookies.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.redirect(new URL('/admin/login',request.url));
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
 if(!profile||profile.role!=='admin')return NextResponse.redirect(new URL('/admin/login?error=not_authorized',request.url));
 return response;
}
export const config={matcher:['/admin/:path*']};

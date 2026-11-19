import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function middleware(request:NextRequest){
 const path=request.nextUrl.pathname;
 if(path==='/admin/login'||path==='/merchant/login')return NextResponse.next();
 let response=NextResponse.next({request});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return NextResponse.redirect(new URL(path.startsWith('/merchant')?'/merchant/login':'/admin/login',request.url));
 const supabase=createServerClient(url,key,{cookies:{getAll(){return request.cookies.getAll();},setAll(cookies: { name: string; value: string; options: CookieOptions }[]){cookies.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookies.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user){const redirect=NextResponse.redirect(new URL(path.startsWith('/merchant')?'/merchant/login':'/admin/login',request.url));response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));return redirect;}
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
 if(path.startsWith('/admin')){if(!profile||profile.role!=='admin'){const redirect=NextResponse.redirect(new URL('/admin/login?error=not_authorized',request.url));response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));return redirect;}}
 else {const {data:member}=await supabase.from('seller_members').select('seller_id').eq('user_id',user.id).limit(1).maybeSingle();if(!profile||profile.role!=='seller'||!member){const redirect=NextResponse.redirect(new URL('/merchant/login?error=not_authorized',request.url));response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));return redirect;}}
 return response;
}
export const config={matcher:['/admin/:path*','/merchant/:path*']};
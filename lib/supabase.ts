import { createBrowserClient } from '@supabase/ssr';
let client: ReturnType<typeof createBrowserClient> | null = null;
export const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 ? (client ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{
   cookieOptions:{maxAge:60*60*24*30,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},
   auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
 })) : null;

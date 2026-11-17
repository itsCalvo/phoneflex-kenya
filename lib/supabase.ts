import { createBrowserClient } from '@supabase/ssr';
let client: ReturnType<typeof createBrowserClient> | null = null;
export const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 ? (client ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) : null;

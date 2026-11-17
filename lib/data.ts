import { createClient } from '@supabase/supabase-js';
import { demoProducts } from './demo-data';
import type { ProductWithListings } from './types';
import { money } from './money';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const publicDb=url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
export const isDemoMode=!publicDb;
export async function getProducts():Promise<ProductWithListings[]>{
 if(!publicDb)return demoProducts as unknown as ProductWithListings[];
 const [phonesRes,listingsRes,sellersRes,offersRes]=await Promise.all([
  publicDb.from('phones').select('*, brands(name)').eq('is_published',true).order('created_at',{ascending:false}),
  publicDb.from('listings').select('*').eq('listing_status','active').in('stock_status',['in_stock','preorder']).gt('stock_quantity',0),
  publicDb.from('public_sellers').select('*'),
  publicDb.from('finance_offers').select('*, finance_providers(*)').eq('is_active',true)
 ]);
 if(phonesRes.error){console.error('Phone catalogue query failed:',phonesRes.error.message);return [];}
 const sellers=new Map<string,any>((sellersRes.data||[]).map((s:any)=>[s.id,s]));
 const listings=(listingsRes.data||[]).map((l:any)=>({...l,cash_price:Number(l.cash_price_kes),warranty:l.warranty_months?`${l.warranty_months} months`:null,seller:(sellers.get(l.seller_id) ? { ...sellers.get(l.seller_id), business_name:(sellers.get(l.seller_id) as any).name, location:[(sellers.get(l.seller_id) as any).town,(sellers.get(l.seller_id) as any).county].filter(Boolean).join(', '), verified:true } : undefined)}));
 const offers=(offersRes.data||[]).map((o:any)=>({id:o.id,provider_id:o.provider_id,phone_id:o.phone_id,listing_id:o.listing_id,deposit_amount:Number(o.deposit_kes),installment_amount:Number(o.instalment_amount_kes),installment_frequency:o.instalment_frequency,term_count:o.instalment_count,total_payable:Number(o.total_payable_kes),fees:Number(o.fees_kes),active:o.is_active,provider:o.finance_providers?{...o.finance_providers,contact_phone:o.finance_providers.whatsapp_number||o.finance_providers.contact_phone}:undefined}));
 return (phonesRes.data||[]).map((row:any)=>({
  id:row.id,slug:row.slug,name:row.name,brand:row.brands?.name||'Other',model:row.model,image_url:row.image_url,
  cash_price:null,ram_gb:row.ram_gb,storage_gb:row.storage_gb,display_size:row.screen_inches?`${row.screen_inches} inch`:null,
  battery_mah:row.battery_mah,network:(row.network||[]).join(' / '),condition:row.condition_type,
  description:row.description,featured:false,active:row.is_published,
  listings:listings.filter((l:any)=>l.phone_id===row.id),
  finance_offers:offers.filter((o:any)=>o.phone_id===null||o.phone_id===row.id||listings.some((l:any)=>l.phone_id===row.id&&l.id===o.listing_id))
 })) as ProductWithListings[];
}
export async function getProduct(slug:string):Promise<ProductWithListings|undefined>{return (await getProducts()).find(p=>p.slug===slug);}
export {money};

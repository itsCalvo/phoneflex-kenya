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
 const [phonesRes,listingsRes,sellersRes,offersRes,variantsRes]=await Promise.all([
  publicDb.from('phones').select('*, brands(name)').eq('is_published',true).order('created_at',{ascending:false}),
  publicDb.from('listings').select('*').eq('listing_status','active').in('stock_status',['in_stock','preorder']).gt('stock_quantity',0),
  publicDb.from('public_sellers').select('*'),
  publicDb.from('finance_offers').select('*, finance_providers(*)').eq('is_active',true),
  publicDb.from('phone_variants').select('*').eq('is_active',true)
 ]);
 if(phonesRes.error){console.error('Phone catalogue query failed:',phonesRes.error.message);return [];}
 if(variantsRes.error)console.error('Phone variants query failed:',variantsRes.error.message);
 const sellers=new Map<string,any>((sellersRes.data||[]).map((s:any)=>[s.id,s]));
 const listings=(listingsRes.data||[]).map((l:any)=>({...l,cash_price:Number(l.cash_price_kes),cash_enabled:l.cash_enabled!==false,financing_enabled:l.financing_enabled!==false,warranty:l.warranty_months?String(l.warranty_months)+' months':null,seller:(sellers.get(l.seller_id)?{...sellers.get(l.seller_id),business_name:sellers.get(l.seller_id).name,location:[sellers.get(l.seller_id).town,sellers.get(l.seller_id).county].filter(Boolean).join(', '),verified:true}:undefined)}));
 const now=Date.now();
 const offers=(offersRes.data||[]).filter((o:any)=>{const provider=o.finance_providers;if(!provider||!provider.is_active)return false;if(o.valid_from&&new Date(o.valid_from).getTime()>now)return false;if(o.valid_until&&new Date(o.valid_until).getTime()<=now)return false;return true;}).map((o:any)=>({id:o.id,provider_id:o.provider_id,phone_id:o.phone_id,listing_id:o.listing_id,deposit_amount:Number(o.deposit_kes),installment_amount:Number(o.instalment_amount_kes),installment_frequency:o.installment_frequency,term_count:o.instalment_count,total_payable:Number(o.total_payable_kes),fees:Number(o.fees_kes),active:o.is_active,provider:o.finance_providers?{...o.finance_providers,contact_phone:o.finance_providers.whatsapp_number||o.finance_providers.contact_phone}:undefined}));
 const variantsByPhone=new Map<string,any[]>();
 for(const v of variantsRes.data||[]){const rows=variantsByPhone.get(v.phone_id)||[];rows.push(v);variantsByPhone.set(v.phone_id,rows);}
 const products:ProductWithListings[]=[];
 for(const row of phonesRes.data||[]){
  const phoneVariants=variantsByPhone.get(row.id)||[];
  const base={id:row.id,slug:row.slug,name:row.name,brand:row.brands?.name||'Other',model:row.model,category:row.category||'smartphone',image_url:row.image_url||(row.images||[])[0]||null,images:Array.from(new Set([...(row.images||[]),...(row.image_url?[row.image_url]:[])])),cash_price:null,ram_gb:row.ram_gb,storage_gb:row.storage_gb,display_size:row.screen_inches?String(row.screen_inches)+' inch':null,battery_mah:row.battery_mah,network:(row.network||[]).join(' / '),condition:row.condition_type,description:row.description,camera_summary:row.camera_summary,operating_system:row.operating_system,specifications:row.specifications||{},featured:false,active:row.is_published};
  const targets=phoneVariants.length?phoneVariants:[null];
  for(const variant of targets){
   const variantListings=listings.filter((l:any)=>l.phone_id===row.id&&(variant?l.variant_id===variant.id:!l.variant_id));
   const financeListings=variantListings.filter((l:any)=>l.financing_enabled);
   const visibleOffers=offers.filter((o:any)=>{if(o.listing_id)return financeListings.some((l:any)=>l.id===o.listing_id);if(o.phone_id)return o.phone_id===row.id&&financeListings.length>0;return financeListings.length>0;});
   const suffix=variant?'-'+String(variant.variant_name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''):'';
   products.push({...base,id:variant?.id||row.id,catalogue_phone_id:row.id,slug:row.slug+suffix,name:variant?row.name+' '+variant.variant_name:row.name,image_url:variant?.image_url||base.image_url,images:variant?.image_url?Array.from(new Set([variant.image_url,...base.images])):base.images,ram_gb:variant?.ram_gb??row.ram_gb,storage_gb:variant?.storage_gb??row.storage_gb,network:variant?.network?.length?variant.network.join(' / '):base.network,listings:variantListings,finance_offers:visibleOffers,variant_id:variant?.id||null,variant_name:variant?.variant_name||null,model_number:variant?.model_number||null,source_url:variant?.source_url||null});
  }
 }
 return products;
}
export async function getProduct(slug:string):Promise<ProductWithListings|undefined>{return (await getProducts()).find(p=>p.slug===slug);}
export {money};

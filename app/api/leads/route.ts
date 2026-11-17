import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export async function POST(request:Request){
 try{
  const body=await request.json();
  const customer_name=String(body.customer_name||'').trim();
  const customer_phone=String(body.phone_number||body.customer_phone||'').replace(/[^+\d]/g,'');
  const payment=String(body.payment_method||'cash').toLowerCase();
  const payment_method=payment==='financing'||payment==='instalments'?'instalments':payment;
  const consent_to_contact=body.consent_to_contact===true;
  if(customer_name.length<2||customer_phone.length<9||!['cash','instalments'].includes(payment_method)||!consent_to_contact)
   return NextResponse.json({error:'Please provide valid contact details and consent to be contacted.'},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)return NextResponse.json({error:'The marketplace lead database is not configured yet.'},{status:503});
  const db=createClient(url,key,{auth:{persistSession:false}});
  const {error}=await db.from('leads').insert({
   customer_name,customer_phone,phone_id:body.product_id||null,listing_id:body.listing_id||null,
   seller_id:body.seller_id||null,finance_offer_id:body.finance_offer_id||null,
   payment_method,county:body.county||null,town:body.location||null,
   preferred_contact:'whatsapp',message:body.product_name?`Enquiry for ${String(body.product_name).slice(0,150)}`:null,
   consent_to_contact:true,source:'website'
  });
  if(error)throw error;
  return NextResponse.json({ok:true});
 }catch(e){console.error('Lead capture error',e);return NextResponse.json({error:'We could not record your enquiry. Please try again or contact the seller directly.'},{status:500});}
}

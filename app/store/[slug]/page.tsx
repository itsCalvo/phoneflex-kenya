import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { getProducts } from '@/lib/data';
import ProductCard from '@/components/ProductCard';

export const dynamic='force-dynamic';
export default async function MerchantStore({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)notFound();
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:seller}=await db.from('public_storefronts').select('*').eq('slug',slug).maybeSingle();
 if(!seller)notFound();
 const config:any=seller.storefront_config||{};
 const products=await getProducts();
 const storeProducts=products.filter(p=>p.listings?.some(l=>l.seller?.id===seller.id));
 return <main className="public-store" style={{'--store-accent':config.accent||'#176b4b'} as React.CSSProperties}>
 <header className="public-store-header"><Link href="/" className="brand"><span className="brand-mark">P</span><span>phoneflex</span></Link><span>{seller.name}</span></header>
 {config.announcement&&<div className="public-store-announcement">{config.announcement}</div>}
 <section className="public-store-hero" style={config.hero_image_url?{backgroundImage:'linear-gradient(90deg,#10251ddd,#10251d55),url('+config.hero_image_url+')'}:{}}>
 <div><span className="eyebrow">OFFICIAL MERCHANT STORE</span><h1>{config.hero_title||seller.name}</h1><p>{config.hero_subtitle||seller.description||'Shop trusted devices from this merchant.'}</p><a href="#products">{config.hero_cta||'Shop phones'} →</a></div></section>
 <section className="public-store-body"><div className="public-store-heading"><div><span className="eyebrow">{seller.town||seller.county||'KENYA'}</span><h2>Available from {seller.name}</h2><p>{seller.description||config.about_text||'Browse this merchant’s current listings.'}</p></div>{seller.whatsapp_number&&<a className="btn btn-whatsapp" href={'https://wa.me/'+String(seller.whatsapp_number).replace(/\D/g,'')}>WhatsApp store</a>}</div>
 <div id="products" className="product-grid">{storeProducts.map(p=><ProductCard key={p.id} product={p}/>)}</div>{!storeProducts.length&&<div className="empty-state"><h3>Stock is being updated</h3><p>This merchant has not published any available phone listings yet.</p></div>}</section>
 <footer className="public-store-footer">Storefront powered by <Link href="/">PhoneFlex Kenya</Link></footer></main>;
}
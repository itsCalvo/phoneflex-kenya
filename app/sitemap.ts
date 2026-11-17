import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/data';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const base=(process.env.NEXT_PUBLIC_SITE_URL||'https://phoneflex.co.ke').replace(/\/$/,'');const products=await getProducts();return [{url:base,lastModified:new Date(),changeFrequency:'daily',priority:1},{url:`${base}/#phones`,changeFrequency:'daily',priority:.9},...products.map(p=>({url:`${base}/products/${p.slug}`,lastModified:new Date(),changeFrequency:'weekly' as const,priority:.8}))];}

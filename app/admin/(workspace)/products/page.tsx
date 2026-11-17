'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Plus,Upload,Eye,EyeOff} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {money} from '@/lib/money';
type Row={id:string;name:string;slug:string;image_url:string|null;is_published:boolean;brand?:{name:string}|null};
export default function ProductsAdmin(){
 const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 async function load(){if(!supabase){setError('Supabase is not configured.');setLoading(false);return;}const {data,error}=await supabase.from('phones').select('id,name,slug,image_url,is_published,brands(name)').order('created_at',{ascending:false});if(error)setError(error.message);else setRows((data||[]) as unknown as Row[]);setLoading(false);}
 useEffect(()=>{load();},[]);
 async function toggle(p:Row){if(!supabase)return;const {error}=await supabase.from('phones').update({is_published:!p.is_published}).eq('id',p.id);if(error)setError(error.message);else setRows(old=>old.map(x=>x.id===p.id?{...x,is_published:!x.is_published}:x));}
 return <div className="admin-content"><div className="admin-topline"><div><span className="eyebrow">CATALOGUE MANAGEMENT</span><h1>Products</h1><p>Manage central phone models and publication status.</p></div><div className="admin-actions"><Link href="/admin/import" className="btn btn-outline"><Upload size={16}/> Import CSV</Link><Link href="/admin/products/new" className="btn btn-primary"><Plus size={16}/> Add phone</Link></div></div><div className="admin-panel table-panel">{loading?<div className="loading-state">Loading catalogue…</div>:error?<p className="form-error">{error}</p>:<div className="table-scroll"><table className="data-table"><thead><tr><th>Product</th><th>Brand</th><th>Visibility</th><th>Action</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><div className="table-product"><img src={p.image_url||'/phone-placeholder.svg'} alt=""/><b>{p.name}</b></div></td><td>{p.brand?.name||'—'}</td><td><span className={p.is_published?'status-live':'status-pending'}>{p.is_published?'Published':'Draft'}</span></td><td><button className="btn btn-outline" onClick={()=>toggle(p)}>{p.is_published?<><EyeOff size={14}/> Unpublish</>:<><Eye size={14}/> Publish</>}</button></td></tr>)}</tbody></table></div>}<div className="table-foot">{rows.length} catalogue records · Publish only after product details and a valid seller offer have been checked.</div></div></div>;
}

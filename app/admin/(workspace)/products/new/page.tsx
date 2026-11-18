'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
const slugify=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export default function NewProduct(){
 const [form,setForm]=useState({name:'',brand:'',model:'',slug:'',category:'smartphone',ram_gb:'',storage_gb:'',display_size:'',battery_mah:'',network:'4G',condition:'new',image_url:'',description:''});
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 function set(k:string,v:string){setForm(old=>({...old,[k]:v,...(k==='name'&&!old.slug?{slug:slugify(v)}:{})}));}
 async function submit(e:React.FormEvent){e.preventDefault();if(!supabase){setMessage('Supabase is not configured.');return;}setBusy(true);setMessage('');
  try{
   const {data:brand,error:brandError}=await supabase.from('brands').upsert({name:form.brand,slug:slugify(form.brand),is_active:true},{onConflict:'slug'}).select('id').single();
   if(brandError)throw brandError;
   const {error}=await supabase.from('phones').insert({brand_id:brand.id,name:form.name,model:form.model||null,slug:form.slug,category:form.category,ram_gb:form.ram_gb?Number(form.ram_gb):null,storage_gb:form.storage_gb?Number(form.storage_gb):null,screen_inches:form.display_size?Number.parseFloat(form.display_size):null,battery_mah:form.battery_mah?Number(form.battery_mah):null,network:form.network.split('/').map(x=>x.trim()),condition_type:form.condition,image_url:form.image_url||null,description:form.description,is_published:false});
   if(error)throw error;setMessage('Phone model saved. Add a verified seller listing and publish the model after checking its details.');
   setForm({name:'',brand:'',model:'',slug:'',category:'smartphone',ram_gb:'',storage_gb:'',display_size:'',battery_mah:'',network:'4G',condition:'new',image_url:'',description:''});
  }catch(e){setMessage(e instanceof Error?e.message:'Could not save phone.');}finally{setBusy(false);}
 }
 return <div className="admin-content"><Link href="/admin/products" className="back-link"><ArrowLeft size={15}/> Back to products</Link><div className="admin-topline"><div><span className="eyebrow">CATALOGUE MANAGEMENT</span><h1>Add a phone model</h1><p>Create a central product record. Seller offers are managed separately.</p></div></div><form className="admin-panel product-edit-form" onSubmit={submit}><div className="form-grid">
 <label>Product name *<input required value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Samsung Galaxy A16"/></label>
 <label>Brand *<input required value={form.brand} onChange={e=>set('brand',e.target.value)} placeholder="Samsung"/></label>
 <label>Category<select value={form.category} onChange={e=>set('category',e.target.value)}><option value="smartphone">Smartphone</option><option value="feature_phone">Feature phone</option><option value="foldable">Foldable phone</option><option value="gaming">Gaming phone</option><option value="rugged">Rugged phone</option><option value="tablet">Tablet</option></select></label>
 <label>Model<input value={form.model} onChange={e=>set('model',e.target.value)} placeholder="Galaxy A16"/></label>
 <label>URL slug *<input required value={form.slug} onChange={e=>set('slug',e.target.value)} placeholder="samsung-galaxy-a16"/></label>
 <label>RAM (GB)<input type="number" min="1" value={form.ram_gb} onChange={e=>set('ram_gb',e.target.value)}/></label>
 <label>Storage (GB)<input type="number" min="1" value={form.storage_gb} onChange={e=>set('storage_gb',e.target.value)}/></label>
 <label>Display size (inches)<input type="number" step="0.1" min="1" value={form.display_size} onChange={e=>set('display_size',e.target.value)}/></label>
 <label>Battery (mAh)<input type="number" min="1" value={form.battery_mah} onChange={e=>set('battery_mah',e.target.value)}/></label>
 <label>Network<select value={form.network} onChange={e=>set('network',e.target.value)}><option>4G</option><option>5G</option><option>4G / 5G</option><option>3G</option></select></label>
 <label>Condition<select value={form.condition} onChange={e=>set('condition',e.target.value)}><option value="new">New</option><option value="refurbished">Refurbished</option><option value="used">Used</option></select></label>
 <label>Product image URL<input type="url" value={form.image_url} onChange={e=>set('image_url',e.target.value)}/></label>
 <label className="form-span">Description<textarea rows={4} value={form.description} onChange={e=>set('description',e.target.value)}/></label></div>
 {message&&<p className="admin-form-message">{message}</p>}<div className="form-actions"><button className="btn btn-primary" disabled={busy}><Save size={16}/>{busy?'Saving…':'Save phone model'}</button></div></form></div>;
}

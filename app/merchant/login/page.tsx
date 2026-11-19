'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, Mail, LockKeyhole } from 'lucide-react';
import { supabase } from '@/lib/supabase';
export default function MerchantLogin() {
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const router=useRouter();
 async function submit(e:React.FormEvent){e.preventDefault();setError('');if(!supabase){setError('Supabase is not configured.');return;}setLoading(true);const {error}=await supabase.auth.signInWithPassword({email,password});if(error){setLoading(false);setError(error.message);return;}const {data:{user}}=await supabase.auth.getUser();const {data:member}=user?await supabase.from('seller_members').select('seller_id').eq('user_id',user.id).limit(1).maybeSingle():{data:null};setLoading(false);if(!member){await supabase.auth.signOut({scope:'local'});setError('This account is not linked to a merchant. Ask PhoneFlex admin for an invitation.');return;}router.replace('/merchant');router.refresh();}
 return <div className="login-wrap"><div className="login-card"><div className="login-icon"><Store/></div><span className="eyebrow">MERCHANT PORTAL</span><h1>Manage your store.</h1><p>Sign in to manage listings and customise your PhoneFlex storefront.</p><form onSubmit={submit}><label>Email address<div className="login-input"><Mail/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div></label><label>Password<div className="login-input"><LockKeyhole/><input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></div></label>{error&&<div className="form-error">{error}</div>}<button className="btn btn-primary btn-full" disabled={loading}>{loading?'Signing in…':'Sign in to merchant portal'}</button></form><Link href="/" className="login-back">← Return to PhoneFlex</Link></div></div>;
}
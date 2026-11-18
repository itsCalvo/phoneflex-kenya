'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
export default function AdminLogoutButton(){const [busy,setBusy]=useState(false);const router=useRouter();async function logout(){if(!supabase)return;setBusy(true);const {error}=await supabase.auth.signOut({scope:'local'});setBusy(false);if(error){window.alert('Could not sign out: '+error.message);return;}router.replace('/admin/login');router.refresh();}return <button type="button" className="admin-nav-item admin-logout" onClick={logout} disabled={busy}><LogOut size={17}/>{busy?'Signing out…':'Log out'}</button>}

export async function recordLoginEvent(role: 'admin' | 'seller') {
 if(typeof window==='undefined')return;
 const ua=navigator.userAgent;
 const browser=/Edg\//.test(ua)?'Edge':/Chrome\//.test(ua)?'Chrome':/Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)?'Safari':'Other';
 const operating_system=/Windows/.test(ua)?'Windows':/Android/.test(ua)?'Android':/iPhone|iPad|iPod/.test(ua)?'iOS':/Mac OS/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Other';
 const device_type=/iPad|Tablet/.test(ua)?'Tablet':/Mobi|Android|iPhone/.test(ua)?'Mobile':'Desktop';
 try{await fetch('/api/auth/login-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role,browser,operating_system,device_type,screen_size:`${window.screen.width}x${window.screen.height}`,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,language:navigator.language})});}catch{/* Sign-in should not fail if telemetry is unavailable. */}
}

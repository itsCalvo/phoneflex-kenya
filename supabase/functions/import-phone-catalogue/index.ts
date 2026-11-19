import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const slugify = (v: unknown) => String(v ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const chunks = <T>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i*n, (i+1)*n));
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Sign in as an administrator first." }, 401);
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Your session is invalid. Sign in again." }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: profile } = await admin.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  if (profile?.role !== "admin") return json({ error: "Administrator access required." }, 403);
  let body: { limit?: number; offset?: number } = {};
  try { body = await req.json(); } catch { /* defaults */ }
  const limit = Math.max(1, Math.min(25, Math.floor(Number(body.limit) || 25)));
  const offset = Math.max(0, Math.floor(Number(body.offset) || 0));
  try {
    const treeRes = await fetch("https://api.github.com/repos/GetTechAPI/TechAPI/git/trees/develop?recursive=1", { headers: { "User-Agent": "PhoneFlex-Kenya-Catalogue-Importer", "Accept": "application/vnd.github+json" } });
    if (!treeRes.ok) throw new Error("TechAPI catalogue index unavailable (" + treeRes.status + ").");
    const tree = await treeRes.json();
    if (tree.truncated) throw new Error("Source index is truncated; refusing an incomplete import.");
    const files = (tree.tree || []).filter((x: any) => x.type === "blob" && /^data\/smartphone\/[^/]+\/[^/]+\/.+\.json$/i.test(x.path)).sort((a: any,b: any) => a.path.localeCompare(b.path));
    const selected = files.slice(offset, offset + limit);
    if (!selected.length) return json({ ok: true, imported: 0, offset, total: files.length, done: true, message: "No more source records at this offset." });
    const results = await Promise.all(selected.map(async (f: any) => {
      const r = await fetch("https://raw.githubusercontent.com/GetTechAPI/TechAPI/develop/" + f.path);
      if (!r.ok) return null;
      return { path: f.path, data: await r.json() };
    }));
    const records = results.filter(Boolean) as { path: string; data: any }[];
    const brandNames = [...new Set(records.map(x => String(x.data.brand || x.path.split("/")[2])))];
    const { error: brandUpsertError } = await admin.from("brands").upsert(brandNames.map(name => ({ name: name.toUpperCase(), slug: slugify(name), is_active: true })), { onConflict: "slug" });
    if (brandUpsertError) throw brandUpsertError;
    const { data: brandRows, error: brandError } = await admin.from("brands").select("id,slug").in("slug", brandNames.map(slugify));
    if (brandError) throw brandError;
    const brandMap = new Map((brandRows || []).map(x => [x.slug, x.id]));
    const phones = records.map(({data:d,path}) => {
      const brandSlug = slugify(d.brand || path.split("/")[2]);
      const model = d.base_model_slug || d.slug || path.split("/").pop().replace(/\.json$/i, "");
      const slug = "techapi-" + brandSlug + "-" + slugify(model);
      const cameras = Array.isArray(d.cameras) ? d.cameras.map((c:any) => (c.type || "Camera") + ": " + (c.mp || "?") + "MP").join(", ") : null;
      return { brand_id: brandMap.get(brandSlug), name:d.name, model, slug,
        description:"Global device catalogue entry. Specifications credited to TechAPI (CC-BY-SA 4.0). Verify regional configuration before listing.",
        image_url:d.image_url || null, images:d.image_url ? [d.image_url] : [], ram_gb:Number.isFinite(d.ram_gb)?d.ram_gb:null,
        storage_gb:null, screen_inches:d.display?.size_inch || null, battery_mah:d.battery_mah || null, camera_summary:cameras,
        network:[], operating_system:d.os || null, condition_type:"new", is_published:true, category:"smartphone",
        specifications:{source:"TechAPI",source_license:"CC-BY-SA-4.0",source_url:(d.source_urls||[])[0]||null,source_urls:d.source_urls||[],
          verified:Boolean(d.verified),release_date:d.release_date||null,chipset:d.soc||null,display:d.display||null,cameras:d.cameras||[],
          charging_wired_w:d.charging_wired_w||null,charging_wireless_w:d.charging_wireless_w||null,weight_g:d.weight_g||null,
          dimensions:d.dimensions||null,ip_rating:d.ip_rating||null,connectivity:d.connectivity||null,os_version:d.os_version||null},
        _variant:d };
    }).filter(x => x.brand_id && x.name);
    for (const batch of chunks(phones.map(({_variant,...p})=>p),100)) {
      const {error}=await admin.from("phones").upsert(batch,{onConflict:"slug"}); if(error) throw error;
    }
    const {data:savedPhones,error:phoneError}=await admin.from("phones").select("id,slug").in("slug",phones.map(x=>x.slug));
    if(phoneError) throw phoneError;
    const idMap=new Map((savedPhones||[]).map(x=>[x.slug,x.id]));
    const variants:any[]=[];
    for(const p of phones) {
      const d=p._variant;
      const capacities=Array.isArray(d.storage_options_gb)&&d.storage_options_gb.length?d.storage_options_gb:[null];
      for(const capacity of capacities) {
        const ram=Number.isFinite(d.ram_gb)?d.ram_gb:null;
        const variant_name=[ram?ram+"GB RAM":null,capacity?capacity+"GB storage":null,d.model_number||null].filter(Boolean).join(" / ")||"Base configuration";
        variants.push({phone_id:idMap.get(p.slug),variant_name,ram_gb:ram,storage_gb:capacity,model_number:d.model_number||null,
          region:d.region||null,image_url:d.image_url||null,source_url:(d.source_urls||[])[0]||null,source_name:"TechAPI",
          verified_at:d.verified?new Date().toISOString():null,is_active:true});
      }
    }
    const dedup=new Map(variants.filter(v=>v.phone_id).map(v=>[v.phone_id+":"+v.variant_name,v]));
    for(const batch of chunks([...dedup.values()],100)) {
      const {error}=await admin.from("phone_variants").upsert(batch,{onConflict:"phone_id,variant_name"}); if(error) throw error;
    }
    return json({ok:true,offset,requested:limit,source_records_read:records.length,models_upserted:phones.length,variants_upserted:dedup.size,
      total_source_records:files.length,next_offset:offset+selected.length,done:offset+selected.length>=files.length,attribution:"TechAPI, CC BY-SA 4.0"});
  } catch(e) {
    console.error("Phone catalogue import failed",e);
    return json({error:e instanceof Error?e.message:"Import failed."},500);
  }
});
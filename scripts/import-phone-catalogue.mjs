/* PhoneFlex global catalogue importer.
 * Source: GetTechAPI/TechAPI, CC-BY-SA 4.0.
 * Keeps source image URLs external; never downloads image binaries.
 * Run: npm run import:phones
 */
const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com/GetTechAPI/TechAPI/develop/';
const OWNER = 'GetTechAPI';
const REPO = 'TechAPI';
const MAX = Math.max(1, Number(process.env.PHONE_IMPORT_LIMIT || 10000));
const CONCURRENCY = Math.max(1, Math.min(20, Number(process.env.PHONE_IMPORT_CONCURRENCY || 8)));
const BATCH = 200;
const token = process.env.GITHUB_TOKEN;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your local environment. Never expose the service key in NEXT_PUBLIC_ variables.');
}

const headers = { 'User-Agent': 'PhoneFlex-Kenya-Catalogue-Importer', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function getJson(url, raw = false) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, { headers: raw ? { 'User-Agent': headers['User-Agent'] } : headers });
    if (response.ok) return raw ? response.json() : response.json();
    if (![403, 429, 500, 502, 503, 504].includes(response.status)) throw new Error(`GET ${url}: ${response.status} ${await response.text()}`);
    const wait = Number(response.headers.get('retry-after') || 0) * 1000 || Math.min(30000, 1000 * 2 ** attempt);
    await sleep(wait);
  }
  throw new Error(`GitHub source remained unavailable: ${url}`);
}
async function listDir(path) {
  const url = `${API}/repos/${OWNER}/${REPO}/contents/${path}?ref=develop`;
  return getJson(url);
}
async function discoverFiles() {
  const brands = await listDir('data/smartphone');
  const found = [];
  for (const brand of brands.filter(x => x.type === 'dir')) {
    const years = await listDir(brand.path);
    for (const year of years.filter(x => x.type === 'dir')) {
      const entries = await listDir(year.path);
      for (const entry of entries) {
        if (entry.type === 'file' && entry.name.endsWith('.json')) found.push({ path: entry.path, brand: brand.name, year: year.name });
        else if (entry.type === 'dir') {
          const models = await listDir(entry.path);
          for (const model of models) if (model.type === 'file' && model.name.endsWith('.json')) found.push({ path: model.path, brand: brand.name, year: year.name });
        }
      }
    }
    process.stdout.write(`Discovered ${brand.name}: ${found.length} records so far\\n`);
  }
  return found;
}
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (true) { const i = next++; if (i >= items.length) return; results[i] = await fn(items[i], i); }
  }));
  return results;
}
async function rest(path, method, body) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method, headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Supabase ${method} ${path}: ${response.status} ${await response.text()}`);
}
const slugify = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));

async function main() {
  console.log('Discovering TechAPI smartphone records (CC-BY-SA 4.0)...');
  const files = await discoverFiles();
  if (!files.length) throw new Error('No smartphone JSON records were discovered.');
  // Fair brand distribution: avoid filling the first import with only alphabetically early brands.
  const groups = new Map();
  for (const f of files) { const a = groups.get(f.brand) || []; a.push(f); groups.set(f.brand, a); }
  for (const a of groups.values()) a.sort((x, y) => Number(y.year) - Number(x.year) || x.path.localeCompare(y.path));
  const selected = [];
  while (selected.length < Math.min(MAX, files.length)) {
    let added = false;
    for (const rows of groups.values()) if (rows.length && selected.length < MAX) { selected.push(rows.shift()); added = true; }
    if (!added) break;
  }
  console.log(`Fetching ${selected.length} of ${files.length} discovered records across ${groups.size} brands...`);
  const records = (await mapLimit(selected, CONCURRENCY, async f => {
    try { return { file: f, data: await getJson(RAW + f.path, true) }; }
    catch (error) { console.warn('Skipping', f.path, error.message); return null; }
  })).filter(Boolean);
  const brandNames = [...new Set(records.map(x => x.data.brand || x.file.brand))];
  const brandRows = brandNames.map(name => ({ name: name.toUpperCase(), slug: slugify(name), is_active: true }));
  for (const batch of chunks(brandRows, BATCH)) await rest('brands?on_conflict=slug', 'POST', batch);
  const brandResponse = await fetch(`${supabaseUrl}/rest/v1/brands?select=id,slug`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
  if (!brandResponse.ok) throw new Error('Unable to read brand IDs: ' + await brandResponse.text());
  const brandMap = new Map((await brandResponse.json()).map(x => [x.slug, x.id]));
  const phoneRows = [];
  const variantRows = [];
  for (const { file, data: d } of records) {
    const brandSlug = slugify(d.brand || file.brand);
    const brandId = brandMap.get(brandSlug);
    if (!brandId || !d.name) continue;
    const baseSlug = `techapi-${slugify(d.slug || file.path.split('/').pop().replace(/\\.json$/, ''))}`;
    const cameras = Array.isArray(d.cameras) ? d.cameras.map(c => `${c.type}: ${c.mp || '?'}MP`).join(', ') : null;
    const storage = Array.isArray(d.storage_options_gb) ? d.storage_options_gb : [];
    const spec = { source: 'TechAPI', source_license: 'CC-BY-SA-4.0', source_url: (d.source_urls || [])[0] || null, source_urls: d.source_urls || [], verified: Boolean(d.verified), release_date: d.release_date || null, chipset: d.soc || null, display: d.display || null, cameras: d.cameras || [], charging_wired_w: d.charging_wired_w || null, charging_wireless_w: d.charging_wireless_w || null, weight_g: d.weight_g || null, dimensions: d.dimensions || null, ip_rating: d.ip_rating || null, connectivity: d.connectivity || null, os_version: d.os_version || null };
    phoneRows.push({ brand_id: brandId, name: d.name, model: d.base_model_slug || d.slug || d.name, slug: baseSlug, description: `Global device catalogue entry. Specifications credited to TechAPI (CC-BY-SA 4.0). Verify regional configuration before listing.`, image_url: d.image_url || null, images: d.image_url ? [d.image_url] : [], ram_gb: Number.isFinite(d.ram_gb) ? d.ram_gb : null, storage_gb: storage.length === 1 ? storage[0] : null, screen_inches: d.display?.size_inch || null, battery_mah: d.battery_mah || null, camera_summary: cameras, network: [], operating_system: d.os || null, condition_type: 'new', specifications: spec, is_published: true, category: 'smartphone' });
    for (const capacity of storage.length ? storage : [null]) {
      const ram = Number.isFinite(d.ram_gb) ? d.ram_gb : null;
      const variantName = [ram ? `${ram}GB RAM` : null, capacity ? `${capacity}GB storage` : null].filter(Boolean).join(' / ') || 'Base configuration';
      variantRows.push({ phone_id: null, _phone_slug: baseSlug, variant_name: variantName, ram_gb: ram, storage_gb: capacity, model_number: d.model_number || null, region: d.region || null, image_url: d.image_url || null, source_url: (d.source_urls || [])[0] || null, source_name: 'TechAPI', verified_at: d.verified ? new Date().toISOString() : null, is_active: true });
    }
  }
  console.log(`Upserting ${phoneRows.length} phone models...`);
  for (const batch of chunks(phoneRows, BATCH)) await rest('phones?on_conflict=slug', 'POST', batch);
  const phoneResponse = await fetch(`${supabaseUrl}/rest/v1/phones?select=id,slug&slug=in.(${phoneRows.map(x => encodeURIComponent(x.slug)).join(',')})`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
  if (!phoneResponse.ok) throw new Error('Unable to map imported phone IDs: ' + await phoneResponse.text());
  const phoneMap = new Map((await phoneResponse.json()).map(x => [x.slug, x.id]));
  const readyVariants = variantRows.map(({ _phone_slug, ...v }) => ({ ...v, phone_id: phoneMap.get(_phone_slug) })).filter(v => v.phone_id);
  console.log(`Upserting ${readyVariants.length} configuration variants...`);
  for (const batch of chunks(readyVariants, BATCH)) await rest('phone_variants?on_conflict=phone_id,variant_name', 'POST', batch);
  console.log(`DONE: ${phoneRows.length} models; ${readyVariants.length} variants; ${brandNames.length} brands. Images remain external URLs. Source: TechAPI CC-BY-SA 4.0.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

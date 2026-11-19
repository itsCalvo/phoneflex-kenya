"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Result = {
  ok?: boolean; error?: string; brand?: string; source_records_read?: number;
  models_upserted?: number; variants_upserted?: number; total_source_records?: number;
  next_cursor?: string; done?: boolean; message?: string;
};
const CURSOR_KEY = "phoneflex-catalogue-import-cursor";

export default function CatalogueImportRunner() {
  const [busy,setBusy]=useState(false);
  const [cursor,setCursor]=useState(() => typeof window === "undefined" ? "0:0" : window.localStorage.getItem(CURSOR_KEY) || "0:0");
  const [message,setMessage]=useState("");
  const [totals,setTotals]=useState({models:0,variants:0});

  async function runBatch() {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("Importing the next 25 source records…");
    try {
      const {data,error}=await supabase.functions.invoke("import-phone-catalogue",{body:{limit:25,cursor}});
      if(error) {
        let detail = error.message || "Import request failed.";
        const context = (error as any).context;
        if (context && typeof context.json === "function") {
          try { const payload = await context.json(); if (payload?.error) detail = payload.error; } catch { /* response already consumed */ }
        }
        throw new Error(detail);
      }
      const result=data as Result;
      if(!result?.ok) throw new Error(result?.error || "Import did not complete.");
      const next=result.next_cursor || cursor;
      setCursor(next);
      window.localStorage.setItem(CURSOR_KEY,next);
      const models=result.models_upserted||0;
      const variants=result.variants_upserted||0;
      setTotals(t=>({models:t.models+models,variants:t.variants+variants}));
      setMessage(result.done
        ? `Catalogue scan complete. This browser session imported ${totals.models+models} models and ${totals.variants+variants} variants.`
        : `Batch complete — ${result.brand || "next brand"}: ${models} models, ${variants} variants. ${result.source_records_read || 0} source records read. Cursor saved; run the next batch to continue.`);
    } catch(e) {
      setMessage(e instanceof Error ? e.message : "Import failed. Check the Edge Function logs.");
    } finally { setBusy(false); }
  }

  function resetCursor() {
    if (busy) return;
    const confirmed = window.confirm("Reset the catalogue import cursor to the first brand? Existing records will remain; upserts prevent duplicates.");
    if (!confirmed) return;
    setCursor("0:0");
    window.localStorage.setItem(CURSOR_KEY,"0:0");
    setMessage("Cursor reset to the first brand. Existing catalogue records were not deleted.");
  }

  return <section className="admin-panel" style={{marginTop:20}}>
    <div className="admin-panel-head"><div><h2>Global smartphone catalogue</h2><p>Import source records into the model catalogue. Seller inventory remains separate.</p></div></div>
    <p style={{fontSize:13,color:"var(--muted)",margin:"0 0 14px"}}>Source: GetTechAPI / TechAPI · CC BY-SA 4.0 · 25 records per batch · Images remain externally hosted. Import progress is saved in this browser.</p>
    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
      <button className="button button-primary" onClick={runBatch} disabled={busy} type="button">{busy?"Importing…":`Import next 25 (cursor ${cursor})`}</button>
      <button className="button" onClick={resetCursor} disabled={busy} type="button">Reset cursor</button>
    </div>
    {message && <p role="status" aria-live="polite" style={{fontSize:13,marginTop:12}}>{message}</p>}
    <p style={{fontSize:12,color:"var(--muted)",marginTop:8}}>Administrator access is checked server-side. Import failures now display the server’s actual error instead of a generic permission warning. Batches safely upsert existing models and variants.</p>
  </section>;
}

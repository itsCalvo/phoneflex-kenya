"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Result = { ok?: boolean; error?: string; source_records_read?: number; models_upserted?: number; variants_upserted?: number; total_source_records?: number; next_offset?: number; done?: boolean };
export default function CatalogueImportRunner() {
  const [busy,setBusy]=useState(false);
  const [offset,setOffset]=useState(0);
  const [message,setMessage]=useState("");
  const [totals,setTotals]=useState({models:0,variants:0});
  async function runBatch() {
    if (!supabase || busy) return;
    setBusy(true); setMessage("Importing the next 25 source records…");
    try {
      const {data,error}=await supabase.functions.invoke("import-phone-catalogue",{body:{limit:25,offset}});
      if(error) throw error;
      const result=data as Result;
      if(!result?.ok) throw new Error(result?.error || "Import did not complete.");
      setOffset(result.next_offset || offset);
      setTotals(t=>({models:t.models+(result.models_upserted||0),variants:t.variants+(result.variants_upserted||0)}));
      setMessage(result.done
        ? `Source scan complete. This session imported ${totals.models+(result.models_upserted||0)} models and ${totals.variants+(result.variants_upserted||0)} variants.`
        : `Batch complete: ${result.models_upserted} models and ${result.variants_upserted} variants. ${result.next_offset} of ${result.total_source_records} source records scanned. Run the next batch to continue.`);
    } catch(e) { setMessage(e instanceof Error ? e.message : "Import failed."); }
    finally { setBusy(false); }
  }
  return <section className="admin-panel" style={{marginTop:20}}>
    <div className="admin-panel-head"><div><h2>Global smartphone catalogue</h2><p>Import verified source records into the model catalogue. Seller inventory remains separate.</p></div></div>
    <p style={{fontSize:13,color:"var(--muted)",margin:"0 0 14px"}}>Source: GetTechAPI / TechAPI · CC BY-SA 4.0 · 25 records per batch · Images remain externally hosted.</p>
    <button className="button button-primary" onClick={runBatch} disabled={busy} type="button">{busy?"Importing…":`Import next 25 (offset ${offset})`}</button>
    {message && <p role="status" aria-live="polite" style={{fontSize:13,marginTop:12}}>{message}</p>}
    <p style={{fontSize:12,color:"var(--muted)",marginTop:8}}>This action is restricted to signed-in administrators. Repeat batches to continue; the importer safely upserts existing models and variants.</p>
  </section>;
}

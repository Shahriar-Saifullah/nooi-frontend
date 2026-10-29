"use client";

/**
 * 3D models — admin
 * ----------------------------------------------------------------------------
 * Every listing should have a GLB so shoppers can see it in 3D and place it in
 * their rooms. Vendors upload photos; Nooi makes the model:
 *
 *   Needs a model → pick which photo is front / left / back / right → Generate
 *   In progress   → the 3D provider is working (auto-refreshes)
 *   Review        → look at it in 3D, then Approve (goes on the listing) or Reject
 *   Live          → listings that have a model (vendor's, ours, or uploaded here)
 *
 * Approved listings are queued automatically. "Upload GLB" skips generation and
 * publishes a file straight away.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Search, AlertCircle, Box, Upload, CheckCircle2, XCircle, Sparkles, Trash2, RotateCw } from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import {
  listModels, getModelProduct, generateModel, removeModel, decideModelJob, uploadModelGlb, setModelSize, rotateModel,
  type ModelRow, type ModelJob, type ModelView, type ModelProviderInfo,
} from "@/lib/api/admin";

const ModelViewer = dynamic(() => import("@/components/marketplace/ModelViewer"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-[12px] text-[#8E9493]">Loading viewer…</div>,
});

const TABS = [
  { key: "needs", label: "Needs a model" },
  { key: "working", label: "In progress" },
  { key: "review", label: "Review" },
  { key: "live", label: "Live" },
  { key: "failed", label: "Failed" },
];
const JOB: Record<string, { label: string; cls: string }> = {
  queued: { label: "Queued", cls: "bg-[#F1F4F4] text-[#4B4F4F]" },
  processing: { label: "Generating", cls: "bg-[#EEF2FF] text-[#3B4CA8]" },
  review: { label: "Ready for review", cls: "bg-[#FFF6E5] text-[#8A5A00]" },
  approved: { label: "Approved", cls: "bg-[#E7FBEB] text-[#28603A]" },
  rejected: { label: "Rejected", cls: "bg-[#FFF1F2] text-[#812F28]" },
  failed: { label: "Failed", cls: "bg-[#FFF1F2] text-[#812F28]" },
  cancelled: { label: "Cancelled", cls: "bg-[#F1F4F4] text-[#8E9493]" },
};
const SOURCE: Record<string, string> = {
  nooi_generated: "Made by Nooi",
  admin_upload: "Uploaded by Nooi",
  vendor_upload: "Vendor's file",
};
const VIEWS: ModelView[] = ["front", "left", "back", "right"];
const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const errText = (e: unknown, f: string) => (typeof e === "string" ? e : f);
const mb = (b?: number | null) => (b ? `${(b / (1024 * 1024)).toFixed(1)} MB` : "");

function ProviderBanner({ provider }: { provider: ModelProviderInfo | null }) {
  if (!provider) return null;
  if (provider.name === "mock") {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#E6EBEA] bg-[#FFFBF2] p-3 text-[12.5px] text-[#4B4F4F]">
        <AlertCircle size={14} className="mt-px shrink-0" />
        Test mode: every job finishes with a sample chair after about 20 seconds. Don&apos;t approve these onto real listings.
      </div>
    );
  }
  if (!provider.ready) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#E6EBEA] bg-[#FFFBF2] p-3 text-[12.5px] text-[#4B4F4F]">
        <AlertCircle size={14} className="mt-px shrink-0" />
        {provider.name === "off"
          ? "3D generation is turned off. You can still upload a GLB for any listing."
          : "The 3D provider isn't connected yet. Jobs wait in the queue and start as soon as it is. You can still upload a GLB."}
      </div>
    );
  }
  // Tripo is pay-as-you-go: a standard model costs about 30 credits.
  const b = provider.balance;
  if (b) {
    const low = b.balance < 30;
    return (
      <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-[12.5px] ${low ? "border-[#812F28]/25 bg-[#FFFAF9] text-[#812F28]" : "border-[#E6EBEA] bg-[#FBFCFC] text-[#4B4F4F]"}`}>
        {low ? <AlertCircle size={14} className="mt-px shrink-0" /> : <CheckCircle2 size={14} className="mt-px shrink-0 text-[#28603A]" />}
        {low
          ? `Tripo has ${Math.floor(b.balance)} credits left — not enough for a model (about 30 each). New jobs wait until you top up, then start by themselves.`
          : `Tripo connected · ${Math.floor(b.balance)} credits left (about ${Math.floor(b.balance / 30)} models)${b.frozen ? ` · ${Math.floor(b.frozen)} held for running jobs` : ""}.`}
      </div>
    );
  }
  return null;
}

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E6EBEA] bg-[#F1F4F4]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <Box size={16} className="text-[#B3B9B9]" />}
    </span>
  );
}

// ─── Queue ───────────────────────────────────────────────────────────────────

function Queue({ onOpen }: { onOpen: (id: string) => void }) {
  const [tab, setTab] = useState("needs");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ModelRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [provider, setProvider] = useState<ModelProviderInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => listModels(tab, search.trim() || undefined).then(res => {
      if (!alive) return;
      if (res.success) { setRows(res.data.rows); setCounts(res.data.counts); setProvider(res.data.provider); setError(null); }
      else setError(errText(res.error, "Could not load 3D models."));
    });
    const t = setTimeout(load, search ? 300 : 0);
    // In progress changes on its own; keep it fresh.
    const iv = tab === "working" ? setInterval(load, 8000) : null;
    return () => { alive = false; clearTimeout(t); if (iv) clearInterval(iv); };
  }, [tab, search]);

  return (
    <div className="px-6 py-7 lg:px-10">
      <h1 className="text-[24px] text-[#101212]">3D models</h1>
      <p className="mt-1 text-[12.5px] text-[#646968]">Listings with a 3D model can be viewed in 3D and placed in shoppers&apos; rooms.</p>
      <ProviderBanner provider={provider} />
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setRows(null); }} aria-pressed={tab === t.key}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] ${tab === t.key ? "border-[#004643] bg-[#004643] text-white" : "border-[#D5DBDA] bg-white text-[#343837] hover:bg-[#F1F4F4]"}`}>
            {t.label}
            {counts[t.key] !== undefined && <span className={tab === t.key ? "text-white/60" : "text-[#8E9493]"}>{counts[t.key]}</span>}
          </button>
        ))}
        <span className="relative ms-auto">
          <Search size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#8E9493]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Listing title"
            className="w-56 rounded-full border border-[#D5DBDA] bg-white py-1.5 pe-3 ps-8 text-[12.5px] focus:outline-none" />
        </span>
      </div>
      <section className="mt-4 rounded-2xl border border-[#D5DBDA] bg-white">
        {error && <p className="p-5 text-[12.5px] text-[#812F28]">{error}</p>}
        {!error && rows === null && <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-[#004643]" /></div>}
        {rows?.length === 0 && <p className="p-8 text-center text-[12.5px] text-[#8E9493]">Nothing here.</p>}
        {rows?.map(({ product, job }) => (
          <button key={`${product.id}-${job?.id ?? ""}`} onClick={() => onOpen(product.id)}
            className="flex w-full items-center gap-3 border-b border-[#F1F4F4] px-5 py-3 text-start last:border-b-0 hover:bg-[#FBFCFC]">
            <Thumb src={product.photo} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-[#101212]">{product.title}</span>
              <span className="block text-[11px] text-[#8E9493]">
                {product.vendor ?? "—"} · {product.photo_count} photo{product.photo_count === 1 ? "" : "s"}
                {product.listing_status !== "approved" && ` · listing ${product.listing_status}`}
              </span>
            </span>
            {job ? (
              <span className="flex flex-col items-end gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${JOB[job.status].cls}`}>
                  {JOB[job.status].label}{job.status === "processing" ? ` · ${job.progress}%` : ""}
                </span>
                {job.error && job.status !== "review" && <span className="max-w-[260px] truncate text-[10.5px] text-[#812F28]">{job.error}</span>}
              </span>
            ) : product.model_url ? (
              <span className="text-[11px] text-[#28603A]">{SOURCE[product.model_source ?? "vendor_upload"]}</span>
            ) : (
              <span className="text-[11px] text-[#8E9493]">No model</span>
            )}
          </button>
        ))}
      </section>
    </div>
  );
}

// ─── Listing ─────────────────────────────────────────────────────────────────

type Detail = NonNullable<Extract<Awaited<ReturnType<typeof getModelProduct>>, { success: true }>["data"]>;

function Listing({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [views, setViews] = useState<Record<string, ModelView | "">>({});
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    getModelProduct(id).then(res => {
      if (!alive) return;
      if (res.success) {
        setData(res.data); setError(null);
        // First time in: the sides the vendor marked, else the first photo as the front.
        setViews(v => {
          if (Object.keys(v).length || !res.data.product.photos.length) return v;
          const marked = (res.data.product.photo_views ?? []).filter(pv => res.data.product.photos.includes(pv.url));
          return marked.length
            ? Object.fromEntries(marked.map(pv => [pv.url, pv.view]))
            : { [res.data.product.photos[0]]: "front" };
        });
      } else setError(errText(res.error, "Could not load this listing."));
    });
    return () => { alive = false; };
  }, [id, version]);

  const active = data?.jobs.find(j => ["queued", "processing", "review"].includes(j.status)) ?? null;
  const running = active && (active.status === "queued" || active.status === "processing");

  // Follow a running job without the admin refreshing.
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setVersion(v => v + 1), 5000);
    return () => clearInterval(iv);
  }, [running]);

  const picked = useMemo(
    () => Object.entries(views).filter(([, v]) => v).map(([url, view]) => ({ url, view: view as ModelView })),
    [views],
  );
  const viewError = useMemo(() => {
    const seen = new Set<string>();
    for (const p of picked) { if (seen.has(p.view)) return `Only one photo can be the ${p.view} view.`; seen.add(p.view); }
    if (picked.length && !seen.has("front")) return "Mark one photo as the front view.";
    return null;
  }, [picked]);

  const run = useCallback(async (key: string, fn: () => Promise<{ success: boolean; error?: unknown }>, done?: string) => {
    setBusy(key); setError(null); setNotice(null);
    const res = await fn();
    setBusy(null);
    if (!res.success) { setError(errText(res.error, "Something went wrong.")); return; }
    if (done) setNotice(done);
    setNote("");
    setVersion(v => v + 1);
  }, []);

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusy("upload"); setError(null); setNotice(null);
    const r = await uploadModelGlb(id, file);
    setBusy(null);
    if (!r.ok) { setError(r.error); return; }
    setNotice("Model uploaded and live on the listing.");
    setVersion(v => v + 1);
  };

  if (!data) {
    return (
      <div className="px-6 py-10 lg:px-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968]"><ArrowLeft size={13} /> 3D models</button>
        {error ? <p className="mt-6 text-[13px] text-[#812F28]">{error}</p> : <Loader2 className="mt-10 h-5 w-5 animate-spin text-[#004643]" />}
      </div>
    );
  }

  const { product, jobs, provider } = data;
  const d = product.dimensions_cm;
  const size = d ? { w: Number(d.width), d: Number(d.depth), h: Number(d.height) } : undefined;
  const review = active?.status === "review" ? active : null;

  return (
    <div className="px-6 py-7 lg:px-10">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968] hover:text-[#004643]"><ArrowLeft size={13} /> 3D models</button>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] text-[#101212]">{product.title}</h1>
          <p className="mt-1 text-[12.5px] text-[#646968]">
            {product.vendor ?? "—"} · listing {product.listing_status}
            {d && ` · ${d.width} × ${d.depth} × ${d.height} cm`}
          </p>
        </div>
        <label className={`flex cursor-pointer items-center gap-1.5 rounded-full border border-[#D5DBDA] bg-white px-4 py-2 text-[12px] font-medium text-[#004643] hover:bg-[#F1F4F4] ${busy ? "pointer-events-none opacity-50" : ""}`}>
          {busy === "upload" ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload GLB
          <input type="file" accept=".glb,model/gltf-binary" className="hidden" onChange={e => { void onUpload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      <ProviderBanner provider={provider} />
      {error && <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-3 text-[12.5px] text-[#812F28]"><AlertCircle size={14} /> {error}</div>}
      {notice && <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#28603A]/25 bg-[#F3FBF5] p-3 text-[12.5px] text-[#28603A]"><CheckCircle2 size={14} /> {notice}</div>}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* What shoppers see now, or what's waiting for review */}
        <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
          <h2 className="text-[13px] font-medium text-[#101212]">{review ? "New model — review" : "On the listing"}</h2>
          <div className="mt-3 h-[340px] overflow-hidden rounded-xl border border-[#E6EBEA]">
            {review?.glb_url || product.model_url ? (
              <ModelViewer key={review?.glb_url ?? product.model_url!} modelPath={(review?.glb_url ?? product.model_url)!} size={size} />
            ) : running ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#FBFCFC] text-[12.5px] text-[#646968]">
                <Loader2 className="h-5 w-5 animate-spin text-[#004643]" />
                {active!.status === "queued" ? "Waiting to start…" : `Generating · ${active!.progress}%`}
                {active!.error && <span className="max-w-[80%] text-center text-[11.5px] text-[#8A5A00]">{active!.error}</span>}
                <div className="h-1.5 w-48 overflow-hidden rounded-full bg-[#E6EBEA]">
                  <div className="h-full bg-[#004643] transition-all" style={{ width: `${active!.progress}%` }} />
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center bg-[#FBFCFC] text-[12.5px] text-[#8E9493]">No 3D model yet</div>
            )}
          </div>

          {review ? (
            <div className="mt-4 space-y-2">
              <p className="text-[12px] text-[#646968]">
                Check the shape, colours and proportions against the photos, and that it isn&apos;t turned sideways — the front should face the same way as the front photo. Approving replaces any model on the listing.
                {review.glb_bytes ? ` (${mb(review.glb_bytes)})` : ""}
              </p>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="If rejecting: what's wrong? (for the record)"
                className="w-full rounded-xl border border-[#D5DBDA] p-2.5 text-[12.5px] focus:outline-none" />
              <div className="flex flex-wrap gap-2">
                <button disabled={!!busy} onClick={() => run("approve", () => decideModelJob(review.id, "approve"), "Approved — the model is live on the listing.")}
                  className="flex items-center gap-1.5 rounded-full bg-[#004643] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50">
                  {busy === "approve" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                </button>
                <button disabled={!!busy} onClick={() => run("rotate", () => rotateModel({ job_id: review.id }), "Turned 90°.")}
                  title="If it faces sideways or backwards, turn it until the front faces you"
                  className="flex items-center gap-1.5 rounded-full border border-[#D5DBDA] px-4 py-2 text-[12px] font-medium text-[#004643] disabled:opacity-50">
                  {busy === "rotate" ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />} Turn 90°
                </button>
                <button disabled={!!busy} onClick={() => run("reject", () => decideModelJob(review.id, "reject", note.trim() || undefined), "Rejected. You can generate again with different photos.")}
                  className="flex items-center gap-1.5 rounded-full border border-[#D5DBDA] px-4 py-2 text-[12px] font-medium text-[#812F28] disabled:opacity-50">
                  <XCircle size={12} /> Reject
                </button>
              </div>
            </div>
          ) : running ? (
            <button disabled={!!busy} onClick={() => run("cancel", () => decideModelJob(active!.id, "cancel"), "Job cancelled.")}
              className="mt-4 rounded-full border border-[#D5DBDA] px-4 py-2 text-[12px] text-[#646968] disabled:opacity-50">
              Cancel job
            </button>
          ) : product.model_url ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#646968]">
              <span>{SOURCE[product.model_source ?? "vendor_upload"]}</span>
              <button disabled={!!busy} onClick={() => run("rotate", () => rotateModel({ product_id: id }), "Turned 90° on the listing.")}
                className="ms-auto flex items-center gap-1.5 rounded-full border border-[#D5DBDA] px-3 py-1.5 text-[#004643] disabled:opacity-50">
                <RotateCw size={12} /> Turn 90°
              </button>
              <button disabled={!!busy} onClick={() => { if (confirmRemove()) void run("remove", () => removeModel(id), "Model removed from the listing."); }}
                className="flex items-center gap-1.5 rounded-full border border-[#D5DBDA] px-3 py-1.5 text-[#812F28] disabled:opacity-50">
                <Trash2 size={12} /> Remove from listing
              </button>
            </div>
          ) : null}

          <SizeEditor key={JSON.stringify(d)} id={id} dims={d} onSaved={() => setVersion(v => v + 1)} />
        </section>

        {/* Photos → views → generate */}
        <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
          <h2 className="text-[13px] font-medium text-[#101212]">Make a model from the photos</h2>
          <p className="mt-1 text-[12px] text-[#646968]">
            Mark which photo shows each side. A front plus one to three more sides gives the best result; a front alone also works.
          </p>
          {product.photos.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-[#8E9493]">This listing has no photos. Ask the vendor to add some, or upload a GLB.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {product.photos.map(url => (
                <div key={url} className={`overflow-hidden rounded-xl border ${views[url] ? "border-[#004643]" : "border-[#E6EBEA]"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="aspect-square w-full object-cover" />
                  <select value={views[url] ?? ""} onChange={e => setViews(v => ({ ...v, [url]: e.target.value as ModelView | "" }))}
                    className="w-full border-t border-[#E6EBEA] bg-white px-2 py-1.5 text-[12px] capitalize focus:outline-none">
                    <option value="">Not used</option>
                    {VIEWS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          {viewError && <p className="mt-3 text-[12px] text-[#812F28]">{viewError}</p>}
          <button
            disabled={!!busy || !!active || !product.photos.length || !!viewError}
            onClick={() => run("generate", () => generateModel(id, picked), provider.ready ? "Started. This usually takes a few minutes." : "Queued. It starts once the 3D provider is connected.")}
            className="mt-4 flex items-center gap-1.5 rounded-full bg-[#004643] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50">
            {busy === "generate" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {product.model_url ? "Generate a new model" : "Generate model"}
          </button>
          {active && <p className="mt-2 text-[11.5px] text-[#8E9493]">A model is already {active.status === "review" ? "waiting for review" : "in progress"}.</p>}
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-[#D5DBDA] bg-white p-5">
        <h2 className="text-[13px] font-medium text-[#101212]">History</h2>
        {jobs.length === 0 ? <p className="mt-2 text-[12px] text-[#8E9493]">No attempts yet.</p> : (
          <div className="mt-3 divide-y divide-[#F1F4F4]">
            {jobs.map((j: ModelJob) => (
              <div key={j.id} className="flex flex-wrap items-center gap-3 py-2.5 text-[12px]">
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${JOB[j.status].cls}`}>{JOB[j.status].label}</span>
                <span className="text-[#4B4F4F]">
                  {j.mode === "manual" ? "Uploaded GLB" : `${j.mode === "multiview" ? `${j.source_images.length} views` : "1 photo"} · ${j.provider}`}
                </span>
                <span className="text-[#8E9493]">{when(j.created_at)}</span>
                {j.credits_used ? <span className="text-[#8E9493]">{j.credits_used} credits</span> : null}
                {(j.error || j.review_note) && <span className="w-full text-[11.5px] text-[#812F28] sm:w-auto">{j.review_note || j.error}</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * The canvas scales the model to exactly this size, so a wrong size means a
 * sofa that looks twice as big in the shopper's room. Older listings were all
 * saved as 120 × 80 × 75 cm, which is worth flagging.
 */
function SizeEditor({ id, dims, onSaved }: {
  id: string;
  dims: { width: number; height: number; depth: number } | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    width: String(dims?.width ?? ""), depth: String(dims?.depth ?? ""), height: String(dims?.height ?? ""),
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const placeholder = dims && Number(dims.width) === 120 && Number(dims.depth) === 80 && Number(dims.height) === 75;
  const changed = !dims || form.width !== String(dims.width) || form.depth !== String(dims.depth) || form.height !== String(dims.height);

  const save = async () => {
    setBusy(true); setMsg(null);
    const res = await setModelSize(id, { width: Number(form.width), depth: Number(form.depth), height: Number(form.height) });
    setBusy(false);
    if (!res.success) { setMsg({ ok: false, text: errText(res.error, "Could not save the size.") }); return; }
    setMsg({ ok: true, text: "Saved." });
    onSaved();
  };

  return (
    <div className="mt-4 border-t border-[#F1F4F4] pt-4">
      <div className="text-[12px] font-medium text-[#101212]">Real size (cm)</div>
      <p className="mt-0.5 text-[11.5px] text-[#646968]">Shoppers&apos; rooms show the model at exactly this size.</p>
      {placeholder && (
        <p className="mt-1 text-[11.5px] text-[#8A5A00]">This is the old default size — check the real size with the vendor.</p>
      )}
      <div className="mt-2 flex flex-wrap items-end gap-2">
        {(["width", "depth", "height"] as const).map(k => (
          <label key={k} className="text-[11px] capitalize text-[#646968]">{k}
            <input value={form[k]} inputMode="decimal" onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
              className="mt-0.5 block w-20 rounded-lg border border-[#D5DBDA] px-2 py-1.5 text-[12.5px] text-[#101212] focus:outline-none" />
          </label>
        ))}
        <button disabled={busy || !changed} onClick={save}
          className="rounded-full border border-[#D5DBDA] px-3 py-1.5 text-[12px] font-medium text-[#004643] disabled:opacity-40">
          {busy ? "Saving…" : "Save size"}
        </button>
      </div>
      {msg && <p className={`mt-1.5 text-[11.5px] ${msg.ok ? "text-[#28603A]" : "text-[#812F28]"}`}>{msg.text}</p>}
    </div>
  );
}

function confirmRemove() {
  return typeof window !== "undefined" && window.confirm("Remove the 3D model from this listing? Shoppers will no longer see it in 3D.");
}

function Inner() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  return id
    ? <Listing id={id} onBack={() => router.push("/admin/models")} />
    : <Queue onOpen={x => router.push(`/admin/models?id=${x}`)} />;
}

export default function AdminModelsPage() {
  return <AdminShell><Suspense fallback={null}><Inner /></Suspense></AdminShell>;
}

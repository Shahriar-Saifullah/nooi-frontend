"use client";

/**
 * "Photo render" — a photo-real image of the current view, made on the GPU
 * server (lib/render/photoRender). Sits with the other view buttons over the
 * 3D canvas. A render takes a minute or two; the client can carry on editing
 * meanwhile, and gets a notification if they leave the page.
 */

import React, { useEffect, useRef, useState } from "react";
import { Aperture, Check, Loader2, X } from "lucide-react";
import { QUALITY, type RenderQuality, type RenderSpec } from "@/lib/render/sceneSpec";
import { requestPhotoRender, waitForRender, type PhotoRenderStage } from "@/lib/render/photoRender";
import type { PhotoRender } from "@/lib/api/renders";

const STAGE_TEXT: Record<PhotoRenderStage, string> = {
  exporting: "Preparing the scene…",
  uploading: "Uploading the scene…",
  queued: "Waiting for the render server…",
  running: "Rendering…",
};

export default function PhotoRenderButton({
  projectId, exportGlb, renderSpec, onReady, className = "",
}: {
  projectId: string | null | undefined;
  exportGlb: () => Promise<Blob | null>;
  renderSpec: (q: RenderQuality) => RenderSpec | null;
  onReady: (r: PhotoRender) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [quality, setQuality] = useState<RenderQuality>("standard");
  const [stage, setStage] = useState<PhotoRenderStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const busy = stage !== null;

  const start = async () => {
    if (!projectId || busy) return;
    setOpen(false); setError(null); setDone(false);
    const spec = renderSpec(quality);
    if (!spec) { setError("The 3D view isn't ready yet."); return; }
    const ac = new AbortController();
    abort.current = ac;
    try {
      const job = await requestPhotoRender({ projectId, quality, exportGlb, spec, onStage: setStage });
      const final = await waitForRender(job.id, j => setStage(j.status === "running" ? "running" : "queued"), ac.signal);
      if (final.status === "done" && final.url) {
        onReady(final);
        setDone(true);
        setTimeout(() => setDone(false), 4000);
      } else {
        setError(final.error ?? "The render failed. Please try again.");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setError(e instanceof Error ? e.message : "The render failed.");
    } finally {
      setStage(null);
    }
  };

  return (
    <div className={`flex flex-col items-end gap-2 ${className}`}>
      {open && !busy && (
        <div className="w-[250px] rounded-[12px] bg-black/80 p-3.5 text-white backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold">Photo render</span>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white" title="Close"><X size={14} /></button>
          </div>
          <p className="mb-2.5 text-[10.5px] leading-snug text-white/65">
            A photo-real image of exactly this view, with real light, shadows and reflections.
          </p>
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-[8px] bg-white/10 p-1">
            {(Object.keys(QUALITY) as RenderQuality[]).map(q => (
              <button key={q} onClick={() => setQuality(q)} aria-pressed={quality === q}
                className={`rounded-[6px] py-1.5 text-[11px] font-medium ${quality === q ? "bg-white text-[#0a0a0a]" : "text-white/75 hover:text-white"}`}>
                {QUALITY[q].label}
              </button>
            ))}
          </div>
          <p className="mb-2.5 text-[10.5px] text-white/55">Takes {QUALITY[quality].minutes}. You can keep working meanwhile.</p>
          <button onClick={start} disabled={!projectId}
            className="w-full rounded-[8px] bg-[#c7de7d] py-2 text-[12px] font-semibold text-[#003832] hover:bg-[#b8d268] disabled:opacity-50">
            {projectId ? "Render this view" : "Save the project first"}
          </button>
        </div>
      )}
      {error && !busy && (
        <div className="flex max-w-[280px] items-start gap-2 rounded-[10px] bg-[#fef2f2] px-3 py-2 text-[11px] text-[#b91c1c] shadow">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} title="Dismiss"><X size={12} /></button>
        </div>
      )}
      <button
        onClick={() => !busy && setOpen(o => !o)}
        title="A photo-real image of this view, rendered on our render server"
        className="flex items-center gap-2 rounded-full bg-white py-2 pl-3.5 pr-4 text-[12px] font-medium text-[#003832] shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-colors hover:bg-white/90"
      >
        {busy ? <><Loader2 size={14} className="animate-spin" />{STAGE_TEXT[stage!]}</>
          : done ? <><Check size={14} className="text-[#2f7d32]" />Photo ready</>
          : <><Aperture size={14} />Photo render</>}
      </button>
    </div>
  );
}

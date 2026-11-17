"use client";

/**
 * "360° tour" over the 3D canvas: pick rooms and quality, make the tour, follow
 * its progress, open earlier tours. The rendering is the photo render worker's
 * panorama mode (backend routes/tour.routes.ts).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Loader2, Orbit, X } from "lucide-react";
import { getTour, listTours, type Tour, type TourSummary } from "@/lib/api/tours";
import { requestTour, type TourStage } from "@/lib/tour/createTour";
import type { RenderQuality, RenderSpec } from "@/lib/render/sceneSpec";
import type { buildTour } from "@/lib/tour/graph";

const OUTDOOR = /porch|patio|balcon|deck|terrace|garden/i;
const QUALITY_LABEL: Record<RenderQuality, string> = { standard: "Standard", high: "High (8K)" };
const STAGE_TEXT: Record<TourStage, string> = {
  preparing: "Preparing the scene…",
  uploading: "Uploading the scene…",
  starting: "Starting…",
};

export default function TourButton({
  projectId, rooms, prepare, exportGlb, renderSpec, tourLayout, className = "",
}: {
  projectId: string | null | undefined;
  rooms: { id: string; name: string }[];
  /** switch the 3D view to what a tour needs (ceilings on, walls up); returns how to switch back */
  prepare: () => Promise<() => void>;
  exportGlb: () => Promise<Blob | null>;
  renderSpec: (q: RenderQuality) => RenderSpec | null;
  tourLayout: (roomIds?: string[]) => ReturnType<typeof buildTour> | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [quality, setQuality] = useState<RenderQuality>("standard");
  // the client's ticks; untouched rooms default to "indoors yes, outdoors no"
  const [choice, setChoice] = useState<Record<string, boolean>>({});
  const isOn = (r: { id: string; name: string }) => choice[r.id] ?? !OUTDOOR.test(r.name);
  const picked = new Set(rooms.filter(isOn).map(r => r.id));
  const [stage, setStage] = useState<TourStage | null>(null);
  const [active, setActive] = useState<Tour | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [past, setPast] = useState<TourSummary[]>([]);
  const timer = useRef<number | null>(null);

  const refreshList = useCallback(() => {
    if (!projectId) return;
    listTours(projectId).then(r => { if (r.success) setPast(r.data.items); }).catch(() => undefined);
  }, [projectId]);
  useEffect(() => { refreshList(); }, [refreshList]);

  // follow a tour that is rendering
  const follow = useCallback((id: string) => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(async () => {
      const r = await getTour(id).catch(() => null);
      if (!r?.success) return;
      setActive(r.data.tour);
      if (r.data.tour.status !== "rendering") {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
        refreshList();
      }
    }, 6000);
  }, [refreshList]);
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  // pick up a tour still rendering from before a reload
  useEffect(() => {
    const running = past.find(t => t.status === "rendering");
    if (running && !active) {
      getTour(running.id).then(r => { if (r.success) { setActive(r.data.tour); follow(running.id); } }).catch(() => undefined);
    }
  }, [past, active, follow]);

  const toggle = (id: string) => setChoice(c => ({ ...c, [id]: !picked.has(id) }));

  const start = async () => {
    if (!projectId || stage || picked.size === 0) return;
    setOpen(false); setError(null);
    let restore: (() => void) | null = null;
    try {
      setStage("preparing");
      restore = await prepare();
      const layout = tourLayout([...picked]);
      const lights = renderSpec(quality);
      if (!layout || !lights) throw new Error("The 3D view isn't ready yet.");
      if (!layout.nodes.length) throw new Error("None of the chosen rooms is large enough for a tour.");
      const tour = await requestTour({
        projectId, quality, layout, lights, onStage: setStage,
        exportGlb: async () => {
          const glb = await exportGlb();
          restore?.(); restore = null;  // the scene is captured; give the view back
          return glb;
        },
      });
      setActive(tour);
      follow(tour.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make the tour.");
    } finally {
      restore?.();
      setStage(null);
    }
  };

  const rendering = active?.status === "rendering";
  const ready = active && (active.status === "done" || active.status === "partial");

  return (
    <div className={`flex flex-col items-end gap-2 ${className}`}>
      {open && !stage && (
        <div className="w-[270px] rounded-[12px] bg-black/80 p-3.5 text-white backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold">360° tour</span>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white" title="Close"><X size={14} /></button>
          </div>
          <p className="mb-2.5 text-[10.5px] leading-snug text-white/65">
            A photo-real panorama of every room you choose, linked room to room, with a shareable link.
          </p>
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-white/45">
            <span>Rooms</span>
            <button className="normal-case tracking-normal text-white/70 hover:text-white"
              onClick={() => setChoice(Object.fromEntries(rooms.map(r => [r.id, picked.size !== rooms.length])))}>
              {picked.size === rooms.length ? "Clear" : "Select all"}
            </button>
          </div>
          <div className="mb-3 max-h-[180px] space-y-0.5 overflow-y-auto">
            {rooms.map(r => {
              const on = picked.has(r.id);
              return (
                <button key={r.id} onClick={() => toggle(r.id)} aria-pressed={on}
                  className={`flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[11.5px] ${on ? "bg-white/15" : "hover:bg-white/10"}`}>
                  <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border ${on ? "border-[#c7de7d] bg-[#c7de7d] text-[#0a0a0a]" : "border-white/40"}`}>
                    {on && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className="truncate">{r.name}</span>
                </button>
              );
            })}
          </div>
          <div className="mb-2.5 grid grid-cols-2 gap-1 rounded-[8px] bg-white/10 p-1">
            {(["standard", "high"] as RenderQuality[]).map(q => (
              <button key={q} onClick={() => setQuality(q)} aria-pressed={quality === q}
                className={`rounded-[6px] py-1.5 text-[11px] font-medium ${quality === q ? "bg-white text-[#0a0a0a]" : "text-white/75 hover:text-white"}`}>
                {QUALITY_LABEL[q]}
              </button>
            ))}
          </div>
          <p className="mb-2.5 text-[10.5px] text-white/55">
            About {quality === "high" ? 4 : 2}–{quality === "high" ? 6 : 3} minutes per room; rooms render side by side.
          </p>
          <button onClick={start} disabled={!projectId || picked.size === 0}
            className="w-full rounded-[8px] bg-[#c7de7d] py-2 text-[12px] font-semibold text-[#003832] hover:bg-[#b8d268] disabled:opacity-50">
            {projectId ? `Make a tour of ${picked.size} room${picked.size === 1 ? "" : "s"}` : "Save the project first"}
          </button>
          {past.filter(t => t.status === "done" || t.status === "partial").length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-2">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-white/45">Earlier tours</div>
              {past.filter(t => t.status === "done" || t.status === "partial").slice(0, 5).map(t => (
                <a key={t.id} href={`/tour/${t.id}`} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between rounded-[7px] px-2 py-1.5 text-[11.5px] hover:bg-white/10">
                  <span className="truncate">{new Date(t.createdAt).toLocaleString()} · {t.rooms} rooms</span>
                  <ExternalLink size={12} className="shrink-0 text-white/60" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
      {error && !stage && (
        <div className="flex max-w-[280px] items-start gap-2 rounded-[10px] bg-[#fef2f2] px-3 py-2 text-[11px] text-[#b91c1c] shadow">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} title="Dismiss"><X size={12} /></button>
        </div>
      )}
      {ready && active && (
        <a href={`/tour/${active.id}`} target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 rounded-full bg-[#c7de7d] px-3.5 py-1.5 text-[11.5px] font-semibold text-[#003832] shadow">
          <Check size={13} />Tour ready — open <ExternalLink size={12} />
        </a>
      )}
      <button
        onClick={() => !stage && setOpen(o => !o)}
        title="Photo-real 360° panoramas of every room, linked into a walk-through"
        className="flex items-center gap-2 rounded-full bg-white py-2 pl-3.5 pr-4 text-[12px] font-medium text-[#003832] shadow-[0_4px_12px_rgba(0,0,0,0.25)] hover:bg-white/90"
      >
        {stage ? <><Loader2 size={14} className="animate-spin" />{STAGE_TEXT[stage]}</>
          : rendering && active ? <><Loader2 size={14} className="animate-spin" />Tour: {active.progress.done}/{active.progress.total} rooms</>
          : <><Orbit size={14} />360° tour</>}
      </button>
    </div>
  );
}

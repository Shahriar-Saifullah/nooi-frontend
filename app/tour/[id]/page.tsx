"use client";

/**
 * A 360° tour, for its owner: the viewer, its progress while rooms are still
 * rendering, and the share link. Shared copies open at /share/tour/[token].
 */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Link2, Loader2 } from "lucide-react";
import TourViewer from "@/components/tour/TourViewer";
import { getTour, shareTour, tourShareUrl, type Tour } from "@/lib/api/tours";

export default function TourPage() {
  const { id } = useParams<{ id: string }>();
  const [tour, setTour] = useState<Tour | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    const r = await getTour(id).catch(() => null);
    if (r?.success) setTour(r.data.tour);
    else setError("This tour could not be opened. Are you signed in to the account that made it?");
  }, [id]);

  useEffect(() => {
    let timer: number | null = null;
    let live = true;
    const tick = async () => {
      const r = await getTour(id).catch(() => null);
      if (!live) return;
      if (r?.success) {
        setTour(r.data.tour);
        if (r.data.tour.status === "rendering") timer = window.setTimeout(tick, 6000);
      } else {
        setError("This tour could not be opened. Are you signed in to the account that made it?");
      }
    };
    tick();
    return () => { live = false; if (timer) window.clearTimeout(timer); };
  }, [id]);

  const toggleShare = async () => {
    if (!tour) return;
    setSharing(true);
    const r = await shareTour(tour.id, !tour.shared).catch(() => null);
    setSharing(false);
    if (r?.success) setTour(r.data.tour); else load();
  };
  const copy = async () => {
    if (!tour?.shareToken) return;
    await navigator.clipboard.writeText(tourShareUrl(tour.shareToken)).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (error) return <div className="flex h-screen items-center justify-center bg-[#15191a] px-6 text-center text-[13px] text-white/75">{error}</div>;
  if (!tour) return <div className="flex h-screen items-center justify-center bg-[#15191a]"><Loader2 size={24} className="animate-spin text-[#c7de7d]" /></div>;

  const anyReady = tour.nodes.some(n => n.status === "done");
  return (
    <div className="flex h-screen flex-col bg-[#15191a]">
      <header className="flex items-center gap-3 px-4 py-3 text-white">
        {tour.projectId && (
          <Link href={`/canvas?projectId=${tour.projectId}`} className="flex items-center gap-1.5 text-[12.5px] text-white/70 hover:text-white">
            <ArrowLeft size={14} />Back to the design
          </Link>
        )}
        <span className="text-[14px] font-semibold">{tour.title}</span>
        {tour.status === "rendering" && (
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11.5px] text-white/80">
            <Loader2 size={12} className="animate-spin" />{tour.progress.done} of {tour.progress.total} rooms ready
          </span>
        )}
        {tour.status === "partial" && <span className="text-[11.5px] text-[#ffc9c0]">Some rooms failed to render</span>}
        <div className="ms-auto flex items-center gap-2">
          {tour.shared && tour.shareToken && (
            <button onClick={copy} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] text-white hover:bg-white/20">
              {copied ? <><Check size={13} />Copied</> : <><Copy size={13} />Copy link</>}
            </button>
          )}
          {(tour.status === "done" || tour.status === "partial") && (
            <button onClick={toggleShare} disabled={sharing}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium ${tour.shared ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#c7de7d] text-[#003832] hover:bg-[#b8d268]"}`}>
              <Link2 size={13} />{tour.shared ? "Stop sharing" : "Share tour"}
            </button>
          )}
        </div>
      </header>
      <main className="min-h-0 flex-1 px-3 pb-3">
        <div className="h-full overflow-hidden rounded-[14px]">
          {anyReady ? <TourViewer tour={tour} /> : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-black text-[13px] text-white/75">
              {tour.status === "rendering" ? <><Loader2 size={24} className="animate-spin text-[#c7de7d]" />Rendering the rooms… you can close this page; we&apos;ll notify you.</> : "This tour has no rooms ready."}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

/**
 * A shared 360° tour — no sign-in. Access is the unguessable link; the
 * backend sends only the finished rooms and the plan outline.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import TourViewer from "@/components/tour/TourViewer";
import { getSharedTour, type Tour } from "@/lib/api/tours";

export default function SharedTourPage() {
  const { token } = useParams<{ token: string }>();
  const [tour, setTour] = useState<Tour | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    getSharedTour(token)
      .then(r => { if (r.success) setTour(r.data.tour); else setMissing(true); })
      .catch(() => setMissing(true));
  }, [token]);

  if (missing) {
    return <div className="flex h-screen items-center justify-center bg-[#15191a] px-6 text-center text-[13px] text-white/75">This tour isn&apos;t available. The link may have been turned off.</div>;
  }
  if (!tour) return <div className="flex h-screen items-center justify-center bg-[#15191a]"><Loader2 size={24} className="animate-spin text-[#c7de7d]" /></div>;
  return (
    <div className="h-screen w-screen">
      <TourViewer tour={tour} toolbar={
        <span className="me-1 rounded-full bg-black/45 px-3 py-1.5 text-[11.5px] text-white/85 backdrop-blur-sm">{tour.title} · Nooi</span>
      } />
    </div>
  );
}

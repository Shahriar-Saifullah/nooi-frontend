"use client";

// ─── Public read-only design viewer ──────────────────────────────────────────
// Route: /share/[token] — no auth required. Access is gated by the
// unguessable share token; the backend returns a sanitized payload
// (name, project_type, room_data only).

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Loader2, Sofa, Eye } from "lucide-react";
import { getSharedProject, type Project } from "@/lib/api/projects";
import type { PlacedFurniture } from "@/components/ThreeSceneV2";
import { type GridRoom } from "@/components/RoomLayoutGrid";

const ThreeSceneV2 = dynamic(() => import("@/components/ThreeSceneV2"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1a1f1e]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={24} className="animate-spin text-[#c7de7d]" />
        <p className="text-[13px] text-white/60 font-medium">Loading 3D scene…</p>
      </div>
    </div>
  ),
});

type SharedProject = Pick<Project, "name" | "project_type" | "room_data" | "updated_at">;

const FALLBACK_COLORS = ["#c3f4f0", "#b9eac5", "#87ddd7", "#f7dfad", "#d5dbda", "#ffc9c0"];

function toGridRoom(room: any, index: number): GridRoom {
  return {
    id: room.id, name: room.name,
    color: room.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    box: room.box, polygon: room.polygon,
    gridRow: room.gridRow, gridCol: room.gridCol,
    rowWeight: room.rowWeight, colWeight: room.colWeight,
  };
}

export default function SharedDesignPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [project, setProject] = useState<SharedProject | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!token) return;
    getSharedProject(token)
      .then((p) => { setProject(p); setStatus("ready"); })
      .catch(() => setStatus("error"));
  }, [token]);

  const rd: any = project?.room_data ?? {};
  const rooms = useMemo(
    () => ((rd.rooms ?? []) as any[]).map(toGridRoom).filter((r: GridRoom) => r.box || r.polygon),
    [project],
  );
  const furniture: PlacedFurniture[] = Array.isArray(rd.furniture) ? rd.furniture : [];
  const imageSize: { width: number; height: number } | null = rd.image_size ?? null;

  // Same real-world-scale derivation as the canvas page: estimate plan width
  // from user-entered room dimensions, take the median, apply visual scale.
  const roomDimensionsCm = useMemo(() => {
    const est: number[] = [];
    for (const r of (rd.rooms ?? []) as any[]) {
      const b = r.box;
      if (!b) continue;
      const wM = Number(r.width);
      const lM = Number(r.length);
      if (Number.isFinite(wM) && wM > 1 && b.width > 3) {
        est.push((wM * 100) / (b.width / 100));
      }
      if (Number.isFinite(lM) && lM > 1 && b.height > 3) {
        const aspect = imageSize && imageSize.height > 0
          ? imageSize.width / imageSize.height : 1.25;
        est.push(((lM * 100) / (b.height / 100)) * aspect);
      }
    }
    const sane = est.filter(v => v > 800 && v < 6000).sort((a, b) => a - b);
    const BASE = sane.length >= 2 ? sane[Math.floor(sane.length / 2)] : 2600;
    const VISUAL_SCALE = 1.5;
    const SCALED = BASE * VISUAL_SCALE;
    if (imageSize && imageSize.width > 0 && imageSize.height > 0) {
      if (imageSize.width >= imageSize.height) {
        return { width: Math.round(SCALED), depth: Math.round(SCALED * imageSize.height / imageSize.width) };
      }
      return { width: Math.round(SCALED * imageSize.width / imageSize.height), depth: Math.round(SCALED) };
    }
    return { width: Math.round(SCALED), depth: Math.round(SCALED * 0.8) };
  }, [project]);

  if (status === "loading") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#f5f5f5]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={26} className="animate-spin text-[#004643]" />
          <p className="text-[13px] text-[#737373] font-medium">Loading shared design…</p>
        </div>
      </div>
    );
  }

  if (status === "error" || !project) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#f5f5f5]">
        <div className="text-center max-w-[360px] px-6">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#f0f0f0] flex items-center justify-center">
            <Eye size={20} className="text-[#a3a3a3]" />
          </div>
          <h1 className="text-[17px] font-semibold text-[#0a0a0a] mb-1.5">This design isn't available</h1>
          <p className="text-[13px] text-[#737373] leading-relaxed">
            The link may have been turned off by the owner, or it doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#f5f5f5] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-[#e5e5e5]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[15px] font-bold text-[#004643] shrink-0">nooi</span>
          <div className="w-px h-5 bg-[#e5e5e5] shrink-0" />
          <div className="min-w-0">
            <h1 className="text-[14px] font-semibold text-[#0a0a0a] truncate">{project.name}</h1>
            <p className="text-[11px] text-[#a3a3a3]">Shared design · view only</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {furniture.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f7f6] border border-[#c7de7d] rounded-full text-[12px] font-medium text-[#004643]">
              <Sofa size={12} />{furniture.length} item{furniture.length !== 1 ? "s" : ""}
            </div>
          )}
          <a
            href="/"
            className="px-3.5 py-1.5 bg-[#004643] rounded-full hover:bg-[#003633] text-[12px] font-medium text-white"
          >
            Made with Nooi
          </a>
        </div>
      </header>

      {/* 3D viewer — read-only: no select/move handlers passed */}
      <main className="flex-1 overflow-hidden relative">
        <ThreeSceneV2
          roomWidthCm={roomDimensionsCm.width}
          roomDepthCm={roomDimensionsCm.depth}
          rooms={rooms}
          rfWalls={rd.walls ?? []}
          openings={rd.openings ?? []}
          furniture={furniture}
        />
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 bg-black/50 backdrop-blur-sm text-white/80 text-[11px] px-4 py-2 rounded-full pointer-events-none">
          <span>🖱 Drag to orbit</span>
          <span>⚡ Scroll to zoom</span>
          <span>✋ Right-click to pan</span>
        </div>
      </main>
    </div>
  );
}
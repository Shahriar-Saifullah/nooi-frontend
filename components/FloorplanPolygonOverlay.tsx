"use client";



import React, { useRef, useState } from "react";
import type { GridRoom } from "@/components/RoomLayoutGrid";

export interface PolyRoom extends GridRoom {
  polygon?: [number, number][];
  confidence?: number;
}

export type DrawShape = "rect" | "circle";

interface Props {
  imageUrl: string;
  rooms: PolyRoom[];
  selectedRoomId?: string | null;
  onRoomClick?: (id: string) => void;
  showLabels?: boolean;
  className?: string;
  /** NOOI-11: when set, dragging on the plan draws a new room of this shape */
  drawShape?: DrawShape | null;
  /** polygon in viewBox units (0–100), the same space room polygons use */
  onDrawComplete?: (polygon: [number, number][]) => void;
}

/** Rectangle or ellipse as a polygon in 0–100 plan units. Circles are sampled
 *  rather than kept as an SVG <ellipse> so downstream code — 3D floors, wall
 *  snapping, room containment — only ever deals with polygons. */
function shapeToPolygon(
  shape: DrawShape, x0: number, y0: number, x1: number, y1: number,
): [number, number][] {
  const l = Math.min(x0, x1), r = Math.max(x0, x1);
  const t = Math.min(y0, y1), b = Math.max(y0, y1);
  if (shape === "rect") {
    return [[l, t], [r, t], [r, b], [l, b]];
  }
  const cx = (l + r) / 2, cy = (t + b) / 2;
  const rx = (r - l) / 2, ry = (b - t) / 2;
  const SEGMENTS = 32;
  return Array.from({ length: SEGMENTS }, (_, i) => {
    const a = (i / SEGMENTS) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as [number, number];
  });
}

/** polygon (or box fallback) → SVG points string in viewBox units (0-100) */
function toPoints(room: PolyRoom): string | null {
  if (room.polygon && room.polygon.length >= 3) {
    return room.polygon.map(([x, y]) => `${x},${y}`).join(" ");
  }
  if (room.box) {
    const { left: l, top: t, width: w, height: h } = room.box;
    return `${l},${t} ${l + w},${t} ${l + w},${t + h} ${l},${t + h}`;
  }
  return null;
}

function centroid(room: PolyRoom): [number, number] {
  if (room.polygon && room.polygon.length >= 3) {
    const n = room.polygon.length;
    const cx = room.polygon.reduce((s, p) => s + p[0], 0) / n;
    const cy = room.polygon.reduce((s, p) => s + p[1], 0) / n;
    return [cx, cy];
  }
  if (room.box) {
    return [room.box.left + room.box.width / 2, room.box.top + room.box.height / 2];
  }
  return [50, 50];
}

export default function FloorplanPolygonOverlay({
  imageUrl,
  rooms,
  selectedRoomId = null,
  onRoomClick,
  showLabels = true,
  className = "",
  drawShape = null,
  onDrawComplete,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  // pointer → viewBox units. preserveAspectRatio="none" means the SVG box maps
  // straight onto the container, so this is a plain percentage on both axes.
  const toPlan = (e: React.PointerEvent): [number, number] => {
    const rect = hostRef.current!.getBoundingClientRect();
    return [
      Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    ];
  };

  return (
    <div ref={hostRef} className={`relative w-full ${className}`}>
      {/* the image defines the aspect ratio; the SVG shares its box exactly */}
      <img
        src={imageUrl}
        alt="Floor plan"
        className="block w-full h-auto select-none pointer-events-none rounded-lg"
        draggable={false}
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        {rooms.map((room) => {
          const pts = toPoints(room);
          if (!pts) return null;
          const selected = room.id === selectedRoomId;
          return (
            <polygon
              key={room.id}
              points={pts}
              fill={room.color || "#8dd3c7"}
              fillOpacity={selected ? 0.55 : 0.32}
              stroke={selected ? "#0f766e" : room.color || "#5eead4"}
              strokeOpacity={0.9}
              strokeWidth={selected ? 0.6 : 0.35}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: onRoomClick ? "pointer" : "default",
                       transition: "fill-opacity 120ms" }}
              onClick={() => onRoomClick?.(room.id)}
            />
          );
        })}
      </svg>

      {/* Draw layer — only mounted while a shape tool is active, so it never
          intercepts normal room clicks. */}
      {drawShape && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            const [x, y] = toPlan(e);
            setDraft({ x0: x, y0: y, x1: x, y1: y });
          }}
          onPointerMove={(e) => {
            if (!draft) return;
            const [x, y] = toPlan(e);
            setDraft({ ...draft, x1: x, y1: y });
          }}
          onPointerUp={() => {
            if (!draft) return;
            const w = Math.abs(draft.x1 - draft.x0), h = Math.abs(draft.y1 - draft.y0);
            // ignore a stray click or a sliver — a 2% minimum keeps accidental
            // taps from creating unusable rooms
            if (w >= 2 && h >= 2) {
              onDrawComplete?.(shapeToPolygon(drawShape, draft.x0, draft.y0, draft.x1, draft.y1));
            }
            setDraft(null);
          }}
        >
          <rect x={0} y={0} width={100} height={100} fill="transparent" />
          {draft && (
            <polygon
              points={shapeToPolygon(drawShape, draft.x0, draft.y0, draft.x1, draft.y1)
                .map(([x, y]) => `${x},${y}`).join(" ")}
              fill="#004643" fillOpacity={0.25}
              stroke="#004643" strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      )}

      {showLabels && rooms.map((room) => {
        const [cx, cy] = centroid(room);
        const selected = room.id === selectedRoomId;
        return (
          <button
            key={`lbl-${room.id}`}
            type="button"
            onClick={() => onRoomClick?.(room.id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full
              px-2.5 py-0.5 text-[11px] font-medium shadow-sm whitespace-nowrap
              ${selected
                ? "bg-teal-700 text-white"
                : "bg-white/95 text-gray-800 border border-gray-200"}`}
            style={{ left: `${cx}%`, top: `${cy}%` }}
          >
            {room.name}
          </button>
        );
      })}
    </div>
  );
}
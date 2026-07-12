"use client";



import React from "react";
import type { GridRoom } from "@/components/RoomLayoutGrid";

export interface PolyRoom extends GridRoom {
  polygon?: [number, number][];
  confidence?: number;
}

interface Props {
  imageUrl: string;
  rooms: PolyRoom[];
  selectedRoomId?: string | null;
  onRoomClick?: (id: string) => void;
  showLabels?: boolean;
  className?: string;
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
}: Props) {
  return (
    <div className={`relative w-full ${className}`}>
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
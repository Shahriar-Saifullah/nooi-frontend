"use client";



import React, { useRef, useState } from "react";
import type { GridRoom } from "@/components/RoomLayoutGrid";

export interface PolyRoom extends GridRoom {
  polygon?: [number, number][];
  confidence?: number;
}

export type DrawShape = "rect" | "circle";

export interface EditWall {
  x1: number; y1: number; x2: number; y2: number;  // % of plan (0–100)
  thickness: number;
  id?: string;
}

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

  // ── NOOI-10: wall editing ────────────────────────────────────────────────
  /** when true, walls are drawn with draggable endpoints */
  editWalls?: boolean;
  walls?: EditWall[];
  /** Fired continuously while dragging; the parent owns the wall array.
   *  `dragRooms: false` marks a wall that moved only to stay welded to the
   *  wall the user grabbed — room boundaries must follow the grabbed wall
   *  once, not once per wall meeting at that corner. */
  onWallChange?: (
    index: number, wall: EditWall, opts?: { dragRooms?: boolean },
  ) => void;
  /** fired once when a drag finishes, so the parent can persist */
  onWallCommit?: () => void;
  onWallDelete?: (index: number) => void;
  /** a new wall drawn end-to-end */
  onWallAdd?: (wall: EditWall) => void;
  /** null when nothing is selected */
  selectedWallIndex?: number | null;
  onWallSelect?: (index: number | null) => void;
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

/**
 * Collapse a wall onto its dominant axis.
 *
 * ThreeSceneV2 renders every wall axis-aligned: it picks the axis the wall
 * spans furthest along and takes a single cross-axis coordinate. A wall stored
 * with y1 !== y2 therefore looks one way in this editor and another way in 3D,
 * and the snap engine — which reads the raw segment — believes a third thing.
 * Keeping the stored wall axis-aligned makes all three agree.
 */
export function axisAlign(w: EditWall): EditWall {
  const horiz = Math.abs(w.x2 - w.x1) >= Math.abs(w.y2 - w.y1);
  if (horiz) {
    const y = (w.y1 + w.y2) / 2;
    return { ...w, y1: y, y2: y };
  }
  const x = (w.x1 + w.x2) / 2;
  return { ...w, x1: x, x2: x };
}

const isHoriz = (w: EditWall) =>
  Math.abs(w.x2 - w.x1) >= Math.abs(w.y2 - w.y1);

/**
 * Move one end of a wall to (x, y) without ever skewing it.
 *
 * The grabbed handle goes exactly where the cursor is. Along the wall's own
 * axis that lengthens or shortens it; across that axis the WHOLE wall slides,
 * because a wall with two different cross-axis coordinates is a wall the 3D
 * renderer cannot draw. (An earlier version simply ignored cross-axis motion,
 * which made vertical walls impossible to move sideways at all.)
 */
export function moveWallEnd(w: EditWall, end: 1 | 2, x: number, y: number): EditWall {
  const a = axisAlign(w);
  if (isHoriz(a)) {
    return end === 1
      ? { ...a, x1: x, y1: y, y2: y }
      : { ...a, x2: x, y1: y, y2: y };
  }
  return end === 1
    ? { ...a, y1: y, x1: x, x2: x }
    : { ...a, y2: y, x1: x, x2: x };
}

/** How close two endpoints must be, in plan units, to count as one corner.
 *  Matches VERTEX_ON_WALL in the canvas page — detected walls are ~1.2 thick
 *  and rarely terminate on exactly the same coordinate. */
const WELD_RADIUS = 2.0;

export interface WeldRef { i: number; end: 1 | 2 }

/**
 * Walls that END somewhere along the BODY of `host` — a T-junction rather than
 * a corner.
 *
 * Interior partitions almost always meet an exterior wall this way: the
 * partition stops in the middle of the wall, not at either of its ends. Corner
 * welding alone therefore leaves every partition behind when the exterior wall
 * moves, and the shell opens up along its whole length — floor with no walls
 * around it, which is what the extended side of the plan was showing.
 *
 * A T follower only tracks the host's CROSS-axis position: it reaches further
 * to stay attached, it does not slide along.
 */
function tJunctions(
  walls: EditWall[], skip: number, host: EditWall, taken: WeldRef[],
): WeldRef[] {
  const h = axisAlign(host);
  const horiz = isHoriz(h);
  const lo = Math.min(horiz ? h.x1 : h.y1, horiz ? h.x2 : h.y2);
  const hi = Math.max(horiz ? h.x1 : h.y1, horiz ? h.x2 : h.y2);
  const cross = horiz ? h.y1 : h.x1;

  const out: WeldRef[] = [];
  walls.forEach((raw, i) => {
    if (i === skip) return;
    const w = axisAlign(raw);
    ([1, 2] as const).forEach((end) => {
      // a corner weld already owns this endpoint and positions it precisely
      if (taken.some(t => t.i === i && t.end === end)) return;
      const ex = end === 1 ? w.x1 : w.x2;
      const ey = end === 1 ? w.y1 : w.y2;
      const along = horiz ? ex : ey;
      const off = horiz ? ey : ex;
      if (Math.abs(off - cross) <= WELD_RADIUS
          && along >= lo - WELD_RADIUS && along <= hi + WELD_RADIUS) {
        out.push({ i, end });
      }
    });
  });
  return out;
}

/** Reach a T follower's endpoint out to the host wall's new cross-axis
 *  position, leaving its own along-axis coordinate alone. */
function followHost(
  follower: EditWall, end: 1 | 2, hostHoriz: boolean, hostCross: number,
): EditWall {
  const a = axisAlign(follower);
  const ownX = end === 1 ? a.x1 : a.x2;
  const ownY = end === 1 ? a.y1 : a.y2;
  return moveWallEnd(
    a, end,
    hostHoriz ? ownX : hostCross,
    hostHoriz ? hostCross : ownY,
  );
}

/**
 * Every other wall endpoint sitting on the corner at (x, y).
 *
 * Without this, dragging one wall tears it away from the walls it met and
 * leaves the shell open — the room polygon follows the wall it is attached to
 * and collapses into a wedge, which is what the 3D view was showing.
 */
function weldTargets(
  walls: EditWall[], skip: number, x: number, y: number,
): WeldRef[] {
  const out: WeldRef[] = [];
  walls.forEach((raw, i) => {
    if (i === skip) return;
    const w = axisAlign(raw);
    if (Math.hypot(w.x1 - x, w.y1 - y) <= WELD_RADIUS) out.push({ i, end: 1 });
    else if (Math.hypot(w.x2 - x, w.y2 - y) <= WELD_RADIUS) out.push({ i, end: 2 });
  });
  return out;
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
  editWalls = false,
  walls = [],
  onWallChange,
  onWallCommit,
  onWallDelete,
  onWallAdd,
  selectedWallIndex = null,
  onWallSelect,
}: Props) {
  // which endpoint is being dragged: wall index + which end
  const [dragEnd, setDragEnd] =
    useState<{ i: number; end: 1 | 2; weld: WeldRef[]; tee: WeldRef[] } | null>(null);
  // dragging the wall LINE translates the whole wall (the gesture people
  // actually reach for when they want to "move the left wall in")
  const [dragBody, setDragBody] = useState<{
    i: number; px: number; py: number; wall: EditWall;
    weld1: WeldRef[]; weld2: WeldRef[]; tee: WeldRef[];
  } | null>(null);
  const [newWall, setNewWall] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
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

      {/* ── NOOI-10: wall editing layer ── */}
      {editWalls && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          style={{ cursor: drawShape ? "crosshair" : "default" }}
          onPointerMove={(e) => {
            const [x, y] = toPlan(e);

            if (dragEnd) {
              const w = walls[dragEnd.i];
              if (!w) return;
              // the grabbed handle follows the cursor in BOTH axes; the wall
              // stays straight because moveWallEnd slides it rather than
              // bending it
              const next = moveWallEnd(w, dragEnd.end, x, y);
              onWallChange?.(dragEnd.i, next);
              // carry the walls that met it at this corner, so the shell
              // stays closed instead of tearing open
              for (const t of dragEnd.weld) {
                const n = walls[t.i];
                if (n) onWallChange?.(t.i, moveWallEnd(n, t.end, x, y),
                                      { dragRooms: false });
              }
              // and the partitions that T into it along its length
              const nHoriz = isHoriz(next);
              const nCross = nHoriz ? next.y1 : next.x1;
              for (const t of dragEnd.tee) {
                const n = walls[t.i];
                if (n) onWallChange?.(t.i, followHost(n, t.end, nHoriz, nCross),
                                      { dragRooms: false });
              }
              return;
            }

            if (dragBody) {
              const dx = x - dragBody.px, dy = y - dragBody.py;
              const w = axisAlign(dragBody.wall);
              const moved = axisAlign({
                ...w,
                x1: w.x1 + dx, x2: w.x2 + dx,
                y1: w.y1 + dy, y2: w.y2 + dy,
              });
              onWallChange?.(dragBody.i, moved);
              for (const t of dragBody.weld1) {
                const n = walls[t.i];
                if (n) onWallChange?.(t.i, moveWallEnd(n, t.end, moved.x1, moved.y1),
                                      { dragRooms: false });
              }
              for (const t of dragBody.weld2) {
                const n = walls[t.i];
                if (n) onWallChange?.(t.i, moveWallEnd(n, t.end, moved.x2, moved.y2),
                                      { dragRooms: false });
              }
              const bHoriz = isHoriz(moved);
              const bCross = bHoriz ? moved.y1 : moved.x1;
              for (const t of dragBody.tee) {
                const n = walls[t.i];
                if (n) onWallChange?.(t.i, followHost(n, t.end, bHoriz, bCross),
                                      { dragRooms: false });
              }
              return;
            }

            if (newWall) setNewWall({ ...newWall, x2: x, y2: y });
          }}
          onPointerUp={() => {
            if (dragEnd) { setDragEnd(null); onWallCommit?.(); }
            if (dragBody) { setDragBody(null); onWallCommit?.(); }
            if (newWall) {
              const len = Math.hypot(newWall.x2 - newWall.x1, newWall.y2 - newWall.y1);
              // ignore a click without a drag
              if (len >= 2) {
                onWallAdd?.(axisAlign({
                  ...newWall, thickness: walls[0]?.thickness ?? 1.2,
                }));
              }
              setNewWall(null);
            }
          }}
          // a pointer that leaves the window must not leave a wall glued to
          // the cursor for the rest of the session
          onPointerCancel={() => { setDragEnd(null); setDragBody(null); setNewWall(null); }}
          onLostPointerCapture={() => {
            if (dragEnd || dragBody) { setDragEnd(null); setDragBody(null); onWallCommit?.(); }
          }}
        >
          {/* background captures drags that start on empty space = draw a wall */}
          <rect
            x={0} y={0} width={100} height={100} fill="transparent"
            onPointerDown={(e) => {
              const [x, y] = toPlan(e);
              onWallSelect?.(null);
              setNewWall({ x1: x, y1: y, x2: x, y2: y });
            }}
          />

          {walls.map((raw, i) => {
            // Draw the wall the way the 3D scene will actually build it, so
            // this editor is a faithful preview rather than a second opinion.
            const w = axisAlign(raw);
            const selected = i === selectedWallIndex;
            return (
              <g key={raw.id ?? i}>
                {/* fat invisible hit line — a 1% stroke is very hard to click.
                    Press-and-drag on it moves the whole wall. */}
                <line
                  x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                  stroke="transparent" strokeWidth={3}
                  style={{ cursor: selected ? "move" : "pointer" }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    (e.target as Element).setPointerCapture?.(e.pointerId);
                    onWallSelect?.(i);
                    const [px, py] = toPlan(e);
                    const weld1 = weldTargets(walls, i, w.x1, w.y1);
                    const weld2 = weldTargets(walls, i, w.x2, w.y2);
                    setDragBody({
                      i, px, py, wall: w, weld1, weld2,
                      tee: tJunctions(walls, i, w, [...weld1, ...weld2]),
                    });
                  }}
                />
                <line
                  x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                  stroke={selected ? "#004643" : "#64748b"}
                  strokeWidth={selected ? 1.1 : 0.7}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
                {selected && ([1, 2] as const).map(end => (
                  <circle
                    key={end}
                    cx={end === 1 ? w.x1 : w.x2}
                    cy={end === 1 ? w.y1 : w.y2}
                    r={1.4}
                    fill="#ffffff" stroke="#004643" strokeWidth={0.5}
                    vectorEffect="non-scaling-stroke"
                    style={{ cursor: "grab" }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      (e.target as Element).setPointerCapture?.(e.pointerId);
                      const weld = weldTargets(walls, i,
                        end === 1 ? w.x1 : w.x2,
                        end === 1 ? w.y1 : w.y2);
                      setDragEnd({
                        i, end, weld,
                        tee: tJunctions(walls, i, w, weld),
                      });
                    }}
                  />
                ))}
              </g>
            );
          })}

          {newWall && (() => {
            // preview the wall as it will be stored: snapped to whichever axis
            // the drag has travelled furthest along
            const p = axisAlign({ ...newWall, thickness: 0 });
            return (
              <line
                x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
                stroke="#004643" strokeWidth={1} strokeDasharray="2 1.5"
                vectorEffect="non-scaling-stroke" pointerEvents="none"
              />
            );
          })()}
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
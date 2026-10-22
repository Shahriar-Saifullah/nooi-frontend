"use client";

/**
 * Measurements — components/Measurements.tsx
 * ============================================================================
 * Answers "will it fit?" on the spot:
 *
 *   RoomAreaLabels   each room's name and floor area in m², at its centre.
 *   ItemDimensions   for one floor item: its own size, and a line from each of
 *                    its four sides to the nearest wall in that direction, in
 *                    cm. For a wall item: the gap to each end of its wall and
 *                    its height off the floor.
 *
 * Lines are thin solid bars (not GL lines: 1 px on most GPUs, and on WebGPU a
 * line material breaks the effects pass) drawn over everything. Labels are DOM
 * overlays (drei <Html>), so they stay crisp at any zoom and never appear in
 * captures, exports or AI renders. Every mesh is named "nooi-ui" for the same
 * reason.
 */

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { WorldWall } from "@/lib/placement/snap";
import { halfExtents } from "@/lib/placement/snap";
import { polygonArea } from "@/lib/geometry/planFrame";

const LINE = "#0f5c4f";          // Nooi deep green
const BAR_T = 0.018;             // bar thickness, m
const MAX_REACH = 30;            // ignore walls further than this, m

const labelStyle: React.CSSProperties = {
  pointerEvents: "none",
  whiteSpace: "nowrap",
  font: "500 11px/1.2 system-ui, -apple-system, Segoe UI, sans-serif",
  color: "#0a0a0a",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(15,92,79,0.25)",
  borderRadius: 6,
  padding: "2px 6px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
};

const cm = (m: number) => `${Math.round(m * 100)} cm`;

// ── Room areas ──────────────────────────────────────────────────────────────

export { polygonArea };

/** `areaScale` turns scene m² into the real m² the user measured (the
 *  scene's floor layout is drawn larger than life — see planFrame). */
export function RoomAreaLabels({
  rooms, areaScale = 1,
}: { rooms: Array<{ id: string; name: string; poly: [number, number][] }>; areaScale?: number }) {
  return (
    <>
      {rooms.map(r => {
        if (r.poly.length < 3) return null;
        const xs = r.poly.map(p => p[0]), zs = r.poly.map(p => p[1]);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
        const area = polygonArea(r.poly) * areaScale;
        return (
          <Html key={r.id} position={[cx, 0.05, cz]} center zIndexRange={[20, 0]}>
            <div style={{ ...labelStyle, textAlign: "center" }}>
              {r.name ? <div style={{ fontWeight: 600 }}>{r.name}</div> : null}
              <div style={{ color: "#4b5563" }}>{area.toFixed(1)} m²</div>
            </div>
          </Html>
        );
      })}
    </>
  );
}

// ── Dimension lines ─────────────────────────────────────────────────────────

interface Seg { from: [number, number, number]; to: [number, number, number]; label: string }

/** A bar from a to b, with its label at the middle. */
function DimLine({ seg }: { seg: Seg }) {
  const { pos, len, quat } = useMemo(() => {
    const a = new THREE.Vector3(...seg.from), b = new THREE.Vector3(...seg.to);
    const dir = new THREE.Vector3().subVectors(b, a);
    const l = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 0, 0), dir.clone().normalize(),
    );
    return { pos: a.clone().add(b).multiplyScalar(0.5), len: l, quat: q };
  }, [seg]);
  if (len < 0.01) return null;
  return (
    <group>
      <mesh name="nooi-ui" position={pos} quaternion={quat} raycast={() => null} renderOrder={997}>
        <boxGeometry args={[len, BAR_T, BAR_T]} />
        <meshBasicMaterial color={LINE} toneMapped={false} depthTest={false} transparent opacity={0.9} />
      </mesh>
      {/* end ticks */}
      {[seg.from, seg.to].map((p, i) => (
        <mesh key={i} name="nooi-ui" position={p} raycast={() => null} renderOrder={997}>
          <sphereGeometry args={[BAR_T * 1.6, 8, 8]} />
          <meshBasicMaterial color={LINE} toneMapped={false} depthTest={false} transparent opacity={0.9} />
        </mesh>
      ))}
      <Html position={pos} center zIndexRange={[30, 0]}>
        <div style={labelStyle}>{seg.label}</div>
      </Html>
    </group>
  );
}

interface ItemLike {
  position: [number, number, number];
  rotation?: number;
  /** metres */
  w: number; d: number; h: number;
  mountType: "floor" | "ceiling" | "wall";
}

/** Distance from the box to the nearest wall face along one axis direction. */
function reach(
  walls: WorldWall[], axis: "x" | "z", sign: 1 | -1,
  edge: number, lo: number, hi: number,
): number | null {
  let best: number | null = null;
  for (const w of walls) {
    const vertical = w.x1 === w.x2;           // runs along z, blocks x travel
    if ((axis === "x") !== vertical) continue;
    const half = w.thickness / 2;
    const c = axis === "x" ? w.x1 : w.z1;
    const s0 = axis === "x" ? Math.min(w.z1, w.z2) : Math.min(w.x1, w.x2);
    const s1 = axis === "x" ? Math.max(w.z1, w.z2) : Math.max(w.x1, w.x2);
    if (s1 < lo || s0 > hi) continue;          // wall not across this side
    const face = c - sign * half;              // the face turned towards us
    const dist = (face - edge) * sign;
    if (dist < -0.01 || dist > MAX_REACH) continue;
    if (best === null || dist < best) best = Math.max(0, dist);
  }
  return best;
}

export function ItemDimensions({ item, walls }: { item: ItemLike; walls: WorldWall[] }) {
  const segs = useMemo<Seg[]>(() => {
    const [x, yBase, z] = item.position;
    const out: Seg[] = [];

    if (item.mountType === "wall") {
      // along the wall to each end, and up from the floor
      const rot = item.rotation ?? 0;
      const nx = Math.round(Math.sin(rot)), nz = Math.round(Math.cos(rot));
      const alongX = nz !== 0;                 // facing ±z → wall runs along x
      const y = yBase + item.h / 2;
      const a = alongX ? x : z;
      const lo = a - item.w / 2, hi = a + item.w / 2;
      const left = reach(walls, alongX ? "x" : "z", -1, lo, (alongX ? z : x) - 0.3, (alongX ? z : x) + 0.3);
      const right = reach(walls, alongX ? "x" : "z", 1, hi, (alongX ? z : x) - 0.3, (alongX ? z : x) + 0.3);
      const off = 0.03;                        // just proud of the item's face
      const px = x + nx * (item.d / 2 + off), pz = z + nz * (item.d / 2 + off);
      const at = (along: number): [number, number, number] =>
        alongX ? [along, y, pz] : [px, y, along];
      if (left !== null) out.push({ from: at(lo - left), to: at(lo), label: cm(left) });
      if (right !== null) out.push({ from: at(hi), to: at(hi + right), label: cm(right) });
      if (yBase > 0.02) out.push({ from: [px, 0.01, pz], to: [px, yBase, pz], label: `${cm(yBase)} from floor` });
      return out;
    }

    if (item.mountType !== "floor") return out;
    const [hx, hz] = halfExtents({ w: item.w, d: item.d, rotation: item.rotation ?? 0 });
    const y = 0.03;
    const minX = x - hx, maxX = x + hx, minZ = z - hz, maxZ = z + hz;
    const px = reach(walls, "x", 1, maxX, minZ, maxZ);
    const nxD = reach(walls, "x", -1, minX, minZ, maxZ);
    const pz = reach(walls, "z", 1, maxZ, minX, maxX);
    const nzD = reach(walls, "z", -1, minZ, minX, maxX);
    if (px !== null) out.push({ from: [maxX, y, z], to: [maxX + px, y, z], label: cm(px) });
    if (nxD !== null) out.push({ from: [minX - nxD, y, z], to: [minX, y, z], label: cm(nxD) });
    if (pz !== null) out.push({ from: [x, y, maxZ], to: [x, y, maxZ + pz], label: cm(pz) });
    if (nzD !== null) out.push({ from: [x, y, minZ - nzD], to: [x, y, minZ], label: cm(nzD) });
    return out;
  }, [item, walls]);

  const sizeLabel = item.mountType === "wall"
    ? `${Math.round(item.w * 100)} × ${Math.round(item.h * 100)} cm`
    : `${Math.round(item.w * 100)} × ${Math.round(item.d * 100)} cm`;

  return (
    <group>
      {segs.map((s, i) => <DimLine key={i} seg={s} />)}
      <Html
        position={[item.position[0], item.position[1] + item.h + 0.12, item.position[2]]}
        center
        zIndexRange={[30, 0]}
      >
        <div style={{ ...labelStyle, background: "#0f5c4f", color: "#fff", border: "none" }}>{sizeLabel}</div>
      </Html>
    </group>
  );
}

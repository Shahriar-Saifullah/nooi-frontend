"use client";

/**
 * Ceiling designs drawn under a room's flat ceiling (lib/walls/ceiling):
 * a stepped border with a hidden LED cove, coffers, or beams.
 *
 * Rendered inside RoomRoof's group, whose origin is at the ceiling height:
 * y = 0 is the ceiling, negative is down into the room. Floor coordinates
 * are the scene's (x, z), already scaled.
 */

import React, { useMemo } from "react";
import * as THREE from "three";
import {
  ceilingBeams, insetPolygon, LED_COLOURS, type CeilingSpec, type XZ,
} from "@/lib/walls/ceiling";

const PLASTER = "#f7f5f1";
const COVE_SLOT_H = 0.08;    // the gap the light comes out of
const COVE_SETBACK = 0.14;   // how far the upper part steps back from the edge

function shapeOf(poly: XZ[], holes: XZ[][] = []): THREE.Shape {
  const s = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, z)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, z))));
  return s;
}

/** A ring (outer outline with an inner hole) as a slab from y0 down to y0 - depth. */
function Ring({ outer, inner, y0, depth, color = PLASTER }: { outer: XZ[]; inner: XZ[]; y0: number; depth: number; color?: string }) {
  const geo = useMemo(() => {
    // the hole must wind the other way round from the outline
    const hole = [...inner].reverse();
    const g = new THREE.ExtrudeGeometry(shapeOf(outer, [hole]), { depth, bevelEnabled: false });
    return g;
  }, [outer, inner, depth]);
  // the extrusion runs DOWN once rotated, from y0
  return (
    <mesh geometry={geo} rotation={[Math.PI / 2, 0, 0]} position={[0, y0, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** A thin glowing strip following a closed outline. */
function LedStrip({ path, y, color }: { path: XZ[]; y: number; color: string }) {
  const geo = useMemo(() => {
    const pts = [...path, path[0]].map(([x, z]) => new THREE.Vector3(x, y, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0);
    return new THREE.TubeGeometry(curve, Math.max(16, path.length * 8), 0.012, 6, false);
  }, [path, y]);
  return (
    <mesh geometry={geo} name="nooi-led">
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} toneMapped={false} />
    </mesh>
  );
}

/**
 * The wash of light on the raised middle, for the browser only — a path
 * tracer makes the real one from the strip. Bright at the edge, fading in.
 */
function CoveGlow({ outer, inner, color }: { outer: XZ[]; inner: XZ[]; color: string }) {
  const geo = useMemo(() => {
    const n = outer.length;
    const pos: number[] = [], col: number[] = [], idx: number[] = [];
    for (let i = 0; i < n; i++) {
      pos.push(outer[i][0], 0, outer[i][1], inner[i][0], 0, inner[i][1]);
      col.push(1, 1, 1, 0, 0, 0);
    }
    for (let i = 0; i < n; i++) {
      const a = i * 2, b = ((i + 1) % n) * 2;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    return g;
  }, [outer, inner]);
  return (
    <mesh geometry={geo} position={[0, -0.008, 0]} name="nooi-noexport" renderOrder={2}>
      <meshBasicMaterial color={color} vertexColors transparent opacity={0.55}
        blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function CeilingDesign({ poly, spec, scale }: {
  poly: XZ[];
  spec: CeilingSpec;
  /** scene units per real metre, horizontally */
  scale: number;
}) {
  const parts = useMemo(() => {
    if (spec.style === "tray") {
      const inset = (spec.inset ?? 0.55) * scale;
      const inner = insetPolygon(poly, inset);
      const upper = insetPolygon(poly, Math.max(0.05 * scale, inset - COVE_SETBACK * scale));
      const stripPath = insetPolygon(poly, Math.max(0.03 * scale, inset - COVE_SETBACK * 0.5 * scale));
      const glowIn = insetPolygon(poly, inset - COVE_SETBACK * scale + 0.9 * scale);
      if (!inner || !upper || !stripPath) return null;
      return { kind: "tray" as const, inner, upper, stripPath, glowIn };
    }
    if (spec.style === "coffered" || spec.style === "beams") {
      return { kind: "beams" as const, beams: ceilingBeams(poly, spec.style, 1.2 * scale, (spec.style === "coffered" ? 0.14 : 0.18) * scale) };
    }
    return null;
  }, [poly, spec, scale]);

  if (!parts) return null;

  if (parts.kind === "beams") {
    const depth = spec.style === "coffered" ? 0.14 : 0.2;
    const wood = spec.style === "beams";
    return (
      <group>
        {parts.beams.map((b, i) => (
          <mesh key={i} position={[b.x, -depth / 2 - 0.004, b.z]} castShadow receiveShadow>
            <boxGeometry args={[b.w, depth, b.d]} />
            <meshStandardMaterial color={wood ? "#8a6544" : PLASTER} roughness={wood ? 0.7 : 0.9} />
          </mesh>
        ))}
      </group>
    );
  }

  const drop = spec.drop ?? 0.25;
  const led = spec.led !== false;
  const colour = LED_COLOURS[spec.ledTone ?? "warm"];
  return (
    <group>
      {/* lower border: the part you see from below */}
      <Ring outer={poly} inner={parts.inner} y0={-COVE_SLOT_H} depth={Math.max(0.04, drop - COVE_SLOT_H)} />
      {/* upper border, stepped back: the slot between the two hides the strip */}
      <Ring outer={poly} inner={parts.upper} y0={-0.004} depth={COVE_SLOT_H - 0.004} />
      {led && <LedStrip path={parts.stripPath} y={-COVE_SLOT_H + 0.015} color={colour} />}
      {led && parts.glowIn && <CoveGlow outer={parts.upper} inner={parts.glowIn} color={colour} />}
    </group>
  );
}

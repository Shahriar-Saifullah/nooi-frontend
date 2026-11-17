"use client";

/**
 * Mouldings and panels on one side of a wall (lib/walls/panelling), merged
 * into a single mesh so a long fluted wall is one draw call.
 */

import React, { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { panelPieces, type PanelSpec } from "@/lib/walls/panelling";

export default function WallPanelling({ spec, stretches, wallH, horiz, c, t, side, scale, color }: {
  spec: PanelSpec;
  /** [from, to, top] along the wall, scene units; top in metres */
  stretches: [number, number, number][];
  wallH: number;
  horiz: boolean;
  /** the wall's centre line (z for a horizontal wall, x for a vertical one) */
  c: number;
  t: number;
  side: "A" | "B";
  scale: number;
  color: string;
}) {
  // stretches arrive as a fresh array each render; key on their values
  const key = JSON.stringify(stretches);
  const geo = useMemo(() => {
    const stretches = JSON.parse(key) as [number, number, number][];
    // side A faces −z (horizontal wall) / −x (vertical); B the other way
    const out = side === "A" ? -1 : 1;
    const face = c + out * (t / 2);
    const parts: THREE.BufferGeometry[] = [];
    for (const [a0, a1, top] of stretches) {
      for (const p of panelPieces(spec.style, a0, a1, top, wallH, scale)) {
        const len = p.a1 - p.a0, hgt = p.y1 - p.y0;
        if (len <= 0 || hgt <= 0) continue;
        const g = horiz ? new THREE.BoxGeometry(len, hgt, p.proud) : new THREE.BoxGeometry(p.proud, hgt, len);
        const mid = (p.a0 + p.a1) / 2, y = (p.y0 + p.y1) / 2, o = face + out * (p.proud / 2);
        g.translate(horiz ? mid : o, y, horiz ? o : mid);
        parts.push(g);
      }
    }
    if (!parts.length) return null;
    const merged = mergeGeometries(parts, false);
    parts.forEach(g => g.dispose());
    return merged;
  }, [spec.style, key, wallH, horiz, c, t, side, scale]);

  if (!geo) return null;
  return (
    // not pickable: a click goes to the wall, which is how the panelling is chosen
    <mesh geometry={geo} castShadow receiveShadow raycast={() => null}>
      <meshStandardMaterial color={color} roughness={spec.style === "fluted" ? 0.6 : 0.75} />
    </mesh>
  );
}

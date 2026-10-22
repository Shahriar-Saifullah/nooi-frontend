"use client";

/**
 * Wall-mounted decor, built in code — components/decor/WallDecor.tsx
 * ============================================================================
 * TV, framed art, mirror, curtains and a wall light. Procedural rather than
 * downloaded models because:
 *   - no licensing question to answer later (every bit of it is ours),
 *   - no download: they appear instantly and weigh nothing,
 *   - they resize cleanly — a curtain that is 20% wider keeps its pleats.
 *
 * Every piece is centred on its own origin with its BACK on the plane
 * z = -d/2 and its face pointing +z, so the scene can hang it by putting the
 * back against the wall and rotating +z into the room.
 *
 * Sizes are in metres. `color` (the user's colour override) tints the part a
 * person would think of as "the colour" of that item: the frame, the fabric,
 * the TV's bezel.
 */

import { useMemo } from "react";
import * as THREE from "three";

import type { ProceduralKind } from "@/lib/furniture/catalog";
export type { ProceduralKind };

interface Props {
  kind: ProceduralKind;
  w: number;
  h: number;
  d: number;
  color?: string | null;
  /** Light fittings only: 0 = off … 1 = full glow. */
  glow?: number;
}

// ── Painted canvases ────────────────────────────────────────────────────────
// Drawn once per kind and cached. Deterministic, so every project shows the
// same piece and renders are repeatable.

const artCache = new Map<string, THREE.CanvasTexture>();

function artTexture(kind: "art-abstract" | "art-lines"): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const hit = artCache.get(kind);
  if (hit) return hit;

  const c = document.createElement("canvas");
  c.width = 768;
  c.height = kind === "art-abstract" ? 512 : 1024;
  const g = c.getContext("2d");
  if (!g) return null;

  if (kind === "art-abstract") {
    // warm, soft colour fields — the "large abstract over the sofa" piece
    g.fillStyle = "#efe6d8";
    g.fillRect(0, 0, c.width, c.height);
    const blobs: Array<[number, number, number, string]> = [
      [230, 260, 210, "#c8875a"],
      [470, 230, 190, "#d9b48f"],
      [600, 360, 150, "#8a6a52"],
      [330, 380, 140, "#e7cdb0"],
      [140, 140, 110, "#b59a7d"],
    ];
    for (const [x, y, r, col] of blobs) {
      const grad = g.createRadialGradient(x, y, r * 0.15, x, y, r);
      grad.addColorStop(0, col);
      grad.addColorStop(1, "rgba(239,230,216,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // a confident brush line through the middle
    g.strokeStyle = "rgba(60,44,34,0.75)";
    g.lineWidth = 9;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(90, 330);
    g.bezierCurveTo(260, 180, 450, 460, 690, 210);
    g.stroke();
  } else {
    // single-line figure drawing on cream — the portrait-format piece
    g.fillStyle = "#f4efe7";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#d8b99a";
    g.beginPath();
    g.arc(470, 360, 170, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#2c2622";
    g.lineWidth = 6;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(250, 860);
    g.bezierCurveTo(230, 650, 330, 560, 360, 470);
    g.bezierCurveTo(390, 380, 320, 300, 380, 230);
    g.bezierCurveTo(440, 160, 560, 200, 540, 300);
    g.bezierCurveTo(525, 380, 430, 400, 450, 470);
    g.bezierCurveTo(470, 560, 600, 640, 560, 860);
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  artCache.set(kind, tex);
  return tex;
}

// ── Curtain cloth ───────────────────────────────────────────────────────────
// A plane whose columns swing in and out like pleats. Built once per size.

function pleatedPanel(w: number, h: number, depth: number, pleats: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(w, h, Math.max(24, pleats * 8), 6);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = (x / w + 0.5) * pleats * Math.PI * 2;
    // pleats deepen slightly towards the hem, as hanging fabric does
    const sag = 0.75 + 0.25 * (0.5 - y / h);
    pos.setZ(i, Math.sin(u) * depth * 0.5 * sag);
  }
  geo.computeVertexNormals();
  return geo;
}

// ── The pieces ──────────────────────────────────────────────────────────────

export default function WallDecor({ kind, w, h, d, color, glow = 1 }: Props) {
  const art = useMemo(
    () => (kind === "art-abstract" || kind === "art-lines" ? artTexture(kind) : null),
    [kind],
  );
  const curtain = useMemo(() => {
    if (kind !== "curtains") return null;
    const panelW = w * 0.32;
    return pleatedPanel(panelW, h - 0.06, Math.min(0.12, d), Math.max(3, Math.round(panelW / 0.14)));
  }, [kind, w, h, d]);

  switch (kind) {
    case "tv": {
      const bezel = 0.012;
      return (
        <group>
          {/* body */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color ?? "#141518"} roughness={0.45} metalness={0.3} />
          </mesh>
          {/* glass: near-black and glossy, so it picks up the room's light */}
          <mesh position={[0, 0, d / 2 + 0.001]}>
            <planeGeometry args={[w - bezel * 2, h - bezel * 2]} />
            <meshStandardMaterial color="#07080a" roughness={0.08} metalness={0.6} />
          </mesh>
        </group>
      );
    }

    case "art-abstract":
    case "art-lines": {
      const frame = Math.min(0.035, w * 0.05);
      const mat = Math.min(0.06, w * 0.08);
      const frameColor = color ?? (kind === "art-abstract" ? "#c9a57a" : "#2b2622");
      const bar = (bw: number, bh: number, x: number, y: number, key: string) => (
        <mesh key={key} position={[x, y, 0]} castShadow>
          <boxGeometry args={[bw, bh, d]} />
          <meshStandardMaterial color={frameColor} roughness={0.5} metalness={kind === "art-abstract" ? 0.35 : 0} />
        </mesh>
      );
      return (
        <group>
          {bar(w, frame, 0, h / 2 - frame / 2, "t")}
          {bar(w, frame, 0, -h / 2 + frame / 2, "b")}
          {bar(frame, h - frame * 2, -w / 2 + frame / 2, 0, "l")}
          {bar(frame, h - frame * 2, w / 2 - frame / 2, 0, "r")}
          {/* mount board */}
          <mesh position={[0, 0, -d / 2 + 0.004]} receiveShadow>
            <boxGeometry args={[w - frame * 2, h - frame * 2, 0.006]} />
            <meshStandardMaterial color="#f6f3ee" roughness={0.9} />
          </mesh>
          {/* the picture */}
          <mesh position={[0, 0, -d / 2 + 0.008]}>
            <planeGeometry args={[w - (frame + mat) * 2, h - (frame + mat) * 2]} />
            <meshStandardMaterial map={art ?? undefined} roughness={0.85} />
          </mesh>
        </group>
      );
    }

    case "mirror-round": {
      const r = Math.min(w, h) / 2;
      const rim = Math.min(0.03, r * 0.08);
      return (
        <group>
          {/* rim, standing proud of the wall */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[r, r, d, 64]} />
            <meshStandardMaterial color={color ?? "#b8955a"} roughness={0.3} metalness={0.85} />
          </mesh>
          {/* the glass: a mirror reflects the environment, so a very smooth
              metal reads as a mirror without a second render of the scene */}
          <mesh position={[0, 0, d / 2 + 0.001]}>
            <circleGeometry args={[r - rim, 64]} />
            <meshStandardMaterial color="#e9eef1" roughness={0.04} metalness={1} />
          </mesh>
        </group>
      );
    }

    case "curtains": {
      const fabric = color ?? "#e8e1d4";
      const panelW = w * 0.32;
      const rodY = h / 2 - 0.02;
      return (
        <group>
          {/* rod with end finials */}
          <mesh position={[0, rodY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, w + 0.12, 12]} />
            <meshStandardMaterial color="#3a332d" roughness={0.4} metalness={0.6} />
          </mesh>
          {[-1, 1].map(s => (
            <mesh key={`f${s}`} position={[s * (w / 2 + 0.07), rodY, 0]}>
              <sphereGeometry args={[0.025, 12, 12]} />
              <meshStandardMaterial color="#3a332d" roughness={0.4} metalness={0.6} />
            </mesh>
          ))}
          {/* two panels, drawn back to the sides so the window shows */}
          {curtain && [-1, 1].map(s => (
            <mesh
              key={`p${s}`}
              geometry={curtain}
              position={[s * (w / 2 - panelW / 2), -0.03, 0]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial color={fabric} roughness={0.95} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      );
    }

    case "sconce": {
      // back plate, a short arm, and a fabric drum shade that glows. The light
      // itself comes from the scene's lamp pool (the name matches "sconce").
      return (
        <group>
          <mesh position={[0, -h * 0.15, -d / 2 + 0.01]} castShadow>
            <boxGeometry args={[0.08, 0.16, 0.02]} />
            <meshStandardMaterial color={color ?? "#a88a5a"} roughness={0.35} metalness={0.8} />
          </mesh>
          <mesh position={[0, -h * 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.01, 0.01, d * 0.8, 8]} />
            <meshStandardMaterial color={color ?? "#a88a5a"} roughness={0.35} metalness={0.8} />
          </mesh>
          <mesh position={[0, h * 0.12, d * 0.18]}>
            <cylinderGeometry args={[w * 0.42, w * 0.5, h * 0.55, 32, 1, true]} />
            <meshStandardMaterial
              color="#f3e6cf"
              emissive="#ffd9a0"
              emissiveIntensity={0.9 * glow}
              roughness={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      );
    }
  }
}

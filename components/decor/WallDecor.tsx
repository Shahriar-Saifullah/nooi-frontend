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

    case "split-ac": {
      // wall unit: body, a darker air outlet along the bottom with its flap,
      // intake slots on top and a small display
      const body = color ?? "#f4f5f4";
      const slots = Math.max(6, Math.round(w / 0.05));
      return (
        <group>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={body} roughness={0.35} />
          </mesh>
          {/* front panel seam */}
          <mesh position={[0, h * 0.12, d / 2 + 0.001]}>
            <planeGeometry args={[w * 0.96, h * 0.6]} />
            <meshStandardMaterial color={body} roughness={0.2} />
          </mesh>
          {/* outlet */}
          <mesh position={[0, -h / 2 + h * 0.13, d / 2 - 0.015]}>
            <boxGeometry args={[w * 0.9, h * 0.16, 0.03]} />
            <meshStandardMaterial color="#2b2f31" roughness={0.8} />
          </mesh>
          <mesh position={[0, -h / 2 + h * 0.05, d / 2 + 0.006]} rotation={[-0.5, 0, 0]} castShadow>
            <boxGeometry args={[w * 0.88, h * 0.16, 0.006]} />
            <meshStandardMaterial color={body} roughness={0.3} />
          </mesh>
          {/* intake slots on top */}
          {Array.from({ length: slots }).map((_, i) => (
            <mesh key={i} position={[-w * 0.44 + (i * w * 0.88) / (slots - 1), h / 2 + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.012, d * 0.7]} />
              <meshStandardMaterial color="#9aa0a3" roughness={0.8} />
            </mesh>
          ))}
          {/* display */}
          <mesh position={[w * 0.36, h * 0.02, d / 2 + 0.002]}>
            <planeGeometry args={[0.05, 0.018]} />
            <meshStandardMaterial color="#1c2a30" emissive="#5ad1ff" emissiveIntensity={0.6} />
          </mesh>
        </group>
      );
    }

    case "floor-ac": {
      // cabinet unit: plinth, louvred outlet up top, plain front, display
      const body = color ?? "#f4f5f4";
      const louvres = 9;
      const outH = h * 0.34;
      const outY = h / 2 - h * 0.08 - outH / 2;
      return (
        <group>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={body} roughness={0.35} />
          </mesh>
          <mesh position={[0, -h / 2 + 0.03, 0.004]}>
            <boxGeometry args={[w * 0.98, 0.06, d]} />
            <meshStandardMaterial color="#8c9295" roughness={0.6} />
          </mesh>
          <mesh position={[0, outY, d / 2 - 0.01]}>
            <boxGeometry args={[w * 0.82, outH, 0.022]} />
            <meshStandardMaterial color="#2b2f31" roughness={0.8} />
          </mesh>
          {Array.from({ length: louvres }).map((_, i) => (
            <mesh key={i} position={[0, outY - outH / 2 + ((i + 0.5) * outH) / louvres, d / 2 + 0.004]} rotation={[-0.35, 0, 0]}>
              <boxGeometry args={[w * 0.8, 0.012, 0.03]} />
              <meshStandardMaterial color={body} roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, outY - outH / 2 - 0.08, d / 2 + 0.002]}>
            <planeGeometry args={[0.09, 0.03]} />
            <meshStandardMaterial color="#1c2a30" emissive="#5ad1ff" emissiveIntensity={0.6} />
          </mesh>
        </group>
      );
    }

    case "ceiling-fan": {
      // canopy and downrod from the ceiling, motor, five pitched blades and a
      // frosted light bowl underneath. Origin is the middle of its height.
      const metal = color ?? "#f2efe9";
      const bladeL = Math.max(0.2, w / 2 - 0.1);
      const motorY = -h / 2 + 0.11;
      const bladeY = motorY - 0.01;
      return (
        <group>
          <mesh position={[0, h / 2 - 0.025, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.05, 32]} />
            <meshStandardMaterial color={metal} roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, (h / 2 - 0.05 + motorY + 0.06) / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.012, Math.max(0.01, h / 2 - 0.05 - (motorY + 0.06)), 12]} />
            <meshStandardMaterial color={metal} roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, motorY, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.12, 32]} />
            <meshStandardMaterial color={metal} roughness={0.4} metalness={0.3} />
          </mesh>
          {Array.from({ length: 5 }).map((_, i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <group key={i} rotation={[0, a, 0]}>
                <mesh position={[0.11 + bladeL / 2, bladeY, 0]} rotation={[0.18, 0, 0]} castShadow>
                  <boxGeometry args={[bladeL, 0.008, 0.13]} />
                  <meshStandardMaterial color="#8a6a4a" roughness={0.6} />
                </mesh>
              </group>
            );
          })}
          <mesh position={[0, -h / 2 + 0.04, 0]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[0.08, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#f7f3ea" emissive="#ffe2b0" emissiveIntensity={0.35 * glow} roughness={0.9} />
          </mesh>
        </group>
      );
    }

    case "water-heater": {
      // a white tank on a wall bracket, rounded ends, thermostat dial and the
      // two pipes underneath
      const body = color ?? "#f7f7f5";
      const r = Math.min(w, d) / 2;
      const tankH = h * 0.86;
      return (
        <group>
          <mesh position={[0, h * 0.04, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[r, r, tankH - r * 0.6, 40]} />
            <meshStandardMaterial color={body} roughness={0.35} />
          </mesh>
          {[1, -1].map(sgn => (
            <mesh key={sgn} position={[0, h * 0.04 + sgn * (tankH - r * 0.6) / 2, 0]} scale={[1, 0.3, 1]}>
              <sphereGeometry args={[r, 40, 16, 0, Math.PI * 2, sgn > 0 ? 0 : Math.PI / 2, Math.PI / 2]} />
              <meshStandardMaterial color={body} roughness={0.35} />
            </mesh>
          ))}
          <mesh position={[0, h * 0.25, -d / 2 + 0.01]}>
            <boxGeometry args={[w * 0.7, 0.06, 0.02]} />
            <meshStandardMaterial color="#9aa0a3" roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh position={[0, -h * 0.05, r - 0.005]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.03, 24]} />
            <meshStandardMaterial color="#3a3f42" roughness={0.5} />
          </mesh>
          {[-1, 1].map(sgn => (
            <mesh key={`p${sgn}`} position={[sgn * r * 0.35, -h / 2 + h * 0.05, 0]}>
              <cylinderGeometry args={[0.012, 0.012, h * 0.1, 12]} />
              <meshStandardMaterial color={sgn < 0 ? "#3d6fb8" : "#c0453a"} roughness={0.4} metalness={0.4} />
            </mesh>
          ))}
        </group>
      );
    }

    case "socket":
    case "switch": {
      // BS 1363 plates: a socket has an earth slot over live and neutral and
      // its own switch; a switch has one rocker per gang
      const plate = color ?? "#f6f6f4";
      const n = kind === "socket" ? (w > 0.12 ? 2 : 1) : (w > 0.12 ? 3 : 1);
      const cellW = (w - 0.012) / n;
      const slot = (x: number, y: number, sw: number, sh: number, key: string) => (
        <mesh key={key} position={[x, y, d / 2 + 0.0006]}>
          <planeGeometry args={[sw, sh]} />
          <meshStandardMaterial color="#1f2224" roughness={0.9} />
        </mesh>
      );
      return (
        <group>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={plate} roughness={0.3} />
          </mesh>
          {Array.from({ length: n }).map((_, i) => {
            const cx = -w / 2 + 0.006 + cellW * (i + 0.5);
            if (kind === "switch") {
              return (
                <group key={i}>
                  {slot(cx, 0, cellW - 0.004, h * 0.64, `g${i}`)}
                  <mesh position={[cx, 0, d / 2 + 0.003]} rotation={[0.08, 0, 0]}>
                    <boxGeometry args={[cellW - 0.009, h * 0.6, 0.006]} />
                    <meshStandardMaterial color={plate} roughness={0.25} />
                  </mesh>
                </group>
              );
            }
            return (
              <group key={i}>
                {slot(cx - 0.006, h * 0.17, 0.004, 0.009, `e${i}`)}
                {slot(cx - 0.017, -h * 0.08, 0.009, 0.004, `l${i}`)}
                {slot(cx + 0.005, -h * 0.08, 0.009, 0.004, `n${i}`)}
                <mesh position={[cx + cellW * 0.32, h * 0.18, d / 2 + 0.002]}>
                  <boxGeometry args={[0.008, 0.016, 0.004]} />
                  <meshStandardMaterial color="#d8d8d4" roughness={0.3} />
                </mesh>
              </group>
            );
          })}
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

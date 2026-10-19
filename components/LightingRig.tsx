"use client";

/**
 * Interior lighting — components/LightingRig.tsx
 * ============================================================================
 * The scene had one directional light outside the building and a flat ambient
 * term. That is why it read as a diagram: a real room is lit from inside it,
 * by fixtures and by daylight coming through openings, and the shading those
 * produce is most of what the eye uses to read depth and material.
 *
 * Three sources, all derived from what is already in the scene:
 *
 *   1. Fixtures. Every lamp the user placed becomes a real light. A standing
 *      lamp that does not light the room is set dressing.
 *   2. Daylight through openings. The plan already knows where every window
 *      and door is; each becomes a light pointing inward.
 *   3. A sky/ground hemisphere instead of flat ambient, so shadowed surfaces
 *      pick up a direction rather than a uniform grey wash.
 *
 * All of it is tunable from one brightness and one warmth value, which is what
 * the settings panel drives.
 */

import { useMemo } from "react";
import * as THREE from "three";

/** Catalogue ids and names that should emit light. Matched loosely because the
 *  catalogue grows and a new lamp should work without touching this file. */
const LIGHT_PATTERN = /lamp|light|chandelier|pendant|sconce|lantern/i;

export interface LightingSettings {
  /** 0.4 dim, 1 normal, 2 bright. Scales everything together. */
  brightness: number;
  /** 0 cool daylight, 0.5 neutral, 1 warm tungsten. */
  warmth: number;
}

export const DEFAULT_LIGHTING: LightingSettings = { brightness: 1, warmth: 0.45 };

interface PlacedLike {
  id: string;
  name: string;
  modelId?: string;
  position: [number, number, number];
  height?: number;
  mountType?: "floor" | "ceiling" | "wall";
}

interface OpeningLike {
  type: "door" | "window";
  wall: "horizontal" | "vertical";
  x: number;
  y: number;
  width: number;
}

interface Props {
  furniture: PlacedLike[];
  openings: OpeningLike[];
  /** % → world, same mapping the scene uses. */
  px: (x: number) => number;
  pz: (y: number) => number;
  maxDim: number;
  totalW: number;
  totalD: number;
  wallHeight: number;
  settings?: LightingSettings;
  /** Ceiling mounts only render inside; their lights should match. */
  insideMode?: boolean;
}

/** Warm tungsten through to cool daylight. */
function temperature(warmth: number): THREE.Color {
  const cool = new THREE.Color("#cfe2ff");
  const warm = new THREE.Color("#ffd9a0");
  return cool.clone().lerp(warm, Math.max(0, Math.min(1, warmth)));
}

export default function LightingRig({
  furniture, openings, px, pz, maxDim, totalW, totalD, wallHeight,
  settings = DEFAULT_LIGHTING, insideMode = false,
}: Props) {
  const b = Math.max(0.1, settings.brightness);
  const bulb = useMemo(() => temperature(settings.warmth), [settings.warmth]);

  // ── 1. Fixtures ────────────────────────────────────────────────────────
  const fixtures = useMemo(() => {
    return furniture
      .filter(f => LIGHT_PATTERN.test(f.name) || LIGHT_PATTERN.test(f.modelId ?? ""))
      .filter(f => (f.mountType ?? "floor") !== "ceiling" || insideMode)
      .map(f => {
        const ceiling = (f.mountType ?? "floor") === "ceiling";
        // Sit the emitter where the bulb would be: just under a ceiling fitting,
        // near the top of a standing lamp. A light at the model's origin is
        // inside its own base and lights the floor it stands on.
        const y = ceiling
          ? wallHeight - 0.35
          : (f.position[1] ?? 0) + ((f.height ?? 150) / 100) * 0.85;
        return { id: f.id, pos: [f.position[0], y, f.position[2]] as const, ceiling };
      });
  }, [furniture, insideMode, wallHeight]);

  // ── 2. Daylight through openings ───────────────────────────────────────
  const windows = useMemo(() => {
    return openings.map((op, i) => {
      // Openings are in ‰ of the source image; the scene divides by 10 to get
      // the 0–100 plan space, so this matches cutsPerWall.
      const wx = px(op.x / 10);
      const wz = pz(op.y / 10);
      const horiz = op.wall === "horizontal";

      // Point inward. "Inward" is toward the middle of the plan, which is the
      // origin — crude, but right for every opening on an exterior wall, and
      // an interior door lighting both ways is harmless.
      const inward = new THREE.Vector3(-wx, 0, -wz);
      if (inward.lengthSq() < 0.01) inward.set(0, 0, -1);
      inward.normalize();

      // A door reaches the floor and floods; a window starts at sill height
      // and throws a narrower band.
      const isDoor = op.type === "door";
      const y = isDoor ? 1.1 : 1.5;
      const width = (op.width / 1000) * maxDim;

      return {
        id: `op${i}`,
        // Set back slightly into the room so the light is not co-planar with
        // the wall it comes through, which would light the wall edge-on.
        pos: [wx + inward.x * 0.35, y, wz + inward.z * 0.35] as const,
        target: [wx + inward.x * 4, y * 0.6, wz + inward.z * 4] as const,
        // Wider openings admit more light, but not without limit — a 7m
        // slider should not outshine the sun.
        power: Math.min(2.2, 0.8 + width * 0.35),
        isDoor,
      };
    });
  }, [openings, px, pz, maxDim]);

  return (
    <group name="nooi-lighting">
      {/*
        Sky above, floor bounce below. A flat ambientLight lifts every surface
        by the same amount, which is exactly what kills the sense of form; a
        hemisphere at least tells the renderer which way is up.
      */}
      <hemisphereLight
        args={["#dceaff", "#b9a98f", 0.45 * b]}
        position={[0, wallHeight, 0]}
      />

      {/* A little flat fill underneath, so deep corners are not pure black.
          Deliberately small — this is the term that was at 0.55 and washing
          out every shadow in the scene. */}
      <ambientLight intensity={0.1 * b} />

      {/* ── Fixtures ── */}
      {fixtures.map(f => (
        <pointLight
          key={f.id}
          position={f.pos as unknown as [number, number, number]}
          color={bulb}
          // Ceiling fittings light a room; a table lamp pools.
          intensity={(f.ceiling ? 9 : 5) * b}
          // Physical falloff. Without decay 2 a lamp lights the whole floor
          // evenly and reads as a flood rather than a lamp.
          decay={2}
          distance={f.ceiling ? 9 : 5}
          castShadow={f.ceiling}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.004}
          shadow-normalBias={0.02}
        />
      ))}

      {/* ── Daylight through openings ── */}
      {windows.map(w => (
        <spotLight
          key={w.id}
          position={w.pos as unknown as [number, number, number]}
          // Wide and soft: a window is an area source, and a tight cone would
          // put a visible ellipse on the floor that no window produces.
          angle={w.isDoor ? 1.15 : 0.95}
          penumbra={1}
          color="#eaf2ff"
          intensity={w.power * 9 * b}
          decay={1.4}
          distance={Math.max(8, maxDim * 0.5)}
          castShadow={false}
        >
          <object3D
            attach="target"
            position={w.target as unknown as [number, number, number]}
          />
        </spotLight>
      ))}
    </group>
  );
}
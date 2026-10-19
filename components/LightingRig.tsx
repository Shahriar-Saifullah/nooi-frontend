"use client";

/**
 * Interior lighting — components/LightingRig.tsx
 * ============================================================================
 * Deliberately simple, after the approach in Pascal's open-source viewer
 * (github.com/pascalorg/editor, MIT): a few broad, soft sources plus ambient
 * occlusion in post, rather than many local lights.
 *
 * What changed from the previous rig and why:
 *
 *   - NO LIGHT PER WINDOW. Each opening used to get its own spotlight. Even
 *     capped at six and toned down twice, they stacked into the white pools on
 *     the floor and the bright bands on walls. Daylight still enters: the sun
 *     shines through the real holes the openings cut in the walls, with real
 *     shadows, which is what a window actually does.
 *
 *   - A FIXED POOL OF LAMP LIGHTS. three.js compiles the number of lights into
 *     every material's shader, so adding or removing a lamp used to recompile
 *     every material in the scene (a visible hitch). The pool is always
 *     POOL_SIZE lights; unused ones sit at intensity 0. Every REASSIGN_S
 *     seconds the pool is handed to the lamps nearest the camera, so a big
 *     plan with many lamps still lights whatever the user is looking at.
 *
 *   - A GENERATED SKY FOR ENVIRONMENT LIGHT. A tiny gradient (cool zenith,
 *     warm horizon, dim ground) set as scene.environment. Upward faces read a
 *     little cooler than walls, which gives direction to the fill light, with
 *     no HDR download.
 *
 * Everything still scales from one brightness and one warmth value, which is
 * what the Lighting panel drives.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/** Catalogue ids and names that should emit light. Matched loosely because the
 *  catalogue grows and a new lamp should work without touching this file. */
const LIGHT_PATTERN = /lamp|light|chandelier|pendant|sconce|lantern/i;

/** Real lights available to lamps at any moment. Constant on purpose — see the
 *  header note on shader recompiles. */
const POOL_SIZE = 8;
/** How often the pool is reassigned to the nearest lamps. */
const REASSIGN_S = 0.2;

/** Environment (IBL) strength at brightness 1. */
const ENV_INTENSITY = 0.6;

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

interface Props {
  furniture: PlacedLike[];
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

// ── Environment ─────────────────────────────────────────────────────────────

const ZENITH = [0.4, 0.56, 0.78] as const;
const HORIZON = [0.95, 0.84, 0.66] as const;
const GROUND = [0.38, 0.35, 0.3] as const;

function buildGradientSky(): THREE.DataTexture {
  const W = 64, H = 32;
  const data = new Float32Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const lat = ((y + 0.5) / H) * 2 - 1; // -1 straight down … +1 straight up
    let r: number, g: number, b: number;
    if (lat <= 0) {
      const k = 1 + lat * 0.35;
      r = GROUND[0] * k; g = GROUND[1] * k; b = GROUND[2] * k;
    } else {
      const t = lat ** 0.65;
      r = HORIZON[0] + (ZENITH[0] - HORIZON[0]) * t;
      g = HORIZON[1] + (ZENITH[1] - HORIZON[1]) * t;
      b = HORIZON[2] + (ZENITH[2] - HORIZON[2]) * t;
    }
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 1;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Sets scene.environment for as long as it is mounted. The renderer turns an
 *  equirect environment into a PMREM by itself, so nothing else is needed. */
function SceneEnvironment({ intensity }: { intensity: number }) {
  // The scene is read through get() inside the effects rather than captured
  // from a hook: it is a three.js object mutated on purpose, which the React
  // compiler's lint rules would otherwise reject.
  const get = useThree(s => s.get);
  const texture = useMemo(() => buildGradientSky(), []);

  useEffect(() => {
    const scene = get().scene;
    const prev = scene.environment;
    const prevIntensity = scene.environmentIntensity;
    scene.environment = texture;
    return () => {
      if (scene.environment === texture) {
        scene.environment = prev;
        scene.environmentIntensity = prevIntensity;
      }
    };
  }, [get, texture]);

  useEffect(() => () => texture.dispose(), [texture]);

  useEffect(() => {
    const { scene, invalidate } = get();
    scene.environmentIntensity = intensity;
    invalidate();
  }, [get, intensity]);

  return null;
}

// ── Rig ─────────────────────────────────────────────────────────────────────

export default function LightingRig({
  furniture, wallHeight, settings = DEFAULT_LIGHTING, insideMode = false,
}: Props) {
  const b = Math.max(0.1, settings.brightness);
  const bulb = useMemo(() => temperature(settings.warmth), [settings.warmth]);

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
        return {
          id: f.id,
          pos: new THREE.Vector3(f.position[0], y, f.position[2]),
          ceiling,
        };
      });
  }, [furniture, insideMode, wallHeight]);

  // ── Pool assignment ──
  const poolRefs = useRef<Array<THREE.PointLight | null>>([]);
  const sinceAssign = useRef(Infinity); // assign on the first frame
  const lastFixtures = useRef(fixtures);

  useFrame(({ camera, invalidate }, dt) => {
    // reassign at once when the lamps change, otherwise on the timer
    if (lastFixtures.current !== fixtures) {
      lastFixtures.current = fixtures;
      sinceAssign.current = Infinity;
    }
    sinceAssign.current += dt;
    if (sinceAssign.current < REASSIGN_S) return;
    sinceAssign.current = 0;

    const nearest = fixtures.length <= POOL_SIZE
      ? fixtures
      : [...fixtures]
          .sort((a, c) =>
            a.pos.distanceToSquared(camera.position) - c.pos.distanceToSquared(camera.position))
          .slice(0, POOL_SIZE);

    let changed = false;
    for (let i = 0; i < POOL_SIZE; i++) {
      const light = poolRefs.current[i];
      if (!light) continue;
      const f = nearest[i];
      if (!f) {
        if (light.intensity !== 0) { light.intensity = 0; changed = true; }
        continue;
      }
      // Ceiling fittings light a room; a table lamp pools.
      const intensity = (f.ceiling ? 5 : 2.6) * b;
      const distance = f.ceiling ? 9 : 5;
      if (!light.position.equals(f.pos) || light.intensity !== intensity) {
        light.position.copy(f.pos);
        light.intensity = intensity;
        light.distance = distance;
        changed = true;
      }
    }
    if (changed) invalidate();
  });

  return (
    <group name="nooi-lighting">
      <SceneEnvironment intensity={ENV_INTENSITY * b} />

      {/* Sky above, floor bounce below — tells the renderer which way is up,
          which a flat ambient term cannot. */}
      <hemisphereLight
        args={["#fff5e6", "#b9a98f", 0.45 * b]}
        position={[0, wallHeight, 0]}
      />

      {/* Flat fill so rooms under a ceiling (where the sun cannot reach) are
          not left to the hemisphere alone. Ambient occlusion in post puts the
          form back into corners and under furniture. */}
      <ambientLight color="#fff9eb" intensity={0.3 * b} />

      {/*
        The lamp pool. Always POOL_SIZE lights, assigned in useFrame above.

        No shadows: a point-light shadow is a cube map, six extra passes per
        light per frame. The sun draws the hard shadows; AO handles contact.
      */}
      {Array.from({ length: POOL_SIZE }, (_, i) => (
        <pointLight
          key={`pool${i}`}
          ref={el => { poolRefs.current[i] = el; }}
          color={bulb}
          intensity={0}
          decay={2}
          castShadow={false}
        />
      ))}

      {/* A visible glow per lamp, pooled or not, so a fitting never looks
          switched off. Small, unlit, never occludes. */}
      {fixtures.map(f => (
        <mesh
          key={`${f.id}-glow`}
          position={f.pos}
          name="nooi-noexport"
          raycast={() => null}
        >
          <sphereGeometry args={[f.ceiling ? 0.11 : 0.07, 12, 12]} />
          <meshBasicMaterial
            color={bulb}
            toneMapped={false}
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

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

/** Does this placed item emit light? Shared with the inspector, so the
 *  on/off and dimmer controls appear on exactly the items that light up. */
export function isLightFixture(f: { name: string; modelId?: string }): boolean {
  return LIGHT_PATTERN.test(f.name) || LIGHT_PATTERN.test(f.modelId ?? "");
}

/** Real lights available to lamps at any moment. Constant on purpose — see the
 *  header note on shader recompiles. */
const POOL_SIZE = 8;
/** How often the pool is reassigned to the nearest lamps. */
const REASSIGN_S = 0.2;

/** Environment (IBL) strength at brightness 1. */
const ENV_INTENSITY = 0.6;

export type TimeOfDay = "day" | "sunset" | "night";

export interface LightingSettings {
  /** 0.4 dim, 1 normal, 2 bright. Scales everything together. */
  brightness: number;
  /** 0 cool daylight, 0.5 neutral, 1 warm tungsten. */
  warmth: number;
  /** Sun, sky and lamps together. Optional so older saved settings load. */
  timeOfDay?: TimeOfDay;
}

export const DEFAULT_LIGHTING: LightingSettings = { brightness: 1, warmth: 0.45, timeOfDay: "day" };

/**
 * One row per time of day. Every light in the scene reads from here, so a
 * preset changes the whole mood at once instead of one dial at a time.
 *
 *  - day:    high sun, neutral sky. The look the app has always had.
 *  - sunset: a low, orange sun that rakes through the windows and throws long
 *            shadows across the floor; a warm sky and a cooler fill opposite.
 *  - night:  no sun, a dark blue sky; the lamps carry the room, and rooms with
 *            no lamp get a soft ceiling light so nothing goes black.
 *
 * Light COUNT never changes between presets (the sun is dimmed to 0 at night,
 * not removed): three.js recompiles every material when the number of lights
 * changes, which would freeze the view for a moment on every switch.
 */
interface Preset {
  sun: { elevationDeg: number; azimuthDeg: number; color: string; intensity: number };
  fill: { color: string; intensity: number };
  hemi: { sky: string; ground: string; intensity: number };
  ambient: { color: string; intensity: number };
  env: number;
  lampBoost: number;
  roomLights: boolean;
}

export const TIME_OF_DAY: Record<TimeOfDay, Preset> = {
  day: {
    sun: { elevationDeg: 55, azimuthDeg: 32, color: "#fff1c8", intensity: 2.8 },
    fill: { color: "#dde5ff", intensity: 0.4 },
    hemi: { sky: "#fff5e6", ground: "#ddd5c8", intensity: 0.5 },
    ambient: { color: "#fff9eb", intensity: 0.3 },
    env: 1,
    lampBoost: 1,
    roomLights: false,
  },
  sunset: {
    sun: { elevationDeg: 10, azimuthDeg: 205, color: "#ffa45c", intensity: 3.2 },
    fill: { color: "#8fa6d8", intensity: 0.32 },
    hemi: { sky: "#ffcfa8", ground: "#c9b29a", intensity: 0.4 },
    ambient: { color: "#ffe2c4", intensity: 0.22 },
    env: 0.7,
    lampBoost: 1.25,
    roomLights: false,
  },
  night: {
    sun: { elevationDeg: 40, azimuthDeg: 32, color: "#9fb6d8", intensity: 0 },
    fill: { color: "#8fa6d8", intensity: 0.08 },
    hemi: { sky: "#26304a", ground: "#3a3028", intensity: 0.18 },
    ambient: { color: "#ffe8cc", intensity: 0.08 },
    env: 0.12,
    lampBoost: 1.8,
    roomLights: true,
  },
};

interface PlacedLike {
  id: string;
  name: string;
  modelId?: string;
  position: [number, number, number];
  height?: number;
  mountType?: "floor" | "ceiling" | "wall";
  /** 0 = off … 1 = full. Absent means on at full. */
  lightLevel?: number;
}

interface Props {
  furniture: PlacedLike[];
  wallHeight: number;
  settings?: LightingSettings;
  /** Ceiling mounts only render inside; their lights should match. */
  insideMode?: boolean;
  /** Plan size in metres; the sun and its shadow camera are sized from it. */
  world: { totalW: number; totalD: number; maxDim: number };
  /** Room centres [x, z] in metres. At night a room with no lamp gets a soft
   *  ceiling light at its centre. */
  roomCentres?: Array<[number, number]>;
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
  world, roomCentres = [],
}: Props) {
  const b = Math.max(0.1, settings.brightness);
  const preset = TIME_OF_DAY[settings.timeOfDay ?? "day"];
  // At night lamps are the room's only light, and a neutral bulb reads as
  // cold and clinical. Lean them warm (at least 0.75) so the room feels lived
  // in; the warmth dial still goes further if the user asks for it.
  const bulbWarmth = settings.timeOfDay === "night" ? Math.max(settings.warmth, 0.75) : settings.warmth;
  const bulb = useMemo(() => temperature(bulbWarmth), [bulbWarmth]);

  const fixtures = useMemo(() => {
    const lamps = furniture
      .filter(f => isLightFixture(f))
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
          virtual: false,
          level: Math.max(0, Math.min(1, f.lightLevel ?? 1)),
        };
      });

    if (!preset.roomLights) return lamps;

    // Night: a soft ceiling light in every room that has no lamp of its own,
    // switched-off lamps included (a lamp turned off still means the owner
    // chose the lighting for that room, so no stand-in is added there).
    // so an unlit room reads as "lights on" rather than a black hole. They go
    // through the same nearest-to-camera pool as real lamps.
    const virtual = roomCentres
      .filter(([x, z]) => !lamps.some(l => Math.hypot(l.pos.x - x, l.pos.z - z) < 2))
      .map(([x, z], i) => ({
        id: `room-light-${i}`,
        pos: new THREE.Vector3(x, wallHeight - 0.15, z),
        ceiling: true,
        virtual: true,
        level: 1,
      }));
    return [...lamps, ...virtual];
  }, [furniture, insideMode, wallHeight, preset.roomLights, roomCentres]);

  // ── Pool assignment ──
  const poolRefs = useRef<Array<THREE.PointLight | null>>([]);
  const sinceAssign = useRef(Infinity); // assign on the first frame
  const lastKey = useRef<unknown[]>([]);

  useFrame(({ camera, invalidate }, dt) => {
    // reassign at once when the lamps or the preset change, else on the timer
    const key = [fixtures, preset, b];
    if (key.some((k, i) => k !== lastKey.current[i])) {
      lastKey.current = key;
      sinceAssign.current = Infinity;
    }
    sinceAssign.current += dt;
    if (sinceAssign.current < REASSIGN_S) return;
    sinceAssign.current = 0;

    // switched-off lamps take no light from the pool
    const lit = fixtures.filter(f => f.level > 0);
    const nearest = lit.length <= POOL_SIZE
      ? lit
      : [...lit]
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
      // Ceiling fittings light a room; a table lamp pools. A room light is a
      // broad soft wash, so it is weaker but reaches further.
      const base = f.virtual ? 3.2 : f.ceiling ? 5 : 2.6;
      const intensity = base * preset.lampBoost * b * f.level;
      const distance = f.virtual ? 8 : f.ceiling ? 9 : 5;
      if (!light.position.equals(f.pos) || light.intensity !== intensity || light.distance !== distance) {
        light.position.copy(f.pos);
        light.intensity = intensity;
        light.distance = distance;
        changed = true;
      }
    }
    if (changed) invalidate();
  });

  // ── Sun ──
  const sunPos = useMemo((): [number, number, number] => {
    const el = THREE.MathUtils.degToRad(preset.sun.elevationDeg);
    const az = THREE.MathUtils.degToRad(preset.sun.azimuthDeg);
    const d = world.maxDim * 1.6;
    return [Math.cos(el) * Math.cos(az) * d, Math.sin(el) * d, Math.cos(el) * Math.sin(az) * d];
  }, [preset, world.maxDim]);

  return (
    <group name="nooi-lighting">
      <SceneEnvironment intensity={ENV_INTENSITY * preset.env * b} />

      {/* Sky above, floor bounce below — tells the renderer which way is up,
          which a flat ambient term cannot. The ground colour is the light
          bounced up off the floor, which is what lights a ceiling. */}
      <hemisphereLight
        args={[preset.hemi.sky, preset.hemi.ground, preset.hemi.intensity * b]}
        position={[0, wallHeight, 0]}
      />

      {/* Flat fill so rooms under a ceiling (where the sun cannot reach) are
          not left to the hemisphere alone. Ambient occlusion in post puts the
          form back into corners and under furniture. */}
      <ambientLight color={preset.ambient.color} intensity={preset.ambient.intensity * b} />

      {/*
        The sun. Its job is the hard shadows and the light that falls through
        the window and door openings — at sunset, long raking patches across
        the floor.
      */}
      <directionalLight
        position={sunPos}
        color={preset.sun.color}
        intensity={preset.sun.intensity * b}
        castShadow
        shadow-mapSize={[2048, 2048]}
        /*
          Without these three.js uses a ±5 unit shadow camera. The plan is
          tens of metres across, so shadows rendered only in a 10 m square at
          the centre. Sized to the world, so it scales with the plan.
        */
        shadow-camera-left={-world.maxDim}
        shadow-camera-right={world.maxDim}
        shadow-camera-top={world.maxDim}
        shadow-camera-bottom={-world.maxDim}
        shadow-camera-near={0.5}
        shadow-camera-far={world.maxDim * 5}
        /* normalBias beats bias for thin geometry: walls here are ~12 cm and a
           plain depth bias makes them self-shadow in stripes. */
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
      />
      {/* Fill from the opposite side, so shadowed faces are not dead. */}
      <directionalLight
        position={[-world.totalW, world.maxDim, -world.totalD]}
        color={preset.fill.color}
        intensity={preset.fill.intensity * b}
      />

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

      {/* A visible glow per real lamp, pooled or not, so a fitting never looks
          switched off. Small, unlit, never occludes. */}
      {fixtures.filter(f => !f.virtual && f.level > 0).map(f => (
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
            opacity={0.25 + 0.65 * f.level}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

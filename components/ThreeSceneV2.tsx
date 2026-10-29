"use client";


import React, {
  Suspense, useMemo, useRef, useState, useEffect,
  forwardRef, useImperativeHandle,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls, ContactShadows, useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import { surfaceById } from "@/lib/surfaces/catalog";
import {
  snapToWall, resolveCollision, settleClearOfWalls, planWallsToWorld, halfExtents, nearestWall,
  WALL_T_MIN, WALL_T_MAX,
  type WorldWall, type Footprint,
} from "@/lib/placement/snap";
import { doorFinishById } from "@/lib/surfaces/doors";
import { getFaceTextures, getDoorTexture, onSurfaceTextureLoaded } from "@/lib/surfaces/textures";
import WallDecor from "@/components/decor/WallDecor";
import { RoomAreaLabels, ItemDimensions } from "@/components/Measurements";
import { Html } from "@react-three/drei";
import { installBvh, buildBoundsTrees } from "@/lib/three/bvh";
import { outsideSides, type OutsideSide } from "@/lib/walls/exterior";
import { makeFrame, sceneToReal, snapSceneToRealCm, type PlanFrame } from "@/lib/geometry/planFrame";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { GridRoom } from "@/components/RoomLayoutGrid";
import { catalogById, MATERIAL_PRESETS } from "@/lib/furniture/catalog";
import { ensureShopItems, useShopCatalogVersion } from "@/lib/furniture/shopCatalog";
import WalkthroughCamera, { type WalkthroughProgressInfo } from "@/components/WalkthroughCamera";
import PathTracerLayer, { type PathTracerStats } from "@/components/PathTracerLayer";
import LightingRig, {
  DEFAULT_LIGHTING, isLightFixture, type LightingSettings,
} from "@/components/LightingRig";
import {
  EffectComposer, N8AO, ToneMapping, HueSaturation, BrightnessContrast,
} from "@react-three/postprocessing";
import InkEdges from "@/components/InkEdges";
// Not in package.json directly — it is @react-three/postprocessing's own
// dependency, and this enum is the documented way to pick a tone-map mode.
import { ToneMappingMode } from "postprocessing";
import { useRendererBackend } from "@/lib/three/rendererBackend";
import { webgpuGlFactory } from "@/components/webgpu/renderer";
import WebGPUPostFx from "@/components/webgpu/WebGPUPostFx";
import { createDepthNodeMaterial } from "@/components/webgpu/depthMaterial";

// ─── Canvas Bridge Helper ──────────────────────────────────────────────────────
// Textures decode asynchronously; nudge a redraw when one lands so a newly
// applied surface appears without the user having to move the camera.
function SurfaceTextureRefresh() {
  const invalidate = useThree(s => s.invalidate);
  useEffect(() => onSurfaceTextureLoaded(() => invalidate()), [invalidate]);
  return null;
}

// ─── On-demand rendering ──────────────────────────────────────────────────────
// The Canvas runs frameloop="demand": a frame is drawn only when something
// asks for one, so an idle view costs nothing (laptops stay cool, phones keep
// their battery). Who asks:
//   - R3F itself, whenever React changes a prop on a three.js object;
//   - OrbitControls, on every camera change (damping included);
//   - every animation in this file, for as long as it is still moving
//     (doors, cutaway walls, camera flights, walk mode, the tour);
//   - this driver: a short burst after mount and after each update of the
//     scene's props, so work that lands a moment later — a model's
//     materials, an effect that mutates an object directly — still reaches
//     the screen; and any key press, for the keyboard camera.
export const KICK_MS = { mount: 4000, update: 700 };
/** Cap a frame's delta: after an idle stretch the first frame's delta is the
 *  whole idle time, which would teleport anything that moves by `dt`. */
export const frameDt = (dt: number) => Math.min(dt, 1 / 20);

function DemandDriver({ kickRef }: { kickRef: React.MutableRefObject<((ms: number) => void) | null> }) {
  const invalidate = useThree(s => s.invalidate);
  const until = useRef(0);
  useEffect(() => {
    kickRef.current = (ms: number) => {
      until.current = Math.max(until.current, performance.now() + ms);
      invalidate();
    };
    kickRef.current(KICK_MS.mount);
    const key = () => invalidate();
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);
    return () => {
      kickRef.current = null;
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
    };
  }, [invalidate, kickRef]);
  useFrame(() => { if (performance.now() < until.current) invalidate(); });
  return null;
}

function CanvasBridge({ onCanvasReady }: { onCanvasReady: (canvas: HTMLCanvasElement) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    if (gl.domElement) {
      onCanvasReady(gl.domElement);
    }
  }, [gl, onCanvasReady]);
  return null;
}


// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlacedFurniture {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number;
  /** catalog model id — when set, a real GLTF model renders; when absent,
      the legacy colored box (width/depth/height/color) renders instead */
  modelId?: string;
  sizeScale?: number;                 // uniform size multiplier (default 1)
  color?: string | null;              // material color override
  materialPreset?: string | null;     // id from MATERIAL_PRESETS
  mountType?: "floor" | "ceiling" | "wall";
  /** Lamps only: 0 = off … 1 = full. Absent = on at full. */
  lightLevel?: number;
  // legacy box fields (still used as GLTF fallback)
  scale?: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
}


// accelerated raycasting for every mesh (lib/three/bvh)
installBvh();

/** A drag on one of the selected wall's 3D handles. (x, z) is the pointer
 *  on the floor in scene metres, snapped so real lengths land on whole
 *  centimetres; the page feeds it to the same edit rules as the 2D editor
 *  (lib/walls/wallEdit). */
export interface WallHandleDragEvent {
  index: number;
  /** 1 / 2 = that end; "body" = the middle handle (slides the wall sideways) */
  handle: 1 | 2 | "body";
  x: number;
  z: number;
  phase: "start" | "move" | "end";
}

/** Where a wall-mounted item hangs: its bottom-centre and the rotation that
 *  turns its face (+z) into the room. */
export interface WallPlacement { position: [number, number, number]; rotation: number }

export interface ThreeSceneHandle {
  /** raycast an NDC point (-1..1) onto the floor or ceiling; returns world [x, z] */
  floorPointFromNdc: (nx: number, ny: number, mountType?: "floor" | "ceiling") => [number, number] | null;
  /** Hang an item of the given size (cm) on the wall under an NDC point, at
   *  `mountHeight` cm (its centre). With `nearestIfMissed`, a point that misses
   *  every wall falls back to the wall nearest the floor point under it. */
  wallPlacementFromNdc: (
    nx: number, ny: number,
    item: { w: number; d: number; h: number; mountHeight?: number },
    nearestIfMissed?: boolean,
  ) => WallPlacement | null;
  /** render the current view and return it as a PNG data-URL */
  captureImage: () => string | null;
  /** grayscale depth map of the current view (near = white), for
      depth-conditioned photorealistic rendering */
  captureDepthMap: () => string | null;
  /** export the whole scene (rooms, walls, furniture) as a binary glTF blob */
  exportGlb: () => Promise<Blob | null>;
  /** get the HTML canvas element for recording */
  getCanvasElement: () => HTMLCanvasElement | null;
  /** smoothly move the camera to a preset view */
  setCameraView: (view: CameraViewPreset) => void;
  /** The live camera. Needed to point it at each panorama face; the capture
   *  functions render whatever it is currently looking at. */
  getCamera: () => THREE.Camera | null;
}

export type CameraViewPreset = "default" | "top" | "front" | "inside";

export interface Opening {
  type: "door" | "window";
  wall: "horizontal" | "vertical";
  x: number;      // ‰ of image width
  y: number;      // ‰ of image height
  width: number;  // ‰ of max(image w, h)
  wall_id?: string;
}

export interface VWall {
  x1: number; y1: number; x2: number; y2: number; // % of image
  thickness: number;                              // % of max(image w, h)
  id?: string;
}

/** One paintable face of a wall. side "A" = the −z face for horizontal walls
    / −x face for vertical walls; "B" = the opposite face. */
export type WallSideSelection = { key: string; side: "A" | "B" };

export interface PolyRoom extends GridRoom {
  polygon?: [number, number][]; // % coords
}

interface ThreeSceneV2Props {
  roomWidthCm?: number;
  roomDepthCm?: number;
  /** scene metres per real metre for the floor layout (the page draws plans
   *  larger than life); measurements shown to the user divide by it */
  visualScale?: number;
  rooms?: PolyRoom[];
  rfWalls?: VWall[];
  openings?: Opening[];
  furniture?: PlacedFurniture[];
  /** per-side wall paint: "wallKey:A" | "wallKey:B" → hex color */
  wallColors?: Record<string, string>;
  /** per-side wall surface: "wallKey:A" | "wallKey:B" → surface id */
  wallSurfaces?: Record<string, string>;
  /** per-room floor surface: room id → surface id */
  floorSurfaces?: Record<string, string>;
  selectedFloorRoomId?: string | null;
  onFloorSelect?: (roomId: string | null) => void;
  /** per-door finish: door key → finish id */
  doorFinishes?: Record<string, string>;
  selectedDoorKey?: string | null;
  onDoorSelect?: (key: string | null) => void;
  /** reports every door key the scene rendered — the single source of truth
      for "apply to all doors" (never rebuild these keys elsewhere) */
  onDoorKeys?: (keys: string[]) => void;
  selectedWallSide?: string | null;
  onWallSelect?: (sel: WallSideSelection | null) => void;
  onFurnitureSelect?: (id: string | null) => void;
  onFurnitureMove?: (id: string, position: [number, number, number]) => void;
  /** fired when wall-snapping re-orients an item so its back faces the wall */
  onFurnitureRotate?: (id: string, rotation: number) => void;
  /** double-click on a lamp: switch it on or off */
  onFurnitureToggleLight?: (id: string) => void;
  selectedFurnitureId?: string | null;
  walkthroughActive?: boolean;
  walkthroughPaused?: boolean;
  onWalkthroughProgress?: (progress: number, info?: WalkthroughProgressInfo) => void;
  /** Ambient occlusion. On by default; pass false on weak hardware. */
  aoEnabled?: boolean;
  /** Room areas, and distance-to-wall lines for the selected item. Distance
   *  lines also show for any item while it is being dragged. */
  showDimensions?: boolean;
  /** Handles on the selected wall: drag its ends to resize it, its middle to
   *  slide it. Omit to disable wall editing in 3D. */
  onWallHandleDrag?: (e: WallHandleDragEvent) => void;
  /** Brightness and warmth for the interior lighting rig. */
  lighting?: LightingSettings;
  /** Path-traced rendering. Replaces the raster view entirely while on. */
  pathTracing?: boolean;
  onPathTracerStats?: (s: PathTracerStats) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WALL_H = 2.8;
const DOOR_H = 2.1;
const SILL_H = 0.9;
const MIN_WALL_T = WALL_T_MIN;
const MAX_WALL_T = WALL_T_MAX;

const OUTDOOR = /porch|patio|balcon|deck|terrace|garden/i;

// ─── Geometry helpers ────────────────────────────────────────────────────────

interface World {
  totalW: number;
  totalD: number;
  maxDim: number;
  /** the same plan as a PlanFrame — lengths and areas shown to the user go
   *  through it (scene → real) */
  frame: PlanFrame;
  px: (xPct: number) => number; // % → world x
  pz: (yPct: number) => number; // % → world z
}

function makeWorld(totalW: number, totalD: number, visualScale = 1): World {
  return {
    totalW,
    totalD,
    maxDim: Math.max(totalW, totalD),
    frame: makeFrame(totalW * 100, totalD * 100, visualScale),
    px: (x) => (x / 100) * totalW - totalW / 2,
    pz: (y) => (y / 100) * totalD - totalD / 2,
  };
}

type Cut = { start: number; end: number; type: "door" | "window"; key: string };

/** Split one wall's along-axis extent into solid pieces + opening cuts. */
function wallPieces(a0: number, a1: number, cuts: Cut[]) {
  const solids: Array<[number, number]> = [];
  const sorted = [...cuts]
    .filter((c) => c.end > a0 && c.start < a1)
    .map((c) => ({ ...c, start: Math.max(c.start, a0), end: Math.min(c.end, a1) }))
    .sort((p, q) => p.start - q.start);
  let cursor = a0;
  for (const c of sorted) {
    if (c.start - cursor > 0.02) solids.push([cursor, c.start]);
    cursor = Math.max(cursor, c.end);
  }
  if (a1 - cursor > 0.02) solids.push([cursor, a1]);
  return { solids, cuts: sorted };
}

// ─── Doors that open ─────────────────────────────────────────────────────────
//
// A hinged leaf swings open as an eye-level camera comes within reach (walk
// mode and the guided walkthrough both qualify) and closes again behind it.
// It always swings AWAY from the viewer, so it never sweeps through them.
// From the orbit views a door rests slightly ajar, as it always has, and a
// double-click opens or closes it fully.

const DOOR_OPEN = 1.45;      // rad, a little short of 90° so it reads as a door
const DOOR_AJAR = 0.5;
const DOOR_REACH = 1.9;      // m: auto-open distance
const EYE_LEVEL_MAX = 2.4;   // m: below this the camera counts as standing

function SwingDoor({
  horiz, hinge, centre, children,
}: {
  horiz: boolean;
  /** hinge position (world) */
  hinge: [number, number, number];
  /** door centre on the plan (world x, z) */
  centre: [number, number];
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  // null = automatic; otherwise the user's double-click choice
  const manual = useRef<"open" | "closed" | null>(null);
  const side = useRef(horiz ? -1 : 1);

  useFrame(({ camera, invalidate }, rawDt) => {
    const g = ref.current;
    if (!g) return;
    const dt = frameDt(rawDt);
    const cam = camera.position;
    const standing = cam.y < EYE_LEVEL_MAX;
    const near = standing && Math.hypot(cam.x - centre[0], cam.z - centre[1]) < DOOR_REACH;

    // swing away from the camera: see the sign derivation in the header —
    // a horizontal wall's leaf runs along +x and a positive angle moves its
    // free end towards −z; a vertical wall's leaf runs along +z and a
    // positive angle moves it towards +x
    const away = horiz
      ? (cam.z > hinge[2] ? 1 : -1)
      : (cam.x > hinge[0] ? -1 : 1);

    let target: number;
    if (manual.current === "open" || (manual.current !== "closed" && near)) {
      // only pick a side while (nearly) closed, so an open door does not flip
      if (Math.abs(g.rotation.y) < 0.2) side.current = away;
      target = side.current * DOOR_OPEN;
    } else if (manual.current === "closed" || standing) {
      target = 0;
    } else {
      target = horiz ? -DOOR_AJAR : DOOR_AJAR;   // orbit views: as before
    }
    const y = g.rotation.y;
    if (Math.abs(y - target) > 0.001) {
      g.rotation.y = y + (target - y) * Math.min(1, dt * 6);
      invalidate();                      // still swinging
    }
  });

  return (
    <group
      ref={ref}
      position={hinge}
      rotation={[0, horiz ? -DOOR_AJAR : DOOR_AJAR, 0]}
      onDoubleClick={(e) => {
        e.stopPropagation();
        const g = ref.current;
        const isOpen = g ? Math.abs(g.rotation.y) > 1 : false;
        manual.current = isOpen ? "closed" : "open";
      }}
    >
      {children}
    </group>
  );
}

// ─── Wall rendering ──────────────────────────────────────────────────────────

function WallWithOpenings({
  wall, cuts, world, wallKey, colors, surfaces, selectedSide, onSelect,
  doorFinishes, selectedDoorKey, onDoorSelect,
}: {
  wall: VWall; cuts: Cut[]; world: World;
  doorFinishes?: Record<string, string>;
  selectedDoorKey?: string | null;
  onDoorSelect?: (key: string | null) => void;
  wallKey: string;
  colors?: { A?: string; B?: string };
  surfaces?: { A?: string; B?: string };
  selectedSide?: "A" | "B" | null;
  onSelect?: (sel: WallSideSelection) => void;
}) {
  const horiz = Math.abs(wall.x2 - wall.x1) >= Math.abs(wall.y2 - wall.y1);
  const t = Math.min(MAX_WALL_T,
    Math.max(MIN_WALL_T, (wall.thickness / 100) * world.maxDim));

  let a0 = horiz ? world.px(Math.min(wall.x1, wall.x2)) : world.pz(Math.min(wall.y1, wall.y2));
  let a1 = horiz ? world.px(Math.max(wall.x1, wall.x2)) : world.pz(Math.max(wall.y1, wall.y2));
  // Cross-axis position from the wall's MIDPOINT, not endpoint 1. Reading
  // y1 / x1 alone meant dragging endpoint 2 sideways in the 2D editor changed
  // the data and the room polygons but left the 3D wall exactly where it was
  // — the "floor moved, walls did not" bug. The midpoint at least tracks both
  // ends; the 2D editor now also keeps walls axis-aligned so the two agree.
  const c = horiz
    ? world.pz((wall.y1 + wall.y2) / 2)
    : world.px((wall.x1 + wall.x2) / 2);
  if (a1 - a0 < 0.05) return null;
  // extend by half a thickness at both ends: perpendicular walls now
  // interpenetrate at corners instead of meeting with a visible slit
  a0 -= t / 2;
  a1 += t / 2;

  const { solids, cuts: clipped } = wallPieces(a0, a1, cuts);

  // ── per-side painting ──
  // boxGeometry material slots: 0 +x, 1 −x, 2 +y, 3 −y, 4 +z, 5 −z.
  // A horizontal wall's paintable sides face ±z; a vertical wall's face ±x.
  const BASE_WALL = "#f2f0ec";
  const sideForFace = (fi: number): "A" | "B" | null => {
    if (horiz) return fi === 5 ? "A" : fi === 4 ? "B" : null;
    return fi === 1 ? "A" : fi === 0 ? "B" : null;
  };
  // which side was clicked: face normal when it's a side face, otherwise
  // (top / end faces) whichever side of the wall's centerline the hit is on
  const pickSide = (e: any): "A" | "B" => {
    const n = e.face?.normal;
    if (horiz) {
      if (n && Math.abs(n.z) > 0.5) return n.z < 0 ? "A" : "B";
      return e.point.z < c ? "A" : "B";
    }
    if (n && Math.abs(n.x) > 0.5) return n.x < 0 ? "A" : "B";
    return e.point.x < c ? "A" : "B";
  };

  const box = (
    from: number, to: number, y0: number, y1: number, key: string,
    material: React.ReactNode, paintable = false,
  ) => {
    const len = to - from;
    const mid = (from + to) / 2;
    const pos: [number, number, number] = horiz
      ? [mid, (y0 + y1) / 2, c]
      : [c, (y0 + y1) / 2, mid];
    const size: [number, number, number] = horiz
      ? [len, y1 - y0, t]
      : [t, y1 - y0, len];
    return (
      <mesh
        key={key} position={pos} castShadow receiveShadow
        onPointerDown={paintable && onSelect ? (e) => {
          e.stopPropagation();
          onSelect({ key: wallKey, side: pickSide(e) });
        } : undefined}
        onClick={paintable && onSelect ? (e) => e.stopPropagation() : undefined}
      >
        <boxGeometry args={size} />
        {paintable
          ? [0, 1, 2, 3, 4, 5].map((fi) => {
              const side = sideForFace(fi);
              const painted = side ? colors?.[side] : undefined;
              const isSel = side !== null && side === selectedSide;

              // A surface (texture) wins over flat paint on the same face.
              // Tiling uses this segment's own length so the pattern keeps
              // real-world scale across walls cut by doors and windows.
              const surf = side ? surfaceById(surfaces?.[side] ?? "") : undefined;
              const tex = surf
                ? getFaceTextures(surf, Math.abs(len), Math.abs(y1 - y0))
                : undefined;

              return (
                <meshStandardMaterial
                  // Rebuild the material when the finish changes. Swapping
                  // `map` on an existing material needs a shader recompile
                  // (USE_MAP is compiled in); R3F won't flag needsUpdate, so
                  // the old shader keeps rendering flat colour. A changing key
                  // forces a fresh material instead.
                  key={`${fi}-${surf?.id ?? painted ?? "base"}`}
                  attach={`material-${fi}`}
                  map={tex?.map}
                  normalMap={tex?.normalMap}
                  color={tex ? (surf?.color ?? "#ffffff") : (painted ?? BASE_WALL)}
                  roughness={surf?.roughness ?? 0.9}
                  emissive={isSel ? "#c7de7d" : "#000000"}
                  emissiveIntensity={isSel ? 0.4 : 0}
                />
              );
            })
          : material}
      </mesh>
    );
  };

  const wallMat = <meshStandardMaterial color="#f2f0ec" roughness={0.9} />;
  const frameMat = <meshStandardMaterial color="#8a7360" roughness={0.7} />;
  const glassMat = (
    <meshPhysicalMaterial color="#bcd6de" transparent opacity={0.32}
      roughness={0.05} metalness={0.1} />
  );

  return (
    <group>
      {solids.map(([f, tt], i) => box(f, tt, 0, WALL_H, `s${i}`, null, true))}
      {clipped.map((cut, i) => {
        const cw = cut.end - cut.start;
        if (cut.type === "door") {
          // Width decides what a "door" opening really is:
          //   <=1.3m hinged leaf | <=3.6m sliding glass | wider: open passage
          const HINGED_MAX = 1.3, SLIDER_MAX = 7.0;
          return (
            <group key={`d${i}`}>
              {/* header above the opening */}
              {box(cut.start, cut.end, DOOR_H, WALL_H, `dh${i}`, null, true)}
              {/* slim jamb posts */}
              {box(cut.start, cut.start + 0.05, 0, DOOR_H, `dfa${i}`, frameMat)}
              {box(cut.end - 0.05, cut.end, 0, DOOR_H, `dfb${i}`, frameMat)}

              {cw <= HINGED_MAX && (
                // hinged leaf, pivoted at the jamb (not its own centre)
                <SwingDoor
                  horiz={horiz}
                  hinge={horiz ? [cut.start + 0.03, 0, c] : [c, 0, cut.start + 0.03]}
                  centre={horiz ? [cut.start + cw / 2, c] : [c, cut.start + cw / 2]}
                >
                  <mesh
                    position={horiz
                      ? [(cw - 0.08) / 2, DOOR_H / 2 - 0.02, 0]
                      : [0, DOOR_H / 2 - 0.02, (cw - 0.08) / 2]}
                    castShadow
                    onPointerDown={onDoorSelect ? (e) => {
                      e.stopPropagation();
                      onDoorSelect(cut.key);
                    } : undefined}
                    onClick={onDoorSelect ? (e) => e.stopPropagation() : undefined}
                  >
                    <boxGeometry args={horiz
                      ? [cw - 0.08, DOOR_H - 0.06, 0.045]
                      : [0.045, DOOR_H - 0.06, cw - 0.08]} />
                    {(() => {
                      const fin = doorFinishById(doorFinishes?.[cut.key] ?? "");
                      // one leaf = one texture, stretched (no tiling), so the
                      // grain runs the full height like real veneer
                      const tex = fin ? { map: getDoorTexture(fin.map) } : undefined;
                      const isSel = selectedDoorKey === cut.key;
                      return (
                        <meshStandardMaterial
                          key={fin?.id ?? "base"}
                          map={tex?.map}
                          color={tex ? "#ffffff" : "#b59a72"}
                          roughness={fin?.roughness ?? 0.55}
                          emissive={isSel ? "#c7de7d" : "#000000"}
                          emissiveIntensity={isSel ? 0.35 : 0}
                        />
                      );
                    })()}
                  </mesh>
                </SwingDoor>
              )}

              {cw > HINGED_MAX && cw <= SLIDER_MAX && (
                // sliding glass panels (patio / balcony sliders)
                <group key={`sl${i}`}>
                  {Array.from({ length: Math.max(2, Math.round(cw / 1.0)) }).map((_, pi, arr) => {
                    const n = arr.length;
                    const pw = cw / n;
                    const p0 = cut.start + pi * pw;
                    const zOff = (pi % 2 === 0 ? -1 : 1) * t * 0.22;
                    return (
                      <group key={pi}>
                        <mesh position={horiz
                          ? [p0 + pw / 2, DOOR_H / 2, c + zOff]
                          : [c + zOff, DOOR_H / 2, p0 + pw / 2]}>
                          <boxGeometry args={horiz
                            ? [pw - 0.04, DOOR_H - 0.1, 0.03]
                            : [0.03, DOOR_H - 0.1, pw - 0.04]} />
                          <meshPhysicalMaterial color="#bcd6de" transparent
                            opacity={0.3} roughness={0.05} metalness={0.1} />
                        </mesh>
                        {/* thin panel frame rails */}
                        <mesh position={horiz
                          ? [p0 + pw / 2, DOOR_H - 0.06, c + zOff]
                          : [c + zOff, DOOR_H - 0.06, p0 + pw / 2]} castShadow>
                          <boxGeometry args={horiz
                            ? [pw - 0.02, 0.06, 0.05] : [0.05, 0.06, pw - 0.02]} />
                          <meshStandardMaterial color="#5f6b70" roughness={0.5} />
                        </mesh>
                        <mesh position={horiz
                          ? [p0 + pw / 2, 0.04, c + zOff]
                          : [c + zOff, 0.04, p0 + pw / 2]}>
                          <boxGeometry args={horiz
                            ? [pw - 0.02, 0.08, 0.05] : [0.05, 0.08, pw - 0.02]} />
                          <meshStandardMaterial color="#5f6b70" roughness={0.5} />
                        </mesh>
                      </group>
                    );
                  })}
                </group>
              )}
              {/* > SLIDER_MAX: cased opening — header + jambs only, stays open */}
            </group>
          );
        }
        // window: sill below, glass pane, header above
        return (
          <group key={`w${i}`}>
            {box(cut.start, cut.end, 0, SILL_H, `ws${i}`, null, true)}
            {box(cut.start, cut.end, DOOR_H, WALL_H, `wh${i}`, null, true)}
            {box(cut.start + 0.02, cut.end - 0.02,
                 SILL_H + 0.03, DOOR_H - 0.03, `wg${i}`, glassMat)}
            {/* thin frame */}
            {box(cut.start, cut.end, SILL_H, SILL_H + 0.04, `wfa${i}`, frameMat)}
            {box(cut.start, cut.end, DOOR_H - 0.04, DOOR_H, `wfb${i}`, frameMat)}
          </group>
        );
      })}
    </group>
  );
}

// ─── Wall cutaway ────────────────────────────────────────────────────────────
//
// In the orbit views the walls nearest the camera hid the rooms behind them,
// so a client looking at their furnished home mostly saw the outside of it.
// Like the cutaway in The Sims (and Pascal's viewer), a wall that stands
// between the camera and the middle of the plan drops to a low ledge, and
// rises again as the camera moves round. The ledge keeps the plan readable;
// hiding the wall outright made rooms look like they had no walls at all.
//
// Only OUTER walls are cut (lib/walls/exterior). Lowering interior
// partitions too flattened the whole plan into ledges and the rooms lost
// their shape; with them standing, the house reads as a house.
//
// Scaled, not hidden: the wall group shrinks towards the floor, so selection,
// painting and door clicks keep working on what is left, and the change can
// animate instead of popping.

/** Height a cut-away wall keeps, in metres. */
const CUTAWAY_H = 0.32;

/** Current height factor of every wall (1 = full), by wall key. Written by
 *  CutawayWall each frame; read by wall-mounted items (which hide with their
 *  wall rather than float in mid-air) and by the wall raycast (which must not
 *  hit the part of a wall that is not there). */
const wallCutScale = new Map<string, number>();
/** Above this camera elevation (top-down views) nothing needs cutting. */
const CUTAWAY_MAX_ELEVATION = THREE.MathUtils.degToRad(68);

function wallLine(wall: VWall, world: World) {
  const horiz = Math.abs(wall.x2 - wall.x1) >= Math.abs(wall.y2 - wall.y1);
  const c = horiz
    ? world.pz((wall.y1 + wall.y2) / 2)
    : world.px((wall.x1 + wall.x2) / 2);
  const a0 = horiz ? world.px(Math.min(wall.x1, wall.x2)) : world.pz(Math.min(wall.y1, wall.y2));
  const a1 = horiz ? world.px(Math.max(wall.x1, wall.x2)) : world.pz(Math.max(wall.y1, wall.y2));
  return { horiz, c, mid: (a0 + a1) / 2 };
}

function CutawayWall({
  wall, wallKey, world, enabled, outside, children,
}: {
  wall: VWall; wallKey: string; world: World; enabled: boolean;
  /** which side of this wall faces outside; 0 = interior, never cut */
  outside: OutsideSide;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const line = useMemo(() => wallLine(wall, world), [wall, world]);

  useFrame(({ camera, invalidate }, rawDt) => {
    const g = ref.current;
    if (!g) return;
    const dt = frameDt(rawDt);

    let cut = false;
    if (enabled && outside !== 0) {
      const cam = camera.position;
      // signed distance of the camera from the wall's line, along its normal
      const camSide = line.horiz ? cam.z - line.c : cam.x - line.c;
      // horizontal distance from the camera to the wall's midpoint
      const dx = (line.horiz ? line.mid : line.c) - cam.x;
      const dz = (line.horiz ? line.c : line.mid) - cam.z;
      const flat = Math.hypot(dx, dz);
      const elevation = Math.atan2(cam.y - 1, flat);

      cut =
        // the camera is out on this wall's outside, looking in
        (outside === 2 || Math.sign(camSide) === outside) &&
        Math.abs(camSide) / Math.max(flat, 1e-3) > 0.3 && // facing the camera, not edge-on
        elevation < CUTAWAY_MAX_ELEVATION;
    }

    const target = cut ? CUTAWAY_H / WALL_H : 1;
    const y = g.scale.y;
    if (Math.abs(y - target) < 0.002) {
      if (y !== target) g.scale.y = target;
    } else {
      // ~150 ms ease either way
      g.scale.y = y + (target - y) * Math.min(1, dt * 10);
      invalidate();                      // still easing
    }
    wallCutScale.set(wallKey, g.scale.y);
  });
  useEffect(() => () => { wallCutScale.delete(wallKey); }, [wallKey]);

  return <group ref={ref}>{children}</group>;
}

// ─── Wall mounting ───────────────────────────────────────────────────────────
//
// TVs, art, mirrors, curtains and wall lights hang on a wall FACE: back flush
// against it, front turned into the room. The raycast tests each wall's two
// faces as vertical planes, honours the cutaway (a lowered wall can only be
// hit on its ledge), and returns the face the ray actually arrives at.

interface WallFaceHit {
  x: number; y: number; z: number;
  /** face normal, pointing into the room the item will face */
  nx: number; nz: number;
  horiz: boolean;
  /** the wall's extent along its own axis */
  a0: number; a1: number;
}

function wallHitFromRay(ray: THREE.Ray, walls: WorldWall[]): WallFaceHit | null {
  let best: WallFaceHit | null = null;
  let bestT = Infinity;
  for (const w of walls) {
    const horiz = w.z1 === w.z2;
    const half = w.thickness / 2;
    const top = WALL_H * (wallCutScale.get(w.id ?? "") ?? 1);
    const c = horiz ? w.z1 : w.x1;
    const a0 = horiz ? Math.min(w.x1, w.x2) : Math.min(w.z1, w.z2);
    const a1 = horiz ? Math.max(w.x1, w.x2) : Math.max(w.z1, w.z2);
    const o = horiz ? ray.origin.z : ray.origin.x;
    const dd = horiz ? ray.direction.z : ray.direction.x;
    if (Math.abs(dd) < 1e-6) continue;
    for (const side of [-1, 1]) {
      const plane = c + side * half;
      if (Math.sign(o - plane) !== side) continue;     // only faces turned towards the ray
      const t = (plane - o) / dd;
      if (t <= 0 || t >= bestT) continue;
      const px = ray.origin.x + ray.direction.x * t;
      const py = ray.origin.y + ray.direction.y * t;
      const pz = ray.origin.z + ray.direction.z * t;
      const along = horiz ? px : pz;
      if (along < a0 || along > a1 || py < 0 || py > top) continue;
      bestT = t;
      best = { x: px, y: py, z: pz, nx: horiz ? 0 : side, nz: horiz ? side : 0, horiz, a0, a1 };
    }
  }
  return best;
}

/** The face of the wall nearest a floor point, as if a ray had hit it there. */
function nearestWallFace(x: number, z: number, walls: WorldWall[]): WallFaceHit | null {
  const hit = nearestWall(x, z, walls);
  if (!hit) return null;
  const w = hit.wall;
  const horiz = w.z1 === w.z2;
  // snap the normal to the wall's own axis (nearestWall's is diagonal past
  // the wall ends)
  const nx = horiz ? 0 : Math.sign(hit.nx || 1);
  const nz = horiz ? Math.sign(hit.nz || 1) : 0;
  const half = w.thickness / 2;
  return {
    x: horiz ? hit.px : w.x1 + nx * half,
    y: WALL_H / 2,
    z: horiz ? w.z1 + nz * half : hit.pz,
    nx, nz, horiz,
    a0: horiz ? Math.min(w.x1, w.x2) : Math.min(w.z1, w.z2),
    a1: horiz ? Math.max(w.x1, w.x2) : Math.max(w.z1, w.z2),
  };
}

/** Hang an item (metres) on a face, centred at `centreY`, kept on the wall. */
function placeOnWall(
  hit: WallFaceHit, size: { w: number; h: number; d: number }, centreY: number,
): WallPlacement {
  const along0 = hit.horiz ? hit.x : hit.z;
  const lo = hit.a0 + size.w / 2 + 0.02, hi = hit.a1 - size.w / 2 - 0.02;
  const along = lo <= hi ? Math.max(lo, Math.min(hi, along0)) : (hit.a0 + hit.a1) / 2;
  const cy = Math.max(size.h / 2 + 0.02, Math.min(WALL_H - size.h / 2 - 0.02, centreY));
  // a few millimetres proud of the face, so the back never z-fights the paint
  const off = size.d / 2 + 0.004;
  const x = hit.horiz ? along : hit.x + hit.nx * off;
  const z = hit.horiz ? hit.z + hit.nz * off : along;
  return { position: [x, cy - size.h / 2, z], rotation: Math.atan2(hit.nx, hit.nz) };
}

/** Item size in metres, honouring its size multiplier. */
function itemSizeM(item: PlacedFurniture) {
  const cat = item.modelId ? catalogById(item.modelId) : undefined;
  const s = item.sizeScale ?? 1;
  return {
    w: ((item.width ?? cat?.size.w ?? 60) / 100) * s,
    h: ((item.height ?? cat?.size.h ?? 60) / 100) * s,
    d: ((item.depth ?? cat?.size.d ?? 5) / 100) * s,
  };
}

function WallMountedItem({
  item, walls,
}: { item: PlacedFurniture; walls: WorldWall[] }) {
  const cat = item.modelId ? catalogById(item.modelId) : undefined;
  const ref = useRef<THREE.Group>(null);
  const size = itemSizeM(item);
  // the wall it hangs on, found once per position
  const wallId = useMemo(
    () => nearestWall(item.position[0], item.position[2], walls)?.wall.id ?? null,
    [item.position, walls],
  );
  // hide with the wall when the cutaway lowers it
  useFrame(() => {
    const g = ref.current;
    if (!g || !wallId) return;
    const visible = (wallCutScale.get(wallId) ?? 1) > 0.6;
    if (g.visible !== visible) g.visible = visible;
  });
  if (!cat?.procedural) return null;
  return (
    <group
      ref={ref}
      position={[item.position[0], (item.position[1] ?? 0) + size.h / 2, item.position[2]]}
      rotation={[0, item.rotation ?? 0, 0]}
      onPointerDown={(e) => { e.stopPropagation(); (window as unknown as { __nooiSelect?: (id: string) => void }).__nooiSelect?.(item.id); }}
      onClick={(e) => e.stopPropagation()}
    >
      <WallDecor
        kind={cat.procedural} w={size.w} h={size.h} d={size.d} color={item.color}
        glow={Math.max(0, Math.min(1, item.lightLevel ?? 1))}
      />
    </group>
  );
}

function WallPlacementBridge({
  register, walls,
}: {
  register: (fn: ThreeSceneHandle["wallPlacementFromNdc"]) => void;
  walls: WorldWall[];
}) {
  const { camera } = useThree();
  useEffect(() => {
    const ray = new THREE.Raycaster();
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = new THREE.Vector3();
    register((nx, ny, item, nearestIfMissed = false) => {
      ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
      let hit = wallHitFromRay(ray.ray, walls);
      if (!hit && nearestIfMissed) {
        const onFloor = ray.ray.intersectPlane(floor, p) ? [p.x, p.z] : [0, 0];
        hit = nearestWallFace(onFloor[0], onFloor[1], walls);
      }
      if (!hit) return null;
      const size = { w: item.w / 100, h: item.h / 100, d: item.d / 100 };
      return placeOnWall(hit, size, (item.mountHeight ?? 150) / 100);
    });
  }, [camera, register, walls]);
  return null;
}

// ─── Wall handles (edit walls in 3D) ─────────────────────────────────────────
//
// Shown on the selected wall in the orbit views: a white disc at each end
// (drag to lengthen or shorten it) and a green one in the middle (drag to
// slide the whole wall sideways), plus its length. The drag itself is
// resolved by the page with the same rules as the 2D plan editor, so corners
// stay welded and rooms, doors and windows follow.
//
// Handles draw over everything and are named "nooi-ui" (hidden in captures).
// The pointer is projected onto the floor plane, which keeps the motion
// predictable from any orbit angle.

const HANDLE_Y = 0.6;          // m: above the cutaway ledge, below eye level

const _tmpV = new THREE.Vector3();

function WallHandles({
  wall, index, world, onDrag,
}: {
  wall: VWall; index: number; world: World;
  onDrag: (e: WallHandleDragEvent) => void;
}) {
  // read at drag time through get(): these are three.js objects the drag
  // mutates (controls.enabled), which hook values must not be
  const get = useThree(st => st.get);
  const [active, setActive] = useState<1 | 2 | "body" | null>(null);
  const [hover, setHover] = useState<1 | 2 | "body" | null>(null);
  // the page's handler changes every render; a drag must always call the
  // latest one, not the one from the render the drag started in
  // Pin the label to the canvas's own container. Left to choose, <Html>
  // mounts into whatever the event system is connected to at that moment;
  // when R3F connects its events a beat later the label is moved to a fresh
  // root that never gets its content, and the length vanishes.
  const host = useThree(st => st.gl.domElement.parentElement);
  const labelHost = useMemo(() => ({ current: host as HTMLElement }), [host]);
  const onDragRef = useRef(onDrag);
  useEffect(() => { onDragRef.current = onDrag; });

  const ww = planWallsToWorld([wall], world.totalW, world.totalD)[0];
  const horiz = ww.z1 === ww.z2;
  const half = ww.thickness / 2;
  // centreline ends, without the half-thickness the renderer adds for corners
  const e1: [number, number] = horiz ? [ww.x1 + half, ww.z1] : [ww.x1, ww.z1 + half];
  const e2: [number, number] = horiz ? [ww.x2 - half, ww.z2] : [ww.x2, ww.z2 - half];
  const mid: [number, number] = [(e1[0] + e2[0]) / 2, (e1[1] + e2[1]) / 2];
  const lengthM = Math.hypot(e2[0] - e1[0], e2[1] - e1[1]);

  // snap so the REAL position lands on a whole centimetre — typed and
  // dragged lengths then agree
  const snap = (x: number, z: number): [number, number] => [
    snapSceneToRealCm(world.frame, x), snapSceneToRealCm(world.frame, z),
  ];

  useEffect(() => {
    if (!active) return;
    const { gl, camera } = get();
    const controls = get().controls as unknown as { enabled: boolean } | null;
    const el = gl.domElement;
    const ray = new THREE.Raycaster();
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    const flags = window as unknown as { __nooiFurnitureDrag?: boolean; __nooiWalkMode?: boolean };
    flags.__nooiFurnitureDrag = true;
    if (controls) controls.enabled = false;

    const at = (e: PointerEvent): [number, number] | null => {
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -(((e.clientY - r.top) / r.height) * 2 - 1),
      ), camera);
      return ray.ray.intersectPlane(floor, hit) ? snap(hit.x, hit.z) : null;
    };
    const move = (e: PointerEvent) => {
      const p = at(e);
      if (p) onDragRef.current({ index, handle: active, x: p[0], z: p[1], phase: "move" });
    };
    const up = (e: PointerEvent) => {
      const p = at(e);
      onDragRef.current({ index, handle: active, x: p?.[0] ?? 0, z: p?.[1] ?? 0, phase: "end" });
      setActive(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      flags.__nooiFurnitureDrag = false;
      if (controls && !flags.__nooiWalkMode) controls.enabled = true;
    };
    // the session is fixed for the length of one drag
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const start = (h: 1 | 2 | "body") => (e: { stopPropagation: () => void; point: THREE.Vector3 }) => {
    e.stopPropagation();
    // body drags start from where the pointer meets the floor under the handle
    const p = h === "body" ? mid : h === 1 ? e1 : e2;
    onDrag({ index, handle: h, x: p[0], z: p[1], phase: "start" });
    setActive(h);
  };

  // Handles keep roughly the same size on screen: 12 cm is right when close
  // to the wall, a speck from the overview camera.
  const scaled = useRef<THREE.Object3D[]>([]);
  const keepOnScreenSize = (o: THREE.Object3D | null) => {
    if (o && !scaled.current.includes(o)) scaled.current.push(o);
  };
  useFrame(({ camera }) => {
    scaled.current = scaled.current.filter(o => o.parent);
    for (const o of scaled.current) {
      const d = camera.position.distanceTo(o.getWorldPosition(_tmpV));
      o.scale.setScalar(THREE.MathUtils.clamp(d / 9, 1, 4));
    }
  });

  const disc = (h: 1 | 2 | "body", p: [number, number]) => {
    const isBody = h === "body";
    const lit = active === h || hover === h;
    return (
      <group key={String(h)} position={[p[0], HANDLE_Y, p[1]]} ref={keepOnScreenSize}>
        <mesh
          name="nooi-ui" renderOrder={1000}
          onPointerDown={start(h)}
          onPointerOver={(e) => { e.stopPropagation(); setHover(h); document.body.style.cursor = "grab"; }}
          onPointerOut={() => { setHover(null); document.body.style.cursor = ""; }}
        >
          <sphereGeometry args={[lit ? 0.15 : 0.12, 20, 20]} />
          <meshBasicMaterial
            color={isBody ? "#c7de7d" : "#ffffff"}
            toneMapped={false} depthTest={false} transparent opacity={0.95}
          />
        </mesh>
        <mesh name="nooi-ui" renderOrder={999} raycast={() => null}>
          <sphereGeometry args={[(lit ? 0.15 : 0.12) + 0.025, 20, 20]} />
          <meshBasicMaterial color="#0f5c4f" toneMapped={false} depthTest={false} transparent opacity={0.95} />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      {disc(1, e1)}
      {disc(2, e2)}
      {disc("body", mid)}
      <Html position={[mid[0], HANDLE_Y + 0.4, mid[1]]} center zIndexRange={[40, 0]} portal={labelHost}
        // the wrapper is sized to the label and would otherwise swallow the
        // press meant for the middle handle underneath
        style={{ pointerEvents: "none" }}>
        <div style={{
          pointerEvents: "none", whiteSpace: "nowrap",
          // sit clear above the middle handle rather than on top of it
          transform: "translateY(-30px)",
          font: "600 11px/1.2 system-ui, -apple-system, Segoe UI, sans-serif",
          color: "#fff", background: "#0f5c4f", borderRadius: 6, padding: "3px 7px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}>
          {sceneToReal(world.frame, lengthM).toFixed(2)} m
        </div>
      </Html>
    </group>
  );
}

// ─── Floors ──────────────────────────────────────────────────────────────────

function RoomFloor({
  room, world, surfaceId, selected, onSelect,
}: {
  room: PolyRoom; world: World;
  surfaceId?: string;
  selected?: boolean;
  onSelect?: (roomId: string) => void;
}) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (room.polygon && room.polygon.length >= 3) {
      room.polygon.forEach(([x, y], i) => {
        const wx = world.px(x);
        const wz = world.pz(y);
        if (i === 0) s.moveTo(wx, wz);
        else s.lineTo(wx, wz);
      });
      s.closePath();
    } else if (room.box) {
      const x0 = world.px(room.box.left);
      const z0 = world.pz(room.box.top);
      const x1 = world.px(room.box.left + room.box.width);
      const z1 = world.pz(room.box.top + room.box.height);
      s.moveTo(x0, z0); s.lineTo(x1, z0); s.lineTo(x1, z1); s.lineTo(x0, z1);
      s.closePath();
    } else {
      return null;
    }
    return s;
  }, [room, world]);

  if (!shape) return null;
  const outdoor = OUTDOOR.test(room.name || "");

  if (outdoor) {
    // Patio / porch / covered porch: a solid raised deck slab with its own
    // material — clearly visible, distinct from ground and interior floors
    return (
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}
          castShadow receiveShadow>
          <extrudeGeometry args={[shape, { depth: 0.06, bevelEnabled: false }]} />
          <meshStandardMaterial color="#d6cab2" roughness={0.8}
            side={THREE.DoubleSide} />
        </mesh>
        {/* faint zone tint on the deck surface */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.075, 0]}>
          <shapeGeometry args={[shape]} />
          <meshStandardMaterial
            color={room.color || "#a7f3d0"}
            transparent opacity={0.18}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }

  // The room-colour tint that used to sit on top of this at 0.22 opacity is
  // gone. It is a 2D floor-plan affordance — colour-coding rooms — and in a
  // lit 3D scene it turned every floor into muddy pastel. Room colour still
  // identifies rooms in the plan, which is where it belongs.
  const surf = surfaceId ? surfaceById(surfaceId) : undefined;

  // TILE SCALE. ShapeGeometry's UVs are the shape's own coordinates — here,
  // metres — not 0–1 like a wall face. So the texture already repeats once
  // per metre, and the repeat must be 1 / tileSize, i.e. getFaceTextures with
  // a 1 m × 1 m "face".
  //
  // This used to pass the room's full extent, which multiplied by the size a
  // second time: a 0.6 × 1.2 m marble tile drew at roughly 5 × 10 cm and its
  // veins collapsed into a fine zig-zag that read as woven carpet — in the
  // viewport and in every AI render made from it.
  const tex = surf ? getFaceTextures(surf, 1, 1) : undefined;

  return (
    <group>
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.008, 0]}
        receiveShadow
        onPointerDown={onSelect ? (e) => {
          e.stopPropagation();
          onSelect(room.id);
        } : undefined}
        onClick={onSelect ? (e) => e.stopPropagation() : undefined}
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          // Same reason as the walls: swapping `map` on a live material needs
          // a shader recompile that R3F will not trigger, so a changing key
          // forces a fresh one instead.
          key={surf?.id ?? "base"}
          map={tex?.map}
          normalMap={tex?.normalMap}
          color={tex ? (surf?.color ?? "#ffffff") : "#d9c7a7"}
          // Floors never go glossier than 0.38. The tile finishes are 0.15
          // (mirror gloss), and with no reflected environment to show, the
          // only thing a mirror floor reflects is the nearest lamp: a hard
          // white streak running towards the camera in walk mode. 0.38 keeps
          // the sheen of polished tile and spreads that highlight out.
          roughness={Math.max(surf?.roughness ?? 0.7, 0.38)}
          emissive={selected ? "#c7de7d" : "#000000"}
          emissiveIntensity={selected ? 0.18 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ─── Roof / Ceiling ─────────────────────────────────────────────────────────

function RoomRoof({ room, world }: { room: PolyRoom; world: World }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (room.polygon && room.polygon.length >= 3) {
      room.polygon.forEach(([x, y], i) => {
        const wx = world.px(x);
        const wz = world.pz(y);
        if (i === 0) s.moveTo(wx, wz);
        else s.lineTo(wx, wz);
      });
      s.closePath();
    } else if (room.box) {
      const x0 = world.px(room.box.left);
      const z0 = world.pz(room.box.top);
      const x1 = world.px(room.box.left + room.box.width);
      const z1 = world.pz(room.box.top + room.box.height);
      s.moveTo(x0, z0); s.lineTo(x1, z0); s.lineTo(x1, z1); s.lineTo(x0, z1);
      s.closePath();
    } else {
      return null;
    }
    return s;
  }, [room, world]);

  if (!shape) return null;
  const outdoor = OUTDOOR.test(room.name || "");
  if (outdoor) return null; // outdoor spaces (balconies/patios) do not render roofs

  return (
    <group position={[0, WALL_H, 0]}>
      {/* Indoor ceiling underside visible from inside room.
           Named so the path tracer can turn it into a light — see
           PathTracerLayer. In raster the room is lit by a directional light
           that passes straight through walls; in a path tracer it does not,
           which is why the traced interior came out almost black. */}
      <mesh name="nooi-ceiling" rotation={[Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color="#fcfbf9"
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Outer top roof slab */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, { depth: 0.08, bevelEnabled: false }]} />
        <meshStandardMaterial
          color="#d5d0c8"
          roughness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ─── Furniture ──────────────────────────────────────────────────────────────

// Apply color/material overrides + selection highlight to a cloned model
function applyOverrides(
  root: THREE.Object3D, item: PlacedFurniture, selected: boolean,
) {
  const preset = item.materialPreset
    ? MATERIAL_PRESETS.find(m => m.id === item.materialPreset) : null;
  root.traverse((n: any) => {
    if (!n.isMesh) return;
    n.castShadow = true;
    n.receiveShadow = true;
    if (!n.userData._origMat) n.userData._origMat = n.material;
    const base: THREE.MeshStandardMaterial =
      (n.userData._origMat as THREE.MeshStandardMaterial);
    // only override when the user asked for it, else keep the model's material
    // Selection is shown by SelectionBrackets now, not by tinting the model:
    // a green-washed sofa hid the very colour and fabric being chosen.
    void selected;
    if (item.color || preset) {
      const m = base.clone();
      if (item.color) m.color = new THREE.Color(item.color);
      if (preset) { m.roughness = preset.roughness; m.metalness = preset.metalness; }
      n.material = m;
    } else {
      n.material = base;
    }
  });
}

function GltfModel({
  item, selected, world,
}: { item: PlacedFurniture; selected: boolean; world: World }) {
  const cat = item.modelId ? catalogById(item.modelId) : undefined;
  const { scene } = useGLTF(cat!.path);
  const clone = useMemo(() => scene.clone(true), [scene]);
  // picking a detailed model tests a bounds tree, not every triangle
  useEffect(() => { buildBoundsTrees(clone); }, [clone]);
  const group = useRef<THREE.Group>(null);

  // The model's size in ITS OWN local space, independent of whatever scale the
  // parent group currently carries.
  //
  // This must not use Box3.setFromObject(clone): that measures WORLD bounds,
  // and `clone` lives inside the group that already has fit.scale applied. So
  // each resize measured the already-scaled model and divided again, shrinking
  // it toward zero — the "furniture disappears while resizing" bug (NOOI-15).
  const baseSize = useMemo(() => {
    const box = new THREE.Box3();
    const tmp = new THREE.Matrix4();
    clone.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(clone.matrixWorld).invert();
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!(mesh as any).isMesh || !mesh.geometry) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const b = mesh.geometry.boundingBox!.clone();
      tmp.multiplyMatrices(inv, mesh.matrixWorld);
      b.applyMatrix4(tmp);
      box.union(b);
    });
    return box;
  }, [clone]);

  // auto-scale the raw model to the catalog real-world size (m), * sizeScale
  const fit = useMemo(() => {
    const box = baseSize;
    const size = box.getSize(new THREE.Vector3());
    const s = item.sizeScale ?? 1;
    const tw = (cat!.size.w / 100) * s;
    // architecture (stairs) spans floor to ceiling regardless of catalog height
    const catH = cat!.fitToWallHeight ? WALL_H * 100 : cat!.size.h;
    const th = (catH / 100) * s;
    const td = (cat!.size.d / 100) * s;
    const sx = size.x > 1e-4 ? tw / size.x : 1;
    const sy = size.y > 1e-4 ? th / size.y : 1;
    const sz = size.z > 1e-4 ? td / size.z : 1;
    // sit the model on the floor or hang from ceiling
    const mountType = item.mountType ?? cat?.mountType ?? "floor";
    const minY = box.min.y * sy;
    const maxY = box.max.y * sy;
    const yOffset = mountType === "ceiling"
      ? WALL_H - maxY
      : -minY;
    return { scale: [sx, sy, sz] as [number, number, number], yOffset, mountType };
  }, [baseSize, cat, item.sizeScale, item.mountType]);

  useEffect(() => { applyOverrides(clone, item, selected); },
    [clone, item.color, item.materialPreset, selected, item]);

  return (
    <group
      ref={group}
      // position[1] is the SUPPORT height for floor items (0 = floor, >0 =
      // resting on another item's top). Ceiling/wall mounts already have their
      // height baked into fit.yOffset, so adding it there would push them
      // through the roof.
      position={[
        item.position[0],
        (fit.mountType !== "floor" ? 0 : (item.position[1] ?? 0)) + fit.yOffset,
        item.position[2],
      ]}
      rotation={[0, item.rotation, 0]}
      scale={fit.scale}
      onPointerDown={(e) => { e.stopPropagation(); (window as any).__nooiSelect?.(item.id); }}
      onClick={(e) => e.stopPropagation()}
    >
      <primitive object={clone} />
    </group>
  );
}

function BoxFurniture({
  item,
}: { item: PlacedFurniture; selected: boolean }) {
  const cat = item.modelId ? catalogById(item.modelId) : undefined;
  const s = item.sizeScale ?? 1;
  const w = ((cat?.size.w ?? item.width ?? 80) / 100) * s;
  const d = ((cat?.size.d ?? item.depth ?? 80) / 100) * s;
  const h = ((cat?.size.h ?? item.height ?? 80) / 100) * s;
  const mountType = item.mountType ?? cat?.mountType ?? "floor";
  const posY = mountType === "ceiling" ? WALL_H - h / 2 : (item.position[1] ?? 0) + h / 2;
  return (
    <mesh
      position={[item.position[0], posY, item.position[2]]}
      rotation={[0, item.rotation, 0]}
      castShadow receiveShadow
      onPointerDown={(e) => { e.stopPropagation(); (window as any).__nooiSelect?.(item.id); }}
      onClick={(e) => e.stopPropagation()}
    >
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={item.color || cat?.color || "#b09a7a"}
        roughness={0.7}
      />
    </mesh>
  );
}

// ─── Selection brackets ──────────────────────────────────────────────────────
//
// Corner brackets around the selected item's real outline, plus a soft
// footprint on the floor — the convention of most design tools. Lines and a
// flat quad cost nothing to draw and look the same on WebGL and WebGPU, where
// an outline post-effect would re-render the scene every frame.
//
// The box is measured in the item's own frame (its rotation undone), so a
// rotated sofa gets a tight box rather than a loose axis-aligned one. It is
// re-measured a few times a second while selected, which catches a model that
// finishes loading after it was selected.
//
// Named "nooi-ui": captures (and so the AI render) hide it.

const SELECT_COLOR = "#c7de7d";

/** Bracket bar thickness in metres. Solid bars rather than GL lines: lines are
 *  1 px on most GPUs, and on WebGPU a line material does not write the extra
 *  outputs (normals, albedo) the effects pass renders into, which made its
 *  pipeline invalid. */
const BRACKET_T = 0.014;

function SelectionBrackets({
  target, item,
}: { target: React.RefObject<THREE.Group | null>; item: PlacedFurniture }) {
  const lines = useRef<THREE.InstancedMesh>(null);
  const pad = useRef<THREE.Mesh>(null);
  const since = useRef(Infinity);
  const box = useMemo(() => new THREE.Box3(), []);

  const lastSig = useRef("");
  useFrame((_, dt) => {
    const root = target.current;
    // Re-measure when the item moved, resized or its model finished loading
    // (more meshes), and otherwise at most 4× a second. With on-demand
    // rendering there may be no "later" frame, so a change must not wait for
    // the throttle.
    let meshes = 0;
    root?.traverse(o => { if ((o as THREE.Mesh).isMesh) meshes++; });
    const sig = `${item.position.join()},${item.rotation ?? 0},${item.sizeScale ?? 1},${meshes}`;
    since.current += dt;
    if (sig === lastSig.current && since.current < 0.25) return;
    lastSig.current = sig;
    since.current = 0;
    const ln = lines.current, pd = pad.current;
    if (!root || !ln || !pd) return;

    // world → item frame: undo the item's position and rotation
    const toItem = new THREE.Matrix4()
      .makeRotationY(-(item.rotation ?? 0))
      .multiply(new THREE.Matrix4().makeTranslation(-item.position[0], 0, -item.position[2]));
    box.makeEmpty();
    const tmp = new THREE.Box3();
    const m = new THREE.Matrix4();
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry || mesh.name === "nooi-ui") return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      tmp.copy(mesh.geometry.boundingBox!).applyMatrix4(m.multiplyMatrices(toItem, mesh.matrixWorld));
      box.union(tmp);
    });
    if (box.isEmpty()) return;

    // 8 corners × 3 short bars along the edges that meet there
    const { min, max } = box;
    const size = new THREE.Vector3().subVectors(max, min);
    const tick = (n: number) => Math.min(0.18, n * 0.28);
    const tx = tick(size.x), ty = tick(size.y), tz = tick(size.z);
    const mtx = new THREE.Matrix4();
    let i = 0;
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
      const sx = x === min.x ? 1 : -1, sy = y === min.y ? 1 : -1, sz = z === min.z ? 1 : -1;
      // a unit cube scaled into a bar that starts at the corner
      ln.setMatrixAt(i++, mtx.makeScale(tx, BRACKET_T, BRACKET_T).setPosition(x + sx * tx / 2, y, z));
      ln.setMatrixAt(i++, mtx.makeScale(BRACKET_T, ty, BRACKET_T).setPosition(x, y + sy * ty / 2, z));
      ln.setMatrixAt(i++, mtx.makeScale(BRACKET_T, BRACKET_T, tz).setPosition(x, y, z + sz * tz / 2));
    }
    ln.instanceMatrix.needsUpdate = true;
    ln.count = i;
    ln.computeBoundingSphere();

    pd.position.set((min.x + max.x) / 2, min.y + 0.006, (min.z + max.z) / 2);
    pd.scale.set(size.x + 0.08, size.z + 0.08, 1);
  });

  return (
    <group
      position={[item.position[0], 0, item.position[2]]}
      rotation={[0, item.rotation ?? 0, 0]}
    >
      <instancedMesh
        ref={lines} args={[undefined, undefined, 24]} count={0}
        name="nooi-ui" raycast={() => null} renderOrder={999} frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={SELECT_COLOR} toneMapped={false} depthTest={false} transparent />
      </instancedMesh>
      <mesh ref={pad} name="nooi-ui" rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={998}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={SELECT_COLOR} toneMapped={false} transparent opacity={0.14} depthWrite={false} />
      </mesh>
    </group>
  );
}

function FurnitureItem({
  item, selected, world, walls = [], onToggleLight,
}: {
  item: PlacedFurniture; selected: boolean; world: World; walls?: WorldWall[];
  onToggleLight?: (id: string) => void;
}) {
  const cat = item.modelId ? catalogById(item.modelId) : undefined;
  const ref = useRef<THREE.Group>(null);
  // Drawn-in-code wall decor; else the GLTF (Suspense handles load); else box
  const body = cat?.procedural ? (
    <WallMountedItem item={item} walls={walls} />
  ) : cat ? (
    <Suspense fallback={<BoxFurniture item={item} selected={selected} />}>
      <ModelErrorBoundary fallback={<BoxFurniture item={item} selected={selected} />}>
        <GltfModel item={item} selected={selected} world={world} />
      </ModelErrorBoundary>
    </Suspense>
  ) : <BoxFurniture item={item} selected={selected} />;
  return (
    <>
      <group
        ref={ref}
        onDoubleClick={onToggleLight && isLightFixture(item) ? (e) => {
          e.stopPropagation();
          onToggleLight(item.id);
        } : undefined}
      >{body}</group>
      {selected && <SelectionBrackets target={ref} item={item} />}
    </>
  );
}

// If a .glb file is missing/broken, fall back to the colored box instead of
// crashing the whole canvas.
class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  constructor(props: any) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

// ─── Opening → wall assignment ───────────────────────────────────────────────

function cutsPerWall(
  walls: VWall[], openings: Opening[], world: World,
): Map<number, Cut[]> {
  const map = new Map<number, Cut[]>();
  openings.forEach((op) => {
    const ox = world.px(op.x / 10);
    const oz = world.pz(op.y / 10);
    const halfW = ((op.width / 1000) * world.maxDim) / 2;
    const horiz = op.wall === "horizontal";

    // wall_id like "w7" indexes directly into the walls array
    let idx = -1;
    if (op.wall_id) {
      const n = parseInt(op.wall_id.replace(/\D/g, ""), 10);
      if (!Number.isNaN(n) && n >= 0 && n < walls.length) idx = n;
    }
    if (idx < 0) {
      // fall back to the nearest wall of matching orientation
      let best = Infinity;
      walls.forEach((wl, i) => {
        const wh = Math.abs(wl.x2 - wl.x1) >= Math.abs(wl.y2 - wl.y1);
        if (wh !== horiz) return;
        const c = wh ? world.pz(wl.y1) : world.px(wl.x1);
        const d = Math.abs((horiz ? oz : ox) - c);
        if (d < best) { best = d; idx = i; }
      });
      if (best > 0.6) return; // nothing plausible nearby
    }

    const center = horiz ? ox : oz;
    const arr = map.get(idx) ?? [];
    // Stable per-opening key from its plan position (‰ coords, rounded).
    // Index would be unstable: re-analysing a plan can reorder openings and
    const key = op.wall_id
      ? `${op.wall_id}-${op.type}-${Math.round(op.x)}-${Math.round(op.y)}`
      : `${op.type}-${Math.round(op.x)}-${Math.round(op.y)}`;
    arr.push({
      start: center - halfW,
      end: center + halfW,
      type: op.type,
      key,
    });
    map.set(idx, arr);
  });
  return map;
}

// ─── Placement validity ──────────────────────────────────────────────────────
// "Is this position inside the building?" — the first piece of the shared
// snap/adjacency work. Ceiling mounts use it today (a chandelier cannot hang
// over open ground); the same helper can back collision and wall-snapping.

/** room outlines in WORLD coordinates */
export function roomPolysWorld(rooms: PolyRoom[], world: World): [number, number][][] {
  const out: [number, number][][] = [];
  for (const r of rooms) {
    if (r.polygon && r.polygon.length >= 3) {
      out.push(r.polygon.map(([x, y]) => [world.px(x), world.pz(y)] as [number, number]));
    } else if (r.box) {
      const x0 = world.px(r.box.left), z0 = world.pz(r.box.top);
      const x1 = world.px(r.box.left + r.box.width);
      const z1 = world.pz(r.box.top + r.box.height);
      out.push([[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
    }
  }
  return out;
}

function pointInPoly(x: number, z: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Clamp a world point into the nearest room. Returns the point unchanged when
 * it is already inside one; otherwise projects it onto the closest room edge
 * and nudges it just inside, so an item dragged past the walls stops at them
 * instead of floating off into open space.
 */
export function clampIntoRooms(
  x: number, z: number, polys: [number, number][][],
): [number, number] {
  if (polys.length === 0) return [x, z];
  for (const p of polys) if (pointInPoly(x, z, p)) return [x, z];

  let bx = x, bz = z, best = Infinity;
  for (const p of polys) {
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [ax, az] = p[j], [cx, cz] = p[i];
      const dx = cx - ax, dz = cz - az;
      const len2 = dx * dx + dz * dz || 1e-9;
      let t = ((x - ax) * dx + (z - az) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = ax + dx * t, pz = az + dz * t;
      const d = (x - px) ** 2 + (z - pz) ** 2;
      if (d < best) { best = d; bx = px; bz = pz; }
    }
  }
  // pull a few centimetres inside so it is unambiguously within the room
  const cx = polys.flat().reduce((s, p) => s + p[0], 0) / polys.flat().length;
  const cz = polys.flat().reduce((s, p) => s + p[1], 0) / polys.flat().length;
  const vx = cx - bx, vz = cz - bz;
  const vl = Math.hypot(vx, vz) || 1;
  return [bx + (vx / vl) * 0.05, bz + (vz / vl) * 0.05];
}

// ─── Scene ───────────────────────────────────────────────────────────────────

// Registers a raycast helper for external drop placement (via the handle)
function PlacementBridge({
  register, rooms, world,
}: {
  register: (fn: (nx: number, ny: number, mountType?: "floor" | "ceiling") => [number, number] | null) => void;
  rooms: PolyRoom[];
  world: World;
}) {
  const { camera } = useThree();
  useEffect(() => {
    const ray = new THREE.Raycaster();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ceilingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), WALL_H);
    const hit = new THREE.Vector3();
    const polys = roomPolysWorld(rooms, world);
    register((nx, ny, mountType = "floor") => {
      ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
      const targetPlane = mountType === "ceiling" ? ceilingPlane : floorPlane;
      if (!ray.ray.intersectPlane(targetPlane, hit)) return null;
      // A ceiling mount must land under an actual ceiling, so a drop outside
      // the building is pulled to the nearest room rather than left floating.
      if (mountType === "ceiling") return clampIntoRooms(hit.x, hit.z, polys);
      return [hit.x, hit.z];
    });
  }, [camera, register, rooms, world]);
  return null;
}

const EYE_HEIGHT = 1.6;

// ─── Walk collisions ─────────────────────────────────────────────────────────
//
// Inside mode used to clamp the camera to the plan's outer box only, so a
// client could walk straight through walls and furniture — which breaks the
// sense of being in the room faster than anything else.
//
// The walker is a vertical capsule seen from above: a circle of BODY_R. Walls
// are their solid pieces with DOOR openings removed (doorways stay walkable,
// windows do not). Furniture blocks by its footprint, unless it is low enough
// to step over (a rug, a floor cushion).

const BODY_R = 0.22;
/** Items whose top is below the walker's feet + this are stepped over. */
const STEP_H = 0.35;
/** Eye to feet. Flying up with E / Space lifts the feet too. */
const BODY_H = 1.5;
/** Field of view while walking. The orbit camera's 40° feels like looking
 *  through a tube on foot; ~60° vertical gives back peripheral vision without
 *  wide-angle distortion. */
const WALK_FOV = 60;

interface WalkObstacle { minX: number; maxX: number; minZ: number; maxZ: number; top: number }

function buildWalkObstacles(
  rfWalls: VWall[], openings: Opening[], world: World, furniture: PlacedFurniture[],
): WalkObstacle[] {
  const out: WalkObstacle[] = [];
  const cuts = cutsPerWall(rfWalls, openings, world);
  planWallsToWorld(rfWalls, world.totalW, world.totalD).forEach((w, i) => {
    const horiz = w.z1 === w.z2;
    const half = w.thickness / 2;
    const a0 = horiz ? Math.min(w.x1, w.x2) : Math.min(w.z1, w.z2);
    const a1 = horiz ? Math.max(w.x1, w.x2) : Math.max(w.z1, w.z2);
    const doors = (cuts.get(i) ?? []).filter(c => c.type === "door");
    for (const [f, t] of wallPieces(a0, a1, doors).solids) {
      out.push(horiz
        ? { minX: f, maxX: t, minZ: w.z1 - half, maxZ: w.z1 + half, top: WALL_H }
        : { minX: w.x1 - half, maxX: w.x1 + half, minZ: f, maxZ: t, top: WALL_H });
    }
  });
  for (const f of furniture) {
    const cat = f.modelId ? catalogById(f.modelId) : undefined;
    if ((f.mountType ?? cat?.mountType ?? "floor") !== "floor") continue;
    const scale = f.sizeScale ?? 1;
    const w = (f.width ?? (cat ? cat.size.w * scale : 0)) / 100;
    const d = (f.depth ?? (cat ? cat.size.d * scale : 0)) / 100;
    const h = (f.height ?? (cat ? cat.size.h * scale : 0)) / 100;
    if (w <= 0 || d <= 0) continue;
    const [hx, hz] = halfExtents({ w, d, rotation: f.rotation ?? 0 });
    out.push({
      minX: f.position[0] - hx, maxX: f.position[0] + hx,
      minZ: f.position[2] - hz, maxZ: f.position[2] + hz,
      top: (f.position[1] ?? 0) + h,
    });
  }
  return out;
}

/** Push a walker at `p` out of every obstacle it overlaps. Resolving each
 *  overlap along its own normal is what makes the walker slide along a wall
 *  rather than stop dead against it. */
function resolveWalker(p: THREE.Vector3, obstacles: WalkObstacle[]) {
  const feet = Math.max(0, p.y - BODY_H);
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const o of obstacles) {
      if (o.top <= feet + STEP_H) continue;
      const cx = Math.max(o.minX, Math.min(o.maxX, p.x));
      const cz = Math.max(o.minZ, Math.min(o.maxZ, p.z));
      const dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= BODY_R * BODY_R) continue;
      if (d2 > 1e-10) {
        const d = Math.sqrt(d2);
        p.x += (dx / d) * (BODY_R - d);
        p.z += (dz / d) * (BODY_R - d);
      } else {
        // centre inside the box: leave by the nearest face
        const l = p.x - o.minX, r = o.maxX - p.x, b = p.z - o.minZ, f = o.maxZ - p.z;
        const m = Math.min(l, r, b, f);
        if (m === l) p.x = o.minX - BODY_R;
        else if (m === r) p.x = o.maxX + BODY_R;
        else if (m === b) p.z = o.minZ - BODY_R;
        else p.z = o.maxZ + BODY_R;
      }
      moved = true;
    }
    if (!moved) break;
  }
}

function WalkControls({
  world, active, obstacles, roomPolys,
}: {
  world: World; active: boolean; obstacles: WalkObstacle[];
  /** Room outlines in metres; walk mode always starts inside one. */
  roomPolys: [number, number][][];
}) {
  const { camera, gl, controls } = useThree() as any;
  const targetYaw = useRef(0);
  const targetPitch = useRef(0);
  const currentYaw = useRef(0);
  const currentPitch = useRef(0);
  const velocity = useRef(new THREE.Vector3());
  const scrollImpulse = useRef(0);
  const keys = useRef<Record<string, boolean>>({});
  const look = useRef<{ x: number; y: number } | null>(null);
  const enter = useRef<null | {
    from: THREE.Vector3; to: THREE.Vector3;
    fromQ: THREE.Quaternion; toQ: THREE.Quaternion; t: number;
  }>(null);

  const clampPos = (p: THREE.Vector3) => {
    const bx = world.totalW * 0.9, bz = world.totalD * 0.9;
    p.x = Math.max(-bx, Math.min(bx, p.x));
    p.z = Math.max(-bz, Math.min(bz, p.z));
    p.y = Math.max(0.15, Math.min(WALL_H - 0.05, p.y));
  };

  // entering: glide down to eye height INSIDE A ROOM, facing the way the
  // camera was already looking.
  //
  // This used to clamp the orbit camera's position to 45% of the plan's
  // extent, which for most plans is still outside the outer walls — the walker
  // then started outside the building and, now that walls block, could only
  // walk round it. The room under the camera wins; otherwise the room whose
  // centre is nearest.
  useEffect(() => {
    if (!active) return;
    const to = camera.position.clone();
    const bx = world.totalW * 0.45, bz = world.totalD * 0.45;
    to.x = Math.max(-bx, Math.min(bx, to.x));
    to.z = Math.max(-bz, Math.min(bz, to.z));
    if (roomPolys.length > 0 && !roomPolys.some(poly => pointInPoly(to.x, to.z, poly))) {
      let best: [number, number] | null = null;
      let bestD = Infinity;
      for (const poly of roomPolys) {
        const xs = poly.map(q => q[0]), zs = poly.map(q => q[1]);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
        const d = Math.hypot(cx - camera.position.x, cz - camera.position.z);
        if (d < bestD) { bestD = d; best = [cx, cz]; }
      }
      if (best) { to.x = best[0]; to.z = best[1]; }
    }
    to.y = EYE_HEIGHT;
    // never arrive inside a wall or a sofa
    resolveWalker(to, obstacles);
    // keep the orbit camera's heading, so you step into what you were viewing
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 0.01) dir.set(-to.x, 0, -to.z);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
    dir.normalize();
    const initYaw = Math.atan2(-dir.x, -dir.z);
    targetYaw.current = initYaw;
    currentYaw.current = initYaw;
    targetPitch.current = 0;
    currentPitch.current = 0;
    velocity.current.set(0, 0, 0);
    scrollImpulse.current = 0;

    const toQ = new THREE.Quaternion()
      .setFromEuler(new THREE.Euler(0, initYaw, 0, "YXZ"));
    enter.current = {
      from: camera.position.clone(), to,
      fromQ: camera.quaternion.clone(), toQ, t: 0,
    };

    // wider view on foot; the orbit FOV comes back on exit
    const cam = camera as THREE.PerspectiveCamera;
    const prevFov = cam.fov;
    cam.fov = WALK_FOV;
    cam.updateProjectionMatrix();
    return () => {
      cam.fov = prevFov;
      cam.updateProjectionMatrix();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // input listeners
  useEffect(() => {
    if (!active) return;
    const el = gl.domElement as HTMLCanvasElement;
    (window as any).__nooiWalkMode = true;

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if ((window as any).__nooiFurnitureDrag) return;
      look.current = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!look.current) return;
      if ((window as any).__nooiFurnitureDrag) { look.current = null; return; }
      const dx = e.clientX - look.current.x;
      const dy = e.clientY - look.current.y;
      look.current = { x: e.clientX, y: e.clientY };
      targetYaw.current -= dx * 0.0035;
      targetPitch.current = Math.max(-1.45, Math.min(1.45, targetPitch.current - dy * 0.0035));
    };
    const up = () => { look.current = null; };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollImpulse.current += (e.deltaY > 0 ? -1 : 1) * 2.5;
    };
    const isTyping = (e: KeyboardEvent) =>
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement)?.isContentEditable;
    const keyHandler = (dn: boolean) => (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      const code = e.code.toLowerCase();
      if (
        ["w", "a", "s", "d", "e", "q", " ", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright", "pageup", "pagedown"].includes(k) ||
        ["space", "shiftleft", "shiftright"].includes(code)
      ) {
        keys.current[k] = dn;
        keys.current[code] = dn;
        e.preventDefault();
      }
    };
    const kd = keyHandler(true), ku = keyHandler(false);

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      keys.current = {};
      look.current = null;
      (window as any).__nooiWalkMode = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, gl]);

  useFrame((state, rawDelta) => {
    if (!active) return;
    // walking is continuous: keep frames coming while in walk mode
    state.invalidate();
    const delta = frameDt(rawDelta);
    if (controls) controls.enabled = false;

    const a = enter.current;
    if (a) {
      a.t = Math.min(1, a.t + delta / 0.6);
      const e = a.t * a.t * (3 - 2 * a.t);
      camera.position.lerpVectors(a.from, a.to, e);
      camera.quaternion.slerpQuaternions(a.fromQ, a.toQ, e);
      if (a.t >= 1) enter.current = null;
      return;
    }

    // Smooth rotation interpolation
    const rotFactor = 1 - Math.exp(-22 * delta);
    currentYaw.current += (targetYaw.current - currentYaw.current) * rotFactor;
    currentPitch.current += (targetPitch.current - currentPitch.current) * rotFactor;

    // Movement directions
    const k = keys.current;
    const mvF = (k["w"] || k["arrowup"] ? 1 : 0) - (k["s"] || k["arrowdown"] ? 1 : 0);
    const mvR = (k["d"] || k["arrowright"] ? 1 : 0) - (k["a"] || k["arrowleft"] ? 1 : 0);
    const mvU = (k["e"] || k[" "] || k["space"] || k["pageup"] ? 1 : 0) -
                (k["q"] || k["shift"] || k["shiftleft"] || k["shiftright"] || k["pagedown"] ? 1 : 0);

    const fwdHoriz = new THREE.Vector3(-Math.sin(currentYaw.current), 0, -Math.cos(currentYaw.current));
    const rightHoriz = new THREE.Vector3().crossVectors(fwdHoriz, new THREE.Vector3(0, 1, 0));
    const upVert = new THREE.Vector3(0, 1, 0);

    // 3D view vector for scroll flight
    const view3D = new THREE.Vector3(0, 0, -1)
      .applyEuler(new THREE.Euler(currentPitch.current, currentYaw.current, 0, "YXZ"));

    const moveSpeed = 3.8;
    const targetVel = new THREE.Vector3();
    targetVel.addScaledVector(fwdHoriz, mvF * moveSpeed);
    targetVel.addScaledVector(rightHoriz, mvR * moveSpeed);
    targetVel.addScaledVector(upVert, mvU * moveSpeed);

    // Process scroll impulse
    if (Math.abs(scrollImpulse.current) > 0.01) {
      targetVel.addScaledVector(view3D, scrollImpulse.current * 1.5);
      scrollImpulse.current *= Math.exp(-10 * delta);
    } else {
      scrollImpulse.current = 0;
    }

    // Smooth position velocity interpolation (inertia/damping)
    const posFactor = 1 - Math.exp(-12 * delta);
    velocity.current.lerp(targetVel, posFactor);

    // Move in steps of at most 10 cm, resolving collisions after each, so a
    // fast scroll-flight cannot jump clean through a thin wall in one frame.
    const travel = velocity.current.length() * delta;
    const steps = Math.max(1, Math.ceil(travel / 0.1));
    for (let i = 0; i < steps; i++) {
      camera.position.addScaledVector(velocity.current, delta / steps);
      resolveWalker(camera.position, obstacles);
    }
    clampPos(camera.position);

    camera.quaternion.setFromEuler(new THREE.Euler(currentPitch.current, currentYaw.current, 0, "YXZ"));
  }, -2);  // before drei's OrbitControls update (-1): our enabled=false must land first

  return null;
}

// ─── Camera Rig ───────────────────────────────────────────────────────────────
// Owns framing and preset views:
//  • frames the plan to fit the viewport (bounding sphere vs fov) on load,
//    and re-frames when the plan geometry arrives async — but only until the
//    user first touches the controls (never yank the camera mid-inspection)
//  • animates preset transitions (default / top / front) with ease-in-out
//  • clamps the pan target inside the plan bounds so users can't get lost
const ORBIT_TARGET_Y = 1.1;   // half wall height — centers the dollhouse

function CameraRig({
  world,
  suspended,
  register,
  selectedFurnitureId,
  furniture,
}: {
  world: World;
  suspended: boolean;   // true during walkthrough playback or inside/walk mode
  register: (setView: (v: CameraViewPreset) => void) => void;
  selectedFurnitureId?: string | null;
  furniture?: PlacedFurniture[];
}) {
  const { camera, size, controls } = useThree() as any;
  const anim = useRef<null | {
    fromPos: THREE.Vector3; toPos: THREE.Vector3;
    fromTgt: THREE.Vector3; toTgt: THREE.Vector3;
    t: number; dur: number;
  }>(null);
  const userTouched = useRef(false);

  // distance that fits the plan's bounding sphere in the tighter fov axis
  const fitDistance = () => {
    const radius = 0.5 * Math.hypot(world.totalW, world.totalD) + 1.5; // + wall margin
    const vFov = (camera.fov * Math.PI) / 180;
    const aspect = size.width / Math.max(1, size.height);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    return (radius * 1.08) / Math.sin(Math.min(vFov, hFov) / 2);
  };

  const presetPose = (view: Exclude<CameraViewPreset, "inside">) => {
    const d = fitDistance();
    const tgt = new THREE.Vector3(0, ORBIT_TARGET_Y, 0);
    let dir: THREE.Vector3;
    if (view === "top")        dir = new THREE.Vector3(0, 1, 0.02);
    else if (view === "front") dir = new THREE.Vector3(0, 0.28, 1);
    else                       dir = new THREE.Vector3(0.55, 0.62, 0.95); // ¾ default
    return { pos: tgt.clone().add(dir.normalize().multiplyScalar(d)), tgt };
  };

  const goTo = (view: Exclude<CameraViewPreset, "inside">, instant = false) => {
    const { pos, tgt } = presetPose(view);
    const curTgt = controls?.target?.clone?.() ?? new THREE.Vector3();
    if (instant || !controls) {
      camera.position.copy(pos);
      if (controls) { controls.target.copy(tgt); controls.update(); }
      return;
    }
    userTouched.current = false;
    anim.current = {
      fromPos: camera.position.clone(), toPos: pos,
      fromTgt: curTgt, toTgt: tgt,
      t: 0, dur: 0.65,
    };
  };

  // Smooth focus on target point (e.g. selected furniture)
  const focusOnPoint = (point: THREE.Vector3, offsetDist?: number) => {
    if (!controls) return;
    const curTgt = controls.target.clone();
    const curPos = camera.position.clone();
    const dir = curPos.clone().sub(curTgt);
    if (dir.lengthSq() < 0.001) dir.set(0.55, 0.62, 0.95);
    const d = offsetDist ?? Math.min(dir.length(), 4.5);
    const targetPos = point.clone().add(dir.normalize().multiplyScalar(Math.max(2.0, d)));

    userTouched.current = false;
    anim.current = {
      fromPos: curPos,
      toPos: targetPos,
      fromTgt: curTgt,
      toTgt: point,
      t: 0,
      dur: 0.55,
    };
  };

  // expose to parent ("inside" is handled by WalkControls, not the rig)
  useEffect(() => { register((v) => { if (v !== "inside") goTo(v, false); }); });

  // Smoothly focus camera when selected furniture changes
  const prevSelId = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedFurnitureId) {
      prevSelId.current = null;
      return;
    }
    if (selectedFurnitureId === prevSelId.current) return;
    prevSelId.current = selectedFurnitureId;
    const item = furniture?.find(f => f.id === selectedFurnitureId);
    if (item && controls) {
      const tgt = new THREE.Vector3(
        item.position[0],
        Math.max(0.5, item.position[1] + 0.4),
        item.position[2],
      );
      focusOnPoint(tgt, 3.2);
    }
  }, [selectedFurnitureId, furniture, controls]);

  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());

  // Keyboard input listeners for 3D View camera position shifting (WASD, Arrows, Q/E, Space/Shift)
  useEffect(() => {
    if (suspended) return;
    const isTyping = (e: KeyboardEvent) =>
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement)?.isContentEditable;

    const handleKey = (dn: boolean) => (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      const code = e.code.toLowerCase();
      if (
        ["w", "a", "s", "d", "e", "q", " ", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright", "pageup", "pagedown"].includes(k) ||
        ["space", "shiftleft", "shiftright"].includes(code)
      ) {
        keys.current[k] = dn;
        keys.current[code] = dn;
      }
    };
    const kd = handleKey(true), ku = handleKey(false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      keys.current = {};
    };
  }, [suspended]);

  // any manual interaction cancels animations + stops auto-reframing
  useEffect(() => {
    if (!controls) return;
    const onStart = () => { userTouched.current = true; anim.current = null; };
    controls.addEventListener("start", onStart);
    return () => controls.removeEventListener("start", onStart);
  }, [controls]);

  // initial framing (instant) + re-frame when plan geometry changes (animated,
  // only while the user hasn't interacted yet)
  const framed = useRef(false);
  useEffect(() => {
    if (suspended) return;
    if (!framed.current) { goTo("default", true); framed.current = true; }
    else if (!userTouched.current) goTo("default", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.totalW, world.totalD, controls]);

  useFrame((state, rawDelta) => {
    if (suspended) { anim.current = null; return; }
    const delta = frameDt(rawDelta);

    // Keyboard camera position shifting (WASD / Arrows / Q / E / Space / Shift)
    const k = keys.current;
    const mvF = (k["w"] || k["arrowup"] ? 1 : 0) - (k["s"] || k["arrowdown"] ? 1 : 0);
    const mvR = (k["d"] || k["arrowright"] ? 1 : 0) - (k["a"] || k["arrowleft"] ? 1 : 0);
    const mvU = (k["e"] || k[" "] || k["space"] || k["pageup"] ? 1 : 0) -
                (k["q"] || k["shift"] || k["shiftleft"] || k["shiftright"] || k["pagedown"] ? 1 : 0);

    if (mvF !== 0 || mvR !== 0 || mvU !== 0) {
      anim.current = null;
      userTouched.current = true;

      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      const fwdHoriz = new THREE.Vector3(fwd.x, 0, fwd.z);
      if (fwdHoriz.lengthSq() < 1e-4) fwdHoriz.set(0, 0, -1);
      else fwdHoriz.normalize();

      const rightHoriz = new THREE.Vector3().crossVectors(fwdHoriz, new THREE.Vector3(0, 1, 0)).normalize();
      const upVert = new THREE.Vector3(0, 1, 0);

      const moveSpeed = Math.max(4.5, world.maxDim * 0.45);
      const targetVel = new THREE.Vector3();
      targetVel.addScaledVector(fwdHoriz, mvF * moveSpeed);
      targetVel.addScaledVector(rightHoriz, mvR * moveSpeed);
      targetVel.addScaledVector(upVert, mvU * moveSpeed);

      const posFactor = 1 - Math.exp(-14 * delta);
      velocity.current.lerp(targetVel, posFactor);

      const deltaPos = velocity.current.clone().multiplyScalar(delta);
      camera.position.add(deltaPos);
      if (controls) {
        controls.target.add(deltaPos);
        controls.update();
      }
    } else {
      velocity.current.set(0, 0, 0);
    }

    // preset / focus animation
    const a = anim.current;
    if (a && controls) {
      a.t = Math.min(1, a.t + delta / a.dur);
      const e = a.t * a.t * (3 - 2 * a.t); // smoothstep ease-in-out
      camera.position.lerpVectors(a.fromPos, a.toPos, e);
      controls.target.lerpVectors(a.fromTgt, a.toTgt, e);
      controls.update();
      if (a.t >= 1) anim.current = null;
    }
    // Soft pan guard rails — smooth spring pull back if target strays outside bounds
    if (controls && !anim.current) {
      const t = controls.target;
      const bx = world.totalW * 1.35;
      const bz = world.totalD * 1.35;
      const maxY = WALL_H * 2.0;
      const minY = -0.5;

      const pullFactor = 1 - Math.exp(-12 * delta);

      if (t.x > bx) t.x += (bx - t.x) * pullFactor;
      else if (t.x < -bx) t.x += (-bx - t.x) * pullFactor;

      if (t.z > bz) t.z += (bz - t.z) * pullFactor;
      else if (t.z < -bz) t.z += (-bz - t.z) * pullFactor;

      if (t.y > maxY) t.y += (maxY - t.y) * pullFactor;
      else if (t.y < minY) t.y += (minY - t.y) * pullFactor;
    }

    // on-demand rendering: ask for the next frame while anything here moves
    const t = controls?.target;
    const outside = !!t && (Math.abs(t.x) > world.totalW * 1.35 + 1e-3
      || Math.abs(t.z) > world.totalD * 1.35 + 1e-3 || t.y > WALL_H * 2 + 1e-3 || t.y < -0.5 - 1e-3);
    if (mvF !== 0 || mvR !== 0 || mvU !== 0 || anim.current || outside) state.invalidate();
  });

  return null;
}

// Exposes capture (PNG) + exportGlb (binary glTF) to the parent via a ref.
// Lives inside the Canvas so it can reach gl/scene/camera through useThree.
export interface SceneExportApi {
  capture: () => string;
  captureDepth: () => string;
  exportGlb: () => Promise<Blob>;
  getCamera: () => THREE.Camera;
}

function ExportBridge({
  register, world,
}: { register: (api: SceneExportApi) => void; world: World }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    register({
      getCamera: () => camera,
      // Depth map for ControlNet-style conditioning. Renders the scene with a
      // depth material, then inverts it: three.js writes near=black/far=white,
      // while depth ControlNets expect near=white/far=black.
      captureDepth: () => {
        const cam = camera as THREE.PerspectiveCamera;
        const prevOverride = scene.overrideMaterial;
        const prevBg = scene.background;

        // Fit the depth range to the geometry actually in front of the camera.
        // Using the scene's bounding box (rather than a guess) guarantees the
        // map spans the full 0–255 range instead of collapsing to flat white.
        const box = new THREE.Box3();
        scene.traverse((o: any) => {
          if (o.isMesh && o.visible && o.name !== "nooi-noexport" && o.name !== "nooi-ui") {
            box.expandByObject(o);
          }
        });
        let near = 0.3, far = 30;
        if (!box.isEmpty()) {
          const corners = [
            new THREE.Vector3(box.min.x, box.min.y, box.min.z),
            new THREE.Vector3(box.max.x, box.min.y, box.min.z),
            new THREE.Vector3(box.min.x, box.max.y, box.min.z),
            new THREE.Vector3(box.max.x, box.max.y, box.min.z),
            new THREE.Vector3(box.min.x, box.min.y, box.max.z),
            new THREE.Vector3(box.max.x, box.min.y, box.max.z),
            new THREE.Vector3(box.min.x, box.max.y, box.max.z),
            new THREE.Vector3(box.max.x, box.max.y, box.max.z),
          ];
          const dists = corners.map(c => c.distanceTo(cam.position));
          near = Math.max(0.25, Math.min(...dists) * 0.85);
          far  = Math.max(near + 1, Math.max(...dists) * 1.05);
        }

        // Linear view-space depth. MeshDepthMaterial writes NON-linear
        // perspective depth, which saturates to white a metre from the camera
        // and gives ControlNet no usable signal. This outputs near = white,
        // far = black, which is what depth ControlNets expect (no post-invert).
        const isWebGPU = (gl as { isWebGPURenderer?: boolean }).isWebGPURenderer === true;
        const depthMat: THREE.Material = isWebGPU ? createDepthNodeMaterial(near, far) : new THREE.ShaderMaterial({
          uniforms: { uNear: { value: near }, uFar: { value: far } },
          vertexShader: `
            varying float vDepth;
            void main() {
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vDepth = -mv.z;
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: `
            uniform float uNear;
            uniform float uFar;
            varying float vDepth;
            void main() {
              float d = clamp((vDepth - uNear) / (uFar - uNear), 0.0, 1.0);
              float v = 1.0 - d;              // near = white
              gl_FragColor = vec4(v, v, v, 1.0);
            }`,
          side: THREE.DoubleSide,
        });

        scene.overrideMaterial = depthMat;
        scene.background = new THREE.Color(0x000000); // empty space = far

        // Draw to the CANVAS, not to whatever offscreen target was last bound.
        //
        // EffectComposer (the AO pass) leaves its own render target bound after
        // every frame. Without this, gl.render() wrote the depth pass into that
        // target and toDataURL() read back the stale canvas — which is how the
        // depth map came out flat and the render silently fell back to the
        // colour pipeline, losing the geometry conditioning that keeps the
        // user's actual furniture in the picture.
        const prevTarget = gl.getRenderTarget();
        // The depth values must reach the PNG untouched. WebGL's raw GLSL
        // skips tone mapping and colour conversion by itself; WebGPU applies
        // both at output, so switch them off for this one frame.
        const prevToneMapping = gl.toneMapping;
        const prevColorSpace = gl.outputColorSpace;
        if (isWebGPU) {
          gl.toneMapping = THREE.NoToneMapping;
          gl.outputColorSpace = THREE.LinearSRGBColorSpace;
        }
        gl.setRenderTarget(null);
        gl.render(scene, cam);
        const raw = gl.domElement.toDataURL("image/png");

        scene.overrideMaterial = prevOverride;
        scene.background = prevBg;
        depthMat.dispose();
        gl.toneMapping = prevToneMapping;
        gl.outputColorSpace = prevColorSpace;
        gl.render(scene, cam); // restore the visible frame immediately
        gl.setRenderTarget(prevTarget);

        return raw;
      },
      capture: () => {
        // force a fresh frame so the buffer is valid without needing
        // preserveDrawingBuffer (which costs perf if always on)
        //
        // Same render-target reset as captureDepth above: with the AO pass
        // mounted, the composer's target is still bound here.
        //
        // Note this draws the scene WITHOUT post-processing, so the captured
        // image has no ambient occlusion. That is right for the AI render,
        // which relights anyway — but it does mean "Export as image" differs
        // from what is on screen. Rendering through the composer instead needs
        // a ref to it, which is the next step if anyone notices.
        //
        // TONE MAPPING. On WebGL the post-processing composer sets
        // gl.toneMapping = NoToneMapping while it is mounted (it tone-maps in
        // its own pass instead). This direct render skips the composer, so
        // without restoring ACES here the AI received an untone-mapped image:
        // sunlit floor and lamp pools clipped to flat white, which the model
        // then reproduced as glare. WebGPU applies its own ACES here already.
        // Editor UI (selection brackets) is not part of the room.
        const hiddenUi: THREE.Object3D[] = [];
        scene.traverse((o) => {
          if (o.name === "nooi-ui" && o.visible) { o.visible = false; hiddenUi.push(o); }
        });
        const prevTarget = gl.getRenderTarget();
        const prevToneMapping = gl.toneMapping;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.setRenderTarget(null);
        gl.render(scene, camera);
        const url = gl.domElement.toDataURL("image/png");
        gl.toneMapping = prevToneMapping;
        gl.setRenderTarget(prevTarget);
        for (const o of hiddenUi) o.visible = true;
        return url;
      },
      exportGlb: () =>
        new Promise<Blob>((resolve, reject) => {
          // temporarily hide helper-only objects (e.g. contact shadows)
          const hidden: THREE.Object3D[] = [];
          scene.traverse((o) => {
            if ((o.name === "nooi-noexport" || o.name === "nooi-ui") && o.visible) {
              o.visible = false;
              hidden.push(o);
            }
          });
          const restore = () => hidden.forEach((o) => { o.visible = true; });
          const exporter = new GLTFExporter();
          exporter.parse(
            scene,
            (result) => {
              restore();
              resolve(new Blob([result as ArrayBuffer], { type: "model/gltf-binary" }));
            },
            (err) => { restore(); reject(err); },
            { binary: true },  // onlyVisible defaults to true → drag plane skipped
          );
        }),
    });
  }, [gl, scene, camera, register]);
  return null;
}

function SceneContent({
  rooms, rfWalls, openings, furniture, world,
  onFurnitureSelect, onFurnitureMove, onFurnitureRotate, onFurnitureToggleLight, selectedFurnitureId,
  wallColors, wallSurfaces, selectedWallSide, onWallSelect,
  floorSurfaces, selectedFloorRoomId, onFloorSelect,
  doorFinishes, selectedDoorKey, onDoorSelect, onDoorKeys,
  insideMode = false,
  wallCutaway = false,
  showDimensions = false,
  onWallHandleDrag,
}: Required<Pick<ThreeSceneV2Props,
  "rooms" | "rfWalls" | "openings" | "furniture">> & {
  world: World;
  onFurnitureSelect?: (id: string | null) => void;
  onFurnitureMove?: (id: string, position: [number, number, number]) => void;
  /** fired when wall-snapping re-orients an item so its back faces the wall */
  onFurnitureRotate?: (id: string, rotation: number) => void;
  /** double-click on a lamp: switch it on or off */
  onFurnitureToggleLight?: (id: string) => void;
  selectedFurnitureId?: string | null;
  wallColors?: Record<string, string>;
  wallSurfaces?: Record<string, string>;
  selectedWallSide?: string | null;
  onWallSelect?: (sel: WallSideSelection | null) => void;
  floorSurfaces?: Record<string, string>;
  selectedFloorRoomId?: string | null;
  onFloorSelect?: (roomId: string | null) => void;
  doorFinishes?: Record<string, string>;
  selectedDoorKey?: string | null;
  onDoorSelect?: (key: string | null) => void;
  onDoorKeys?: (keys: string[]) => void;
  insideMode?: boolean;
  /** Lower the walls between the camera and the rooms (orbit views only). */
  wallCutaway?: boolean;
  showDimensions?: boolean;
  onWallHandleDrag?: (e: WallHandleDragEvent) => void;
}) {
  // drei's ContactShadows is built on GLSL ShaderMaterials, which WebGPU
  // cannot run. On WebGPU the AO pass covers the same contact darkening.
  const isWebGPU = useThree(s => (s.gl as { isWebGPURenderer?: boolean }).isWebGPURenderer === true);
  const cuts = useMemo(
    () => cutsPerWall(rfWalls, openings, world),
    [rfWalls, openings, world],
  );

  // Publish the door keys actually rendered, so the parent never has to
  // reconstruct them (the previous cause of "apply to all" silently missing).
  const doorKeys = useMemo(() => {
    const out: string[] = [];
    cuts.forEach(list => list.forEach(c => { if (c.type === "door") out.push(c.key); }));
    return out;
  }, [cuts]);
  const doorKeysSig = doorKeys.join("|");
  useEffect(() => {
    onDoorKeys?.(doorKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorKeysSig]);

  // ── drag-to-move: press on the selected item, drag along the floor ──
  const { controls, camera, gl } = useThree() as any;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; z: number } | null>(null);
  const dragArmed = useRef(false);
  // detect whether the in-flight drag is a ceiling-mount (chandelier etc.)
  // so the invisible drag plane can be placed at ceiling level.
  const draggingItem = useMemo(
    () => furniture.find(f => f.id === draggingId),
    [furniture, draggingId],
  );
  const draggingCat = draggingItem?.modelId ? catalogById(draggingItem.modelId) : undefined;
  const draggingMountType = draggingItem?.mountType ?? draggingCat?.mountType ?? "floor";
  const isDraggingCeiling = draggingMountType === "ceiling";
  const isDraggingWall = draggingMountType === "wall";
  useEffect(() => {
    const up = () => {
      setDraggingId(null);
      (window as any).__nooiFurnitureDrag = false;
      // never hand control back to orbit while walk (Inside) mode is active —
      // its update() would snap the camera back to the stored orbit pose
      if (controls && !(window as any).__nooiWalkMode) controls.enabled = true;
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
    };
  }, [controls]);

  // Ceiling drag path.
  // Floor items drag via the invisible plane mesh below, which works because
  // nothing sits between the camera and the floor. At ceiling height that mesh
  // does not reliably receive R3F pointer events, so ceiling mounts are dragged
  // with a direct raycast instead — the same approach the drop path already
  // uses successfully via floorPointFromNdc(..., "ceiling").
  useEffect(() => {
    if (!draggingId || !isDraggingCeiling) return;
    const ceilingPolys = roomPolysWorld(rooms, world);
    const el = gl.domElement as HTMLCanvasElement;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -WALL_H);
    const ray = new THREE.Raycaster();
    const hit = new THREE.Vector3();

    const move = (e: PointerEvent) => {
      if ((e.buttons ?? 0) === 0) {
        setDraggingId(null);
        dragStart.current = null;
        dragArmed.current = false;
        (window as any).__nooiFurnitureDrag = false;
        if (controls && !(window as any).__nooiWalkMode) controls.enabled = true;
        return;
      }
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
      if (!ray.ray.intersectPlane(plane, hit)) return;

      if (!dragStart.current) {
        dragStart.current = { x: hit.x, z: hit.z };
        return;
      }
      if (!dragArmed.current) {
        if (Math.hypot(hit.x - dragStart.current.x, hit.z - dragStart.current.z) < 0.06) return;
        dragArmed.current = true;
      }
      // a chandelier cannot hang outside the building
      const [cx, cz] = clampIntoRooms(hit.x, hit.z, ceilingPolys);
      onFurnitureMove?.(draggingId, [cx, 0, cz]);
    };

    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [draggingId, isDraggingCeiling, camera, gl, controls, onFurnitureMove, rooms, world]);

  // Walls in world space for the snap engine. VWall stores percentages of the
  // source image; thickness is a percentage of the larger image dimension.
  const worldWalls = useMemo<WorldWall[]>(
    () => planWallsToWorld(rfWalls, world.totalW, world.totalD),
    [rfWalls, world],
  );
  // outer walls and which way they face — only these are cut away
  const wallOutside = useMemo(() => outsideSides(worldWalls), [worldWalls]);

  // The selected wall face ("wallKey:A") → its index in rfWalls.
  const selectedWallIndexFromSide = useMemo(() => {
    if (!selectedWallSide) return -1;
    const key = selectedWallSide.slice(0, selectedWallSide.lastIndexOf(":"));
    return rfWalls.findIndex((wl, i) => (wl.id ?? `wi${i}`) === key);
  }, [selectedWallSide, rfWalls]);

  // Rooms with their names, in metres, for the area labels.
  const namedRoomPolys = useMemo(() => rooms.flatMap(r => {
    let poly: [number, number][] | null = null;
    if (r.polygon && r.polygon.length >= 3) {
      poly = r.polygon.map(([x, y]) => [world.px(x), world.pz(y)] as [number, number]);
    } else if (r.box) {
      const x0 = world.px(r.box.left), z0 = world.pz(r.box.top);
      const x1 = world.px(r.box.left + r.box.width), z1 = world.pz(r.box.top + r.box.height);
      poly = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    }
    return poly ? [{ id: r.id, name: r.name, poly }] : [];
  }), [rooms, world]);

  // The item to measure: whatever is being dragged, else the selection when
  // dimensions are switched on. Ceiling mounts have nothing useful to show.
  const measuredItem = useMemo(() => {
    const f = (draggingId && furniture.find(i => i.id === draggingId))
      || (showDimensions && selectedFurnitureId && furniture.find(i => i.id === selectedFurnitureId))
      || null;
    if (!f) return null;
    const cat = f.modelId ? catalogById(f.modelId) : undefined;
    const mountType = f.mountType ?? cat?.mountType ?? "floor";
    if (mountType === "ceiling") return null;
    const size = itemSizeM(f);
    return { position: f.position, rotation: f.rotation, mountType, ...size };
  }, [draggingId, showDimensions, selectedFurnitureId, furniture]);

  // Wall-mount drag path: the pointer ray is cast against the wall faces, so
  // a TV slides along its wall, moves up or down with the pointer, and can be
  // carried round a corner onto the next wall.
  useEffect(() => {
    if (!draggingId || !isDraggingWall || !draggingItem) return;
    const el = gl.domElement as HTMLCanvasElement;
    const ray = new THREE.Raycaster();
    const size = itemSizeM(draggingItem);
    const flags = window as unknown as { __nooiFurnitureDrag?: boolean; __nooiWalkMode?: boolean };
    const end = () => {
      setDraggingId(null);
      dragStart.current = null;
      dragArmed.current = false;
      flags.__nooiFurnitureDrag = false;
      if (controls && !flags.__nooiWalkMode) controls.enabled = true;
    };
    const move = (e: PointerEvent) => {
      if ((e.buttons ?? 0) === 0) { end(); return; }
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
      const hit = wallHitFromRay(ray.ray, worldWalls);
      if (!hit) return;
      if (!dragStart.current) { dragStart.current = { x: hit.x, z: hit.z }; return; }
      if (!dragArmed.current) {
        if (Math.hypot(hit.x - dragStart.current.x, hit.z - dragStart.current.z) < 0.04) return;
        dragArmed.current = true;
      }
      const placed = placeOnWall(hit, size, hit.y);
      onFurnitureMove?.(draggingId, placed.position);
      if (Math.abs(placed.rotation - (draggingItem.rotation ?? 0)) > 1e-3) {
        onFurnitureRotate?.(draggingId, placed.rotation);
      }
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
    // draggingItem changes on every move; its id and size are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId, isDraggingWall, camera, gl, controls, onFurnitureMove, onFurnitureRotate, worldWalls]);

  const startDrag = (id: string) => {
    setDraggingId(id);
    dragStart.current = null;
    dragArmed.current = false;
    (window as any).__nooiFurnitureDrag = true;
    if (controls) controls.enabled = false;
  };

  // expose select+drag to furniture items (avoids prop-drilling into
  // suspense/error-boundary wrapped models)
  useEffect(() => {
    (window as any).__nooiSelect = (id: string) => {
      onFurnitureSelect?.(id);
      startDrag(id);
    };
    return () => { delete (window as any).__nooiSelect; };
  });

  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow
        onClick={() => {
          onFurnitureSelect?.(null); onWallSelect?.(null);
          onDoorSelect?.(null); onFloorSelect?.(null);
        }}>
        <planeGeometry args={[world.totalW * 1.25, world.totalD * 1.25]} />
        <meshStandardMaterial color="#eae7e0" roughness={1} />
      </mesh>

      {/* invisible drag plane: active only while moving an item.
           Ceiling-mount items (chandeliers) use a plane at WALL_H so the
           pointer tracks at the right height in Inside mode. */}
      {draggingId && !isDraggingCeiling && !isDraggingWall && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, isDraggingCeiling ? WALL_H - 0.001 : 0.001, 0]}
          visible={false}
          onPointerMove={(e) => {
            // the button must be HELD for anything to move: click = select
            // only; a stuck drag with no button down ends itself right here
            const buttons =
              (e as any).buttons ?? (e as any).nativeEvent?.buttons ?? 0;
            if (buttons === 0) {
              setDraggingId(null);
              dragStart.current = null;
              dragArmed.current = false;
              if (controls) controls.enabled = true;
              return;
            }
            if (!dragStart.current) {
              dragStart.current = { x: e.point.x, z: e.point.z };
              return;
            }
            if (!dragArmed.current) {
              const dx = e.point.x - dragStart.current.x;
              const dz = e.point.z - dragStart.current.z;
              if (Math.hypot(dx, dz) < 0.06) return;  // click jitter — ignore
              dragArmed.current = true;
            }
            // Preserve the item's own height while dragging. Ceiling mounts
            // get their height from mountType at render time, but zeroing Y
            // here also wiped any surface height a floor item was resting on.
            const keepY = isDraggingCeiling ? 0 : (draggingItem?.position[1] ?? 0);
            // NOOI-17: snap to a nearby wall, then push clear of anything
            // it would overlap. Both are no-ops when nothing is close, so a
            // free-standing item still follows the pointer exactly.
            let nx = e.point.x, nz = e.point.z, rot = draggingItem?.rotation ?? 0;
            // the size it is actually drawn at, size slider included
            const dSize = draggingItem ? itemSizeM(draggingItem) : null;
            const dw = dSize?.w ?? 0, dd = dSize?.d ?? 0;

            if (dw > 0 && dd > 0) {
              const snap = snapToWall(
                { x: nx, z: nz, w: dw, d: dd, rotation: rot, id: draggingId },
                worldWalls,
              );
              nx = snap.x; nz = snap.z;
              if (snap.snapped) rot = snap.rotation;

              const others: Footprint[] = furniture
                .filter(f => f.id !== draggingId && (f.mountType ?? "floor") === "floor")
                .map(f => {
                  const sz = itemSizeM(f);
                  return {
                    x: f.position[0], z: f.position[2], w: sz.w, d: sz.d,
                    rotation: f.rotation ?? 0, id: f.id,
                  };
                })
                .filter(f => f.w > 0 && f.d > 0);

              const solved = resolveCollision(
                { x: nx, z: nz, w: dw, d: dd, rotation: rot, id: draggingId }, others,
              );
              // Walls are solid: step clear of them, and if there is no
              // wall-free spot here (a gap narrower than the item) do not
              // move at all — the item waits where it last fitted.
              const clear = settleClearOfWalls(solved, worldWalls);
              if (!clear) return;
              nx = clear.x; nz = clear.z;
            }

            onFurnitureMove?.(draggingId, [nx, keepY, nz]);
            if (rot !== (draggingItem?.rotation ?? 0)) onFurnitureRotate?.(draggingId, rot);
          }}
        >
          <planeGeometry args={[world.totalW * 3, world.totalD * 3]} />
        </mesh>
      )}

      {rooms.map((r) => (
        <RoomFloor
          key={r.id} room={r} world={world}
          surfaceId={floorSurfaces?.[r.id]}
          selected={selectedFloorRoomId === r.id}
          onSelect={onFloorSelect}
        />
      ))}

      {/* Roof / Ceiling — ONLY rendered when Inside Mode is active */}
      {insideMode && rooms.map((r) => <RoomRoof key={`roof-${r.id}`} room={r} world={world} />)}

      {rfWalls.map((wl, i) => {
        const wallKey = wl.id ?? `wi${i}`;
        return (
          <CutawayWall key={wallKey} wall={wl} wallKey={wallKey} world={world} enabled={wallCutaway}
            outside={wallOutside[i] ?? 0}>
          <WallWithOpenings wall={wl}
            cuts={cuts.get(i) ?? []} world={world}
            wallKey={wallKey}
            colors={{
              A: wallColors?.[`${wallKey}:A`],
              B: wallColors?.[`${wallKey}:B`],
            }}
            surfaces={{
              A: wallSurfaces?.[`${wallKey}:A`],
              B: wallSurfaces?.[`${wallKey}:B`],
            }}
            selectedSide={
              selectedWallSide && selectedWallSide.startsWith(`${wallKey}:`)
                ? (selectedWallSide.endsWith(":A") ? "A" : "B")
                : null
            }
            onSelect={onWallSelect}
            doorFinishes={doorFinishes}
            selectedDoorKey={selectedDoorKey}
            onDoorSelect={onDoorSelect}
          />
          </CutawayWall>
        );
      })}

      {furniture.map((f) => {
        const cat = f.modelId ? catalogById(f.modelId) : undefined;
        const mountType = f.mountType ?? cat?.mountType ?? "floor";
        // Roof & ceiling-mount items (chandeliers, pendant lights) are ONLY visible
        // in Inside view (or walkthrough). In 3D, Top, and Front views, ceiling items
        // are hidden to keep the dollhouse layout clean and unobstructed.
        if (mountType === "ceiling" && !insideMode) return null;
        return (
          <FurnitureItem key={f.id} item={f} world={world} walls={worldWalls}
            selected={f.id === selectedFurnitureId}
            onToggleLight={onFurnitureToggleLight} />
        );
      })}

      {/* ── wall editing handles (orbit views) ── */}
      {onWallHandleDrag && wallCutaway && selectedWallIndexFromSide >= 0 && rfWalls[selectedWallIndexFromSide] && (
        <WallHandles
          wall={rfWalls[selectedWallIndexFromSide]}
          index={selectedWallIndexFromSide}
          world={world}
          onDrag={onWallHandleDrag}
        />
      )}

      {/* ── measurements ── */}
      {showDimensions && !insideMode && <RoomAreaLabels rooms={namedRoomPolys} areaScale={1 / (world.frame.visualScale ** 2)} />}
      {measuredItem && <ItemDimensions item={measuredItem} walls={worldWalls} />}

      {!isWebGPU && (
        <group name="nooi-noexport">
          <ContactShadows position={[0, 0, 0]} opacity={0.22}
            scale={world.maxDim * 1.3} blur={2.4} far={3} />
        </group>
      )}
    </group>
  );
}

// ─── Ambient occlusion ───────────────────────────────────────────────────────
// The contact darkening where a wall meets a floor, or a sofa meets the
// ground. Shadow maps cannot produce it — they only handle light from the
// directional light's direction — so without AO every object looks like it is
// hovering slightly, which is most of what makes a three.js interior read as a
// diagram rather than a room.
//
// Progressive: it accumulates over several frames while the camera is still
// and resets when it moves, so it costs little during interaction and looks
// its best exactly when the user has stopped to look at something.
//
// N8AO rather than the built-in SSAO: it handles large scenes without the
// halo artefacts SSAO produces at this scale, and it is noticeably cheaper.
/**
 * The finishing pass.
 *
 * Kept to what makes a render read as clean and solid — the recipe Pascal's
 * viewer uses (github.com/pascalorg/editor): ambient occlusion, tone mapping,
 * a gentle grade, and thin ink lines on edges. No bloom, depth of field,
 * vignette or grain: each of those was tried, and each made the room look
 * hazier or blurrier rather than more real.
 */
function Postprocessing({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    /*
      multisampling: the composer renders into its own target, so the Canvas's
      `antialias: true` does NOT apply once it is mounted. At 0 every edge was
      aliased; 4 restores clean edges.
    */
    <EffectComposer enableNormalPass multisampling={4}>
      <N8AO
        // In world units. Too small and only the seams darken; too large and
        // whole rooms go muddy. Roughly a metre reads correctly for interiors
        // regardless of how big the plan is.
        aoRadius={1.0}
        distanceFalloff={0.8}
        // Was 2.2. The rig no longer relies on contrast from local lights, so
        // AO carries the form — but too strong and corners go dirty.
        intensity={1.8}
        // Half resolution. AO is a low-frequency effect — the difference is
        // invisible and it costs half as much.
        halfRes
        screenSpaceRadius={false}
        color="#1a1a1a"
      />

      {/*
        TONE MAPPING — must be here, not on the Canvas.

        EffectComposer forces gl.toneMapping = NoToneMapping while it is
        mounted, so the Canvas's ACESFilmic setting was being silently dropped
        and anything over 1.0 clipped straight to white. Exposure still comes
        from gl.toneMappingExposure, which the composer leaves alone.
      */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

      {/* A gentle grade. ACES reads slightly flat and desaturated on its own. */}
      <HueSaturation saturation={0.08} />
      <BrightnessContrast brightness={0} contrast={0.05} />

      {/*
        Ink lines on creases and silhouettes. Most of the crisp
        "architectural render" look, and it hides soft or low-poly edges.
        After the grade so the line colour is exactly what is asked for.
      */}
      <InkEdges color="#2b2622" opacity={0.45} />
    </EffectComposer>
  );
}

// ─── Root component ──────────────────────────────────────────────────────────

const ThreeSceneV2 = forwardRef<ThreeSceneHandle, ThreeSceneV2Props>(function ThreeSceneV2({
  roomWidthCm = 1600,
  roomDepthCm = 1200,
  rooms = [],
  rfWalls = [],
  openings = [],
  furniture = [],
  wallColors,
  wallSurfaces,
  floorSurfaces,
  selectedFloorRoomId = null,
  onFloorSelect,
  doorFinishes,
  selectedDoorKey = null,
  onDoorSelect,
  onDoorKeys,
  selectedWallSide = null,
  onWallSelect,
  onFurnitureSelect,
  onFurnitureMove,
  onFurnitureRotate,
  onFurnitureToggleLight,
  selectedFurnitureId = null,
  walkthroughActive = false,
  walkthroughPaused = false,
  onWalkthroughProgress,
  aoEnabled = true,
  showDimensions = false,
  onWallHandleDrag,
  visualScale = 1,
  lighting = DEFAULT_LIGHTING,
  pathTracing = false,
  onPathTracerStats,
}, ref) {
  const world = useMemo(
    () => makeWorld(roomWidthCm / 100, roomDepthCm / 100, visualScale),
    [roomWidthCm, roomDepthCm, visualScale],
  );
  const controlsRef = useRef(null);
  // After every update of the scene's props, keep drawing briefly: children
  // apply some changes in their own effects (materials, textures) after the
  // commit R3F already redrew for.
  const kickRef = useRef<((ms: number) => void) | null>(null);
  // Vendor products placed from the Shop tab ("shop:<id>") resolve once
  // they're fetched; redraw when they arrive. Library pieces are unaffected.
  const shopVersion = useShopCatalogVersion();
  useEffect(() => { void ensureShopItems(furniture.map(f => f.modelId)); }, [furniture]);
  useEffect(() => { if (shopVersion) kickRef.current?.(1500); }, [shopVersion]);
  useEffect(() => { kickRef.current?.(KICK_MS.update); });
  const raycastFn = useRef<((nx: number, ny: number, mountType?: "floor" | "ceiling") => [number, number] | null) | null>(null);
  const wallPlaceFn = useRef<ThreeSceneHandle["wallPlacementFromNdc"] | null>(null);
  const exportApi = useRef<SceneExportApi | null>(null);
  const cameraViewFn = useRef<((v: CameraViewPreset) => void) | null>(null);
  const [insideMode, setInsideMode] = useState(false);
  // WebGPU when the browser supports it, WebGL otherwise (or ?renderer=webgl).
  // null for the first few ms while the adapter is probed.
  const backend = useRendererBackend();
  const worldWallsRoot = useMemo(
    () => planWallsToWorld(rfWalls, world.totalW, world.totalD),
    [rfWalls, world],
  );
  // Everything the walker cannot pass through in Inside mode.
  const walkObstacles = useMemo(
    () => buildWalkObstacles(rfWalls, openings, world, furniture),
    [rfWalls, openings, world, furniture],
  );

  const roomPolys = useMemo(() => roomPolysWorld(rooms, world), [rooms, world]);
  // Room centres in metres, for the night preset's per-room ceiling lights.
  const roomCentres = useMemo(
    () => roomPolys.map((poly): [number, number] => {
      const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
      return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
    }),
    [roomPolys],
  );
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  useImperativeHandle(ref, () => ({
    floorPointFromNdc: (nx: number, ny: number, mountType?: "floor" | "ceiling") =>
      raycastFn.current ? raycastFn.current(nx, ny, mountType) : null,
    wallPlacementFromNdc: (nx, ny, item, nearestIfMissed) =>
      wallPlaceFn.current ? wallPlaceFn.current(nx, ny, item, nearestIfMissed) : null,
    captureImage: () =>
      exportApi.current ? exportApi.current.capture() : null,
    captureDepthMap: () =>
      exportApi.current ? exportApi.current.captureDepth() : null,
    exportGlb: async () =>
      exportApi.current ? exportApi.current.exportGlb() : null,
    getCanvasElement: () => canvasElementRef.current,
    getCamera: () => exportApi.current ? exportApi.current.getCamera() : null,
    setCameraView: (view: CameraViewPreset) => {
      if (view === "inside") { setInsideMode(true); return; }
      setInsideMode(false);
      cameraViewFn.current?.(view);
    },
  }), []);

  if (!backend) {
    return <div style={{ width: "100%", height: "100%", background: "#12161a" }} />;
  }

  return (
    <Canvas
      // A different backend is a different renderer on a fresh canvas; the key
      // forces a clean remount when WebGPU fails over to WebGL.
      key={backend}
      // draw only when something changed — see DemandDriver
      frameloop="demand"
      // "soft" selects PCFSoftShadowMap. The default (plain `shadows`) is
      // PCFShadowMap, whose hard edges are the main reason a three.js interior
      // reads as a diagram rather than a room.
      shadows="soft"
      camera={{
        position: [world.totalW * 0.55, world.maxDim * 0.85, world.totalD * 0.95],
        fov: 40,
      }}
      gl={backend === "webgpu"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (webgpuGlFactory as any)
        : {
            // ACES at exposure 1. Only takes effect when post-processing is
            // off — with it on, the ToneMapping effect applies the same curve.
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            antialias: true,
          }}
      onPointerMissed={() => {
        onFurnitureSelect?.(null); onWallSelect?.(null);
        onDoorSelect?.(null); onFloorSelect?.(null);
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#12161a"]} />

      {/*
        Image-based lighting now lives in LightingRig (a generated sky
        gradient), alongside the rest of the lights it has to balance with.
      */}

      {/*
        Interior lighting: environment sky, hemisphere, ambient fill and the
        pooled lamp lights. Daylight is the sun below, through the openings.
      */}
      <LightingRig
        furniture={furniture}
        wallHeight={WALL_H}
        settings={lighting}
        insideMode={insideMode}
        world={world}
        roomCentres={roomCentres}
      />

      {/* The sun and its fill now live in LightingRig, driven by the
          time-of-day preset alongside every other light. */}

      <PlacementBridge register={(fn) => { raycastFn.current = fn; }}
                       rooms={rooms} world={world} />
      <WallPlacementBridge register={(fn) => { wallPlaceFn.current = fn; }}
                           walls={worldWallsRoot} />
      <ExportBridge register={(api) => { exportApi.current = api; }} world={world} />
      <CanvasBridge onCanvasReady={(el) => { canvasElementRef.current = el; }} />
      <DemandDriver kickRef={kickRef} />
      <SurfaceTextureRefresh />
      <CameraRig
        world={world}
        suspended={(!!walkthroughActive && !walkthroughPaused) || insideMode}
        register={(fn) => { cameraViewFn.current = fn; }}
        selectedFurnitureId={selectedFurnitureId}
        furniture={furniture}
      />
      <WalkControls
        world={world}
        active={insideMode && !(walkthroughActive && !walkthroughPaused)}
        obstacles={walkObstacles}
        roomPolys={roomPolys}
      />
      <WalkthroughCamera
        rooms={rooms}
        totalW={world.totalW}
        totalD={world.totalD}
        active={walkthroughActive}
        paused={walkthroughPaused}
        onProgress={onWalkthroughProgress}
      />
      <Suspense fallback={null}>
        <SceneContent
          rooms={rooms}
          rfWalls={rfWalls}
          openings={openings}
          furniture={furniture}
          world={world}
          insideMode={insideMode}
          // Orbit views only: inside, and during the guided walkthrough, the
          // camera is in a room and every wall around it must stand.
          wallCutaway={!insideMode && !(walkthroughActive && !walkthroughPaused)}
          showDimensions={showDimensions}
          onWallHandleDrag={onWallHandleDrag}
          onFurnitureSelect={onFurnitureSelect}
          onFurnitureMove={onFurnitureMove}
          onFurnitureRotate={onFurnitureRotate}
          onFurnitureToggleLight={onFurnitureToggleLight}
          selectedFurnitureId={selectedFurnitureId}
          wallColors={wallColors}
          wallSurfaces={wallSurfaces}
          floorSurfaces={floorSurfaces}
          selectedFloorRoomId={selectedFloorRoomId}
          onFloorSelect={onFloorSelect}
          doorFinishes={doorFinishes}
          selectedDoorKey={selectedDoorKey}
          onDoorSelect={onDoorSelect}
          onDoorKeys={onDoorKeys}
          selectedWallSide={selectedWallSide}
          onWallSelect={onWallSelect}
        />
      </Suspense>
      {/*
        Mounted last so the composer's pass runs after everything is drawn.

        NOTE: captureImage() and captureDepthMap() call gl.render() directly,
        which draws to the canvas WITHOUT the composer. That is deliberate for
        depth — the AI needs raw geometry, not an occluded version — but it
        does mean the PNG export and the AI render source are the un-occluded
        frame. Fine for the AI path, which relights anyway. If the PNG export
        should match what the user sees, that is the thing to fix next.
      */}
      {/* AO and the path tracer cannot both own the render loop — the composer
          would draw over every traced sample. The tracer computes real
          occlusion anyway, so AO is redundant while it runs. */}
      {backend === "webgl" ? (
        <>
          <Postprocessing enabled={aoEnabled && !pathTracing} />
          {/* three-gpu-pathtracer is WebGL-only; the toolbar hides the toggle
              on WebGPU. */}
          <PathTracerLayer active={pathTracing} onStats={onPathTracerStats} />
        </>
      ) : (
        aoEnabled && <WebGPUPostFx />
      )}

      <OrbitControls ref={controlsRef} makeDefault
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.85}
        zoomSpeed={0.95}
        panSpeed={1.15}
        screenSpacePanning={false}
        zoomToCursor
        target={[0, 1.1, 0]}
        maxPolarAngle={Math.PI / 2.02}
        minDistance={0.8}
        maxDistance={world.maxDim * 3.5}
        enabled={!insideMode && !(walkthroughActive && !walkthroughPaused)} />
    </Canvas>
  );
});

export default ThreeSceneV2;
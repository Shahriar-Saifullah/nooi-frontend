"use client";


import React, {
  Suspense, useMemo, useRef, useState, useEffect,
  forwardRef, useImperativeHandle,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { surfaceById } from "@/lib/surfaces/catalog";
import { doorFinishById } from "@/lib/surfaces/doors";
import { getFaceTextures, getDoorTexture, onSurfaceTextureLoaded } from "@/lib/surfaces/textures";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { GridRoom } from "@/components/RoomLayoutGrid";
import { catalogById, MATERIAL_PRESETS } from "@/lib/furniture/catalog";
import WalkthroughCamera, { type WalkthroughProgressInfo } from "@/components/WalkthroughCamera";

// ─── Canvas Bridge Helper ──────────────────────────────────────────────────────
// Textures decode asynchronously; nudge a redraw when one lands so a newly
// applied surface appears without the user having to move the camera.
function SurfaceTextureRefresh() {
  const invalidate = useThree(s => s.invalidate);
  useEffect(() => onSurfaceTextureLoaded(() => invalidate()), [invalidate]);
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
  // legacy box fields (still used as GLTF fallback)
  scale?: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
}

export interface ThreeSceneHandle {
  /** raycast an NDC point (-1..1) onto the floor; returns world [x, z] */
  floorPointFromNdc: (nx: number, ny: number) => [number, number] | null;
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
  rooms?: PolyRoom[];
  rfWalls?: VWall[];
  openings?: Opening[];
  furniture?: PlacedFurniture[];
  /** per-side wall paint: "wallKey:A" | "wallKey:B" → hex color */
  wallColors?: Record<string, string>;
  /** per-side wall surface: "wallKey:A" | "wallKey:B" → surface id */
  wallSurfaces?: Record<string, string>;
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
  selectedFurnitureId?: string | null;
  walkthroughActive?: boolean;
  walkthroughPaused?: boolean;
  onWalkthroughProgress?: (progress: number, info?: WalkthroughProgressInfo) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WALL_H = 2.8;
const DOOR_H = 2.1;
const SILL_H = 0.9;
const MIN_WALL_T = 0.09;
const MAX_WALL_T = 0.2;

const OUTDOOR = /porch|patio|balcon|deck|terrace|garden/i;

// ─── Geometry helpers ────────────────────────────────────────────────────────

interface World {
  totalW: number;
  totalD: number;
  maxDim: number;
  px: (xPct: number) => number; // % → world x
  pz: (yPct: number) => number; // % → world z
}

function makeWorld(totalW: number, totalD: number): World {
  return {
    totalW,
    totalD,
    maxDim: Math.max(totalW, totalD),
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
  const c = horiz ? world.pz(wall.y1) : world.px(wall.x1);
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
                <group
                  position={horiz ? [cut.start + 0.03, 0, c] : [c, 0, cut.start + 0.03]}
                  rotation={[0, horiz ? -0.5 : 0.5, 0]}
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
                </group>
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

// ─── Floors ──────────────────────────────────────────────────────────────────

function RoomFloor({ room, world }: { room: PolyRoom; world: World }) {
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

  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color={room.color || "#e8e2d6"}
          roughness={0.85}
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* wood base under indoor rooms */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color="#d9c7a7" roughness={0.7}
          side={THREE.DoubleSide} />
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
    if (item.color || preset || selected) {
      const m = base.clone();
      if (item.color) m.color = new THREE.Color(item.color);
      if (preset) { m.roughness = preset.roughness; m.metalness = preset.metalness; }
      if (selected) { m.emissive = new THREE.Color("#2dd4bf"); m.emissiveIntensity = 0.25; }
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
  const group = useRef<THREE.Group>(null);

  // auto-scale the raw model to the catalog real-world size (m), * sizeScale
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const s = item.sizeScale ?? 1;
    const tw = (cat!.size.w / 100) * s;
    const th = (cat!.size.h / 100) * s;
    const td = (cat!.size.d / 100) * s;
    const sx = size.x > 1e-4 ? tw / size.x : 1;
    const sy = size.y > 1e-4 ? th / size.y : 1;
    const sz = size.z > 1e-4 ? td / size.z : 1;
    // sit the model on the floor: shift up by its (scaled) min-y
    const minY = box.min.y * sy;
    return { scale: [sx, sy, sz] as [number, number, number], yOffset: -minY };
  }, [clone, cat, item.sizeScale]);

  useEffect(() => { applyOverrides(clone, item, selected); },
    [clone, item.color, item.materialPreset, selected, item]);

  return (
    <group
      ref={group}
      position={[item.position[0], fit.yOffset, item.position[2]]}
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
  item, selected,
}: { item: PlacedFurniture; selected: boolean }) {
  const cat = item.modelId ? catalogById(item.modelId) : undefined;
  const s = item.sizeScale ?? 1;
  const w = ((cat?.size.w ?? item.width ?? 80) / 100) * s;
  const d = ((cat?.size.d ?? item.depth ?? 80) / 100) * s;
  const h = ((cat?.size.h ?? item.height ?? 80) / 100) * s;
  return (
    <mesh
      position={[item.position[0], h / 2, item.position[2]]}
      rotation={[0, item.rotation, 0]}
      castShadow receiveShadow
      onPointerDown={(e) => { e.stopPropagation(); (window as any).__nooiSelect?.(item.id); }}
      onClick={(e) => e.stopPropagation()}
    >
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={item.color || cat?.color || "#b09a7a"}
        roughness={0.7}
        emissive={selected ? "#2dd4bf" : "#000000"}
        emissiveIntensity={selected ? 0.3 : 0}
      />
    </mesh>
  );
}

function FurnitureItem({
  item, selected, world,
}: { item: PlacedFurniture; selected: boolean; world: World }) {
  const cat = item.modelId ? catalogById(item.modelId) : undefined;
  // GLTF path exists → try the real model (Suspense handles load); else box
  if (cat) {
    return (
      <Suspense fallback={<BoxFurniture item={item} selected={selected} />}>
        <ModelErrorBoundary fallback={<BoxFurniture item={item} selected={selected} />}>
          <GltfModel item={item} selected={selected} world={world} />
        </ModelErrorBoundary>
      </Suspense>
    );
  }
  return <BoxFurniture item={item} selected={selected} />;
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
    // move a finish to the wrong door.
    const key = `${op.type[0]}${Math.round(op.x)}_${Math.round(op.y)}`;
    arr.push({ start: center - halfW, end: center + halfW, type: op.type, key });
    map.set(idx, arr);
  });
  return map;
}

// ─── Scene ───────────────────────────────────────────────────────────────────

// Registers a raycast helper for external drop placement (via the handle)
function PlacementBridge({
  register,
}: { register: (fn: (nx: number, ny: number) => [number, number] | null) => void }) {
  const { camera } = useThree();
  useEffect(() => {
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    register((nx, ny) => {
      ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
      return ray.ray.intersectPlane(plane, hit) ? [hit.x, hit.z] : null;
    });
  }, [camera, register]);
  return null;
}

// ─── Walk Controls (Inside mode) ──────────────────────────────────────────────
// First-person navigation: drag = look around (rotate the camera in place),
// scroll = walk along the view direction, WASD/arrows = walk. No collision —
// free flow through doorways and walls by design. Clamped to the plan area
// and between floor and ceiling so users can't get lost.
const EYE_HEIGHT = 1.6;

function WalkControls({ world, active }: { world: World; active: boolean }) {
  const { camera, gl, controls } = useThree() as any;
  const yaw = useRef(0);
  const pitch = useRef(0);
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
    p.y = Math.max(0.4, Math.min(2.6, p.y));
  };

  // entering: glide down to eye height inside the plan, facing the interior
  useEffect(() => {
    if (!active) return;
    const to = camera.position.clone();
    const bx = world.totalW * 0.45, bz = world.totalD * 0.45;
    to.x = Math.max(-bx, Math.min(bx, to.x));
    to.z = Math.max(-bz, Math.min(bz, to.z));
    to.y = EYE_HEIGHT;
    const dir = new THREE.Vector3(-to.x, 0, -to.z);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
    dir.normalize();
    yaw.current = Math.atan2(-dir.x, -dir.z);
    pitch.current = 0;
    const toQ = new THREE.Quaternion()
      .setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, "YXZ"));
    enter.current = {
      from: camera.position.clone(), to,
      fromQ: camera.quaternion.clone(), toQ, t: 0,
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
      yaw.current -= dx * 0.0045;
      pitch.current = Math.max(-1.35, Math.min(1.35, pitch.current - dy * 0.0045));
    };
    const up = () => { look.current = null; };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const fwd = new THREE.Vector3(0, 0, -1)
        .applyEuler(new THREE.Euler(pitch.current, yaw.current, 0, "YXZ"));
      camera.position.addScaledVector(fwd, -e.deltaY * 0.01);
      clampPos(camera.position);
    };
    const isTyping = (e: KeyboardEvent) =>
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement)?.isContentEditable;
    const keyHandler = (dn: boolean) => (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        keys.current[k] = dn;
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

  useFrame((_, delta) => {
    if (!active) return;
    // hard-disable orbit while walking (furniture-drag handlers re-enable it
    // on pointerup, so the prop alone isn't sufficient)
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

    // keyboard walking, horizontal, relative to where you're facing
    const k = keys.current;
    const mvF = (k["w"] || k["arrowup"] ? 1 : 0) - (k["s"] || k["arrowdown"] ? 1 : 0);
    const mvR = (k["d"] || k["arrowright"] ? 1 : 0) - (k["a"] || k["arrowleft"] ? 1 : 0);
    if (mvF || mvR) {
      const speed = 3.2 * delta;
      const fwd = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
      camera.position.addScaledVector(fwd, mvF * speed);
      camera.position.addScaledVector(right, mvR * speed);
      clampPos(camera.position);
    }

    camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, "YXZ"));
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
  world, suspended, register,
}: {
  world: World;
  suspended: boolean;   // true during walkthrough playback or inside/walk mode
  register: (setView: (v: CameraViewPreset) => void) => void;
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
    anim.current = {
      fromPos: camera.position.clone(), toPos: pos,
      fromTgt: curTgt, toTgt: tgt,
      t: 0, dur: 0.65,
    };
  };

  // expose to parent ("inside" is handled by WalkControls, not the rig)
  useEffect(() => { register((v) => { if (v !== "inside") goTo(v, false); }); });

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

  useFrame((_, delta) => {
    if (suspended) { anim.current = null; return; }
    // preset animation
    const a = anim.current;
    if (a && controls) {
      a.t = Math.min(1, a.t + delta / a.dur);
      const e = a.t * a.t * (3 - 2 * a.t); // smoothstep ease-in-out
      camera.position.lerpVectors(a.fromPos, a.toPos, e);
      controls.target.lerpVectors(a.fromTgt, a.toTgt, e);
      controls.update();
      if (a.t >= 1) anim.current = null;
    }
    // pan guard rails — keep the orbit target inside the plan
    if (controls && !anim.current) {
      const t = controls.target;
      const bx = world.totalW * 0.75, bz = world.totalD * 0.75;
      t.x = Math.max(-bx, Math.min(bx, t.x));
      t.z = Math.max(-bz, Math.min(bz, t.z));
      t.y = Math.max(0, Math.min(4, t.y));
    }
  });

  return null;
}

// Exposes capture (PNG) + exportGlb (binary glTF) to the parent via a ref.
// Lives inside the Canvas so it can reach gl/scene/camera through useThree.
export interface SceneExportApi {
  capture: () => string;
  captureDepth: () => string;
  exportGlb: () => Promise<Blob>;
}

function ExportBridge({
  register, world,
}: { register: (api: SceneExportApi) => void; world: World }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    register({
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
          if (o.isMesh && o.visible && o.name !== "nooi-noexport") {
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
        const depthMat = new THREE.ShaderMaterial({
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
        gl.render(scene, cam);
        const raw = gl.domElement.toDataURL("image/png");

        scene.overrideMaterial = prevOverride;
        scene.background = prevBg;
        depthMat.dispose();
        gl.render(scene, cam); // restore the visible frame immediately

        return raw;
      },
      capture: () => {
        // force a fresh frame so the buffer is valid without needing
        // preserveDrawingBuffer (which costs perf if always on)
        gl.render(scene, camera);
        return gl.domElement.toDataURL("image/png");
      },
      exportGlb: () =>
        new Promise<Blob>((resolve, reject) => {
          // temporarily hide helper-only objects (e.g. contact shadows)
          const hidden: THREE.Object3D[] = [];
          scene.traverse((o) => {
            if (o.name === "nooi-noexport" && o.visible) {
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
  onFurnitureSelect, onFurnitureMove, selectedFurnitureId,
  wallColors, wallSurfaces, selectedWallSide, onWallSelect,
  doorFinishes, selectedDoorKey, onDoorSelect, onDoorKeys,
}: Required<Pick<ThreeSceneV2Props,
  "rooms" | "rfWalls" | "openings" | "furniture">> & {
  world: World;
  onFurnitureSelect?: (id: string | null) => void;
  onFurnitureMove?: (id: string, position: [number, number, number]) => void;
  selectedFurnitureId?: string | null;
  wallColors?: Record<string, string>;
  wallSurfaces?: Record<string, string>;
  selectedWallSide?: string | null;
  onWallSelect?: (sel: WallSideSelection | null) => void;
  doorFinishes?: Record<string, string>;
  selectedDoorKey?: string | null;
  onDoorSelect?: (key: string | null) => void;
  onDoorKeys?: (keys: string[]) => void;
}) {
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
  const { controls } = useThree() as any;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; z: number } | null>(null);
  const dragArmed = useRef(false);
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
        onClick={() => { onFurnitureSelect?.(null); onWallSelect?.(null); onDoorSelect?.(null); }}>
        <planeGeometry args={[world.totalW * 1.25, world.totalD * 1.25]} />
        <meshStandardMaterial color="#eae7e0" roughness={1} />
      </mesh>

      {/* invisible drag plane: active only while moving an item */}
      {draggingId && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.001, 0]}
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
            onFurnitureMove?.(draggingId, [e.point.x, 0, e.point.z]);
          }}
        >
          <planeGeometry args={[world.totalW * 3, world.totalD * 3]} />
        </mesh>
      )}

      {rooms.map((r) => <RoomFloor key={r.id} room={r} world={world} />)}

      {rfWalls.map((wl, i) => {
        const wallKey = wl.id ?? `wi${i}`;
        return (
          <WallWithOpenings key={wallKey} wall={wl}
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
        );
      })}

      {furniture.map((f) => (
        <FurnitureItem key={f.id} item={f} world={world}
          selected={f.id === selectedFurnitureId} />
      ))}

      <group name="nooi-noexport">
        <ContactShadows position={[0, 0, 0]} opacity={0.22}
          scale={world.maxDim * 1.3} blur={2.4} far={3} />
      </group>
    </group>
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
  doorFinishes,
  selectedDoorKey = null,
  onDoorSelect,
  onDoorKeys,
  selectedWallSide = null,
  onWallSelect,
  onFurnitureSelect,
  onFurnitureMove,
  selectedFurnitureId = null,
  walkthroughActive = false,
  walkthroughPaused = false,
  onWalkthroughProgress,
}, ref) {
  const world = useMemo(
    () => makeWorld(roomWidthCm / 100, roomDepthCm / 100),
    [roomWidthCm, roomDepthCm],
  );
  const controlsRef = useRef(null);
  const raycastFn = useRef<((nx: number, ny: number) => [number, number] | null) | null>(null);
  const exportApi = useRef<SceneExportApi | null>(null);
  const cameraViewFn = useRef<((v: CameraViewPreset) => void) | null>(null);
  const [insideMode, setInsideMode] = useState(false);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  useImperativeHandle(ref, () => ({
    floorPointFromNdc: (nx: number, ny: number) =>
      raycastFn.current ? raycastFn.current(nx, ny) : null,
    captureImage: () =>
      exportApi.current ? exportApi.current.capture() : null,
    captureDepthMap: () =>
      exportApi.current ? exportApi.current.captureDepth() : null,
    exportGlb: async () =>
      exportApi.current ? exportApi.current.exportGlb() : null,
    getCanvasElement: () => canvasElementRef.current,
    setCameraView: (view: CameraViewPreset) => {
      if (view === "inside") { setInsideMode(true); return; }
      setInsideMode(false);
      cameraViewFn.current?.(view);
    },
  }), []);

  return (
    <Canvas
      shadows
      camera={{
        position: [world.totalW * 0.55, world.maxDim * 0.85, world.totalD * 0.95],
        fov: 40,
      }}
      onPointerMissed={() => { onFurnitureSelect?.(null); onWallSelect?.(null); onDoorSelect?.(null); }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#12161a"]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[world.totalW * 0.8, world.maxDim * 1.4, world.totalD * 0.5]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        position={[-world.totalW, world.maxDim, -world.totalD]}
        intensity={0.3}
      />
      <PlacementBridge register={(fn) => { raycastFn.current = fn; }} />
      <ExportBridge register={(api) => { exportApi.current = api; }} world={world} />
      <CanvasBridge onCanvasReady={(el) => { canvasElementRef.current = el; }} />
      <SurfaceTextureRefresh />
      <CameraRig
        world={world}
        suspended={(!!walkthroughActive && !walkthroughPaused) || insideMode}
        register={(fn) => { cameraViewFn.current = fn; }}
      />
      <WalkControls
        world={world}
        active={insideMode && !(walkthroughActive && !walkthroughPaused)}
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
          onFurnitureSelect={onFurnitureSelect}
          onFurnitureMove={onFurnitureMove}
          selectedFurnitureId={selectedFurnitureId}
          wallColors={wallColors}
          wallSurfaces={wallSurfaces}
          doorFinishes={doorFinishes}
          selectedDoorKey={selectedDoorKey}
          onDoorSelect={onDoorSelect}
          onDoorKeys={onDoorKeys}
          selectedWallSide={selectedWallSide}
          onWallSelect={onWallSelect}
        />
      </Suspense>
      <OrbitControls ref={controlsRef} makeDefault
        enableDamping dampingFactor={0.08}
        zoomToCursor
        target={[0, 1.1, 0]}
        maxPolarAngle={Math.PI / 2.05} minDistance={3}
        maxDistance={world.maxDim * 2.2}
        enabled={!insideMode && !(walkthroughActive && !walkthroughPaused)} />
    </Canvas>
  );
});

export default ThreeSceneV2;
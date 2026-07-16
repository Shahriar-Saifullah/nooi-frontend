"use client";

import React, {
  Suspense, useMemo, useRef, useState, useEffect,
  forwardRef, useImperativeHandle,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { GridRoom } from "@/components/RoomLayoutGrid";
import { catalogById, MATERIAL_PRESETS } from "@/lib/furniture/catalog";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlacedFurniture {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number;
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
}

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
  onFurnitureSelect?: (id: string | null) => void;
  onFurnitureMove?: (id: string, position: [number, number, number]) => void;
  selectedFurnitureId?: string | null;
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

type Cut = { start: number; end: number; type: "door" | "window" };

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
  wall, cuts, world,
}: { wall: VWall; cuts: Cut[]; world: World }) {
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

  const box = (
    from: number, to: number, y0: number, y1: number, key: string,
    material: React.ReactNode,
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
      <mesh key={key} position={pos} castShadow receiveShadow>
        <boxGeometry args={size} />
        {material}
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
      {solids.map(([f, tt], i) => box(f, tt, 0, WALL_H, `s${i}`, wallMat))}
      {clipped.map((cut, i) => {
        const cw = cut.end - cut.start;
        if (cut.type === "door") {
          // Width decides what a "door" opening really is:
          //   <=1.3m hinged leaf | <=3.6m sliding glass | wider: open passage
          const HINGED_MAX = 1.3, SLIDER_MAX = 7.0;
          return (
            <group key={`d${i}`}>
              {/* header above the opening */}
              {box(cut.start, cut.end, DOOR_H, WALL_H, `dh${i}`, wallMat)}
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
                  >
                    <boxGeometry args={horiz
                      ? [cw - 0.08, DOOR_H - 0.06, 0.045]
                      : [0.045, DOOR_H - 0.06, cw - 0.08]} />
                    <meshStandardMaterial color="#b59a72" roughness={0.55} />
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
            {box(cut.start, cut.end, 0, SILL_H, `ws${i}`, wallMat)}
            {box(cut.start, cut.end, DOOR_H, WALL_H, `wh${i}`, wallMat)}
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
    arr.push({ start: center - halfW, end: center + halfW, type: op.type });
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

function SceneContent({
  rooms, rfWalls, openings, furniture, world,
  onFurnitureSelect, onFurnitureMove, selectedFurnitureId,
}: Required<Pick<ThreeSceneV2Props,
  "rooms" | "rfWalls" | "openings" | "furniture">> & {
  world: World;
  onFurnitureSelect?: (id: string | null) => void;
  onFurnitureMove?: (id: string, position: [number, number, number]) => void;
  selectedFurnitureId?: string | null;
}) {
  const cuts = useMemo(
    () => cutsPerWall(rfWalls, openings, world),
    [rfWalls, openings, world],
  );

  // ── drag-to-move: press on the selected item, drag along the floor ──
  const { controls } = useThree() as any;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; z: number } | null>(null);
  const dragArmed = useRef(false);
  useEffect(() => {
    const up = () => {
      setDraggingId(null);
      if (controls) controls.enabled = true;
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [controls]);

  const startDrag = (id: string) => {
    setDraggingId(id);
    dragStart.current = null;
    dragArmed.current = false;
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
        onClick={() => onFurnitureSelect?.(null)}>
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

      {rfWalls.map((wl, i) => (
        <WallWithOpenings key={wl.id ?? i} wall={wl}
          cuts={cuts.get(i) ?? []} world={world} />
      ))}

      {furniture.map((f) => (
        <FurnitureItem key={f.id} item={f} world={world}
          selected={f.id === selectedFurnitureId} />
      ))}

      <ContactShadows position={[0, 0, 0]} opacity={0.22}
        scale={world.maxDim * 1.3} blur={2.4} far={3} />
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
  onFurnitureSelect,
  onFurnitureMove,
  selectedFurnitureId = null,
}, ref) {
  const world = useMemo(
    () => makeWorld(roomWidthCm / 100, roomDepthCm / 100),
    [roomWidthCm, roomDepthCm],
  );
  const controlsRef = useRef(null);
  const raycastFn = useRef<((nx: number, ny: number) => [number, number] | null) | null>(null);

  useImperativeHandle(ref, () => ({
    floorPointFromNdc: (nx: number, ny: number) =>
      raycastFn.current ? raycastFn.current(nx, ny) : null,
  }), []);

  return (
    <Canvas
      shadows
      camera={{
        position: [world.totalW * 0.55, world.maxDim * 0.85, world.totalD * 0.95],
        fov: 40,
      }}
      onPointerMissed={() => onFurnitureSelect?.(null)}
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
        />
      </Suspense>
      <OrbitControls ref={controlsRef} makeDefault
        maxPolarAngle={Math.PI / 2.05} minDistance={2}
        maxDistance={world.maxDim * 3} />
    </Canvas>
  );
});

export default ThreeSceneV2;
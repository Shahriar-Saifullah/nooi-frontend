"use client";

import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture, Html, Grid } from "@react-three/drei";
import * as THREE from "three";
import type { GridRoom, RoomBox } from "@/components/RoomLayoutGrid";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlacedFurniture {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number;
  scale: [number, number, number];
  color: string;
  width: number;
  depth: number;
  height: number;
}

interface ThreeSceneProps {
  floorPlanUrl?: string | null;
  roomWidthCm?: number;
  roomDepthCm?: number;
  rooms?: GridRoom[];
  buildingPerimeter?: [number, number][] | null;
  furniture?: PlacedFurniture[];
  onFurnitureMove?: (id: string, position: [number, number, number]) => void;
  onFurnitureSelect?: (id: string | null) => void;
  selectedFurnitureId?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CM          = 1 / 100;
const WALL_H      = 2.8;
const WALL_T_EXT  = 0.2;   // exterior wall thickness
const WALL_T_INT  = 0.12;  // interior wall thickness
const SNAP        = 1.5;   // % tolerance to consider two edges shared/exterior

// ─── Floor plan texture ───────────────────────────────────────────────────────
function FloorPlanMesh({ url, width, depth }: { url: string; width: number; depth: number }) {
  const texture = useTexture(url);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={texture} transparent opacity={0.6} roughness={1} />
    </mesh>
  );
}

function PlainFloor({ width, depth }: { width: number; depth: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color="#f0ede8" roughness={0.9} />
    </mesh>
  );
}

// ─── Room floor tiles (colored per room) ─────────────────────────────────────
function RoomFloors({ rooms, totalW, totalD }: { rooms: GridRoom[]; totalW: number; totalD: number }) {
  return (
    <>
      {rooms.map(room => {
        if (!room.box) return null;
        const { x, z, w, d } = boxToWorld(room.box, totalW, totalD);
        return (
          <mesh key={room.id} rotation={[-Math.PI / 2, 0, 0]} position={[x + w/2, 0.003, z + d/2]} receiveShadow>
            <planeGeometry args={[w, d]} />
            <meshStandardMaterial color={room.color} transparent opacity={0.35} roughness={1} />
          </mesh>
        );
      })}
    </>
  );
}

// ─── Convert box % coords to world coords ────────────────────────────────────
function boxToWorld(box: RoomBox, totalW: number, totalD: number) {
  const x = (box.left   / 100) * totalW - totalW / 2;
  const z = (box.top    / 100) * totalD - totalD / 2;
  const w = (box.width  / 100) * totalW;
  const d = (box.height / 100) * totalD;
  return { x, z, w, d };
}

// ─── Wall generation from room boxes ─────────────────────────────────────────
// For each room we generate 4 wall segments (edges of the bounding box).
// We then classify each edge:
//   - EXTERIOR: sits on or near the overall bounding box boundary → thick wall
//   - INTERIOR: shared between two rooms OR internal → thin wall
// This gives us Coohom-style separated rooms with proper interior dividers.

interface WallSeg {
  x1: number; z1: number;
  x2: number; z2: number;
  isExterior: boolean;
}

function generateWalls(rooms: GridRoom[], totalW: number, totalD: number): WallSeg[] {
  if (rooms.length === 0) return [];

  // Overall bounding box in world coords
  const minX = -totalW / 2;
  const maxX =  totalW / 2;
  const minZ = -totalD / 2;
  const maxZ =  totalD / 2;
  const snapW = (SNAP / 100) * totalW;
  const snapD = (SNAP / 100) * totalD;

  const isOnExterior = (x1: number, z1: number, x2: number, z2: number) => {
    // Horizontal edge (same z)
    if (Math.abs(z1 - z2) < 0.01) {
      return Math.abs(z1 - minZ) < snapD || Math.abs(z1 - maxZ) < snapD;
    }
    // Vertical edge (same x)
    if (Math.abs(x1 - x2) < 0.01) {
      return Math.abs(x1 - minX) < snapW || Math.abs(x1 - maxX) < snapW;
    }
    return false;
  };

  const segs: WallSeg[] = [];

  rooms.forEach(room => {
    if (!room.box) return;
    const { x, z, w, d } = boxToWorld(room.box, totalW, totalD);
    const x2 = x + w;
    const z2 = z + d;

    // 4 edges: top, bottom, left, right
    const edges: [number, number, number, number][] = [
      [x, z,  x2, z ],  // top edge
      [x, z2, x2, z2],  // bottom edge
      [x, z,  x,  z2],  // left edge
      [x2, z, x2, z2],  // right edge
    ];

    edges.forEach(([ex1, ez1, ex2, ez2]) => {
      segs.push({
        x1: ex1, z1: ez1,
        x2: ex2, z2: ez2,
        isExterior: isOnExterior(ex1, ez1, ex2, ez2),
      });
    });
  });

  // Deduplicate: if two segments are nearly identical, keep one
  // (shared interior walls between adjacent rooms)
  const unique: WallSeg[] = [];
  segs.forEach(seg => {
    const isDuplicate = unique.some(u => {
      const sameAB = Math.abs(u.x1-seg.x1)<0.05 && Math.abs(u.z1-seg.z1)<0.05
                  && Math.abs(u.x2-seg.x2)<0.05 && Math.abs(u.z2-seg.z2)<0.05;
      const sameBA = Math.abs(u.x1-seg.x2)<0.05 && Math.abs(u.z1-seg.z2)<0.05
                  && Math.abs(u.x2-seg.x1)<0.05 && Math.abs(u.z2-seg.z1)<0.05;
      return sameAB || sameBA;
    });
    if (!isDuplicate) unique.push(seg);
  });

  return unique;
}

function RoomWalls({ rooms, totalW, totalD }: { rooms: GridRoom[]; totalW: number; totalD: number }) {
  const walls = generateWalls(rooms, totalW, totalD);

  return (
    <>
      {walls.map((seg, i) => {
        const dx  = seg.x2 - seg.x1;
        const dz  = seg.z2 - seg.z1;
        const len = Math.sqrt(dx*dx + dz*dz);
        if (len < 0.02) return null;

        const cx    = (seg.x1 + seg.x2) / 2;
        const cz    = (seg.z1 + seg.z2) / 2;
        const angle = Math.atan2(dx, dz);
        const t     = seg.isExterior ? WALL_T_EXT : WALL_T_INT;
        const color = seg.isExterior ? "#d4cfc6" : "#e8e4dc";

        return (
          <mesh key={i} position={[cx, WALL_H/2, cz]} rotation={[0, angle, 0]} castShadow receiveShadow>
            <boxGeometry args={[t, WALL_H, len + t/2]} />
            <meshStandardMaterial color={color} roughness={0.9} metalness={0} />
          </mesh>
        );
      })}
    </>
  );
}

// ─── Draggable furniture ──────────────────────────────────────────────────────
function FurnitureBox({ item, isSelected, onSelect, onMove }: {
  item: PlacedFurniture;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (pos: [number, number, number]) => void;
}) {
  const meshRef   = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const dragPlane  = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const raycaster  = useRef(new THREE.Raycaster());

  const w = item.width  * CM;
  const h = item.height * CM;
  const d = item.depth  * CM;

  const getIntersection = (clientX: number, clientY: number) => {
    const pt = new THREE.Vector2(
      (clientX / gl.domElement.clientWidth)  * 2 - 1,
      -(clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(pt, camera);
    const v = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(dragPlane.current, v);
    return v;
  };

  const handlePointerDown = (e: any) => {
    if (!isSelected) { onSelect(); return; }
    e.stopPropagation();
    isDragging.current = true;
    gl.domElement.style.cursor = "grabbing";
    dragPlane.current.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(...item.position)
    );
    const pt = getIntersection(e.clientX, e.clientY);
    dragOffset.current.subVectors(new THREE.Vector3(...item.position), pt);
  };

  useEffect(() => {
    const onMove_ = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const pt = getIntersection(e.clientX, e.clientY);
      onMove([pt.x + dragOffset.current.x, item.position[1], pt.z + dragOffset.current.z]);
    };
    const onUp = () => { isDragging.current = false; gl.domElement.style.cursor = "default"; };
    window.addEventListener("pointermove", onMove_);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove_); window.removeEventListener("pointerup", onUp); };
  }, [isSelected, item.position]);

  return (
    <group position={item.position} rotation={[0, item.rotation, 0]}>
      <mesh ref={meshRef} position={[0, h/2, 0]} castShadow receiveShadow onPointerDown={handlePointerDown}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={item.color} roughness={0.7} metalness={0.1}
          emissive={isSelected ? new THREE.Color(item.color) : new THREE.Color(0x000000)}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>
      {isSelected && (
        <mesh position={[0, h/2, 0]}>
          <boxGeometry args={[w+0.02, h+0.02, d+0.02]} />
          <meshBasicMaterial color="#004643" wireframe />
        </mesh>
      )}
      <Html position={[0, h+0.15, 0]} center distanceFactor={6}>
        <div style={{
          background: isSelected ? "#004643" : "rgba(255,255,255,0.92)",
          color: isSelected ? "white" : "#111",
          padding: "2px 8px", borderRadius: 20, fontSize: 11,
          fontFamily: "Inter, sans-serif", fontWeight: 600,
          whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          cursor: isSelected ? "grab" : "pointer", userSelect: "none",
        }}>
          {item.name}
        </div>
      </Html>
    </group>
  );
}

// ─── Camera setup ─────────────────────────────────────────────────────────────
function CameraSetup({ width, depth }: { width: number; depth: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const d = Math.max(width, depth);
    camera.position.set(d * 0.9, d * 1.1, d * 1.2);
    camera.lookAt(0, 0, 0);
  }, [width, depth]);
  return null;
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function Scene({
  floorPlanUrl, roomWidth, roomDepth, rooms, furniture,
  onFurnitureMove, onFurnitureSelect, selectedFurnitureId,
}: {
  floorPlanUrl?: string | null;
  roomWidth: number; roomDepth: number;
  rooms: GridRoom[]; furniture: PlacedFurniture[];
  onFurnitureMove?: (id: string, pos: [number, number, number]) => void;
  onFurnitureSelect?: (id: string | null) => void;
  selectedFurnitureId?: string | null;
}) {
  const hasRooms = rooms.length > 0;

  return (
    <>
      <CameraSetup width={roomWidth} depth={roomDepth} />

      {/* Lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[roomWidth * 0.8, 5, roomDepth * 0.8]}
        intensity={1.2} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-roomWidth} shadow-camera-right={roomWidth}
        shadow-camera-top={roomDepth} shadow-camera-bottom={-roomDepth}
      />
      <pointLight position={[-roomWidth/2, 3, -roomDepth/2]} intensity={0.4} />
      <pointLight position={[roomWidth/2, 3, roomDepth/2]} intensity={0.3} />

      {/* Floor */}
      {floorPlanUrl && hasRooms
        ? <FloorPlanMesh url={floorPlanUrl} width={roomWidth} depth={roomDepth} />
        : <PlainFloor width={roomWidth} depth={roomDepth} />
      }

      {/* Colored room floor tiles */}
      {hasRooms && <RoomFloors rooms={rooms} totalW={roomWidth} totalD={roomDepth} />}

      {/* Walls generated from room boxes */}
      {hasRooms
        ? <RoomWalls rooms={rooms} totalW={roomWidth} totalD={roomDepth} />
        : (
          // Fallback: simple box room
          <group>
            {[
              { pos: [0, WALL_H/2, -roomDepth/2] as [number,number,number], args: [roomWidth+0.2, WALL_H, 0.2] as [number,number,number] },
              { pos: [-roomWidth/2, WALL_H/2, 0] as [number,number,number], args: [0.2, WALL_H, roomDepth+0.2] as [number,number,number] },
              { pos: [roomWidth/2, WALL_H/2, 0] as [number,number,number], args: [0.2, WALL_H, roomDepth+0.2] as [number,number,number] },
            ].map((w, i) => (
              <mesh key={i} position={w.pos} castShadow receiveShadow>
                <boxGeometry args={w.args} />
                <meshStandardMaterial color="#e8e4dc" roughness={0.9} />
              </mesh>
            ))}
          </group>
        )
      }

      {/* Floor grid */}
      <Grid
        position={[0, 0.005, 0]}
        args={[roomWidth, roomDepth]}
        cellSize={0.5} cellThickness={0.3} cellColor="#c8d0ce"
        sectionSize={1} sectionThickness={0.5} sectionColor="#a0aba9"
        fadeDistance={30} fadeStrength={1} infiniteGrid={false}
      />

      {/* Furniture */}
      {furniture.map(item => (
        <FurnitureBox
          key={item.id} item={item}
          isSelected={selectedFurnitureId === item.id}
          onSelect={() => onFurnitureSelect?.(item.id)}
          onMove={pos => onFurnitureMove?.(item.id, pos)}
        />
      ))}

      <OrbitControls
        makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.05}
        minDistance={1} maxDistance={Math.max(roomWidth, roomDepth) * 3}
        enableDamping dampingFactor={0.08}
      />
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function ThreeScene({
  floorPlanUrl, roomWidthCm = 500, roomDepthCm = 400,
  rooms = [], buildingPerimeter, furniture = [],
  onFurnitureMove, onFurnitureSelect, selectedFurnitureId,
}: ThreeSceneProps) {
  const roomWidth = roomWidthCm * CM;
  const roomDepth = roomDepthCm * CM;

  return (
    <div style={{ width: "100%", height: "100%", background: "#1a1f1e" }}>
      <Canvas
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        camera={{ fov: 50, near: 0.1, far: 100 }}
        onClick={e => { if (e.target === e.currentTarget) onFurnitureSelect?.(null); }}
      >
        <Suspense fallback={
          <Html center>
            <div style={{ color: "#c7de7d", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
              Loading 3D scene…
            </div>
          </Html>
        }>
          <Scene
            floorPlanUrl={floorPlanUrl}
            roomWidth={roomWidth} roomDepth={roomDepth}
            rooms={rooms} furniture={furniture}
            onFurnitureMove={onFurnitureMove}
            onFurnitureSelect={onFurnitureSelect}
            selectedFurnitureId={selectedFurnitureId}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
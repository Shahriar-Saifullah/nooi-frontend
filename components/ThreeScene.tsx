"use client";

import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Grid } from "@react-three/drei";
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

export interface Opening {
  type: 'door' | 'window';
  wall: 'horizontal' | 'vertical';
  x: number;
  y: number;
  width: number;
}

interface ThreeSceneProps {
  floorPlanUrl?: string | null;
  roomWidthCm?: number;
  roomDepthCm?: number;
  rooms?: GridRoom[];
  buildingPerimeter?: [number, number][] | null;
  openings?: Opening[];
  furniture?: PlacedFurniture[];
  onFurnitureMove?: (id: string, position: [number, number, number]) => void;
  onFurnitureSelect?: (id: string | null) => void;
  selectedFurnitureId?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CM         = 1 / 100;
const WALL_H     = 2.8;
const WALL_T_EXT = 0.2;
const WALL_T_INT = 0.12;
const SNAP       = 2.0; // % tolerance for exterior detection

// ─── Convert box % to world coords ───────────────────────────────────────────
function boxToWorld(box: RoomBox, totalW: number, totalD: number) {
  const x = (box.left   / 100) * totalW - totalW / 2;
  const z = (box.top    / 100) * totalD - totalD / 2;
  const w = (box.width  / 100) * totalW;
  const d = (box.height / 100) * totalD;
  return { x, z, w, d };
}

// ─── Plain floor ──────────────────────────────────────────────────────────────
function PlainFloor({ width, depth }: { width: number; depth: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color="#f2ede6" roughness={0.95} metalness={0} />
    </mesh>
  );
}

// ─── Colored room floor tiles ─────────────────────────────────────────────────
function RoomFloors({ rooms, totalW, totalD }: {
  rooms: GridRoom[]; totalW: number; totalD: number;
}) {
  return (
    <>
      {rooms.map(room => {
        if (!room.box) return null;
        const { x, z, w, d } = boxToWorld(room.box, totalW, totalD);
        return (
          <group key={room.id}>
            {/* Colored floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x + w/2, 0.002, z + d/2]} receiveShadow>
              <planeGeometry args={[w - 0.02, d - 0.02]} />
              <meshStandardMaterial color={room.color} transparent opacity={0.4} roughness={1} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// ─── Wall generation from room boxes ─────────────────────────────────────────
interface WallSeg {
  x1: number; z1: number;
  x2: number; z2: number;
  isExterior: boolean;
  isFront: boolean; // front face — skip rendering so user can see inside
}

function generateWalls(rooms: GridRoom[], totalW: number, totalD: number): WallSeg[] {
  if (rooms.length === 0) return [];

  const minX = -totalW / 2;
  const maxX =  totalW / 2;
  const minZ = -totalD / 2;
  const maxZ =  totalD / 2;
  const snapW = (SNAP / 100) * totalW;
  const snapD = (SNAP / 100) * totalD;

  const isExterior = (x1: number, z1: number, x2: number, z2: number) => {
    if (Math.abs(z1 - z2) < 0.01) // horizontal
      return Math.abs(z1 - minZ) < snapD || Math.abs(z1 - maxZ) < snapD;
    if (Math.abs(x1 - x2) < 0.01) // vertical
      return Math.abs(x1 - minX) < snapW || Math.abs(x1 - maxX) < snapW;
    return false;
  };

  // The "front" is the max-Z boundary — always skip this so interior is visible
  const isFrontEdge = (z1: number, z2: number) =>
    Math.abs(z1 - maxZ) < snapD && Math.abs(z2 - maxZ) < snapD;

  const segs: WallSeg[] = [];

  rooms.forEach(room => {
    if (!room.box) return;
    const { x, z, w, d } = boxToWorld(room.box, totalW, totalD);
    const x2 = x + w;
    const z2 = z + d;

    const edges: [number, number, number, number][] = [
      [x, z,  x2, z ],  // top
      [x, z2, x2, z2],  // bottom
      [x, z,  x,  z2],  // left
      [x2, z, x2, z2],  // right
    ];

    edges.forEach(([ex1, ez1, ex2, ez2]) => {
      segs.push({
        x1: ex1, z1: ez1, x2: ex2, z2: ez2,
        isExterior: isExterior(ex1, ez1, ex2, ez2),
        isFront: isFrontEdge(ez1, ez2),
      });
    });
  });

  // Deduplicate shared walls
  const unique: WallSeg[] = [];
  segs.forEach(seg => {
    const dup = unique.some(u => {
      const ab = Math.abs(u.x1-seg.x1)<0.05 && Math.abs(u.z1-seg.z1)<0.05
              && Math.abs(u.x2-seg.x2)<0.05 && Math.abs(u.z2-seg.z2)<0.05;
      const ba = Math.abs(u.x1-seg.x2)<0.05 && Math.abs(u.z1-seg.z2)<0.05
              && Math.abs(u.x2-seg.x1)<0.05 && Math.abs(u.z2-seg.z1)<0.05;
      return ab || ba;
    });
    if (!dup) unique.push(seg);
  });

  return unique;
}

function RoomWalls({ rooms, totalW, totalD, openings }: {
  rooms: GridRoom[]; totalW: number; totalD: number;
  openings: Opening[];
}) {
  const walls = generateWalls(rooms, totalW, totalD);
  const segments: React.ReactElement[] = [];

  walls.forEach((seg, i) => {
    if (seg.isFront) return;

    const dx  = seg.x2 - seg.x1;
    const dz  = seg.z2 - seg.z1;
    const len = Math.sqrt(dx*dx + dz*dz);
    if (len < 0.02) return;

    const angle = Math.atan2(dx, dz);
    const t     = seg.isExterior ? WALL_T_EXT : WALL_T_INT;
    const color = seg.isExterior ? "#ccc8c0" : "#e8e4dc";
    const wallH = WALL_H;

    // Find openings that sit on this wall segment
    const wallOpenings = openings.filter(op => {
      const ox = (op.x / 1000) * totalW - totalW / 2;
      const oz = (op.y / 1000) * totalD - totalD / 2;
      // Check if opening center is near this wall line
      const isHoriz = Math.abs(seg.z1 - seg.z2) < 0.05;
      if (isHoriz) {
        // Wall is horizontal — opening must be on same z, x within range
        const minX = Math.min(seg.x1, seg.x2);
        const maxX = Math.max(seg.x1, seg.x2);
        return Math.abs(oz - seg.z1) < 0.3 && ox >= minX - 0.1 && ox <= maxX + 0.1;
      } else {
        // Wall is vertical
        const minZ = Math.min(seg.z1, seg.z2);
        const maxZ = Math.max(seg.z1, seg.z2);
        return Math.abs(ox - seg.x1) < 0.3 && oz >= minZ - 0.1 && oz <= maxZ + 0.1;
      }
    });

    if (wallOpenings.length === 0) {
      // No openings — render full wall
      const cx = (seg.x1 + seg.x2) / 2;
      const cz = (seg.z1 + seg.z2) / 2;
      segments.push(
        <mesh key={`wall-${i}`} position={[cx, wallH/2, cz]} rotation={[0, angle, 0]} castShadow receiveShadow>
          <boxGeometry args={[t, wallH, len + t/2]} />
          <meshStandardMaterial color={color} roughness={0.88} metalness={0} />
        </mesh>
      );
      return;
    }

    // Split wall around each opening
    // Convert openings to positions along the wall (0 = start, len = end)
    const isHoriz = Math.abs(seg.z1 - seg.z2) < 0.05;
    type Cut = { start: number; end: number; type: 'door' | 'window' };
    const cuts: Cut[] = wallOpenings.map(op => {
      const ox = (op.x / 1000) * totalW - totalW / 2;
      const oz = (op.y / 1000) * totalD - totalD / 2;
      const opW = (op.width / 1000) * (isHoriz ? totalW : totalD);
      const pos = isHoriz
        ? Math.sqrt((ox - seg.x1) ** 2)
        : Math.sqrt((oz - seg.z1) ** 2);
      return { start: Math.max(0, pos - opW/2), end: Math.min(len, pos + opW/2), type: op.type };
    }).sort((a, b) => a.start - b.start);

    // Generate wall pieces between cuts
    const pieces: { from: number; to: number }[] = [];
    let cursor = 0;
    cuts.forEach(cut => {
      if (cut.start > cursor + 0.05) pieces.push({ from: cursor, to: cut.start });
      cursor = cut.end;
    });
    if (cursor < len - 0.05) pieces.push({ from: cursor, to: len });

    // Add window sill pieces (partial height) for windows
    cuts.forEach((cut, ci) => {
      if (cut.type === 'window') {
        const pLen = cut.end - cut.start;
        const pCenter = cut.start + pLen / 2;
        const px = seg.x1 + (dx / len) * pCenter;
        const pz = seg.z1 + (dz / len) * pCenter;
        const sillH = 0.9;
        const topH  = 0.5;
        // Sill (bottom)
        segments.push(
          <mesh key={`sill-${i}-${ci}`} position={[px, sillH/2, pz]} rotation={[0, angle, 0]} castShadow receiveShadow>
            <boxGeometry args={[t, sillH, pLen]} />
            <meshStandardMaterial color={color} roughness={0.88} metalness={0} />
          </mesh>
        );
        // Top piece
        segments.push(
          <mesh key={`top-${i}-${ci}`} position={[px, wallH - topH/2, pz]} rotation={[0, angle, 0]} castShadow receiveShadow>
            <boxGeometry args={[t, topH, pLen]} />
            <meshStandardMaterial color={color} roughness={0.88} metalness={0} />
          </mesh>
        );
        // Glass pane
        segments.push(
          <mesh key={`glass-${i}-${ci}`} position={[px, sillH + (wallH - sillH - topH)/2, pz]} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.02, wallH - sillH - topH, pLen]} />
            <meshStandardMaterial color="#a8d8f0" transparent opacity={0.35} roughness={0} metalness={0.1} />
          </mesh>
        );
      }
      // Door: just a gap — optionally add door frame
      if (cut.type === 'door') {
        const pLen = cut.end - cut.start;
        const pCenter = cut.start + pLen / 2;
        const px = seg.x1 + (dx / len) * pCenter;
        const pz = seg.z1 + (dz / len) * pCenter;
        // Door lintel (top of door frame)
        segments.push(
          <mesh key={`lintel-${i}-${ci}`} position={[px, wallH - 0.15, pz]} rotation={[0, angle, 0]} castShadow>
            <boxGeometry args={[t, 0.3, pLen + 0.05]} />
            <meshStandardMaterial color={color} roughness={0.88} />
          </mesh>
        );
      }
    });

    // Full-height wall pieces between openings
    pieces.forEach((piece, pi) => {
      const pLen = piece.to - piece.from;
      if (pLen < 0.05) return;
      const pCenter = piece.from + pLen / 2;
      const px = seg.x1 + (dx / len) * pCenter;
      const pz = seg.z1 + (dz / len) * pCenter;
      segments.push(
        <mesh key={`piece-${i}-${pi}`} position={[px, wallH/2, pz]} rotation={[0, angle, 0]} castShadow receiveShadow>
          <boxGeometry args={[t, wallH, pLen]} />
          <meshStandardMaterial color={color} roughness={0.88} metalness={0} />
        </mesh>
      );
    });
  });

  return <>{segments}</>;
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
    return () => {
      window.removeEventListener("pointermove", onMove_);
      window.removeEventListener("pointerup", onUp);
    };
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
    // Position camera at front-right so the open front face is visible
    camera.position.set(d * 0.7, d * 0.9, d * 1.3);
    camera.lookAt(0, 0, 0);
  }, [width, depth]);
  return null;
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function Scene({
  roomWidth, roomDepth, rooms, openings, furniture,
  onFurnitureMove, onFurnitureSelect, selectedFurnitureId,
}: {
  roomWidth: number; roomDepth: number;
  rooms: GridRoom[];
  openings: Opening[];
  furniture: PlacedFurniture[];
  onFurnitureMove?: (id: string, pos: [number, number, number]) => void;
  onFurnitureSelect?: (id: string | null) => void;
  selectedFurnitureId?: string | null;
}) {
  const hasRooms = rooms.length > 0;

  return (
    <>
      <CameraSetup width={roomWidth} depth={roomDepth} />

      <ambientLight intensity={0.9} />
      <directionalLight
        position={[roomWidth * 0.8, 6, roomDepth * 1.2]}
        intensity={1.3} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-roomWidth} shadow-camera-right={roomWidth}
        shadow-camera-top={roomDepth} shadow-camera-bottom={-roomDepth}
      />
      <pointLight position={[0, 3, 0]} intensity={0.5} />

      {/* Floor — plain, no floor plan image */}
      <PlainFloor width={roomWidth} depth={roomDepth} />

      {/* Colored room tiles */}
      {hasRooms && <RoomFloors rooms={rooms} totalW={roomWidth} totalD={roomDepth} />}

      {/* Walls from room boxes, front face always open */}
      {hasRooms
        ? <RoomWalls rooms={rooms} totalW={roomWidth} totalD={roomDepth} openings={openings} />
        : (
          <group>
            {[
              { p: [0, WALL_H/2, -roomDepth/2] as [number,number,number], a: [roomWidth+0.2, WALL_H, 0.2] as [number,number,number] },
              { p: [-roomWidth/2, WALL_H/2, 0] as [number,number,number], a: [0.2, WALL_H, roomDepth+0.2] as [number,number,number] },
              { p: [roomWidth/2, WALL_H/2, 0] as [number,number,number], a: [0.2, WALL_H, roomDepth+0.2] as [number,number,number] },
            ].map((w, i) => (
              <mesh key={i} position={w.p} castShadow receiveShadow>
                <boxGeometry args={w.a} />
                <meshStandardMaterial color="#ccc8c0" roughness={0.9} />
              </mesh>
            ))}
          </group>
        )
      }

      {/* Floor grid */}
      <Grid
        position={[0, 0.006, 0]}
        args={[roomWidth, roomDepth]}
        cellSize={0.5} cellThickness={0.3} cellColor="#bbb8b0"
        sectionSize={1} sectionThickness={0.6} sectionColor="#a09c94"
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
        makeDefault
        minPolarAngle={0} maxPolarAngle={Math.PI / 2.05}
        minDistance={1} maxDistance={Math.max(roomWidth, roomDepth) * 3}
        enableDamping dampingFactor={0.08}
      />
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function ThreeScene({
  floorPlanUrl, roomWidthCm = 500, roomDepthCm = 400,
  rooms = [], buildingPerimeter, openings = [], furniture = [],
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
            roomWidth={roomWidth} roomDepth={roomDepth}
            rooms={rooms} openings={openings} furniture={furniture}
            onFurnitureMove={onFurnitureMove}
            onFurnitureSelect={onFurnitureSelect}
            selectedFurnitureId={selectedFurnitureId}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
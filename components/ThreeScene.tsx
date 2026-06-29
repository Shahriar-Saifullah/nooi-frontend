"use client";

import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  useTexture,
  Grid,
  Environment,
  Html,
} from "@react-three/drei";
import * as THREE from "three";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlacedFurniture {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number; // Y-axis rotation in radians
  scale: [number, number, number];
  color: string;
  width: number;  // real-world cm
  depth: number;  // real-world cm
  height: number; // real-world cm
}

interface ThreeSceneProps {
  floorPlanUrl?: string | null;
  roomWidthCm?: number;   // real-world width of the floor plan in cm
  roomDepthCm?: number;   // real-world depth of the floor plan in cm
  furniture?: PlacedFurniture[];
  onFurnitureMove?: (id: string, position: [number, number, number]) => void;
  onFurnitureSelect?: (id: string | null) => void;
  selectedFurnitureId?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Scale: 1 Three.js unit = 100 cm. A typical room is 5×4 units (500×400 cm).
const CM_TO_UNIT = 1 / 100;

// ─── Floor Plan Texture ───────────────────────────────────────────────────────

function FloorPlanMesh({
  url,
  width,
  depth,
}: {
  url: string;
  width: number;
  depth: number;
}) {
  const texture = useTexture(url);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={0.85}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

// ─── Plain Floor (when no floor plan image) ───────────────────────────────────

function PlainFloor({ width, depth }: { width: number; depth: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color="#f0ede8" roughness={0.9} metalness={0} />
    </mesh>
  );
}

// ─── Room Walls ───────────────────────────────────────────────────────────────

function RoomWalls({
  width,
  depth,
  wallHeight = 2.8,
}: {
  width: number;
  depth: number;
  wallHeight?: number;
}) {
  const wallMaterial = (
    <meshStandardMaterial color="#f8f6f2" roughness={0.95} metalness={0} side={THREE.BackSide} />
  );

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, wallHeight / 2, -depth / 2]} receiveShadow castShadow>
        <planeGeometry args={[width, wallHeight]} />
        <meshStandardMaterial color="#f8f6f2" roughness={0.95} metalness={0} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-width / 2, wallHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow>
        <planeGeometry args={[depth, wallHeight]} />
        <meshStandardMaterial color="#f0ede8" roughness={0.95} metalness={0} />
      </mesh>
      {/* Right wall */}
      <mesh position={[width / 2, wallHeight / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow castShadow>
        <planeGeometry args={[depth, wallHeight]} />
        <meshStandardMaterial color="#f0ede8" roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
}

// ─── Furniture Box (placeholder until real GLTF models are added) ─────────────

function FurnitureBox({
  item,
  isSelected,
  onSelect,
  onMove,
}: {
  item: PlacedFurniture;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (pos: [number, number, number]) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());

  const w = item.width * CM_TO_UNIT;
  const h = item.height * CM_TO_UNIT;
  const d = item.depth * CM_TO_UNIT;

  const handlePointerDown = (e: any) => {
    if (!isSelected) { onSelect(); return; }
    e.stopPropagation();
    isDragging.current = true;
    gl.domElement.style.cursor = "grabbing";

    // Calculate offset between click point and object center
    const intersection = new THREE.Vector3();
    dragPlane.current.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(...item.position)
    );
    raycaster.current.setFromCamera(
      new THREE.Vector2(
        (e.clientX / gl.domElement.clientWidth) * 2 - 1,
        -(e.clientY / gl.domElement.clientHeight) * 2 + 1
      ),
      camera
    );
    raycaster.current.ray.intersectPlane(dragPlane.current, intersection);
    dragOffset.current.subVectors(new THREE.Vector3(...item.position), intersection);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    gl.domElement.style.cursor = "default";
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current || !meshRef.current) return;
      const intersection = new THREE.Vector3();
      raycaster.current.setFromCamera(
        new THREE.Vector2(
          (e.clientX / gl.domElement.clientWidth) * 2 - 1,
          -(e.clientY / gl.domElement.clientHeight) * 2 + 1
        ),
        camera
      );
      if (raycaster.current.ray.intersectPlane(dragPlane.current, intersection)) {
        const newPos: [number, number, number] = [
          intersection.x + dragOffset.current.x,
          item.position[1],
          intersection.z + dragOffset.current.z,
        ];
        onMove(newPos);
      }
    };
    const onPointerUp = () => handlePointerUp();
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isSelected, item.position]);

  return (
    <group position={item.position} rotation={[0, item.rotation, 0]}>
      <mesh
        ref={meshRef}
        position={[0, h / 2, 0]}
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={item.color}
          roughness={0.7}
          metalness={0.1}
          emissive={isSelected ? new THREE.Color(item.color) : new THREE.Color(0x000000)}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* Selection outline */}
      {isSelected && (
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w + 0.02, h + 0.02, d + 0.02]} />
          <meshBasicMaterial color="#004643" wireframe />
        </mesh>
      )}

      {/* Label */}
      <Html position={[0, h + 0.15, 0]} center distanceFactor={6}>
        <div
          style={{
            background: isSelected ? "#004643" : "rgba(255,255,255,0.9)",
            color: isSelected ? "white" : "#111",
            padding: "2px 8px",
            borderRadius: 20,
            fontSize: 11,
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            cursor: isSelected ? "grab" : "pointer",
            userSelect: "none",
          }}
        >
          {item.name}
        </div>
      </Html>
    </group>
  );
}

// ─── Camera Setup ─────────────────────────────────────────────────────────────

function CameraSetup({ width, depth }: { width: number; depth: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const maxDim = Math.max(width, depth);
    camera.position.set(maxDim * 0.8, maxDim * 0.9, maxDim * 1.1);
    camera.lookAt(0, 0, 0);
  }, [width, depth]);
  return null;
}

// ─── Loading Fallback ─────────────────────────────────────────────────────────

function LoadingFallback() {
  return (
    <Html center>
      <div style={{ color: "#004643", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500 }}>
        Loading 3D scene…
      </div>
    </Html>
  );
}

// ─── Main Scene ───────────────────────────────────────────────────────────────

function Scene({
  floorPlanUrl,
  roomWidth,
  roomDepth,
  furniture,
  onFurnitureMove,
  onFurnitureSelect,
  selectedFurnitureId,
}: {
  floorPlanUrl?: string | null;
  roomWidth: number;
  roomDepth: number;
  furniture: PlacedFurniture[];
  onFurnitureMove?: (id: string, position: [number, number, number]) => void;
  onFurnitureSelect?: (id: string | null) => void;
  selectedFurnitureId?: string | null;
}) {
  return (
    <>
      <CameraSetup width={roomWidth} depth={roomDepth} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[roomWidth, 4, roomDepth]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-roomWidth}
        shadow-camera-right={roomWidth}
        shadow-camera-top={roomDepth}
        shadow-camera-bottom={-roomDepth}
      />
      <pointLight position={[-roomWidth / 2, 3, -roomDepth / 2]} intensity={0.4} />

      {/* Floor */}
      {floorPlanUrl ? (
        <FloorPlanMesh url={floorPlanUrl} width={roomWidth} depth={roomDepth} />
      ) : (
        <PlainFloor width={roomWidth} depth={roomDepth} />
      )}

      {/* Walls */}
      <RoomWalls width={roomWidth} depth={roomDepth} />

      {/* Grid overlay on floor */}
      <Grid
        position={[0, 0.002, 0]}
        args={[roomWidth, roomDepth]}
        cellSize={0.5}
        cellThickness={0.3}
        cellColor="#c8d0ce"
        sectionSize={1}
        sectionThickness={0.5}
        sectionColor="#a0aba9"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Furniture */}
      {furniture.map((item) => (
        <FurnitureBox
          key={item.id}
          item={item}
          isSelected={selectedFurnitureId === item.id}
          onSelect={() => onFurnitureSelect?.(item.id)}
          onMove={(pos) => onFurnitureMove?.(item.id, pos)}
        />
      ))}

      {/* Controls */}
      <OrbitControls
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={1}
        maxDistance={Math.max(roomWidth, roomDepth) * 2.5}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

// ─── Exported Component ───────────────────────────────────────────────────────

export default function ThreeScene({
  floorPlanUrl,
  roomWidthCm = 500,
  roomDepthCm = 400,
  furniture = [],
  onFurnitureMove,
  onFurnitureSelect,
  selectedFurnitureId,
}: ThreeSceneProps) {
  const roomWidth = roomWidthCm * CM_TO_UNIT;
  const roomDepth = roomDepthCm * CM_TO_UNIT;

  return (
    <div style={{ width: "100%", height: "100%", background: "#1a1f1e" }}>
      <Canvas
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        camera={{ fov: 50, near: 0.1, far: 100 }}
        onClick={(e) => {
          // Deselect when clicking empty space
          if (e.target === e.currentTarget) onFurnitureSelect?.(null);
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene
            floorPlanUrl={floorPlanUrl}
            roomWidth={roomWidth}
            roomDepth={roomDepth}
            furniture={furniture}
            onFurnitureMove={onFurnitureMove}
            onFurnitureSelect={onFurnitureSelect}
            selectedFurnitureId={selectedFurnitureId}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
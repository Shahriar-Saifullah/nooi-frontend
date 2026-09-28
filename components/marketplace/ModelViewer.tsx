"use client";

/**
 * ModelViewer — the 3D tab on a product detail page
 * ----------------------------------------------------------------------------
 * Renders the catalog GLB that a product maps to, so "3D ready" means something
 * a shopper can actually look at.
 *
 * Deliberately isolated from ThreeSceneV2. That component carries the whole
 * room — walls, openings, snapping, walk controls — and none of it applies to a
 * single object on a turntable. Sharing it would couple the shop to the canvas
 * renderer for no benefit.
 *
 * Import this with next/dynamic and { ssr: false }. Three.js touches `window`
 * on module load, and the GLB is several megabytes that should only be fetched
 * when the shopper opens the tab.
 */

import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Stage, Html } from "@react-three/drei";
import * as THREE from "three";

interface Props {
  /** Public path from CatalogItem.path, e.g. "/models/sofa_3seat.glb" */
  modelPath: string;
  /** Real-world size in cm, used to normalise wildly different model scales. */
  size?: { w: number; d: number; h: number };
  /** Turntable while the shopper hasn't touched it yet. */
  autoRotate?: boolean;
}

function Model({ modelPath, size }: { modelPath: string; size?: Props["size"] }) {
  const { scene } = useGLTF(modelPath);
  const ref = useRef<THREE.Group>(null);

  // Catalog GLBs are authored at wildly different scales — some in metres,
  // some in centimetres, some arbitrary. The canvas normalises by measuring the
  // bounding box and scaling to the catalog `size`; do the same here so a lamp
  // and a sectional both frame sensibly.
  const cloned = React.useMemo(() => {
    const copy = scene.clone(true);
    if (!size) return copy;

    const box = new THREE.Box3().setFromObject(copy);
    const dims = new THREE.Vector3();
    box.getSize(dims);

    const target = Math.max(size.w, size.d, size.h) / 100; // cm → m
    const current = Math.max(dims.x, dims.y, dims.z);
    if (current > 0) {
      const k = target / current;
      copy.scale.setScalar(k);
    }

    // Recentre on the origin so orbiting doesn't swing around empty space.
    const centred = new THREE.Box3().setFromObject(copy);
    const centre = new THREE.Vector3();
    centred.getCenter(centre);
    copy.position.sub(centre);

    return copy;
  }, [scene, size]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.15;
  });

  return <group ref={ref}><primitive object={cloned} /></group>;
}

function Fallback() {
  return (
    <Html center>
      <span className="text-[11.5px] text-[#8E9493]">Loading model…</span>
    </Html>
  );
}

export default function ModelViewer({ modelPath, size }: Props) {
  return (
    <Canvas
      camera={{ position: [1.8, 1.2, 1.8], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: false }}
      style={{ background: "#F1F4F4" }}
    >
      <Suspense fallback={<Fallback />}>
        <Stage intensity={0.4} environment="city" adjustCamera={1.1} shadows="contact">
          <Model modelPath={modelPath} size={size} />
        </Stage>
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={0.8}
        maxDistance={6}
        // Stop below the floor — an upside-down sofa is not a feature.
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
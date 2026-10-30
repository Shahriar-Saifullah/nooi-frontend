"use client";

/**
 * FurnitureGizmo — move / rotate handles for the selected piece (3D view)
 * ----------------------------------------------------------------------------
 *   blue ring        drag around it to rotate by any angle; clicks onto
 *                    0/45/90… within 3° (hold Shift to turn that off)
 *   orange arrows    slide along the piece's width
 *   green arrows     slide along the piece's depth
 *
 * The piece itself can still be dragged freely, as before. Every step goes
 * through the same rules as dragging: never into a wall (a turn that would
 * hit one nudges the piece clear, or is refused if there's no room), and
 * clear of other furniture.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { type Footprint, type WorldWall, resolveCollision, settleClearOfWalls } from "@/lib/placement/snap";
import { angleAround, itemAxis, rotationFromDrag, slideAlong, toDeg } from "@/lib/placement/gizmo";

const RING = "#3B82F6";
const X_COL = "#E7A43A";
const Z_COL = "#3FB68B";

// Page-level side effects, kept out of the component body.
const setCursor = (c: string) => { document.body.style.cursor = c; };
const setFurnitureDrag = (on: boolean) => {
  (window as unknown as { __nooiFurnitureDrag?: boolean }).__nooiFurnitureDrag = on;
};
const inWalkMode = () => Boolean((window as unknown as { __nooiWalkMode?: boolean }).__nooiWalkMode);
/** Orbit controls off while a handle is dragged, back on after (not in walk mode). */
const setOrbit = (controls: { enabled: boolean } | null, on: boolean) => {
  if (controls && (!on || !inWalkMode())) controls.enabled = on;
};

type Drag =
  | { mode: "rotate"; startRot: number; startAngle: number }
  | { mode: "slide"; axis: "x" | "z"; dir: [number, number]; from: [number, number]; start: [number, number] };

/** A flat arrow on the floor pointing along +X, base at the origin. */
function useArrowGeometry(len: number, width: number) {
  return useMemo(() => {
    const head = width * 1.9, shaft = width * 0.55, headLen = Math.min(len * 0.45, width * 1.6);
    const s = new THREE.Shape();
    s.moveTo(0, -shaft / 2);
    s.lineTo(len - headLen, -shaft / 2);
    s.lineTo(len - headLen, -head / 2);
    s.lineTo(len, 0);
    s.lineTo(len - headLen, head / 2);
    s.lineTo(len - headLen, shaft / 2);
    s.lineTo(0, shaft / 2);
    s.closePath();
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2); // lie flat; the shape's +Y becomes −Z
    return g;
  }, [len, width]);
}

export default function FurnitureGizmo({
  id, position, rotation, w, d, walls, others, onMove, onRotate,
}: {
  id: string;
  position: [number, number, number];
  rotation: number;
  /** drawn size in metres */
  w: number; d: number;
  walls: WorldWall[];
  /** other floor furniture, to stay clear of */
  others: Footprint[];
  onMove?: (id: string, position: [number, number, number]) => void;
  onRotate?: (id: string, rotation: number) => void;
}) {
  const { camera, gl, controls } = useThree() as unknown as {
    camera: THREE.Camera; gl: THREE.WebGLRenderer; controls: { enabled: boolean } | null;
  };
  const drag = useRef<Drag | null>(null);
  const [active, setActive] = useState<Drag["mode"] | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  // keep the latest values for the window listeners
  const live = useRef({ position, rotation, w, d, walls, others, onMove, onRotate, id });
  useEffect(() => {
    live.current = { position, rotation, w, d, walls, others, onMove, onRotate, id };
  });
  const controlsRef = useRef(controls);
  useEffect(() => { controlsRef.current = controls; }, [controls]);

  const radius = Math.max(w, d) / 2 + 0.28;
  const arrowLen = 0.34, arrowW = 0.07;
  const arrow = useArrowGeometry(arrowLen, arrowW);
  const hitArrow = useArrowGeometry(arrowLen + 0.06, arrowW * 2.6);  // easier to grab

  const floorPoint = useMemo(() => {
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    return (ev: PointerEvent): [number, number] | null => {
      const r = gl.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -(((ev.clientY - r.top) / r.height) * 2 - 1)), camera);
      return ray.ray.intersectPlane(plane, hit) ? [hit.x, hit.z] : null;
    };
  }, [camera, gl]);

  useEffect(() => {
    const move = (ev: PointerEvent) => {
      const g = drag.current;
      if (!g) return;
      const p = floorPoint(ev);
      if (!p) return;
      const L = live.current;
      const [cx, , cz] = L.position;
      if (g.mode === "rotate") {
        const r = rotationFromDrag(g.startRot, g.startAngle, angleAround(cx, cz, p[0], p[1]), !ev.shiftKey);
        // turning against a wall steps the piece clear; no room → no turn
        const clear = settleClearOfWalls({ x: cx, z: cz, w: L.w, d: L.d, rotation: r, id: L.id }, L.walls);
        if (!clear) return;
        if (Math.abs(clear.x - cx) > 1e-4 || Math.abs(clear.z - cz) > 1e-4) L.onMove?.(L.id, [clear.x, L.position[1], clear.z]);
        L.onRotate?.(L.id, r);
      } else {
        const [nx, nz] = slideAlong(g.start, g.dir, g.from, p);
        const solved = resolveCollision({ x: nx, z: nz, w: L.w, d: L.d, rotation: L.rotation, id: L.id }, L.others);
        const clear = settleClearOfWalls(solved, L.walls);
        if (!clear) return;
        L.onMove?.(L.id, [clear.x, L.position[1], clear.z]);
      }
    };
    const up = () => {
      if (!drag.current) return;
      drag.current = null;
      setActive(null);
      setFurnitureDrag(false);
      setOrbit(controlsRef.current, true);
      setCursor("");
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [floorPoint]);

  const begin = (e: { stopPropagation: () => void; nativeEvent: PointerEvent }, g: Drag) => {
    e.stopPropagation();
    drag.current = g;
    setActive(g.mode);
    setFurnitureDrag(true);
    setOrbit(controlsRef.current, false);
    setCursor(g.mode === "rotate" ? "grabbing" : "move");
  };

  const startRotate = (e: { stopPropagation: () => void; nativeEvent: PointerEvent }) => {
    const p = floorPoint(e.nativeEvent);
    if (!p) return;
    begin(e, { mode: "rotate", startRot: rotation, startAngle: angleAround(position[0], position[2], p[0], p[1]) });
  };

  const startSlide = (axis: "x" | "z") => (e: { stopPropagation: () => void; nativeEvent: PointerEvent }) => {
    const p = floorPoint(e.nativeEvent);
    if (!p) return;
    begin(e, { mode: "slide", axis, dir: itemAxis(rotation, axis), from: p, start: [position[0], position[2]] });
  };

  const hoverOn = (key: string, cursor: string) => () => { setHover(key); if (!drag.current) setCursor(cursor); };
  // a click on a handle must not fall through to the floor (which deselects)
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const hoverOff = () => { setHover(null); if (!drag.current) setCursor(""); };

  // always drawn on top, never casts shadows, never part of the model
  const mat = (color: string, opacity: number) => (
    <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
  );
  const arrows: { key: string; axis: "x" | "z"; angle: number; offset: number; color: string }[] = [
    { key: "x+", axis: "x", angle: 0, offset: w / 2 + 0.12, color: X_COL },
    { key: "x-", axis: "x", angle: Math.PI, offset: w / 2 + 0.12, color: X_COL },
    { key: "z+", axis: "z", angle: -Math.PI / 2, offset: d / 2 + 0.12, color: Z_COL },
    { key: "z-", axis: "z", angle: Math.PI / 2, offset: d / 2 + 0.12, color: Z_COL },
  ];

  return (
    <group position={[position[0], 0.02, position[2]]}>
    <group rotation={[0, rotation, 0]}>
      {/* rotation ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1000} name="nooi-ui" raycast={() => null}>
        <ringGeometry args={[radius - 0.025, radius + 0.025, 96]} />
        {mat(RING, active === "rotate" || hover === "ring" ? 0.95 : 0.7)}
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} name="nooi-ui"
        onPointerDown={startRotate} onClick={stop} onPointerOver={hoverOn("ring", "grab")} onPointerOut={hoverOff}>
        <ringGeometry args={[radius - 0.11, radius + 0.11, 64]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* slide arrows along the piece's own axes */}
      {arrows.map(a => (
        <group key={a.key} rotation={[0, a.angle, 0]}>
          <mesh position={[a.offset, 0, 0]} geometry={arrow} renderOrder={1001} name="nooi-ui" raycast={() => null}>
            {mat(a.color, active === "slide" || hover === a.key ? 0.95 : 0.75)}
          </mesh>
          <mesh position={[a.offset - 0.03, 0, 0]} geometry={hitArrow} name="nooi-ui"
            onPointerDown={startSlide(a.axis)} onClick={stop} onPointerOver={hoverOn(a.key, "move")} onPointerOut={hoverOff}>
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}

    </group>
      {active === "rotate" && (
        <Html position={[0, 0, radius + 0.3]} center style={{ pointerEvents: "none" }}>
          <div style={{ background: "rgba(16,18,18,0.85)", color: "#fff", fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
            {toDeg(rotation)}°
          </div>
        </Html>
      )}
    </group>
  );
}

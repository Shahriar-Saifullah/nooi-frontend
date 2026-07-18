"use client";

/**
 * WalkthroughCamera
 * ─────────────────
 * A React Three Fiber component that animates the camera along a
 * CatmullRomCurve3 built from room polygon centroids.
 *
 * Design decisions (per user spec):
 *  • Rooms are sorted by nearest-neighbour proximity so the camera
 *    takes the shortest natural tour rather than teleporting.
 *  • When `paused`, the camera stops and OrbitControls (enabled by the
 *    parent) lets the user look around freely.
 *  • When `active` becomes false the camera is returned to the original
 *    dollhouse angle so the scene looks exactly as before.
 */

import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PolyRoom } from "@/components/ThreeSceneV2";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Camera eye-level height in metres */
const EYE_LEVEL = 1.6;

/** Seconds to complete one full loop of all rooms */
const LOOP_DURATION = 40;

/**
 * Fractional look-ahead: the camera looks at a point this far ahead on the
 * curve, giving a natural forward-facing view as it moves.
 */
const LOOK_AHEAD = 0.018;

// ─── Path helpers ─────────────────────────────────────────────────────────────

/** Compute world-space centroid for a room's polygon or bounding box. */
function roomCentroid(
  room: PolyRoom,
  totalW: number,
  totalD: number,
): THREE.Vector3 | null {
  if (room.polygon && room.polygon.length >= 3) {
    const n = room.polygon.length;
    const sumX = room.polygon.reduce((s, [x]) => s + x, 0) / n;
    const sumY = room.polygon.reduce((s, [, y]) => s + y, 0) / n;
    return new THREE.Vector3(
      (sumX / 100) * totalW - totalW / 2,
      EYE_LEVEL,
      (sumY / 100) * totalD - totalD / 2,
    );
  }
  if (room.box) {
    return new THREE.Vector3(
      ((room.box.left + room.box.width / 2) / 100) * totalW - totalW / 2,
      EYE_LEVEL,
      ((room.box.top + room.box.height / 2) / 100) * totalD - totalD / 2,
    );
  }
  return null;
}

/**
 * Reorder `points` using nearest-neighbour starting from `points[0]`
 * to minimize total travel distance and avoid teleporting jumps.
 */
function sortByProximity(points: THREE.Vector3[]): THREE.Vector3[] {
  if (points.length <= 1) return [...points];

  const result: THREE.Vector3[] = [points[0]];
  const remaining = [...points.slice(1)];

  while (remaining.length > 0) {
    const last = result[result.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = last.distanceTo(p);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    result.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return result;
}

/** Build a closed CatmullRomCurve3 from all rooms with valid geometry. */
function buildPath(
  rooms: PolyRoom[],
  totalW: number,
  totalD: number,
): THREE.CatmullRomCurve3 | null {
  const centroids = rooms
    .map((r) => roomCentroid(r, totalW, totalD))
    .filter((v): v is THREE.Vector3 => v !== null);

  if (centroids.length < 2) return null;

  const sorted = sortByProximity(centroids);
  // closed=true so the camera loops; catmullrom tension=0.5 gives smooth curves
  return new THREE.CatmullRomCurve3(sorted, true, "catmullrom", 0.5);
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface WalkthroughCameraProps {
  rooms: PolyRoom[];
  /** World width in metres (roomWidthCm / 100) */
  totalW: number;
  /** World depth in metres (roomDepthCm / 100) */
  totalD: number;
  /** True when the user has started the walkthrough */
  active: boolean;
  /** True when the user has paused — camera freezes; OrbitControls enabled */
  paused: boolean;
  /** Called every frame with the current loop progress (0–1) */
  onProgress?: (progress: number) => void;
}

export default function WalkthroughCamera({
  rooms,
  totalW,
  totalD,
  active,
  paused,
  onProgress,
}: WalkthroughCameraProps) {
  const { camera } = useThree();

  // ── normalised time along the path (0 … 1, wraps) ──
  const elapsedRef = useRef(0);

  // ── pre-built path, rebuilt when room layout changes ──
  const path = useMemo(
    () => buildPath(rooms, totalW, totalD),
    [rooms, totalW, totalD],
  );

  // ── dollhouse camera state: saved on first activation, restored on stop ──
  const dollyPos = useMemo(
    () =>
      new THREE.Vector3(
        totalW * 0.55,
        Math.max(totalW, totalD) * 0.85,
        totalD * 0.95,
      ),
    [totalW, totalD],
  );

  // When walkthrough becomes inactive: reset elapsed + restore dollhouse view
  useEffect(() => {
    if (!active) {
      elapsedRef.current = 0;
      // Restore the same camera position Canvas sets initially
      camera.position.copy(dollyPos);
      camera.lookAt(new THREE.Vector3(0, 0, 0));
    }
  }, [active, camera, dollyPos]);

  // ── per-frame animation ──────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!active || paused || !path) return;

    // Advance elapsed time
    elapsedRef.current = (elapsedRef.current + delta / LOOP_DURATION) % 1;
    const t = elapsedRef.current;
    const tAhead = (t + LOOK_AHEAD) % 1;

    const pos = path.getPointAt(t);
    const lookTarget = path.getPointAt(tAhead);

    camera.position.copy(pos);
    camera.lookAt(lookTarget);

    onProgress?.(t);
  });

  // This component only drives the camera — no mesh output
  return null;
}

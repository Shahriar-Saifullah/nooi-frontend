"use client";

/**
 * WalkthroughCamera
 * ─────────────────
 * A React Three Fiber component that animates the camera inside the 3D model
 * from a human perspective (1.6m eye level).
 *
 * Flow per user specification:
 *  1. Identifies the Entrance room (or closest exterior room) and starts at the entrance.
 *  2. Traverses all rooms in logical spatial order (nearest-neighbour proximity).
 *  3. Moves inside each room at human height (1.6m).
 *  4. Performs a full 360-degree panoramic view inside each room.
 *  5. Continues sequentially until every room in the 3D model has been captured.
 */

import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PolyRoom } from "@/components/ThreeSceneV2";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Camera eye-level height in metres */
const EYE_LEVEL = 1.6;

/** Duration (in seconds) to transition/move into a room */
const MOVE_DURATION = 3.0;

/** Duration (in seconds) to execute a full 360-degree pan inside a room */
const PAN_360_DURATION = 6.5;

/** Extra initial entrance approach duration (seconds) */
const ENTRANCE_APPROACH_DURATION = 3.0;

/** Default canvas FOV vs Inside perspective FOV */
const DEFAULT_FOV = 40;
const INSIDE_FOV = 65;

// ─── Types & Helpers ──────────────────────────────────────────────────────────

export interface RoomTourItem {
  room: PolyRoom;
  centroid: THREE.Vector3;
  name: string;
}

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

/** Find index of the entrance/foyer room or fallback to front-most room */
function findEntranceIndex(items: RoomTourItem[]): number {
  if (items.length === 0) return 0;

  const entranceRegex = /entrance|entry|foyer|porch|front|hall/i;
  const idxByName = items.findIndex((r) => entranceRegex.test(r.name));
  if (idxByName !== -1) return idxByName;

  const livingRegex = /living|reception|lounge/i;
  const idxByLiving = items.findIndex((r) => livingRegex.test(r.name));
  if (idxByLiving !== -1) return idxByLiving;

  // Fallback: room with maximum Z (closest to bottom/front of plan)
  let bestIdx = 0;
  let maxZ = -Infinity;
  items.forEach((r, i) => {
    if (r.centroid.z > maxZ) {
      maxZ = r.centroid.z;
      bestIdx = i;
    }
  });
  return bestIdx;
}

/** Order rooms starting from Entrance, then nearest-neighbour spatial traversal */
function orderRoomsForTour(
  rooms: PolyRoom[],
  totalW: number,
  totalD: number,
): RoomTourItem[] {
  const tourItems: RoomTourItem[] = rooms
    .map((r, i) => {
      const c = roomCentroid(r, totalW, totalD);
      return c ? { room: r, centroid: c, name: r.name || `Room ${i + 1}` } : null;
    })
    .filter((v): v is RoomTourItem => v !== null);

  if (tourItems.length <= 1) return tourItems;

  const startIdx = findEntranceIndex(tourItems);
  const result: RoomTourItem[] = [tourItems[startIdx]];
  const remaining = tourItems.filter((_, idx) => idx !== startIdx);

  while (remaining.length > 0) {
    const last = result[result.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((item, i) => {
      const d = last.centroid.distanceTo(item.centroid);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    result.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return result;
}

/** Smoothstep cubic easing for camera motion */
function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface WalkthroughProgressInfo {
  progress: number; // 0 to 1
  roomName: string;
  roomIndex: number;
  totalRooms: number;
  phase: "entrance" | "moving" | "360_view";
  statusText: string;
}

export interface WalkthroughCameraProps {
  rooms: PolyRoom[];
  totalW: number;
  totalD: number;
  active: boolean;
  paused: boolean;
  onProgress?: (progress: number, info?: WalkthroughProgressInfo) => void;
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

  const elapsedRef = useRef(0);

  // Pre-build room sequence for the tour
  const tour = useMemo(
    () => orderRoomsForTour(rooms, totalW, totalD),
    [rooms, totalW, totalD],
  );

  // Calculate entrance approach start point (slightly outside entrance room)
  const entranceStartPos = useMemo(() => {
    if (tour.length === 0) return new THREE.Vector3(0, EYE_LEVEL, totalD * 0.45);
    const firstCentroid = tour[0].centroid.clone();
    // Offset outward toward front boundary
    const dir = new THREE.Vector3(0, 0, 1.8);
    return firstCentroid.clone().add(dir);
  }, [tour, totalD]);

  // Total duration of the walkthrough video sequence
  const totalDuration = useMemo(() => {
    if (tour.length === 0) return 30;
    return ENTRANCE_APPROACH_DURATION + tour.length * (MOVE_DURATION + PAN_360_DURATION);
  }, [tour]);

  // Save dollhouse camera position to restore when walkthrough stops
  const dollyPos = useMemo(
    () =>
      new THREE.Vector3(
        totalW * 0.55,
        Math.max(totalW, totalD) * 0.85,
        totalD * 0.95,
      ),
    [totalW, totalD],
  );

  // Restore camera position & FOV when walkthrough stops
  useEffect(() => {
    if (!active) {
      elapsedRef.current = 0;
      camera.position.copy(dollyPos);
      camera.lookAt(new THREE.Vector3(0, 0, 0));
      if ("fov" in camera) {
        (camera as THREE.PerspectiveCamera).fov = DEFAULT_FOV;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
    } else {
      if ("fov" in camera) {
        (camera as THREE.PerspectiveCamera).fov = INSIDE_FOV;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
    }
  }, [active, camera, dollyPos]);

  // Per-frame camera animation loop
  useFrame((_, delta) => {
    if (!active || paused || tour.length === 0) return;

    // Advance time (wraps smoothly if user lets it run continuously)
    elapsedRef.current = (elapsedRef.current + delta) % totalDuration;
    const time = elapsedRef.current;
    const progress = time / totalDuration;

    let currentPos = new THREE.Vector3();
    let lookTarget = new THREE.Vector3();
    let activeRoomName = tour[0].name;
    let activeRoomIdx = 0;
    let currentPhase: "entrance" | "moving" | "360_view" = "entrance";
    let statusText = "";

    if (time < ENTRANCE_APPROACH_DURATION) {
      // ── Phase 0: Entrance Approach ──
      const u = time / ENTRANCE_APPROACH_DURATION;
      const easeU = smoothstep(u);

      currentPos.lerpVectors(entranceStartPos, tour[0].centroid, easeU);
      lookTarget.copy(tour[0].centroid);
      activeRoomName = tour[0].name;
      activeRoomIdx = 0;
      currentPhase = "entrance";
      statusText = `Approaching Entrance (${activeRoomName})`;
    } else {
      // ── Room-by-Room Progression ──
      const tourTime = time - ENTRANCE_APPROACH_DURATION;
      const roomCycleDuration = MOVE_DURATION + PAN_360_DURATION;
      const rawRoomIdx = Math.floor(tourTime / roomCycleDuration);
      const roomIdx = Math.min(rawRoomIdx, tour.length - 1);
      const roomTime = tourTime - roomIdx * roomCycleDuration;

      const currentRoom = tour[roomIdx];
      const prevCentroid =
        roomIdx === 0 ? entranceStartPos : tour[roomIdx - 1].centroid;
      activeRoomName = currentRoom.name;
      activeRoomIdx = roomIdx;

      if (roomTime < MOVE_DURATION) {
        // ── Phase 1: Move / Enter Room ──
        currentPhase = "moving";
        const u = roomTime / MOVE_DURATION;
        const easeU = smoothstep(u);

        currentPos.lerpVectors(prevCentroid, currentRoom.centroid, easeU);

        // Look toward room center during entry
        const fwd = currentRoom.centroid.clone().sub(prevCentroid);
        if (fwd.lengthSq() < 0.001) fwd.set(0, 0, -1);
        fwd.y = 0;
        fwd.normalize();
        lookTarget.copy(currentPos).add(fwd);

        statusText = `Entering Room ${roomIdx + 1}/${tour.length}: ${currentRoom.name}`;
      } else {
        // ── Phase 2: 360-Degree Panoramic View inside Room ──
        currentPhase = "360_view";
        const panTime = roomTime - MOVE_DURATION;
        const u = panTime / PAN_360_DURATION;
        const easeU = smoothstep(u);

        // Position fixed at room centroid at eye level
        currentPos.copy(currentRoom.centroid);

        // Initial entry angle
        const initialFwd = currentRoom.centroid.clone().sub(prevCentroid);
        if (initialFwd.lengthSq() < 0.001) initialFwd.set(0, 0, -1);
        initialFwd.y = 0;
        initialFwd.normalize();
        const baseYaw = Math.atan2(initialFwd.x, initialFwd.z);

        // Rotate yaw through full 360 degrees (2 * PI)
        const yaw = baseYaw + easeU * Math.PI * 2;
        const lookDir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        lookTarget.copy(currentPos).add(lookDir);

        statusText = `Room ${roomIdx + 1}/${tour.length}: ${currentRoom.name} (360° View)`;
      }
    }

    // Apply computed position & rotation to camera
    camera.position.copy(currentPos);
    camera.lookAt(lookTarget);

    // Report progress & details to HUD / Recorder
    onProgress?.(progress, {
      progress,
      roomName: activeRoomName,
      roomIndex: activeRoomIdx + 1,
      totalRooms: tour.length,
      phase: currentPhase,
      statusText,
    });
  });

  return null;
}


"use client";

/**
 * Kitchen in the 3D scene — components/KitchenLayer.tsx
 * ============================================================================
 * Draws every cabinet run (lib/kitchen/build) on its wall, and in kitchen
 * editing mode handles the pointer:
 *
 *   add mode   pick a unit in the panel, then click a wall: a ghost shows
 *              where it would go (green fits, red doesn't)
 *   otherwise  click a unit to select it (outlined in green)
 *
 * Walls are found by casting the pointer ray against plain boxes, as the
 * doors & windows editor does, so cut-away walls and furniture don't get in
 * the way. Everything editor-only is named "nooi-ui" (hidden in captures).
 */

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { buildRun } from "@/lib/kitchen/build";
import {
  addModuleAt, runFrame, runWallIndex, upperVisible, windowSpans, moduleSpans,
  BASE_DEPTH, COUNTER_TOP, MODULES, TALL_TOP, type KitchenData, type KitchenRun, type ModuleKind,
} from "@/lib/kitchen/model";
import { wallLine, type PlanOpening, type PlanWallLike } from "@/lib/walls/openings";

export interface KitchenSelection { runId: string; index: number }

export interface KitchenSceneProps {
  data: KitchenData;
  /** kitchen editing mode is on: clicks select units / add them */
  editing: boolean;
  addKind: ModuleKind | null;
  selected: KitchenSelection | null;
  onSelect: (s: KitchenSelection | null) => void;
  onAddAt: (wallIndex: number, side: 1 | -1, along: number) => void;
}

// Built runs, by everything that shapes them; a run is rebuilt only when its
// units, the style or its uppers change. Old builds are dropped (and their
// geometry freed) once the cache is full.
const runCache = new Map<string, THREE.Group>();
function builtRun(run: KitchenRun, style: KitchenData["style"], showUpper: boolean[]): THREE.Group {
  const key = JSON.stringify([run.id, run.modules, style, showUpper]);
  let g = runCache.get(key);
  if (!g) {
    g = buildRun(run, style, showUpper);
    runCache.set(key, g);
    if (runCache.size > 48) {
      const [oldKey, old] = runCache.entries().next().value as [string, THREE.Group];
      runCache.delete(oldKey);
      if (!old.parent) old.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
    }
  }
  return g;
}

function RunMesh({ run, data, walls, size, openings }: {
  run: KitchenRun; data: KitchenData; walls: (PlanWallLike & { id?: string })[];
  size: { totalW: number; totalD: number }; openings: PlanOpening[];
}) {
  const wi = runWallIndex(run, walls);
  if (wi < 0) return null;
  const frame = runFrame(wallLine(walls[wi], wi, size), run.side);
  const wins = windowSpans(walls, size, openings, wi);
  const group = builtRun(run, data.style, upperVisible(run, frame, wins));
  const [x, z] = frame.at(run.start, 0);
  return (
    <group position={[x, 0, z]} rotation={[0, frame.rotation, 0]} userData={{ kitchenRunId: run.id }}>
      <primitive object={group} />
    </group>
  );
}

/** Is a point inside any of the rooms (scene metres)? */
function inRooms(x: number, z: number, rooms: [number, number][][]) {
  return rooms.some(poly => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i], [xj, zj] = poly[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  });
}

export default function KitchenLayer({
  kitchen, walls, size, openings, rooms,
}: {
  kitchen: KitchenSceneProps; walls: (PlanWallLike & { id?: string })[];
  size: { totalW: number; totalD: number }; openings: PlanOpening[];
  /** room outlines, scene metres — which face of a wall is indoors */
  rooms: [number, number][][];
}) {
  const get = useThree(st => st.get);
  const { data, editing, addKind, selected } = kitchen;
  const [ghost, setGhost] = useState<{ x: number; z: number; rotation: number; w: number; d: number; h: number; ok: boolean } | null>(null);
  const latest = useRef({ kitchen, walls, size, openings, rooms });
  useEffect(() => { latest.current = { kitchen, walls, size, openings, rooms }; });

  useEffect(() => {
    if (!editing) return;
    const { gl } = get();
    const el = gl.domElement;
    const ray = new THREE.Raycaster();
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    let down: { x: number; y: number } | null = null;

    const aim = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)), get().camera);
    };
    /** the wall face under the pointer: which wall, which side, where along it */
    const wallHit = () => {
      const L = latest.current;
      let best: { wi: number; side: 1 | -1; along: number; dist: number } | null = null;
      L.walls.forEach((w, wi) => {
        const ln = wallLine(w, wi, L.size);
        if (ln.horiz) box.set(new THREE.Vector3(ln.a0 - ln.t / 2, 0, ln.c - ln.t / 2), new THREE.Vector3(ln.a1 + ln.t / 2, 2.8, ln.c + ln.t / 2));
        else box.set(new THREE.Vector3(ln.c - ln.t / 2, 0, ln.a0 - ln.t / 2), new THREE.Vector3(ln.c + ln.t / 2, 2.8, ln.a1 + ln.t / 2));
        if (!ray.ray.intersectBox(box, v)) return;
        const dist = v.distanceTo(ray.ray.origin);
        // Cabinets go on the indoor face. An outer wall has one; between
        // two rooms, the face the camera looks at.
        const along = ln.horiz ? v.x : v.z;
        const probe = (sd: 1 | -1) => {
          const cross = ln.c + sd * (ln.t / 2 + 0.3);
          return ln.horiz ? inRooms(along, cross, L.rooms) : inRooms(cross, along, L.rooms);
        };
        const camCross = ln.horiz ? ray.ray.origin.z : ray.ray.origin.x;
        const camSide: 1 | -1 = camCross >= ln.c ? 1 : -1;
        const pos = probe(1), neg = probe(-1);
        const side: 1 | -1 = pos && !neg ? 1 : neg && !pos ? -1 : camSide;
        if (!best || dist < best.dist) best = { wi, side, along: ln.horiz ? v.x : v.z, dist };
      });
      return best as { wi: number; side: 1 | -1; along: number; dist: number } | null;
    };
    /** where a new unit would land, and whether it fits */
    const proposal = (kind: ModuleKind) => {
      const h = wallHit();
      if (!h) return null;
      const L = latest.current;
      const res = addModuleAt({ data: L.kitchen.data, kind, walls: L.walls, size: L.size, openings: L.openings, wallIndex: h.wi, side: h.side, along: h.along });
      const ln = wallLine(L.walls[h.wi], h.wi, L.size);
      const f = runFrame(ln, h.side);
      const w = MODULES[kind].width, ht = MODULES[kind].tall ? TALL_TOP : COUNTER_TOP;
      let mid = h.along;
      if ("runs" in res) {
        const run = res.runs.find(r => r.id === res.runId)!;
        const spans = moduleSpans(run, f);
        mid = (spans[res.index][0] + spans[res.index][1]) / 2;
      }
      const [x, z] = f.at(mid, BASE_DEPTH / 2);
      return { hit: h, ok: "runs" in res, ghost: { x, z, rotation: f.rotation, w, d: BASE_DEPTH, h: ht, ok: "runs" in res } };
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY };
      const kind = latest.current.kitchen.addKind;
      if (!kind) return;
      aim(e);
      const p = proposal(kind);
      if (!p) return;
      e.stopImmediatePropagation(); e.preventDefault();
      latest.current.kitchen.onAddAt(p.hit.wi, p.hit.side, p.hit.along);
      setGhost(null);
    };
    const onMove = (e: PointerEvent) => {
      const kind = latest.current.kitchen.addKind;
      if (!kind || e.target !== el) { if (!kind) setGhost(null); return; }
      aim(e);
      const p = proposal(kind);
      setGhost(p ? p.ghost : null);
      el.style.cursor = p ? (p.ok ? "copy" : "not-allowed") : "";
    };
    const onUp = (e: PointerEvent) => {
      const k = latest.current.kitchen;
      if (!down || k.addKind) { down = null; return; }
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5;
      down = null;
      if (moved || e.target !== el) return;
      // a plain click: select the unit under the pointer, if any
      aim(e);
      const scene = get().scene;
      const hits = ray.intersectObjects(scene.children, true);
      for (const hit of hits) {
        if (hit.object.name === "nooi-ui") continue;
        let o: THREE.Object3D | null = hit.object, runId: string | null = null;
        while (o) { if (o.userData.kitchenRunId) { runId = o.userData.kitchenRunId; break; } o = o.parent; }
        if (!runId) return k.onSelect(null);     // something else is in front
        const run = k.data.runs.find(r => r.id === runId);
        if (!run || !o) return;
        // which unit: by where along the run the hit is
        const local = o.worldToLocal(hit.point.clone());
        let x = 0, index = run.modules.length - 1;
        for (let i = 0; i < run.modules.length; i++) {
          if (local.x < x + run.modules[i].width) { index = i; break; }
          x += run.modules[i].width;
        }
        return k.onSelect({ runId, index });
      }
      k.onSelect(null);
    };
    el.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.style.cursor = "";
    };
  }, [editing, get]);

  // outline of the selected unit
  const sel = (() => {
    if (!editing || !selected) return null;
    const run = data.runs.find(r => r.id === selected.runId);
    const m = run?.modules[selected.index];
    if (!run || !m) return null;
    const wi = runWallIndex(run, walls);
    if (wi < 0) return null;
    const f = runFrame(wallLine(walls[wi], wi, size), run.side);
    const span = moduleSpans(run, f)[selected.index];
    const [x, z] = f.at((span[0] + span[1]) / 2, BASE_DEPTH / 2);
    const h = MODULES[m.kind].tall || m.upper ? TALL_TOP : COUNTER_TOP;
    return { x, z, rotation: f.rotation, w: m.width, d: BASE_DEPTH + 0.04, h };
  })();

  return (
    <group>
      {data.runs.map(r => <RunMesh key={r.id} run={r} data={data} walls={walls} size={size} openings={openings} />)}
      {sel && (
        <mesh name="nooi-ui" raycast={() => null} renderOrder={960} position={[sel.x, sel.h / 2, sel.z]} rotation={[0, sel.rotation, 0]}>
          <boxGeometry args={[sel.w + 0.02, sel.h + 0.02, sel.d]} />
          <meshBasicMaterial color="#c7de7d" transparent opacity={0.28} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {editing && addKind && ghost && (
        <mesh name="nooi-ui" raycast={() => null} renderOrder={960} position={[ghost.x, ghost.h / 2, ghost.z]} rotation={[0, ghost.rotation, 0]}>
          <boxGeometry args={[ghost.w, ghost.h, ghost.d]} />
          <meshBasicMaterial color={ghost.ok ? "#7fc97f" : "#e5484d"} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

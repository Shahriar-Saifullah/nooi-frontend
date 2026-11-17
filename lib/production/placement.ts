/**
 * Kitchen order input — lib/production/placement.ts
 * ============================================================================
 * Everything the order pack needs, in one plain, serialisable object: the
 * order details, the kitchen's style, each run's position in the room, and
 * the walls / doors / windows for the plan drawing. The 3D page builds it
 * with placeKitchen(); the backend can store it with the order and rebuild
 * the pack later without the plan maths.
 *
 * Positions are scene metres (the 3D world: x right, z towards the viewer).
 */

import { wallLine, wallIndexOf, openingSpan, type PlanOpening, type PlanSize, type PlanWallLike } from "@/lib/walls/openings";
import { frameOf, runWallIndex, upperVisible, windowSpans, type KitchenData, type KitchenModule } from "@/lib/kitchen/model";
import type { KitchenStyle } from "@/lib/kitchen/materials";

export interface OrderInfo {
  orderNo: string;
  client: string;
  project: string;
  /** ISO date */
  date: string;
  designer?: string;
  notes?: string;
}

export interface PlacedRun {
  id: string;
  /** R1, R2 … in the order the runs were drawn */
  code: string;
  modules: KitchenModule[];
  /** along-wall position of the run's left end (scene metres) */
  start: number;
  /** +1 / −1: which way along the wall the run's +X goes */
  dir: 1 | -1;
  /** the wall face the cabinets back onto (cross-axis coordinate) */
  face: number;
  /** +1 / −1: which way the room is from that face */
  side: 1 | -1;
  /** the wall runs along x (true) or z (false) */
  horiz: boolean;
  /** rotation about Y that turns the run's +Z towards the room */
  rotation: number;
  /** per module: is the wall cabinet / hood above it built (none in front of windows) */
  showUpper: boolean[];
}

export interface PlanRect { x0: number; z0: number; x1: number; z1: number }

export interface KitchenOrderInput {
  order: OrderInfo;
  style: KitchenStyle;
  runs: PlacedRun[];
  plan: {
    walls: PlanRect[];
    openings: (PlanRect & { type: "door" | "window" })[];
  };
}

/** World (x, z) of a point in a run's own frame (x along from its left end, z out from the wall), metres. */
export function runToWorld(r: Pick<PlacedRun, "start" | "dir" | "face" | "side" | "horiz">, x: number, z: number): [number, number] {
  const along = r.start + r.dir * x;
  const cross = r.face + r.side * z;
  return r.horiz ? [along, cross] : [cross, along];
}

/** The order pack's input from the canvas's kitchen and plan. */
export function placeKitchen(args: {
  kitchen: KitchenData;
  walls: (PlanWallLike & { id?: string })[];
  size: PlanSize;
  openings: PlanOpening[];
  order: OrderInfo;
}): KitchenOrderInput {
  const { kitchen, walls, size, openings } = args;
  const runs: PlacedRun[] = [];
  kitchen.runs.forEach(run => {
    const f = frameOf(run, walls, size);
    if (!f || !run.modules.length) return;
    const wi = runWallIndex(run, walls);
    const wins = windowSpans(walls, size, openings, wi);
    runs.push({
      id: run.id, code: `R${runs.length + 1}`, modules: run.modules,
      start: run.start, dir: f.dir, face: f.face, side: run.side, horiz: f.line.horiz,
      rotation: f.rotation, showUpper: upperVisible(run, f, wins),
    });
  });

  const lines = walls.map((w, i) => wallLine(w, i, size));
  const rect = (horiz: boolean, a0: number, a1: number, c0: number, c1: number): PlanRect =>
    horiz ? { x0: a0, x1: a1, z0: c0, z1: c1 } : { x0: c0, x1: c1, z0: a0, z1: a1 };
  return {
    order: args.order,
    style: kitchen.style,
    runs,
    plan: {
      walls: lines.map(l => rect(l.horiz, l.a0 - l.t / 2, l.a1 + l.t / 2, l.c - l.t / 2, l.c + l.t / 2)),
      openings: openings.flatMap(op => {
        const wi = wallIndexOf(op, walls, size);
        const l = lines[wi];
        if (!l) return [];
        const { centre, half } = openingSpan(op, size);
        return [{ type: op.type, ...rect(l.horiz, centre - half, centre + half, l.c - l.t / 2, l.c + l.t / 2) }];
      }),
    },
  };
}

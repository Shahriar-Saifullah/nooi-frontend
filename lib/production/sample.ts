/**
 * A sample L-shaped kitchen — lib/production/sample.ts
 * ============================================================================
 * A 4.2 × 3.6 m room with a window over the sink and a door opposite: five
 * units and three wall cabinets on one wall, an oven tower, pantry and fridge
 * on the other. Used by the tests and by scripts/production/sample.ts (the
 * sample pack shown to factories).
 */

import { addModuleAt, type KitchenData, type ModuleKind } from "@/lib/kitchen/model";
import { DEFAULT_KITCHEN_STYLE } from "@/lib/kitchen/materials";
import type { PlanOpening } from "@/lib/walls/openings";

export function sampleKitchen() {
  // a 4.2 × 3.6 m room: walls in % of a 4.6 × 4.0 m plan, 20 cm thick
  const size = { totalW: 4.6, totalD: 4.0 };
  const T = (0.2 / 4.6) * 100;
  const walls = [
    { id: "top", x1: 2.5, y1: 2.5, x2: 97.5, y2: 2.5, thickness: T },
    { id: "right", x1: 97.5, y1: 2.5, x2: 97.5, y2: 97.5, thickness: T },
    { id: "bottom", x1: 97.5, y1: 97.5, x2: 2.5, y2: 97.5, thickness: T },
    { id: "left", x1: 2.5, y1: 97.5, x2: 2.5, y2: 2.5, thickness: T },
  ];
  const openings: PlanOpening[] = [
    { type: "window", wall: "horizontal", x: 264, y: 25, width: 152, wall_id: "w0" },
    { type: "door", wall: "horizontal", x: 760, y: 975, width: 200, wall_id: "w2" },
  ];
  let data: KitchenData = { runs: [], style: { ...DEFAULT_KITCHEN_STYLE, front: "#2f3e53", frontStyle: "shaker", countertop: "quartz-white", hardware: "brass" } };
  // add units one by one, each beside the last (away from the corner)
  const add = (wallIndex: number, along: number, kinds: ModuleKind[]) => {
    for (const kind of kinds) {
      const r = addModuleAt({ data, kind, walls, size, openings, wallIndex, side: 1, along });
      if ("error" in r) throw new Error(`${kind}: ${r.error}`);
      data = { ...data, runs: r.runs };
      const run = r.runs.find(x => x.id === r.runId)!;
      const len = run.modules.reduce((a, m) => a + m.width, 0);
      along = wallIndex === 0 ? run.start + len + 0.05 : run.start + 0.05;
    }
  };
  // top wall from the left corner: drawers, sink under the window, dishwasher, hob, cupboard
  add(0, -1.7, ["drawer-base", "sink-base", "dishwasher", "cooktop-gas", "base-door"]);
  // left wall from the same corner: oven tower, pantry, fridge
  add(3, -1.0, ["oven-tower", "tall-pantry", "fridge-single"]);
  return { data, walls, size, openings };
}

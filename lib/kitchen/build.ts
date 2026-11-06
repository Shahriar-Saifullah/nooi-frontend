/**
 * Kitchen → 3D — lib/kitchen/build.ts
 * ============================================================================
 * Turns a run into three.js objects with Pascal's cabinet geometry (vendored
 * in ./pascal): the run's plinth and continuous countertop (sink cut out),
 * each module's carcass, fronts, handles and appliance, and the uppers.
 *
 * Built in the run's own frame: x along the run from its left end, z out of
 * the wall (back face at z = 0), y up from the floor. The caller places the
 * group on the wall (runFrame).
 */

import * as THREE from "three";
import { buildCabinetGeometry } from "./pascal/geometry";
import { cabinetPresetById } from "./pascal/presets";
import { newCabinetCompartment } from "./pascal/stack";
import type { CabinetModuleNode, CabinetNode, GeometryContext, AnyNode } from "./pascal/core";
import { setKitchenStyle, type KitchenStyle } from "./materials";
import { MODULES, BASE_DEPTH, PLINTH, CARCASS, UPPER_BOTTOM, UPPER_DEPTH, type KitchenRun } from "./model";

const BOX_DEFAULTS = {
  rotation: 0, operationState: 0, plinthHeight: PLINTH, toeKickDepth: 0.075, boardThickness: 0.018,
  countertopThickness: 0.02, countertopOverhang: 0.02, countertopBackOverhang: 0, withFinishedBack: false,
  frontThickness: 0.018, frontGap: 0.003, panelReady: false, handlePosition: "auto" as const,
  frontOverlay: "full" as const, withBottomPanel: true, showPlinth: true, withCountertop: true,
};

function runNode(style: KitchenStyle): CabinetNode {
  return {
    ...BOX_DEFAULTS, id: "run", type: "cabinet", parentId: null, children: [],
    runTier: "base", withWaterfall: false, withFinishedEnds: false,
    position: [0, 0, 0], width: 1, depth: BASE_DEPTH, carcassHeight: CARCASS,
    frontStyle: style.frontStyle, handleStyle: style.handleStyle,
  };
}

function moduleNode(id: string, patch: Partial<CabinetModuleNode>, style: KitchenStyle): CabinetModuleNode {
  return {
    ...BOX_DEFAULTS, id, type: "cabinet-module", parentId: "run", children: [],
    cabinetType: "base", moduleKind: "standard", topFinish: "none", topFinishHeight: 0.33, topFinishDepth: 0.32,
    position: [0, 0, 0], width: 0.6, depth: BASE_DEPTH, carcassHeight: CARCASS,
    ...patch,
    // the kitchen's style wins over the preset's
    frontStyle: style.frontStyle,
    handleStyle: style.handleStyle,
  } as CabinetModuleNode;
}

const ctxFor = (parent: AnyNode | null, children: AnyNode[] = []): GeometryContext => ({
  resolve: () => undefined, children, siblings: [], parent,
});

/** Mark every mesh: which run and module it belongs to (picking). */
function tag(o: THREE.Object3D, data: Record<string, unknown>) {
  o.traverse(c => { Object.assign(c.userData, data); });
}

/**
 * Build one run. Group origin: the run's left end, on the wall face, at the
 * floor. Each module's own group is tagged { kitchenRun, kitchenModule } so a
 * click can tell which module it hit.
 */
export function buildRun(run: KitchenRun, style: KitchenStyle, showUpper: boolean[]): THREE.Group {
  setKitchenStyle(style);
  const group = new THREE.Group();
  const runN = runNode(style);
  let x = 0;
  const mods: CabinetModuleNode[] = [];
  run.modules.forEach((m, i) => {
    const preset = cabinetPresetById(m.kind).createPatch(runN);
    const node = moduleNode(m.id, { ...preset, width: m.width }, style);
    node.position = [x + m.width / 2, PLINTH, node.depth / 2];
    mods.push(node);
    x += m.width;

    const g = buildCabinetGeometry(node, ctxFor(runN));
    g.position.set(node.position[0], node.position[1], node.position[2]);
    tag(g, { kitchenRun: run.id, kitchenModule: i });
    group.add(g);

    if (m.upper && showUpper[i] && !MODULES[m.kind].tall) {
      const hood = m.upper === "hood";
      const upper = moduleNode(`${m.id}-up`, hood ? {
        name: "Chimney", width: m.width, depth: 0.5, carcassHeight: 0.4,
        plinthHeight: 0, toeKickDepth: 0, countertopThickness: 0, countertopOverhang: 0,
        showPlinth: false, withCountertop: false, stack: [newCabinetCompartment("hood-pyramid")],
      } : { ...cabinetPresetById("wall-cabinet").createPatch(runN), width: m.width, depth: UPPER_DEPTH }, style);
      const y = hood ? UPPER_BOTTOM + 0.2 : UPPER_BOTTOM;
      // the hood's duct runs up to the ceiling from its own height
      if (hood) upper.position = [0, y, 0];
      const ug = buildCabinetGeometry(upper, ctxFor(hood ? null : node));
      const depth = hood ? 0.5 : UPPER_DEPTH;
      ug.position.set(node.position[0], y, depth / 2);
      tag(ug, { kitchenRun: run.id, kitchenModule: i });
      group.add(ug);
    }
  });

  // plinth + countertop along the whole run (the sink is cut into it)
  runN.width = x;
  const top = buildCabinetGeometry(runN, ctxFor(null, mods));
  tag(top, { kitchenRun: run.id, kitchenModule: -1 });
  group.add(top);

  group.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
  });
  return group;
}

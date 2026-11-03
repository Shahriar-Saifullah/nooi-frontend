/** Smart stretch (lib/furniture/stretch) — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  chooseCuts, crossingProfile, cutRegion, planStretch, repeatsFor, stretchModeFor, cutsFor,
} from "@/lib/furniture/stretch";

/** A sofa-ish model 2.2 m wide: two arms, three seat cushions, one long back. */
function sofa(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial();
  const box = (x0: number, x1: number, y: number, h: number, z: number, d: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, d, 1, 1, 1), mat);
    m.position.set((x0 + x1) / 2, y + h / 2, z);
    g.add(m);
  };
  box(-1.1, -0.9, 0, 0.6, 0, 0.9);            // left arm
  box(0.9, 1.1, 0, 0.6, 0, 0.9);              // right arm
  for (const [a, b] of [[-0.895, -0.305], [-0.295, 0.295], [0.305, 0.895]]) box(a, b, 0.2, 0.2, 0.05, 0.8);  // cushions
  box(-0.9, 0.9, 0, 0.8, -0.4, 0.1);          // one long back panel
  return g;
}

const area = (root: THREE.Object3D) => {
  let a = 0;
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  root.updateMatrixWorld(true);
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    const p = geo.getAttribute("position");
    for (let i = 0; i + 2 < p.count; i += 3) {
      for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(p, i + k).applyMatrix4(m.matrixWorld);
      a += new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[2], v[0])).length() / 2;
    }
  });
  return a;
};

test("kinds of piece grow the right way", () => {
  assert.equal(stretchModeFor({ typeId: "sofa", path: "/m.glb" }).mode, "repeat");
  assert.equal(stretchModeFor({ typeId: "sofa", path: "/m.glb" }).unit, "seat");
  assert.equal(stretchModeFor({ typeId: "bookshelf", path: "/m.glb" }).unit, "bay");
  assert.equal(stretchModeFor({ typeId: "dining-table", path: "/m.glb" }).mode, "stretch");
  assert.equal(stretchModeFor({ typeId: "floor-lamp", path: "/m.glb" }).mode, "scale");
  assert.equal(stretchModeFor({ typeId: "sofa", path: "/m.glb", mountType: "wall" }).mode, "scale");
  assert.equal(stretchModeFor({ typeId: "tv-stand", path: "", procedural: "tv" }).mode, "scale");
});

test("a sofa is cut between the cushions, around one middle seat", () => {
  const prof = crossingProfile(sofa())!;
  assert.ok(Math.abs(prof.x0 + 1.1) < 1e-6 && Math.abs(prof.x1 - 1.1) < 1e-6);
  const cuts = chooseCuts(prof, "repeat")!;
  assert.ok(cuts.c1 > -0.31 && cuts.c1 < -0.29, `left cut ${cuts.c1}`);
  assert.ok(cuts.c2 > 0.29 && cuts.c2 < 0.31, `right cut ${cuts.c2}`);
});

test("a table is cut just inside its legs", () => {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial();
  const add = (w: number, h: number, d: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, 0); g.add(m);
  };
  add(2, 0.04, 1, 0, 0.74);                      // top
  for (const x of [-0.95, 0.95]) add(0.1, 0.72, 0.1, x, 0.36);   // legs
  const prof = crossingProfile(g)!;
  const cuts = chooseCuts(prof, "stretch")!;
  assert.ok(cuts.c1 >= -0.9 && cuts.c1 < -0.6, `left cut ${cuts.c1}`);
  assert.ok(cuts.c2 <= 0.9 && cuts.c2 > 0.6, `right cut ${cuts.c2}`);
});

test("cutting keeps every bit of surface, clipped exactly at the cuts", () => {
  const model = sofa();
  const cuts = cutsFor(model, "repeat")!;
  const parts = [cutRegion(model, -Infinity, cuts.c1), cutRegion(model, cuts.c1, cuts.c2), cutRegion(model, cuts.c2, Infinity)];
  const total = parts.reduce((a, p) => a + area(p), 0);
  assert.ok(Math.abs(total - area(model)) < 1e-6, `${total} vs ${area(model)}`);
  // the middle holds nothing outside its slab
  const box = new THREE.Box3().setFromObject(parts[1]);
  assert.ok(box.min.x >= cuts.c1 - 1e-6 && box.max.x <= cuts.c2 + 1e-6);
});

test("wider sofas get whole extra seats; the arms keep their size", () => {
  const cuts = { x0: -1.1, x1: 1.1, c1: -0.3, c2: 0.3, how: "repeat" as const };    // model units = metres here
  const plan = planStretch(cuts, 2.2, 2.8, "repeat")!;
  assert.equal(plan.repeats, 2);
  const [left, , , right] = plan.pieces;
  assert.equal(left.k, 1);
  assert.equal(right.k, 1);
  assert.ok(Math.abs(plan.pieces[1].k - 1) < 1e-9);       // 0.6 m seats stay 0.6 m
  assert.ok(Math.abs(right.start - (2.8 / 2 - 0.8)) < 1e-9);
  // no change → plain scaling
  assert.equal(planStretch(cuts, 2.2, 2.21, "repeat"), null);
  // far too narrow for the arms → plain scaling
  assert.equal(planStretch(cuts, 2.2, 1.7, "repeat"), null);
  // stretch mode lengthens one middle
  const t = planStretch(cuts, 2.2, 3.0, "stretch")!;
  assert.equal(t.repeats, 1);
  assert.ok(Math.abs(t.pieces[1].k - 1.4 / 0.6) < 1e-9);
});

test("the panel's seat count matches the scene", () => {
  const share = { left: 0.8 / 2.2, middle: 0.6 / 2.2, right: 0.8 / 2.2 };
  assert.equal(repeatsFor(share, 2.2, 2.2), 1);
  assert.equal(repeatsFor(share, 2.2, 2.8), 2);
  assert.equal(repeatsFor(share, 2.2, 3.4), 3);
});

test("a chaise or built-in side table is never repeated", () => {
  // a sofa whose right half has a chaise reaching forward
  const g = sofa();
  const chaise = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.7), new THREE.MeshStandardMaterial());
  chaise.position.set(0.6, 0.15, 0.75);
  g.add(chaise);
  const prof = crossingProfile(g)!;
  const cuts = chooseCuts(prof, "repeat")!;
  assert.ok(cuts, "still finds a plain run of seats");
  assert.ok(cuts.c2 <= 0.3 + 0.012, `middle stays clear of the chaise (right cut ${cuts.c2})`);
});

test("a one-bay shelf gains bays with a post between; a one-cushion sofa gets a longer seat", () => {
  const mat = new THREE.MeshStandardMaterial();
  const shelf = new THREE.Group();
  const add = (g: THREE.Group, w: number, h: number, d: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, 0); g.add(m);
  };
  for (const x of [-0.38, 0.38]) add(shelf, 0.04, 1.8, 0.35, x, 0.9);          // posts
  for (const y of [0.05, 0.5, 0.95, 1.4, 1.78]) add(shelf, 0.72, 0.03, 0.33, 0, y);   // shelves
  const prof = crossingProfile(shelf)!;
  const c = chooseCuts(prof, "repeat", "post-bay")!;
  assert.equal(c.how, "repeat");
  assert.ok(Math.abs(c.c1 - c.x0) < 1e-9, "left post goes with each bay");
  assert.ok(c.c2 > 0.3 && c.c2 <= 0.37, `right post kept as the end (cut ${c.c2})`);
  // 1.4× wide is not a whole extra bay: the shelves lengthen between the posts
  const short = planStretch(c, 0.8, 1.12)!;
  assert.equal(short.repeats, 1);
  assert.ok(short.pieces[0].k === short.pieces[2].k, "posts keep their scale");
  // 2× wide: two bays
  assert.equal(planStretch(c, 0.8, 1.6)!.repeats, 2);

  const couch = new THREE.Group();
  add(couch, 0.2, 0.6, 0.9, -1, 0.3); add(couch, 0.2, 0.6, 0.9, 1, 0.3);      // arms
  add(couch, 1.8, 0.4, 0.9, 0, 0.2);                                           // one long seat
  const s2 = chooseCuts(crossingProfile(couch)!, "repeat", "stretch")!;
  assert.equal(s2.how, "stretch");
  assert.ok(s2.c1 >= -0.9 - 0.012 && s2.c2 <= 0.9 + 0.012, "arms stay at the ends");
});

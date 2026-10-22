/**
 * Geometry unit tests — run with `npm test`.
 *
 * These pin down the conversions and wall rules every view depends on, so a
 * unit mix-up (plan % vs scene metres vs real metres) fails here instead of
 * showing up as a floor at the wrong scale or a corner that tears open.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  makeFrame, pctToSceneX, pctToSceneZ, sceneToPctX, sceneToPctY,
  wallToScene, wallToPct, sceneToReal, realToScene, sceneAreaToReal,
  snapSceneToRealCm, polygonArea,
} from "@/lib/geometry/planFrame";
import {
  axisAlign, isHoriz, moveWallEnd, weldTargets, tJunctions, wallLength,
} from "@/lib/walls/geometry";
import {
  beginEndDrag, beginBodyDrag, applySession, setWallLength, setWallThickness,
  wallSize,
} from "@/lib/walls/wallEdit";
import { planWallsToWorld, WALL_T_MIN, WALL_T_MAX } from "@/lib/placement/snap";

const near = (a: number, b: number, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`);

type W = { x1: number; y1: number; x2: number; y2: number; thickness: number; id: string };

// 16 m × 12 m plan, a living room and a bedroom split by partition w5, and
// a short partition p that T's into the east wall.
const FRAME = makeFrame(1600, 1200, 1);
const T = 1.2;
const PLAN = (): W[] => [
  { x1: 10, y1: 10, x2: 90, y2: 10, thickness: T, id: "w1" },
  { x1: 90, y1: 10, x2: 90, y2: 90, thickness: T, id: "w2" },
  { x1: 90, y1: 90, x2: 10, y2: 90, thickness: T, id: "w3" },
  { x1: 10, y1: 90, x2: 10, y2: 10, thickness: T, id: "w4" },
  { x1: 60, y1: 10, x2: 60, y2: 90, thickness: T, id: "w5" },
  { x1: 90, y1: 50, x2: 70, y2: 50, thickness: T, id: "p" },
];
const apply = (walls: W[], ch: { index: number; wall: W }[]) => {
  const n = [...walls];
  for (const c of ch) n[c.index] = c.wall;
  return n;
};
const byId = (walls: W[], id: string) => walls.find(w => w.id === id)!;

// ── planFrame ───────────────────────────────────────────────────────────────

test("plan % maps onto a scene centred on the origin", () => {
  near(pctToSceneX(FRAME, 0), -8);
  near(pctToSceneX(FRAME, 100), 8);
  near(pctToSceneZ(FRAME, 50), 0);
  near(pctToSceneZ(FRAME, 100), 6);
  near(sceneToPctX(FRAME, pctToSceneX(FRAME, 37.25)), 37.25);
  near(sceneToPctY(FRAME, pctToSceneZ(FRAME, 81.5)), 81.5);
});

test("a wall survives % → metres → % unchanged", () => {
  const w = { x1: 12.5, y1: 33.3, x2: 77.7, y2: 33.3, thickness: 1.1, id: "a" };
  const back = wallToPct(FRAME, wallToScene(FRAME, w));
  for (const k of ["x1", "y1", "x2", "y2", "thickness"] as const) near(back[k], w[k], 1e-6);
  assert.equal(back.id, "a");
});

test("wall thickness is a % of the LARGER plan side", () => {
  const s = wallToScene(FRAME, { x1: 0, y1: 0, x2: 10, y2: 0, thickness: 1 });
  near(s.thickness, 0.16);              // 1 % of 16 m, not of 12 m
});

test("saved % carries no float noise", () => {
  const w = wallToPct(FRAME, { x1: 0.1 + 0.2, y1: -2, x2: 3, y2: -2, thickness: 0.15 });
  assert.equal(String(w.x1).length < 12, true);
});

test("real ↔ scene: lengths scale by visualScale, areas by its square", () => {
  const f = makeFrame(3900, 3000, 1.5);
  near(realToScene(f, 4), 6);
  near(sceneToReal(f, 6), 4);
  near(sceneAreaToReal(f, 9 * 2.25), 9);
  // snapping lands the REAL length on a whole centimetre
  near(sceneToReal(f, snapSceneToRealCm(f, 1.23456)) * 100, Math.round(1.23456 / 1.5 * 100));
});

test("polygonArea", () => {
  near(polygonArea([[0, 0], [4, 0], [4, 3], [0, 3]]), 12);
  near(polygonArea([[0, 0], [0, 3], [4, 3], [4, 0]]), 12);   // either winding
});

// ── planWallsToWorld (what the renderer and snapping see) ──────────────────

test("planWallsToWorld extends ends by half the clamped thickness", () => {
  const [w] = planWallsToWorld([{ x1: 10, y1: 10, x2: 90, y2: 10, thickness: T }], 16, 12);
  const t = Math.min(WALL_T_MAX, Math.max(WALL_T_MIN, 0.012 * 16));
  near(w.thickness, t);
  near(w.x1, -6.4 - t / 2);
  near(w.x2, 6.4 + t / 2);
  near(w.z1, -4.8);
  assert.equal(w.id, "wi0");
});

test("planWallsToWorld picks the axis in plan %, like the renderer", () => {
  // 10 % across and 11 % down on a 16 × 12 plan: % says vertical (11 > 10),
  // metres would say horizontal (1.6 m > 1.32 m). The renderer uses %.
  const [w] = planWallsToWorld([{ x1: 40, y1: 40, x2: 50, y2: 51, thickness: T }], 16, 12);
  assert.equal(w.x1, w.x2, "drawn vertical");
});

// ── axis-aligned helpers ───────────────────────────────────────────────────

test("axisAlign flattens onto the dominant axis", () => {
  const a = axisAlign({ x1: 0, y1: 1, x2: 10, y2: 3, thickness: 1 });
  assert.equal(isHoriz(a), true);
  assert.equal(a.y1, 2);
  assert.equal(a.y2, 2);
});

test("moveWallEnd slides across its axis instead of skewing", () => {
  const w = moveWallEnd({ x1: 0, y1: 0, x2: 10, y2: 0, thickness: 1 }, 2, 12, 3);
  assert.deepEqual([w.x1, w.y1, w.x2, w.y2], [0, 3, 12, 3]);
  assert.equal(wallLength(w), 12);
});

test("weld radius is a real distance on both axes", () => {
  const walls = [
    { x1: 0, y1: 0, x2: 5, y2: 0, thickness: 0.1 },
    { x1: 5.3, y1: 0, x2: 5.3, y2: 4, thickness: 0.1 },   // 30 cm off
    { x1: 0, y1: 0.8, x2: 0, y2: 4, thickness: 0.1 },     // 80 cm off
  ];
  assert.deepEqual(weldTargets(walls, 0, 5, 0, 0.5), [{ i: 1, end: 1 }]);
  assert.deepEqual(weldTargets(walls, 0, 0, 0, 0.5), []);
});

test("tJunctions finds partitions ending on a wall's body", () => {
  const sw = PLAN().map(w => wallToScene(FRAME, w));
  const tees = tJunctions(sw, 1, sw[1], [], 0.5);           // east wall w2
  assert.ok(tees.some(t => t.i === 5 && t.end === 1), "partition p");
});

// ── wall edit sessions (2D editor and 3D handles) ──────────────────────────

test("lengthening a wall keeps every corner closed, one wall further out too", () => {
  const walls = PLAN();
  const s = beginEndDrag(walls, FRAME, 0, 2);               // w1's east end
  const out = apply(walls, applySession(walls, FRAME, s, 7.4, -4.8));
  near(byId(out, "w1").x2, 96.25);                          // +1 m
  near(byId(out, "w2").x1, 96.25);                          // corner weld
  near(byId(out, "w2").x2, 96.25);
  near(byId(out, "w3").x1, 96.25);                          // the next corner
  near(byId(out, "p").x1, 96.25);                           // T into w2
  assert.deepEqual(byId(out, "w4"), walls[3], "untouched wall unchanged");
});

test("sliding a partition keeps both ends attached", () => {
  const walls = PLAN();
  const s = beginBodyDrag(walls, FRAME, 4, 1.6, 0);
  const out = apply(walls, applySession(walls, FRAME, s, 2.6, 3, true));
  near(byId(out, "w5").x1, 66.25);
  near(byId(out, "w5").y1, 10);                             // crossOnly: no slide along
  near(byId(out, "w5").y2, 90);
});

test("only the grabbed wall drags room outlines", () => {
  const walls = PLAN();
  const ch = applySession(walls, FRAME, beginEndDrag(walls, FRAME, 0, 2), 7.4, -4.8);
  assert.equal(ch[0].index, 0);
  assert.equal(ch[0].opts, undefined);
  assert.ok(ch.slice(1).every(c => c.opts?.dragRooms === false));
});

test("typed length is REAL metres, even when the scene is stretched", () => {
  const f = makeFrame(1600 * 1.5, 1200 * 1.5, 1.5);
  const walls = PLAN();
  near(wallSize(walls, f, 0).lengthRealM, 12.8);            // 80 % of 16 m real
  const out = apply(walls, setWallLength(walls, f, 0, 10));
  near(wallSize(out, f, 0).lengthRealM, 10);
  near(byId(out, "w1").x1, 10);                             // anchor end stays
  near(byId(out, "w2").x1, byId(out, "w1").x2);             // corner follows
});

test("setWallThickness stores metres back as % of the larger side", () => {
  const c = setWallThickness(PLAN(), FRAME, 0, 0.16);
  near(c.wall.thickness, 1);
  assert.equal(c.wall.id, "w1");
});

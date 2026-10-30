/** Rotate ring and slide arrows — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rotationFromDrag, itemAxis, slideAlong, toDeg, angleAround } from "@/lib/placement/gizmo";

const rad = (d: number) => (d * Math.PI) / 180;
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test("dragging around the ring turns the piece by any angle", () => {
  // grabbed at 0°, pointer moved to −18° on the floor → piece turns +18°
  assert.equal(toDeg(rotationFromDrag(0, 0, rad(-18))), 18);
  assert.equal(toDeg(rotationFromDrag(rad(30), rad(10), rad(-27))), 67);
});

test("it clicks onto multiples of 45° when close, unless snapping is off", () => {
  assert.equal(toDeg(rotationFromDrag(0, 0, rad(-88))), 90);
  assert.equal(toDeg(rotationFromDrag(0, 0, rad(-88), false)), 88);
  assert.equal(toDeg(rotationFromDrag(0, 0, rad(-80))), 80);
  assert.equal(toDeg(rotationFromDrag(0, 0, rad(2))), 0);   // −2° snaps back to 0
});

test("the grabbed point follows the pointer (three.js rotation sense)", () => {
  // a point on the ring at angle a, after rotating by r, sits at a − r
  const start = rad(40), grab = rad(100), now = rad(160);
  const r = rotationFromDrag(start, grab, now, false);
  const turned = r - start;
  close(Math.cos(grab - turned), Math.cos(now));
  close(Math.sin(grab - turned), Math.sin(now));
});

test("arrows slide along the piece's own axes", () => {
  close(itemAxis(0, "x")[0], 1); close(itemAxis(0, "z")[1], 1);
  const [x, z] = itemAxis(rad(90), "x");          // width axis turns to −z
  close(x, 0); close(z, -1);
  const angle = angleAround(0, 0, 1, 1);
  close(angle, Math.PI / 4);
});

test("sliding ignores sideways pointer movement", () => {
  const [x, z] = slideAlong([2, 3], [1, 0], [0, 0], [0.5, 4]);
  close(x, 2.5); close(z, 3);
});

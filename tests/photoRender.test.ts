/** Photo render: the scene spec sent to the GPU worker — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildRenderSpec, outputSize } from "@/lib/render/sceneSpec";
import { sha256Hex, isTerminal } from "@/lib/render/photoRender";

test("output size keeps the view's shape at the quality's long side", () => {
  assert.deepEqual(outputSize(1280 / 760, "standard"), { width: 1920, height: 1140 });
  assert.deepEqual(outputSize(16 / 9, "high"), { width: 3840, height: 2160 });
  assert.deepEqual(outputSize(0.5, "standard"), { width: 960, height: 1920 });
  // nonsense aspect falls back to 16:9
  assert.deepEqual(outputSize(NaN, "standard"), { width: 1920, height: 1080 });
});

test("spec reads the camera, the sun and the lamps that are on — not the stand-in lights", () => {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(55, 1.5, 0.1, 100);
  cam.position.set(1, 1.6, 3);
  cam.lookAt(0, 1, 0);
  scene.add(cam);

  const sun = new THREE.DirectionalLight("#fff1c8", 2.8);
  sun.castShadow = true;
  sun.position.set(5, 8, 3);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight("#dde5ff", 0.4); // no shadows: a stand-in
  fill.position.set(-5, 5, -5);
  scene.add(fill);
  const on = new THREE.PointLight("#ffddaa", 5, 9);
  on.position.set(2, 2.4, 0.3);
  const off = new THREE.PointLight("#ffddaa", 0, 9);
  scene.add(on, off, new THREE.AmbientLight("#fff", 0.3));

  const spec = buildRenderSpec(scene, cam, 1.5, "standard");
  assert.equal(spec.width, 1920);
  assert.equal(spec.height, 1280);
  assert.equal(spec.samples, 256);
  assert.deepEqual(spec.camera.position, [1, 1.6, 3]);
  assert.equal(spec.camera.fovDeg, 55);
  assert.ok(spec.sun);
  const d = spec.sun!.direction;
  assert.ok(Math.abs(Math.hypot(...d) - 1) < 0.01, "unit vector");
  assert.ok(d[1] > 0.7, "points up towards the sun");
  assert.equal(spec.lamps.length, 1);
  assert.deepEqual(spec.lamps[0].position, [2, 2.4, 0.3]);
});

test("no sun at night", () => {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera();
  const sun = new THREE.DirectionalLight("#9fb6d8", 0);
  sun.castShadow = true;
  scene.add(sun);
  assert.equal(buildRenderSpec(scene, cam, 1, "standard").sun, null);
});

test("scene hash and job states", async () => {
  const h = await sha256Hex(new TextEncoder().encode("abc").buffer as ArrayBuffer);
  assert.equal(h, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(isTerminal("done"), true);
  assert.equal(isTerminal("running"), false);
});
